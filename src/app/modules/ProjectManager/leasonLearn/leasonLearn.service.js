import { StatusCodes } from "http-status-codes";
import axios from "axios";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import { envVars } from "../../../config/env.js";

const verifyProjectOwnership = async (prisma, projectId, userId) => {
    const project = await prisma.project.findFirst({
        where: { id: projectId, managerId: userId, deletedAt: null },
    });
    if (!project) {
        throw new AppError(
            StatusCodes.FORBIDDEN,
            "You do not have access to this project"
        );
    }
    return project;
};

export const LessonLearnService = {
    createLessonLearn: async (prisma, payload, userId) => {
        await verifyProjectOwnership(prisma, payload.projectId, userId);

        const lessonLearn = await prisma.lessonLearn.create({
            data: {
                ...payload,
                loggedDate: payload.loggedDate ? new Date(payload.loggedDate) : new Date(),
                created_by: userId,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "lessonLearn",
            crudId: lessonLearn.id,
            action: "create",
            userId,
            projectId: lessonLearn.projectId,
        });

        return lessonLearn;
    },

    syncLessonLearnForProject: async (prisma, project, userId) => {
        try {
            const apiUrl = `${envVars.AI_CHATBOT_API}/insights/lessons-learned`;
            console.log(`[AI sync] Calling AI API for project ${project.id}: ${apiUrl}`);
            
            const response = await axios.post(apiUrl, {
                project_id: project.id
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 1 minute timeout
            });

            const aiData = response.data;

            if (aiData) {
                // Check if a record already exists to avoid duplication if called multiple times
                const existing = await prisma.lessonLearn.findFirst({
                    where: { projectId: project.id, deleted_at: null }
                });

                if (existing) {
                    await prisma.lessonLearn.update({
                        where: { id: existing.id },
                        data: {
                            projectName: project.name,
                            current_situation_summary: aiData.current_situation_summary,
                            historical_insights: aiData.historical_insights,
                            actionable_warnings: aiData.actionable_warnings,
                            status: aiData.status,
                            aiResponse: aiData,
                            updated_by: userId,
                            description: aiData.current_situation_summary || existing.description
                        }
                    });
                    return existing;
                } else {
                    const lessonLearn = await prisma.lessonLearn.create({
                        data: {
                            projectId: project.id,
                            projectName: project.name,
                            current_situation_summary: aiData.current_situation_summary,
                            historical_insights: aiData.historical_insights,
                            actionable_warnings: aiData.actionable_warnings,
                            status: aiData.status,
                            aiResponse: aiData,
                            created_by: userId,
                            loggedDate: new Date(),
                            source: "AI Generated",
                            title: `AI Insight for ${project.name}`,
                            description: aiData.current_situation_summary || "Automated AI insight generation"
                        }
                    });

                    await ActivityLogService.createLog(prisma, {
                        type: "lessonLearn",
                        crudId: lessonLearn.id,
                        action: "create",
                        userId,
                        projectId: project.id,
                    });

                    return lessonLearn;
                }
            }
        } catch (error) {
            console.error(`[AI sync] Error for project ${project.id}:`, error.response?.data || error.message);
            return null;
        }
    },

    getAllLessonLearns: async (prisma, userId) => {
        // 1. Fetch all active projects of the user
        const projects = await prisma.project.findMany({
            where: {
                managerId: userId,
                deletedAt: null,
            },
            include: {
                lessonLearns: {
                    where: { deleted_at: null }
                }
            }
        });

        const syncedLessonLearns = [];

        for (const project of projects) {
            let lessonLearn = project.lessonLearns[0];

            // 2. If no lesson learn record exists, sync with AI API
            if (!lessonLearn) {
                lessonLearn = await LessonLearnService.syncLessonLearnForProject(prisma, project, userId);
            }

            if (lessonLearn) {
                syncedLessonLearns.push({
                    ...lessonLearn,
                    project: {
                        id: project.id,
                        name: project.name,
                        managerId: project.managerId
                    }
                });
            }
        }

        return syncedLessonLearns;
    },

    getSingleLessonLearn: async (prisma, id, userId) => {
        const lessonLearn = await prisma.lessonLearn.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        managerId: true,
                        deletedAt: true,
                    },
                },
            },
        });

        if (
            !lessonLearn ||
            lessonLearn.project.managerId !== userId ||
            lessonLearn.project.deletedAt !== null ||
            lessonLearn.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "LessonLearn record not found or access denied"
            );
        }

        return lessonLearn;
    },

    updateLessonLearn: async (prisma, id, payload, userId) => {
        const lessonLearn = await prisma.lessonLearn.findUnique({
            where: { id },
            include: { project: true },
        });

        if (
            !lessonLearn ||
            lessonLearn.project.managerId !== userId ||
            lessonLearn.project.deletedAt !== null ||
            lessonLearn.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "LessonLearn record not found or access denied"
            );
        }
        
        let updateData = { ...payload, updated_by: userId };
        if (payload.loggedDate) {
            updateData.loggedDate = new Date(payload.loggedDate);
        }

        const updatedLessonLearn = await prisma.lessonLearn.update({
            where: { id },
            data: updateData,
        });

        await ActivityLogService.createLog(prisma, {
            type: "lessonLearn",
            crudId: id,
            action: "update",
            userId,
            projectId: lessonLearn.projectId,
        });

        return updatedLessonLearn;
    },

    deleteLessonLearn: async (prisma, id, userId) => {
        const lessonLearn = await prisma.lessonLearn.findUnique({
            where: { id },
            include: { project: true },
        });

        if (
            !lessonLearn ||
            lessonLearn.project.managerId !== userId ||
            lessonLearn.project.deletedAt !== null ||
            lessonLearn.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "LessonLearn record not found or access denied"
            );
        }

        const deletedLessonLearn = await prisma.lessonLearn.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "lessonLearn",
            crudId: id,
            action: "delete",
            userId,
            projectId: lessonLearn.projectId,
        });

        return deletedLessonLearn;
    },
};
