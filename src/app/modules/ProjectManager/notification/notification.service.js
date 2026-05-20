import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

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
    if (meetingIds.length > 0) {
      const meetings = await prisma.projectMeeting.findMany({
        where: { id: { in: meetingIds } },
        include: { project: true },
      });
      meetingsMap = new Map(meetings.map((m) => [m.id, m]));
    }

    const mappedNotifications = notifications.map((n) => {
      const nObj = { ...n, meetingSummary: null, previousProjectSummary: null };
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

  // Internal: Create a notification

  createNotification: async (prisma, data) => {
    return prisma.notification.create({
      data,
    });
  },
};
