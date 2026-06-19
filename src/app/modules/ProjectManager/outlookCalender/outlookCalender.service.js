import axios from 'axios';
import prisma from '../../../prisma/client.js';
import { OutlookOAuth } from '../outlookManagement/outlook/utils/outlookOAuth.js';
import { AppError } from '../../../errorHelper/appError.js';
import { StatusCodes } from 'http-status-codes';

const getValidOutlookToken = async (userId, forceRefresh = false) => {
    let account = await prisma.emailAccount.findFirst({
        where: { userId, provider: 'outlook' },
    });

    if (!account) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Outlook account not connected or calendar scope missing. Please connect your email first.');
    }

    // Check if expired (with 5 min buffer) or if refresh is forced
    if (forceRefresh || new Date() >= new Date(account.expiryDate.getTime() - 5 * 60 * 1000)) {
        try {
            const tokens = await OutlookOAuth.refreshToken(account.refreshToken);
            account = await prisma.emailAccount.update({
                where: { id: account.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || account.refreshToken,
                    expiryDate: new Date(Date.now() + tokens.expires_in * 1000),
                    isConnected: true,
                },
            });
        } catch (refreshError) {
            console.error('Failed to refresh Outlook token during calendar sync:', refreshError.message);
            await prisma.emailAccount.updateMany({
                where: { userId, provider: 'outlook' },
                data: { isConnected: false }
            });
            throw refreshError;
        }
    }

    return account.accessToken;
};

export const OutlookCalendarService = {
    syncEvents: async (userId, projectId = null) => {
        const token = await getValidOutlookToken(userId);

        let calendars = [{ id: 'primary', name: 'Primary Calendar' }];

        try {
            // Fetch all calendars user has access to in Outlook
            const calendarListResponse = await axios.get("https://graph.microsoft.com/v1.0/me/calendars", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (calendarListResponse.data && calendarListResponse.data.value) {
                calendars = calendarListResponse.data.value;
            }
        } catch (err) {
            console.warn("Failed to fetch calendars list, falling back to primary calendar:", err.message);
        }

        // Filter out Holiday/Birthday calendars
        const calendarsToSync = calendars.filter(c => {
            const name = (c.name || '').toLowerCase();
            const isHolidayOrBirthday = name.includes('holiday') || name.includes('birthday');
            return !isHolidayOrBirthday;
        });

        console.log(`Syncing ${calendarsToSync.length} Outlook calendars for user ${userId}`);

        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30); // Sync last 30 days of events

        let allSyncedEvents = [];

        for (const cal of calendarsToSync) {
            try {
                // Fetch events from Microsoft Graph API
                const response = await axios.get(`https://graph.microsoft.com/v1.0/me/calendars/${cal.id}/events`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        $filter: `start/dateTime ge '${timeMin.toISOString()}'`,
                        $top: 100,
                        $select: "id,subject,body,bodyPreview,location,start,end,webLink"
                    }
                });

                const events = response.data.value || [];

                const synced = await Promise.all(
                    events.map(async (event) => {
                        const start = event.start?.dateTime;
                        const end = event.end?.dateTime;

                        if (!start || !end) return null;

                        const updateData = {
                            summary: event.subject || '(No Summary)',
                            description: event.bodyPreview || event.body?.content || '',
                            location: event.location?.displayName || '',
                            start: new Date(start),
                            end: new Date(end),
                            webLink: event.webLink,
                        };

                        if (projectId) {
                            updateData.projectId = projectId;
                        }

                        return prisma.outlookCalendarEvent.upsert({
                            where: { outlookEventId: event.id },
                            update: updateData,
                            create: {
                                outlookEventId: event.id,
                                summary: event.subject || '(No Summary)',
                                description: event.bodyPreview || event.body?.content || '',
                                location: event.location?.displayName || '',
                                start: new Date(start),
                                end: new Date(end),
                                webLink: event.webLink,
                                userId: userId,
                                projectId: projectId,
                            },
                        });
                    })
                );
                allSyncedEvents.push(...synced.filter(e => e !== null));
            } catch (err) {
                console.error(`Error syncing Outlook calendar ${cal.id} for user ${userId}:`, err.message);
            }
        }

        return allSyncedEvents;
    },

    getEvents: async (userId, projectId = null) => {
        const where = { userId, deleted_at: null };
        if (projectId) {
            where.projectId = projectId;
        }

        return prisma.outlookCalendarEvent.findMany({
            where,
            orderBy: { start: 'desc' },
        });
    },

    deleteEvent: async (userId, eventId) => {
        const event = await prisma.outlookCalendarEvent.findUnique({
            where: { id: eventId },
        });

        if (!event || event.userId !== userId) {
            throw new AppError(StatusCodes.FORBIDDEN, 'Event not found or access denied');
        }

        return prisma.outlookCalendarEvent.update({
            where: { id: eventId },
            data: { deleted_at: new Date() },
        });
    },

    createEvent: async (userId, meetingData) => {
        try {
            const token = await getValidOutlookToken(userId);

            const eventPayload = {
                subject: meetingData.title || 'Project Meeting',
                body: {
                    contentType: 'HTML',
                    content: meetingData.notes || ''
                },
                start: {
                    dateTime: new Date(meetingData.meetingDate).toISOString(),
                    timeZone: 'UTC'
                },
                end: {
                    // Default to 1 hour after start
                    dateTime: new Date(new Date(meetingData.meetingDate).getTime() + 60 * 60 * 1000).toISOString(),
                    timeZone: 'UTC'
                }
            };

            const response = await axios.post("https://graph.microsoft.com/v1.0/me/calendar/events", eventPayload, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const responseData = response.data;

            // Store the synced event in our local OutlookCalendarEvent table too
            await prisma.outlookCalendarEvent.create({
                data: {
                    outlookEventId: responseData.id,
                    summary: responseData.subject,
                    description: responseData.bodyPreview || responseData.body?.content || '',
                    start: new Date(responseData.start.dateTime),
                    end: new Date(responseData.end.dateTime),
                    webLink: responseData.webLink,
                    userId: userId,
                    projectId: meetingData.projectId,
                }
            });

            return responseData;
        } catch (error) {
            console.error('Error creating Outlook Calendar event:', error.response?.data || error.message);
            return null;
        }
    },

    syncAllConnectedCalendars: async () => {
        const accounts = await prisma.emailAccount.findMany({
            where: { provider: 'outlook', isConnected: true }
        });

        for (const account of accounts) {
            try {
                await OutlookCalendarService.syncEvents(account.userId);
            } catch (error) {
                console.error(`Failed to periodic sync Outlook calendar for user ${account.userId}:`, error.message);

                if (error.message.includes('invalid_grant') || error.message.includes('401') || error.response?.status === 401) {
                    console.log(`Marking Outlook account as disconnected for user ${account.userId} due to invalid refresh token`);
                    await prisma.emailAccount.update({
                        where: { id: account.id },
                        data: { isConnected: false }
                    });
                }
            }
        }
    }
};
