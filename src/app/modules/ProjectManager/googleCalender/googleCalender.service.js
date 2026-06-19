import { google } from 'googleapis';
import prisma from '../../../prisma/client.js';
import { createOAuth2Client } from '../emailManagement/email/utils/googleEmailOAuth.js';
import { AppError } from '../../../errorHelper/appError.js';
import { StatusCodes } from 'http-status-codes';

const getCalendarClient = async (userId) => {
    const account = await prisma.emailAccount.findFirst({
        where: { userId, provider: 'google' },
    });

    if (!account) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Google account not connected or calendar scope missing. Please connect your email first.');
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
        expiry_date: account.expiryDate.getTime(),
    });

    try {
        // Handle token refresh
        oauth2Client.on('tokens', async (tokens) => {
            const updateData = {
                accessToken: tokens.access_token,
                expiryDate: new Date(tokens.expiry_date),
            };
            if (tokens.refresh_token) {
                updateData.refreshToken = tokens.refresh_token;
            }

            await prisma.emailAccount.update({
                where: { id: account.id },
                data: updateData,
            });
        });

        return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
        // Mark account as disconnected if token is invalid
        await prisma.emailAccount.update({
            where: { id: account.id },
            data: { isConnected: false }
        });
        throw error;
    }
};

export const GoogleCalendarService = {
    syncEvents: async (userId, projectId = null) => {
        const calendar = await getCalendarClient(userId);

        // Fetch all-calendars the user has access to
        const calendarList = await calendar.calendarList.list();
        const calendars = calendarList.data.items || [];

        // Filter out Holidays, Birthdays, and other "automatic" calendars
        const calendarsToSync = calendars.filter(c => {
            const summary = (c.summary || '').toLowerCase();
            const id = (c.id || '').toLowerCase();
            const isPrimary = c.primary;
            const isSelected = c.selected;
            const isOwner = c.accessRole === 'owner';

            // Skip calendars that are clearly not personal (Holidays, Birthdays, etc.)
            const isHolidayOrBirthday = summary.includes('holiday') ||
                summary.includes('birthday') ||
                id.includes('holiday') ||
                id.includes('birthday');

            return (isPrimary || isSelected || isOwner) && !isHolidayOrBirthday;
        });

        console.log(`Syncing ${calendarsToSync.length} calendars for user ${userId} (Filtered out holiday/birthday calendars)`);

        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30); // Sync last 30 days of events

        let allSyncedEvents = [];

        for (const cal of calendarsToSync) {
            try {
                const response = await calendar.events.list({
                    calendarId: cal.id,
                    timeMin: timeMin.toISOString(),
                    maxResults: 100,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const events = response.data.items || [];

                const synced = await Promise.all(
                    events.map(async (event) => {
                        // Skip cancelled events or events without confirmation
                        if (event.status === 'cancelled') return null;

                        const start = event.start.dateTime || event.start.date;
                        const end = event.end.dateTime || event.end.date;

                        if (!start || !end) return null;
                        console.log(`[Sync] Event: ${event.summary}, Raw Start: ${start}, Converted: ${new Date(start).toISOString()}`);

                        const updateData = {
                            summary: event.summary || '(No Summary)',
                            description: event.description,
                            location: event.location,
                            start: new Date(start),
                            end: new Date(end),
                            htmlLink: event.htmlLink,
                        };

                        if (projectId) {
                            updateData.projectId = projectId;
                        }

                        return prisma.googleCalendarEvent.upsert({
                            where: { googleEventId: event.id },
                            update: updateData,
                            create: {
                                googleEventId: event.id,
                                summary: event.summary || '(No Summary)',
                                description: event.description,
                                location: event.location,
                                start: new Date(start),
                                end: new Date(end),
                                htmlLink: event.htmlLink,
                                userId: userId,
                                projectId: projectId,
                            },
                        });
                    })
                );
                allSyncedEvents.push(...synced.filter(e => e !== null));
            } catch (err) {
                console.error(`Error syncing calendar ${cal.id}:`, err.message);
            }
        }

        return allSyncedEvents;
    },

    getEvents: async (userId, projectId = null) => {
        const where = { userId, deleted_at: null };
        if (projectId) {
            where.projectId = projectId;
        }

        return prisma.googleCalendarEvent.findMany({
            where,
            orderBy: { start: 'desc' },
        });
    },

    deleteEvent: async (userId, eventId) => {
        const event = await prisma.googleCalendarEvent.findUnique({
            where: { id: eventId },
        });

        if (!event || event.userId !== userId) {
            throw new AppError(StatusCodes.FORBIDDEN, 'Event not found or access denied');
        }

        return prisma.googleCalendarEvent.update({
            where: { id: eventId },
            data: { deleted_at: new Date() },
        });
    },

    createEvent: async (userId, meetingData) => {
        try {
            const calendar = await getCalendarClient(userId);

            const event = {
                summary: meetingData.title || 'Project Meeting',
                description: meetingData.notes || '',
                start: {
                    dateTime: new Date(meetingData.meetingDate).toISOString(),
                },
                end: {
                    // Default to 1 hour after start
                    dateTime: new Date(new Date(meetingData.meetingDate).getTime() + 60 * 60 * 1000).toISOString(),
                },
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });

            // Store the synced event in our local GoogleCalendarEvent table too
            await prisma.googleCalendarEvent.create({
                data: {
                    googleEventId: response.data.id,
                    summary: response.data.summary,
                    description: response.data.description,
                    start: new Date(response.data.start.dateTime || response.data.start.date),
                    end: new Date(response.data.end.dateTime || response.data.end.date),
                    htmlLink: response.data.htmlLink,
                    userId: userId,
                    projectId: meetingData.projectId,
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error creating Google Calendar event:', error.message);
            // We don't throw here to avoid failing the main meeting creation process
            return null;
        }
    },

    syncAllConnectedCalendars: async () => {
        const accounts = await prisma.emailAccount.findMany({
            where: { provider: 'google', isConnected: true }
        });

        for (const account of accounts) {
            try {
                await GoogleCalendarService.syncEvents(account.userId);
            } catch (error) {
                console.error(`Failed to periodic sync calendar for user ${account.userId}:`, error.message);

                // Check if it's an invalid grant error (refresh token expired/revoked)
                if (error.message.includes('invalid_grant') || error.message.includes('invalid_grant')) {
                    console.log(`Marking Google account as disconnected for user ${account.userId} due to invalid refresh token`);
                    await prisma.emailAccount.update({
                        where: { id: account.id },
                        data: { isConnected: false }
                    });
                }
            }
        }
    },

    getAllDatabaseEvents: async (userId) => {
        // 1. Fetch Google Calendar Events
        const calendarEvents = await prisma.googleCalendarEvent.findMany({
            where: {
                userId,
                deleted_at: null
            },
            orderBy: {
                start: 'desc'
            }
        });

        // 1b. Fetch Outlook Calendar Events
        const outlookCalendarEvents = await prisma.outlookCalendarEvent.findMany({
            where: {
                userId,
                deleted_at: null
            },
            orderBy: {
                start: 'desc'
            }
        });

        // 2. Fetch Zoom Meetings (ProjectMeetings) for the user's projects
        const zoomMeetings = await prisma.projectMeeting.findMany({
            where: {
                project: {
                    OR: [
                        { managerId: userId },
                        { assignments: { some: { userId } } }
                    ],
                    deletedAt: null
                }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        status: true
                    }
                }
            },
            orderBy: {
                meetingDate: 'desc'
            }
        });

        // 3. Pre-calculate latest available AI summaries per project as fallback
        const latestProjectSummaries = {};
        zoomMeetings.forEach(m => {
            if (m.aiMeetingSummary && Array.isArray(m.aiMeetingSummary) && m.aiMeetingSummary.length > 0) {
                if (!latestProjectSummaries[m.projectId]) {
                    latestProjectSummaries[m.projectId] = m.aiMeetingSummary.slice(-3);
                }
            }
        });

        // 4. Map and Merge into a single standardized array
        const standardizedCalendarEvents = calendarEvents.map(event => ({
            id: event.id,
            title: event.summary || '(No Summary)',
            description: event.description || '',
            location: event.location || '',
            start: event.start,
            end: event.end,
            createdAt: event.created_at,
            type: 'GOOGLE_CALENDAR_EVENT',
            url: event.htmlLink,
            aiSummary: [],
            projectId: event.projectId,
            projectName: null
        }));

        const standardizedOutlookEvents = outlookCalendarEvents.map(event => ({
            id: event.id,
            title: event.summary || '(No Summary)',
            description: event.description || '',
            location: event.location || '',
            start: event.start,
            end: event.end,
            createdAt: event.created_at,
            type: 'OUTLOOK_CALENDAR_EVENT',
            url: event.webLink,
            aiSummary: [],
            projectId: event.projectId,
            projectName: null
        }));

        const standardizedZoomMeetings = zoomMeetings.map(meeting => {
            const hasSummary = meeting.aiMeetingSummary && Array.isArray(meeting.aiMeetingSummary) && meeting.aiMeetingSummary.length > 0;
            return {
                id: meeting.id,
                title: meeting.title || '(No Title)',
                description: meeting.notes || '',
                location: 'Zoom',
                start: meeting.meetingDate,
                end: meeting.meetingDate ? new Date(new Date(meeting.meetingDate).getTime() + 60 * 60 * 1000) : null,
                createdAt: meeting.createdAt,
                type: 'ZOOM_MEETING',
                url: meeting.meetingUrl,
                aiSummary: hasSummary ? meeting.aiMeetingSummary.slice(-3) : (latestProjectSummaries[meeting.projectId] || []),
                projectId: meeting.projectId,
                projectName: meeting.project?.name || null
            };
        });

        // 5. Combine and sort by creation date descending (Newest created first)
        const allEvents = [
            ...standardizedCalendarEvents,
            ...standardizedOutlookEvents,
            ...standardizedZoomMeetings
        ].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        return allEvents;
    }
};
