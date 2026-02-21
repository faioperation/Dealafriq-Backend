import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

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

    return prisma.projectMilestone.create({
      data: {
        ...payload,
        milestoneDate: new Date(payload.milestoneDate),
      },
    });
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

    return prisma.projectMilestone.update({
      where: { id },
      data: updateData,
    });
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

    return prisma.projectMilestone.delete({
      where: { id },
    });
  },
};
