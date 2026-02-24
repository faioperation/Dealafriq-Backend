import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";

const verifyProjectOwnership = async (prisma, projectId, userId) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, managerId: userId, deletedAt: null },
  });
  if (!project) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You do not have access to this project",
    );
  }
  return project;
};

export const ProjectTaskService = {
  createTask: async (prisma, payload, userId) => {
    await verifyProjectOwnership(prisma, payload.projectId, userId);

    const task = await prisma.projectTask.create({
      data: {
        ...payload,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
      },
    });

    await ActivityLogService.createLog(prisma, {
      type: "task",
      crudId: task.id,
      action: "create",
      userId,
      projectId: task.projectId,
    });

    return task;
  },

  getAllTasks: async (prisma, projectId, userId) => {
    await verifyProjectOwnership(prisma, projectId, userId);

    return prisma.projectTask.findMany({
      where: { projectId },

      orderBy: { createdAt: "desc" },
    });
  },

  getSingleTask: async (prisma, id, userId) => {
    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            vendorName: true,
            managerId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !task ||
      task.project.managerId !== userId ||
      task.project.deletedAt !== null
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Task not found or access denied",
      );
    }

    return task;
  },

  updateTask: async (prisma, id, payload, userId) => {
    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: { project: true },
    });

    if (
      !task ||
      task.project.managerId !== userId ||
      task.project.deletedAt !== null
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Task not found or access denied",
      );
    }

    const updateData = { ...payload };
    if (payload.startDate) updateData.startDate = new Date(payload.startDate);
    if (payload.endDate) updateData.endDate = new Date(payload.endDate);

    const updatedTask = await prisma.projectTask.update({
      where: { id },
      data: updateData,
    });

    await ActivityLogService.createLog(prisma, {
      type: "task",
      crudId: id,
      action: "update",
      userId,
      projectId: task.projectId,
    });

    return updatedTask;
  },

  deleteTask: async (prisma, id, userId) => {
    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: { project: true },
    });

    if (
      !task ||
      task.project.managerId !== userId ||
      task.project.deletedAt !== null
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Task not found or access denied",
      );
    }

    const deletedTask = await prisma.projectTask.delete({
      where: { id },
    });

    await ActivityLogService.createLog(prisma, {
      type: "task",
      crudId: id,
      action: "delete",
      userId,
      projectId: task.projectId,
    });

    return deletedTask;
  },
};
