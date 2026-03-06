export const ActivityLogService = {
    createLog: async (prisma, data) => {
        return prisma.activityLog.create({
            data: {
                type: data.type,
                crudId: data.crudId,
                action: data.action,
                userId: data.userId,
                projectId: data.projectId,
            },
        });
    },

    getAllLogs: async (prisma, query) => {
        const { status } = query;
        const where = {};

        if (status) {
            where.project = {
                status: status.toUpperCase(),
            };
        }

        const logs = await prisma.activityLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { timestamp: "desc" },
        });

        // Populate CRUD data dynamically
        return populateLogData(prisma, logs);
    },

    getProjectLogs: async (prisma, projectId, days = 7) => {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const logs = await prisma.activityLog.findMany({
            where: {
                projectId,
                type: { not: "project" }, // Exclude project creation/update logs
                timestamp: { gte: dateLimit },
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { timestamp: "desc" },
        });

        return populateLogData(prisma, logs);
    },

    getGroupedByProject: async (prisma, query) => {
        const { status } = query;
        const where = { deletedAt: null };

        if (status) {
            where.status = status.toUpperCase();
        }

        const projects = await prisma.project.findMany({
            where,
            include: {
                activityLogs: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { timestamp: "desc" },
                },
            },
        });

        return Promise.all(
            projects.map(async (project) => {
                const activities = await populateLogData(prisma, project.activityLogs);
                const { activityLogs, ...projectData } = project;
                return {
                    ...projectData,
                    activities,
                };
            })
        );
    },
};

const populateLogData = async (prisma, logs) => {
    return Promise.all(
        logs.map(async (log) => {
            let crudData = null;
            try {
                switch (log.type) {
                    case "project":
                        crudData = await prisma.project.findUnique({ where: { id: log.crudId } });
                        break;
                    case "task":
                        crudData = await prisma.projectTask.findUnique({ where: { id: log.crudId } });
                        break;
                    case "meeting":
                        crudData = await prisma.projectMeeting.findUnique({ where: { id: log.crudId } });
                        break;
                    case "document":
                        crudData = await prisma.projectDocumentUpload.findUnique({ where: { id: log.crudId } });
                        break;
                    case "milestone":
                        crudData = await prisma.projectMilestone.findUnique({ where: { id: log.crudId } });
                        break;
                    case "projectHealth":
                        crudData = await prisma.projectHealth.findMany({ where: { projectId: log.crudId } });
                        break;
                    case "ai-detection":
                        crudData = await prisma.aiDetection.findUnique({ where: { id: log.crudId } });
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.error(`Error fetching crudData for ${log.type} ${log.crudId}:`, error);
            }

            return {
                ...log,
                crudData,
            };
        })
    );
};
