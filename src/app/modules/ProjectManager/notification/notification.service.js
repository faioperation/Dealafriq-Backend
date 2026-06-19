import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import webpush from "web-push";
import { envVars } from "../../../config/env.js";

// Initialize VAPID details for Web Push
webpush.setVapidDetails(
  envVars.VAPID_EMAIL,
  envVars.VAPID_PUBLIC_KEY,
  envVars.VAPID_PRIVATE_KEY
);

/**
 * Notification Service
 */
export const NotificationService = {
  // Get all notifications for a user

  getNotifications: async (prisma, userId, query) => {
    const { status, limit = 10, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
    ]);

    const meetingIds = notifications
      .filter((n) => n.type === "ZOOM_MEETING" && n.entityId)
      .map((n) => n.entityId);

    let meetingsMap = new Map();
    let aiDetectionMap = new Map();
    if (meetingIds.length > 0) {
      const meetings = await prisma.projectMeeting.findMany({
        where: { id: { in: meetingIds } },
        include: { project: true },
      });
      meetingsMap = new Map(meetings.map((m) => [m.id, m]));

      const aiDetections = await prisma.aiDetection.findMany({
        where: { sourceType: "meeting", raiddMessage: { in: meetingIds }, deletedAt: null },
      });
      aiDetectionMap = new Map(aiDetections.map((a) => [a.raiddMessage, a]));
    }

    const mappedNotifications = notifications.map((n) => {
      const nObj = { ...n, meetingSummary: null, previousProjectSummary: null, raiddData: null, raiddAnalysis: null };
      if (n.type === "ZOOM_MEETING" && n.entityId) {
        const meeting = meetingsMap.get(n.entityId);
        if (meeting) {
          const meetingSum = meeting.lastMeetingSummary ||
            (meeting.aiMeetingSummary && meeting.aiMeetingSummary.length > 0
              ? meeting.aiMeetingSummary[meeting.aiMeetingSummary.length - 1]
              : null);

          if (meetingSum) {
            nObj.meetingSummary = meetingSum;
          } else if (meeting.project) {
            const project = meeting.project;
            nObj.previousProjectSummary =
              project.weeklyMeetingSummary ||
              (project.projectAiSummary && project.projectAiSummary.length > 0
                ? project.projectAiSummary[project.projectAiSummary.length - 1]
                : null);
          }
        }
        
        const detection = aiDetectionMap.get(n.entityId);
        if (detection) {
          nObj.raiddData = detection.raiddData;
          nObj.raiddAnalysis = detection.raiddAnalysis;
        }
      }
      return nObj;
    });

    return {
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
      data: mappedNotifications,
    };
  },

  // Mark a notification as read

  markAsRead: async (prisma, id, userId) => {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new AppError(StatusCodes.NOT_FOUND, "Notification not found");
    }

    return prisma.notification.update({
      where: { id },
      data: { status: "READ" },
    });
  },

  // Mark all notifications as read for a user

  markAllAsRead: async (prisma, userId) => {
    return prisma.notification.updateMany({
      where: { userId, status: "UNREAD" },
      data: { status: "READ" },
    });
  },

  // Subscribe a device for push notifications
  subscribeDevice: async (prisma, userId, subscriptionData) => {
    const { endpoint, keys } = subscriptionData;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid subscription object");
    }

    return prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });
  },

  // Internal: Create a notification and send push notification to registered devices
  createNotification: async (prisma, data) => {
    const notification = await prisma.notification.create({
      data,
    });

    try {
      // Find all push subscriptions for this user
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: data.userId },
      });

      if (subscriptions.length > 0) {
        const payload = JSON.stringify({
          title: data.title,
          body: data.message,
          type: data.type,
          link: data.link || "",
          id: notification.id,
        });

        // Broadcast to all user's registered devices
        const pushPromises = subscriptions.map((sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          return webpush
            .sendNotification(pushSubscription, payload)
            .catch(async (error) => {
              console.error(
                `❌ Failed to send push to endpoint: ${sub.endpoint}`,
                error
              );
              // Clean up expired subscriptions (410 Gone / 404 Not Found)
              if (error.statusCode === 410 || error.statusCode === 404) {
                await prisma.pushSubscription.delete({
                  where: { id: sub.id },
                }).catch((err) => {
                  console.error(`❌ Failed to delete stale subscription: ${sub.id}`, err);
                });
              }
            });
        });

        // Run asynchronously in the background
        Promise.all(pushPromises);
      }
    } catch (pushError) {
      console.error("❌ Push notification broadcast error:", pushError);
    }

    return notification;
  },
};
