import { projectSearchableFields } from "../../../constant.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";

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
                    health: true,
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
                    health: true,
                    transcripts: true,
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
                    raidd: true,
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

    getSingleProject: async (prisma, id) => {
        const project = await prisma.project.findFirst({
            where: {
                id,
                deletedAt: null
            },
            include: {
                manager: {
                    select: {
                        firstName: true,
                        id: true,
                        lastName: true,
                        role: true,
                    },
                },
                assignTeam: true,
                tasks: true,
                milestones: true,
                health: true,
                documents: true,
                transcripts: true,
                meetings: {
                    include: {
                        keyPoints: true,
                        actionPoints: true,
                    },
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
            take: 1,
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
                milestones: true,
                health: true,
            },
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
                ...buildQuery.where,
                deletedAt: null,
                isPublic: true, // 🔥 important fix
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
                health: true,
            },
        });

        if (!project) {
            throw new AppError(StatusCodes.NOT_FOUND, "Project not found");
        }

        return project;
    }

};
