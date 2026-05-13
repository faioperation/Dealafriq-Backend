import { projectSearchableFields } from "../../../constant.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { AppError } from "../../../errorHelper/appError.js";
import { StatusCodes } from "http-status-codes";

export const AdminProjectService = {
    getAllProjects: async (prisma, query) => {
        const relationConfig = {
            manager: ["firstName", "lastName", "email"],
            assignTeam: ["name"],
        };

        const queryBuilder = new QueryBuilder(query)
            .search(projectSearchableFields)
            .filter(relationConfig, { status: ["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"] })
            .sort("-createdAt", relationConfig)
            .paginate();

        const buildQuery = queryBuilder.build();
        buildQuery.where = {
            ...buildQuery.where,
            deletedAt: null
        };

        const [result, total] = await Promise.all([
            prisma.project.findMany({
                ...buildQuery,
                include: {
                    manager: {
                        select: {
                            firstName: true,
                            lastName: true,
                            id: true,
                            role: true,
                        },
                    },
                    assignTeam: true,
                    tasks: true,
                    milestones: true,
                    meetings: {
                        include: {
                            keyPoints: true,
                            actionPoints: true,
                        },
                    },
                    documents: {
                        include: {
                            keyPoints: true,
                            actionPoints: true,
                        },
                    },
                    transcripts: true,
                    weeklyAiSummaries: {
                        orderBy: { createdAt: 'desc' }
                    },
                },
            }),
            prisma.project.count({ where: buildQuery.where }),
        ]);

        return {
            meta: queryBuilder.getMeta(total),
            data: result,
        };
    },

    getAllProjectsWithRaidd: async (prisma, query) => {
        const relationConfig = {
            manager: ["firstName", "lastName", "email"],
            assignTeam: ["name"],
        };

        const queryBuilder = new QueryBuilder(query)
            .search(projectSearchableFields)
            .filter(relationConfig, { status: ["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"] })
            .sort("-createdAt", relationConfig)
            .paginate();

        const buildQuery = queryBuilder.build();
        buildQuery.where = {
            ...buildQuery.where,
            deletedAt: null
        };

        const [result, total] = await Promise.all([
            prisma.project.findMany({
                ...buildQuery,
                include: {
                    manager: {
                        select: {
                            firstName: true,
                            lastName: true,
                            id: true,
                            role: true,
                        },
                    },
                    assignTeam: true,
                    client: true,
                    raidd: {
                        include: {
                            aiDetection: {
                                include: {
                                    email: true,
                                    outlook: true
                                }
                            }
                        }
                    },
                    tasks: true,
                    meetings: {
                        include: {
                            keyPoints: true,
                            actionPoints: true,
                        },
                    },
                    weeklyAiSummaries: {
                        orderBy: { createdAt: 'desc' }
                    },
                },
            }),
            prisma.project.count({ where: buildQuery.where }),
        ]);

        // Transform data: "in a single object 1 project with 1 raidd"
        // Flattening the relation so that each object contains exactly one project and one RAIDD entry
        const flattenedData = result.flatMap((project) => {
            const { raidd, ...projectData } = project;

            if (!raidd || raidd.length === 0) {
                return [{ project: projectData, raidd: null }];
            }

            return raidd.map((r) => ({
                project: projectData,
                raidd: r,
            }));
        });

        // The meta count will reflect the original projects count, 
        // but data might be longer due to flattening.
        return {
            meta: queryBuilder.getMeta(total),
            data: flattenedData,
        };
    },

    getAllProjectsWithRaiddForChatbot: async (prisma, query) => {
        const result = await AdminProjectService.getAllProjectsWithRaidd(prisma, query);

        // Filter out "raw ai response" and other sensitive/unnecessary AI fields for chatbot
        const filteredData = result.data.map((item) => AdminProjectService.filterProjectDataForChatbot(item));

        return {
            ...result,
            data: filteredData,
        };
    },

    getProjectWithRaiddByIdForChatbot: async (prisma, id) => {
        const result = await AdminProjectService.getProjectWithRaiddById(prisma, id);

        // Filter out "raw ai response" and other sensitive/unnecessary AI fields for chatbot
        const filteredData = result.map((item) => AdminProjectService.filterProjectDataForChatbot(item));

        return filteredData;
    },

    filterProjectDataForChatbot: (item) => {
        const { project, raidd } = item;

        // Remove AI related fields from project
        const {
            projectAiDetails,
            projectAiSummary,
            weeklyAiSummaries,
            ...restProject
        } = project;

        // Remove AI related fields from meetings if they exist
        if (restProject.meetings && Array.isArray(restProject.meetings)) {
            restProject.meetings = restProject.meetings.map((meeting) => {
                const {
                    aiMeetingSummary,
                    transcriptData,
                    transcriptPath,
                    transcriptUrl,
                    ...restMeeting
                } = meeting;
                return restMeeting;
            });
        }

        // Remove AI related fields from client if it exists
        if (restProject.client) {
            const { clientAiResponse, ...restClient } = restProject.client;
            restProject.client = restClient;
        }

        // Remove AI related fields from RAIDD and its nested aiDetection if they exist
        let filteredRaidd = raidd;
        if (raidd) {
            const { generatedReply, ...restRaidd } = raidd;
            filteredRaidd = restRaidd;

            if (filteredRaidd.aiDetection) {
                const { fullAiResponse, email, outlook, ...restAiDetection } = filteredRaidd.aiDetection;
                filteredRaidd.aiDetection = restAiDetection;

                // Clean nested email object
                if (email) {
                    const { fullAiResponse: eFull, generatedReply: eGen, ...restEmail } = email;
                    filteredRaidd.aiDetection.email = restEmail;
                }

                // Clean nested outlook object
                if (outlook) {
                    const { fullAiResponse: oFull, generatedReply: oGen, ...restOutlook } = outlook;
                    filteredRaidd.aiDetection.outlook = restOutlook;
                }
            }
        }

        return {
            project: restProject,
            raidd: filteredRaidd,
        };
    },

    getProjectWithRaiddById: async (prisma, id) => {
        const project = await prisma.project.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            include: {
                manager: {
                    select: {
                        firstName: true,
                        lastName: true,
                        id: true,
                        role: true,
                    },
                },
                assignTeam: true,
                client: true,
                raidd: {
                    include: {
                        aiDetection: {
                            include: {
                                email: true,
                                outlook: true
                            }
                        }
                    }
                },
                tasks: true,
                meetings: {
                    include: {
                        keyPoints: true,
                        actionPoints: true,
                    },
                },
                weeklyAiSummaries: {
                    orderBy: { createdAt: 'desc' }
                },
                risks: true,
                assumptions: true,
                issues: true,
                decisions: true,
                dependencies: true,
            },
        });

        if (!project) {
            const { AppError } = await import("../../../errorHelper/appError.js");
            const { StatusCodes } = await import("http-status-codes");
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        const { raidd, ...projectData } = project;

        if (!raidd || raidd.length === 0) {
            return [{ project: projectData, raidd: null }];
        }

        return raidd.map((r) => ({
            project: projectData,
            raidd: r,
        }));
    },

    getSingleProject: async (prisma, id) => {
        const project = await prisma.project.findFirst({
            where: {
                id,
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                description: true,
                clientName: true,
                startDate: true,
                endDate: true,
                status: true,

                createdAt: true,
                updatedAt: true,
                projectProgress: true,

                manager: {
                    select: {
                        firstName: true,
                        id: true,
                        lastName: true,
                        role: true,
                    },
                },
                assignTeam: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        startDate: true,
                        endDate: true,
                    }
                },
                milestones: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        milestoneDate: true,
                    }
                },

            },
        });

        if (!project) {
            const { AppError } = await import("../../../errorHelper/appError.js");
            const { StatusCodes } = await import("http-status-codes");
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        return project;
    },

    getLatestThreeProjects: async (prisma, query = {}) => {
        const relationConfig = {
            manager: ["firstName", "lastName", "email"],
            assignTeam: ["name"],
        };

        const queryBuilder = new QueryBuilder(query)
            .search(projectSearchableFields)
            .filter(relationConfig, {
                status: [
                    "DRAFT",
                    "IN_PROGRESS",
                    "ONGOING",
                    "ON_HOLD",
                    "COMPLETED",
                    "CANCELLED",
                ],
            })
            .sort("-createdAt", relationConfig);

        const buildQuery = queryBuilder.build();
        const orderBy = buildQuery.orderBy || { createdAt: "desc" };

        const projects = await prisma.project.findMany({
            where: {
                ...buildQuery.where,
                deletedAt: null,
            },
            orderBy,
            take: 3,
            select: {
                id: true,
                name: true,
                description: true,
                clientName: true,
                startDate: true,
                endDate: true,
                status: true,
                projectProgress: true,
                cancelledReason: true,
                projectHealth: true,
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
                assignTeam: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                milestones: {
                    select: {
                        title: true,
                        description: true,
                        startDate: true,
                        milestoneDate: true,
                        status: true,
                        createdAt: true
                    }
                },
                tasks: {
                    select: {
                        title: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                        createdAt: true,
                        priority: true,
                        taskDescription: true,
                    },
                },
            },
        });
        // Compute task status breakdown for each project
        projects.forEach((project) => {
            const statusCounts = {
                PENDING: 0,
                IN_PROGRESS: 0,
                REVIEW: 0,
                COMPLETED: 0,
                CANCELLED: 0,
            };
            if (Array.isArray(project.tasks)) {
                project.tasks.forEach((t) => {
                    const s = t.status;
                    if (statusCounts.hasOwnProperty(s)) {
                        statusCounts[s]++;
                    }
                });
            }
            project.totalTask = statusCounts;
        });
        return projects;
    },

    getLatestPublicProject: async (prisma, query = {}) => {

        const relationConfig = {
            manager: ["firstName", "lastName", "email"],
            assignTeam: ["name"],
        };

        // Build query safely
        const queryBuilder = new QueryBuilder(query)
            .search(projectSearchableFields)
            .filter(relationConfig, {
                status: [
                    "DRAFT",
                    "IN_PROGRESS",
                    "ONGOING",
                    "ON_HOLD",
                    "COMPLETED",
                    "CANCELLED",
                ],
            })
            .sort("-createdAt", relationConfig);

        const buildQuery = queryBuilder.build();

        // Ensure safe orderBy fallback
        const orderBy =
            buildQuery.orderBy && Array.isArray(buildQuery.orderBy) && buildQuery.orderBy.length > 0
                ? buildQuery.orderBy
                : { createdAt: "desc" };

        const project = await prisma.project.findFirst({
            where: {
                deletedAt: null,
            },
            orderBy,
            include: {
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
                assignTeam: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                // ⚡ Keep minimal for performance (add more if needed)
                milestones: true,
                tasks: true,
                weeklyAiSummaries: {
                    orderBy: { createdAt: 'desc' }
                },
                // Compute task status breakdown
                // Will be added after fetching the project

            },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        // Compute status counts
        const statusCounts = {
            PENDING: 0,
            IN_PROGRESS: 0,
            REVIEW: 0,
            COMPLETED: 0,
            CANCELLED: 0,
        };
        if (project.tasks && Array.isArray(project.tasks)) {
            project.tasks.forEach((t) => {
                const s = t.status;
                if (statusCounts.hasOwnProperty(s)) {
                    statusCounts[s]++;
                }
            });
        }
        // Attach totalTask summary
        project.totalTask = statusCounts;
        return project;

    }

};
