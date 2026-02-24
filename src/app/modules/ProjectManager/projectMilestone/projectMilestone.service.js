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

export const ProjectMilestoneService = {
  createMilestone: async (prisma, payload, userId) => {
    await verifyProjectOwnership(prisma, payload.projectId, userId);

    const milestone = await prisma.projectMilestone.create({
      data: {
        ...payload,
        milestoneDate: new Date(payload.milestoneDate),
      },
    });

    await ActivityLogService.createLog(prisma, {
      type: "milestone",
      crudId: milestone.id,
      action: "create",
      userId,
      projectId: milestone.projectId,
    });

    return milestone;
  },

  getAllMilestones: async (prisma, projectId, userId) => {
    await verifyProjectOwnership(prisma, projectId, userId);

    return prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: { milestoneDate: "asc" },
    });
  },

  getSingleMilestone: async (prisma, id, userId) => {
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            description: true,
            name: true,
            vendorName: true,
            managerId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !milestone ||
      milestone.project.managerId !== userId ||
      milestone.project.deletedAt !== null
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Milestone not found or access denied",
      );
    }

    return milestone;
  },

  updateMilestone: async (prisma, id, payload, userId) => {
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id },
      include: { project: true },
    });

    if (
      !milestone ||
      milestone.project.managerId !== userId ||
      milestone.project.deletedAt !== null
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Milestone not found or access denied",
      );
    }

    const updateData = { ...payload };
    if (payload.milestoneDate)
      updateData.milestoneDate = new Date(payload.milestoneDate);

    const updatedMilestone = await prisma.projectMilestone.update({
      where: { id },
      data: updateData,
    });

    await ActivityLogService.createLog(prisma, {
      type: "milestone",
      crudId: id,
      action: "update",
      userId,
      projectId: milestone.projectId,
    });

    return updatedMilestone;
  },

  deleteMilestone: async (prisma, id, userId) => {
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id },
      include: { project: true },
    });

    if (
      !milestone ||
      milestone.project.managerId !== userId ||
      milestone.project.deletedAt !== null
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Milestone not found or access denied",
      );
    }

    const deletedMilestone = await prisma.projectMilestone.delete({
      where: { id },
    });

    await ActivityLogService.createLog(prisma, {
      type: "milestone",
      crudId: id,
      action: "delete",
      userId,
      projectId: milestone.projectId,
    });

    return deletedMilestone;
  },
};
