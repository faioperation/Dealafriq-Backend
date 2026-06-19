import cron from "node-cron";
import prisma from "../prisma/client.js";
import { NotificationService } from "../modules/ProjectManager/notification/notification.service.js";

/**
 * Initialize Notification Cron Job
 * Runs every minute to check for events starting in 30 minutes
 */
export const initNotificationCron = () => {
    cron.schedule("* * * * *", async () => {
        // console.log(`[${new Date().toISOString()}] Checking for upcoming notifications...`);
        try {
            const now = new Date();
            const futureLimit = new Date(now.getTime() + 30 * 60 * 1000);

            // 1. Check Google Calendar Events
            const calendarEvents = await prisma.googleCalendarEvent.findMany({
                where: {
                    start: {
                        gte: now,
                        lte: futureLimit,
                    },
                    deleted_at: null,
                },
            });

            for (const event of calendarEvents) {
                // Check if notification already exists
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId: event.userId,
                        entityId: event.id,
                        reminderType: "START_REMINDER",
                    },
                });

                if (!existing) {
                    const diffMinutes = Math.round((event.start.getTime() - now.getTime()) / (1000 * 60));
                    const timeStr = diffMinutes <= 0 ? "now" : `in ${diffMinutes} minutes`;

                    await NotificationService.createNotification(prisma, {
                        userId: event.userId,
                        title: "Upcoming Calendar Event",
                        message: `Reminder: Your event "${event.summary}" starts ${timeStr}.`,
                        type: "CALENDAR_EVENT",
                        entityId: event.id,
                        reminderType: "START_REMINDER",
                        link: event.htmlLink,
                    });
                    console.log(`Notification created for Calendar Event: ${event.summary} (${timeStr})`);
                }
            }

            // 1b. Check Outlook Calendar Events
            const outlookEvents = await prisma.outlookCalendarEvent.findMany({
                where: {
                    start: {
                        gte: now,
                        lte: futureLimit,
                    },
                    deleted_at: null,
                },
            });

            for (const event of outlookEvents) {
                // Check if notification already exists
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId: event.userId,
                        entityId: event.id,
                        reminderType: "START_REMINDER",
                    },
                });

                if (!existing) {
                    const diffMinutes = Math.round((event.start.getTime() - now.getTime()) / (1000 * 60));
                    const timeStr = diffMinutes <= 0 ? "now" : `in ${diffMinutes} minutes`;

                    await NotificationService.createNotification(prisma, {
                        userId: event.userId,
                        title: "Upcoming Outlook Calendar Event",
                        message: `Reminder: Your event "${event.summary}" starts ${timeStr}.`,
                        type: "CALENDAR_EVENT",
                        entityId: event.id,
                        reminderType: "START_REMINDER",
                        link: event.webLink,
                    });
                    console.log(`Notification created for Outlook Calendar Event: ${event.summary} (${timeStr})`);
                }
            }

            // 2. Check Project Meetings
            const meetings = await prisma.projectMeeting.findMany({
                where: {
                    meetingDate: {
                        gte: now,
                        lte: futureLimit,
                    },
                },
                include: {
                    project: true,
                },
            });

            for (const meeting of meetings) {
                // Determine who to notify (Manager of the project)
                const userId = meeting.project.managerId;

                // Check if notification already exists
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId: userId,
                        entityId: meeting.id,
                        reminderType: "START_REMINDER",
                    },
                });

                if (!existing) {
                    const diffMinutes = Math.round((meeting.meetingDate.getTime() - now.getTime()) / (1000 * 60));
                    const timeStr = diffMinutes <= 0 ? "now" : `in ${diffMinutes} minutes`;

                    await NotificationService.createNotification(prisma, {
                        userId: userId,
                        title: "Upcoming Project Meeting",
                        message: `Reminder: Your meeting "${meeting.title}" starts ${timeStr}.`,
                        type: "ZOOM_MEETING",
                        entityId: meeting.id,
                        reminderType: "START_REMINDER",
                        link: meeting.meetingUrl,
                    });
                    console.log(`Notification created for Project Meeting: ${meeting.title} (${timeStr})`);
                }
            }

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Notification Cron Job failed:`, error.message);
        }
    });

    console.log("✅ Notification Cron Job scheduled successfully (runs every minute)");
};
