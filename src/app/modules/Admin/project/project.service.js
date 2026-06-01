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

            const totalTasks = projectData.tasks?.length || 0;
            const completedTasks = projectData.tasks?.filter(t => t.status === "COMPLETED").length || 0;
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            projectData.projectProgress = `${progressPercentage}%`;

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
        const queryBuilder = new QueryBuilder(query).filter().sort("-createdAt").paginate();

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
                    vendor: true,
                    milestones: true,
                },
            }),
            prisma.project.count({ where: buildQuery.where }),
        ]);

        const filteredData = result.map((project) => {
            const totalTasks = project.tasks?.length || 0;
            const completedTasks = project.tasks?.filter(t => t.status === "COMPLETED").length || 0;
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            project.projectProgress = `${progressPercentage}%`;
            return AdminProjectService.filterProjectForChatbot(project);
        });

        return {
            meta: queryBuilder.getMeta(total),
            data: filteredData,
        };
    },

    getProjectWithRaiddByIdForChatbot: async (prisma, id) => {
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
                vendor: true,
                milestones: true,
            },
        });

        if (!project) {
            const { AppError } = await import("../../../errorHelper/appError.js");
            const { StatusCodes } = await import("http-status-codes");
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        const totalTasks = project.tasks?.length || 0;
        const completedTasks = project.tasks?.filter(t => t.status === "COMPLETED").length || 0;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        project.projectProgress = `${progressPercentage}%`;

        return AdminProjectService.filterProjectForChatbot(project);
    },

    filterProjectForChatbot: (project) => {
        if (!project) return project;

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
                    transcriptMessage,
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

        // Remove AI related fields from RAIDD array and its nested aiDetection if they exist
        if (restProject.raidd && Array.isArray(restProject.raidd)) {
            restProject.raidd = restProject.raidd.map((r) => {
                const { generatedReply, ...restRaidd } = r;

                if (restRaidd.aiDetection) {
                    const { fullAiResponse, email, outlook, ...restAiDetection } = restRaidd.aiDetection;
                    restRaidd.aiDetection = restAiDetection;

                    // Clean nested email object
                    if (email) {
                        const { fullAiResponse: eFull, generatedReply: eGen, ...restEmail } = email;
                        restRaidd.aiDetection.email = restEmail;
                    }

                    // Clean nested outlook object
                    if (outlook) {
                        const { fullAiResponse: oFull, generatedReply: oGen, ...restOutlook } = outlook;
                        restRaidd.aiDetection.outlook = restOutlook;
                    }
                }
                return restRaidd;
            });
        }

        // Format vendor as an array under 'vendor' key for chatbot response
        const vendorArr = restProject.vendor ? [restProject.vendor] : [];
        restProject.vendor = vendorArr;
        if ('vendors' in restProject) {
            delete restProject.vendors;
        }

        return restProject;
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

        const totalTasks = projectData.tasks?.length || 0;
        const completedTasks = projectData.tasks?.filter(t => t.status === "COMPLETED").length || 0;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        projectData.projectProgress = `${progressPercentage}%`;

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

        const totalTasks = project.tasks?.length || 0;
        const completedTasks = project.tasks?.filter(t => t.status === "COMPLETED").length || 0;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        project.projectProgress = `${progressPercentage}%`;

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

            const totalTasks = project.tasks?.length || 0;
            const completedTasks = project.tasks?.filter(t => t.status === "COMPLETED").length || 0;
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            project.projectProgress = `${progressPercentage}%`;
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

        const totalTasks = project.tasks?.length || 0;
        const completedTasks = project.tasks?.filter(t => t.status === "COMPLETED").length || 0;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        project.projectProgress = `${progressPercentage}%`;
        return project;

    }

};
