import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";

export const ProjectChatbotService = {
  // Create a new message
  createMessage: async (prisma, payload, userId) => {
    const message = await prisma.message.create({
      data: {
        userId,
        content: payload.content,
        sender: payload.sender,
        agentName: payload.agentName ?? null,
        documentUrl: payload.documentUrl ?? null,
        documentPath: payload.documentPath ?? null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await ActivityLogService.createLog(prisma, {
      type: "chatbot_message",
      crudId: message.id,
      action: "create",
      userId,
    });

    return message;
  },

  // Get ALL messages for the logged-in user (all senders)
  getMyMessages: async (prisma, userId) => {
    return prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  },

  // Get single message (must belong to the logged-in user)
  getSingleMessage: async (prisma, id, userId) => {
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!message || message.userId !== userId) {
      throw new AppError(StatusCodes.NOT_FOUND, "Message not found or access denied");
    }

    return message;
  },

  // Update message content / agentName (owner only)
  updateMessage: async (prisma, id, payload, userId) => {
    const message = await prisma.message.findUnique({ where: { id } });

    if (!message || message.userId !== userId) {
      throw new AppError(StatusCodes.NOT_FOUND, "Message not found or access denied");
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { ...payload },
    });

    await ActivityLogService.createLog(prisma, {
      type: "chatbot_message",
      crudId: id,
      action: "update",
      userId,
    });

    return updated;
  },

  // Delete a single message (owner only)
  deleteMessage: async (prisma, id, userId) => {
    const message = await prisma.message.findUnique({ where: { id } });

    if (!message || message.userId !== userId) {
      throw new AppError(StatusCodes.NOT_FOUND, "Message not found or access denied");
    }

    await ActivityLogService.createLog(prisma, {
      type: "chatbot_message",
      crudId: id,
      action: "delete",
      userId,
    });

    return prisma.message.delete({ where: { id } });
  },

  // Clear ALL messages for the logged-in user
  clearMyMessages: async (prisma, userId) => {
    const { count } = await prisma.message.deleteMany({ where: { userId } });

    await ActivityLogService.createLog(prisma, {
      type: "chatbot_message",
      crudId: userId,
      action: "clear",
      userId,
    });

    return { deleted: count };
  },
};
