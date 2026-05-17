import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";
import { ActivityLogService } from "../../activityLog/activityLog.service.js";
import axios from "axios";
import { envVars } from "../../../config/env.js";

const verifyProjectOwnership = async (prisma, projectId, userId) => {
    const project = await prisma.project.findFirst({
        where: { id: projectId, managerId: userId, deletedAt: null },
        include: {
            manager: {
                select: { id: true, firstName: true, lastName: true, email: true }
            }
        }
    });
    if (!project) {
        throw new AppError(
            StatusCodes.FORBIDDEN,
            "You do not have access to this project",
        );
    }
    return project;
};

export const RaiddService = {
    createRaidd: async (prisma, payload, userId) => {
        const { aiDetectionId, type, approveAll, items, ...raiddData } = payload;
        const project = await verifyProjectOwnership(prisma, raiddData.projectId, userId);

        let aiDetection = null;
        if (aiDetectionId) {
            aiDetection = await prisma.aiDetection.findUnique({
                where: { id: aiDetectionId }
            });
        }

        // --- 1. HANDLE APPROVE ALL FLOW ---
        if (approveAll && aiDetectionId) {
            if (!aiDetection || !aiDetection.raiddData) {
                throw new AppError(StatusCodes.NOT_FOUND, "AI Detection record not found or has no RAIDD data to approve");
            }
            const raiddFlags = aiDetection.raiddData;
            const createdRaidds = [];
            
            const mapping = [
                { key: "risks", type: "RISK", label: "Risk" },
                { key: "assumptions", type: "ASSUMPTION", label: "Assumption" },
                { key: "issues", type: "ISSUE", label: "Issue" },
                { key: "dependencies", type: "DEPENDENCY", label: "Dependency" },
                { key: "decisions", type: "DECISION", label: "Decision" }
            ];

            for (const { key, type: itemType, label } of mapping) {
                const flagItems = raiddFlags[key];
                if (Array.isArray(flagItems)) {
                    for (const rawItem of flagItems) {
                        const itemText = (typeof rawItem === 'object' && rawItem !== null) ? (rawItem.data || rawItem.description || rawItem.text || "") : rawItem;
                        if (typeof itemText !== 'string' || itemText.trim() === '') continue;
                        
                        const raidd = await prisma.raidd.create({
                            data: {
                                projectId: raiddData.projectId,
                                title: `AI Detected ${label}`,
                                description: itemText,
                                type: [itemType],
                                status: "MEDIUM",
                                aiDetectionId,
                                created_by: userId
                            }
                        });
                        createdRaidds.push(raidd);
                        
                        await ActivityLogService.createLog(prisma, {
                            type: "raidd",
                            crudId: raidd.id,
                            action: "create",
                            userId,
                            projectId: raidd.projectId,
                        });
                    }
                }
            }

            // Sync all to individual items
            await RaiddService.syncIndividualItems(prisma, raiddData.projectId, raiddFlags, null, { aiDetectionId });

            // Auto-delete AI Detection after approving all
            await prisma.aiDetection.delete({
                where: { id: aiDetectionId }
            });
            console.log(`[RAIDD Approve All] Auto-deleted full AI Detection record after approving all: ${aiDetectionId}`);

            return createdRaidds;
        }

        // --- 2. HANDLE BATCH MULTIPLE SELECT FLOW ---
        if (Array.isArray(items) && items.length > 0) {
            const createdRaidds = [];
            const syncedFlags = {
                risks: [],
                assumptions: [],
                issues: [],
                dependencies: [],
                decisions: []
            };

            for (const item of items) {
                const itemType = item.type;
                const rawDescription = item.description;
                const itemDescription = (typeof rawDescription === 'object' && rawDescription !== null) ? (rawDescription.data || rawDescription.description || rawDescription.text || "") : rawDescription;
                if (!itemType || !itemDescription) continue;

                let label = "Item";
                if (itemType === "RISK") { label = "Risk"; syncedFlags.risks.push(itemDescription); }
                else if (itemType === "ASSUMPTION") { label = "Assumption"; syncedFlags.assumptions.push(itemDescription); }
                else if (itemType === "ISSUE") { label = "Issue"; syncedFlags.issues.push(itemDescription); }
                else if (itemType === "DEPENDENCY") { label = "Dependency"; syncedFlags.dependencies.push(itemDescription); }
                else if (itemType === "DECISION") { label = "Decision"; syncedFlags.decisions.push(itemDescription); }

                const raidd = await prisma.raidd.create({
                    data: {
                        projectId: raiddData.projectId,
                        title: item.title || `AI Detected ${label}`,
                        description: itemDescription,
                        type: [itemType],
                        status: "MEDIUM",
                        aiDetectionId: aiDetectionId || undefined,
                        created_by: userId
                    }
                });
                createdRaidds.push(raidd);

                await ActivityLogService.createLog(prisma, {
                    type: "raidd",
                    crudId: raidd.id,
                    action: "create",
                    userId,
                    projectId: raidd.projectId,
                });
            }

            // Sync these approved items to their respective models
            await RaiddService.syncIndividualItems(prisma, raiddData.projectId, syncedFlags, null, { aiDetectionId });

            // Clean up the approved items from the AI Detection record
            if (aiDetectionId && aiDetection && aiDetection.raiddData) {
                let newRaiddData = { ...aiDetection.raiddData };
                let newRaiddAnalysis = aiDetection.raiddAnalysis ? [...aiDetection.raiddAnalysis] : [];
                
                for (const item of items) {
                    const itemType = item.type;
                    const rawDescription = item.description;
                    const itemDescription = (typeof rawDescription === 'object' && rawDescription !== null) ? (rawDescription.data || rawDescription.description || rawDescription.text || "") : rawDescription;
                    if (!itemDescription) continue;

                    let raiddKey = "";
                    let categoryToRemove = "";
                    switch (itemType) {
                        case "RISK": raiddKey = "risks"; categoryToRemove = "Risk"; break;
                        case "ASSUMPTION": raiddKey = "assumptions"; categoryToRemove = "Assumption"; break;
                        case "ISSUE": raiddKey = "issues"; categoryToRemove = "Issue"; break;
                        case "DEPENDENCY": raiddKey = "dependencies"; categoryToRemove = "Dependency"; break;
                        case "DECISION": raiddKey = "decisions"; categoryToRemove = "Decision"; break;
                    }

                    if (raiddKey && newRaiddData[raiddKey]) {
                        if (Array.isArray(newRaiddData[raiddKey])) {
                            newRaiddData[raiddKey] = newRaiddData[raiddKey].filter(raw => {
                                const desc = (typeof raw === 'object' && raw !== null) ? (raw.data || raw.description || raw.text || "") : raw;
                                return desc !== itemDescription;
                            });
                            if (newRaiddData[raiddKey].length === 0) {
                                delete newRaiddData[raiddKey];
                                newRaiddAnalysis = newRaiddAnalysis.filter(cat => cat !== categoryToRemove);
                            }
                        }
                    }
                }

                // Check if anything is left
                const hasLeftoverData = Object.keys(newRaiddData).some(key => Array.isArray(newRaiddData[key]) && newRaiddData[key].length > 0);

                if (!hasLeftoverData) {
                    await prisma.aiDetection.delete({
                        where: { id: aiDetectionId }
                    });
                    console.log(`[RAIDD Batch Creation] Auto-deleted full AI Detection record after all items approved: ${aiDetectionId}`);
                } else {
                    await prisma.aiDetection.update({
                        where: { id: aiDetectionId },
                        data: {
                            raiddData: newRaiddData,
                            raiddAnalysis: newRaiddAnalysis
                        }
                    });
                    console.log(`[RAIDD Batch Creation] Updated AI Detection record: removed selected items for ${aiDetectionId}`);
                }
            }

            return createdRaidds;
        }

        // --- 3. FALLBACK TO LEGACY SINGLE/MULTI-TYPE FLOW ---
        const typesToCreate = Array.isArray(type) ? type : [type];
        let description = raiddData.description;

        // Try to get description from the specific AI Detection record if aiDetectionId is provided
        if (!description && aiDetection && aiDetection.raiddData && typeof aiDetection.raiddData === 'object') {
            const raiddFlags = aiDetection.raiddData;
            if (raiddFlags && typeof raiddFlags === 'object') {
                let aiItems = [];
                for (const t of typesToCreate) {
                    let flagItems = [];
                    switch (t) {
                        case "RISK": flagItems = raiddFlags.risks || raiddFlags.Risk || raiddFlags.projectRisks; break;
                        case "ASSUMPTION": flagItems = raiddFlags.assumptions || raiddFlags.Assumption || raiddFlags.projectAssumptions; break;
                        case "ISSUE": flagItems = raiddFlags.issues || flagItems.Issue || raiddFlags.projectIssues; break;
                        case "DEPENDENCY": flagItems = raiddFlags.dependencies || raiddFlags.Dependency || raiddFlags.projectDependencies; break;
                        case "DECISION": flagItems = raiddFlags.decisions || raiddFlags.Decision || raiddFlags.projectDecisions; break;
                    }
                    if (Array.isArray(flagItems)) {
                        aiItems = [...aiItems, ...flagItems];
                    }
                }
                if (aiItems.length > 0) {
                    const validItems = aiItems
                        .map(i => (typeof i === 'object' && i !== null) ? (i.data || i.description || i.text || "") : i)
                        .filter(i => typeof i === 'string' && i.trim() !== '');
                    if (validItems.length > 0) {
                        description = validItems.map(item => `- ${item}`).join('\n');
                    }
                }
            }
        }

        // Try to get description from project's saved AI details if not provided in payload or AI Detection record
        if (!description && project.projectAiDetails && typeof project.projectAiDetails === 'object') {
            const raiddFlags = project.projectAiDetails.raiddFlags;
            if (raiddFlags && typeof raiddFlags === 'object') {
                let aiItems = [];
                for (const t of typesToCreate) {
                    let flagItems = [];
                    switch (t) {
                        case "RISK": flagItems = raiddFlags.risks; break;
                        case "ASSUMPTION": flagItems = raiddFlags.assumptions; break;
                        case "ISSUE": flagItems = raiddFlags.issues; break;
                        case "DEPENDENCY": flagItems = raiddFlags.dependencies; break;
                        case "DECISION": flagItems = raiddFlags.decisions; break;
                    }
                    if (Array.isArray(flagItems)) {
                        aiItems = [...aiItems, ...flagItems];
                    }
                }
                if (aiItems.length > 0) {
                    const validItems = aiItems
                        .map(i => (typeof i === 'object' && i !== null) ? (i.data || i.description || i.text || "") : i)
                        .filter(i => typeof i === 'string' && i.trim() !== '');
                    if (validItems.length > 0) {
                        description = validItems.map(item => `- ${item}`).join('\n');
                    }
                }
            }
        }

        const createdRaidd = await prisma.raidd.create({
            data: {
                ...raiddData,
                description: description || raiddData.description,
                type: typesToCreate,
                assumptionValidationDueDate: raiddData.assumptionValidationDueDate ? new Date(raiddData.assumptionValidationDueDate) : undefined,
                decisionDueDate: raiddData.decisionDueDate ? new Date(raiddData.decisionDueDate) : undefined,
                aiDetectionId: aiDetectionId || undefined,
                created_by: userId,
            }
        });

        await ActivityLogService.createLog(prisma, {
            type: "raidd",
            crudId: createdRaidd.id,
            action: "create",
            userId,
            projectId: createdRaidd.projectId,
        });

        // Trigger AI sync for THIS specific raidd record without awaiting it
        RaiddService.syncSingleRaiddFromAi(prisma, createdRaidd.id, userId).catch(error => {
            console.error("Background AI Sync for RAIDD failed:", error.message);
        });

        if (aiDetection) {
            try {
                let newRaiddData = aiDetection.raiddData ? { ...aiDetection.raiddData } : null;
                let newRaiddAnalysis = aiDetection.raiddAnalysis ? (Array.isArray(aiDetection.raiddAnalysis) ? [ ...aiDetection.raiddAnalysis ] : aiDetection.raiddAnalysis) : null;
                let newFullAiResponse = aiDetection.fullAiResponse ? JSON.parse(JSON.stringify(aiDetection.fullAiResponse)) : null;

                for (const t of typesToCreate) {
                    let raiddKey = "";
                    let categoryToRemove = "";
                    switch (t) {
                        case "RISK": raiddKey = "risks"; categoryToRemove = "Risk"; break;
                        case "ASSUMPTION": raiddKey = "assumptions"; categoryToRemove = "Assumption"; break;
                        case "ISSUE": raiddKey = "issues"; categoryToRemove = "Issue"; break;
                        case "DEPENDENCY": raiddKey = "dependencies"; categoryToRemove = "Dependency"; break;
                        case "DECISION": raiddKey = "decisions"; categoryToRemove = "Decision"; break;
                    }

                    if (raiddKey) {
                        // 1. Update raiddData
                        if (newRaiddData && typeof newRaiddData === 'object') {
                            if (newRaiddData[raiddKey] !== undefined) delete newRaiddData[raiddKey];
                            if (newRaiddData[categoryToRemove] !== undefined) delete newRaiddData[categoryToRemove];
                            if (newRaiddData[categoryToRemove.toLowerCase()] !== undefined) delete newRaiddData[categoryToRemove.toLowerCase()];
                        }

                        // 2. Update raiddAnalysis array
                        if (Array.isArray(newRaiddAnalysis)) {
                            newRaiddAnalysis = newRaiddAnalysis.filter(item => 
                                typeof item === 'string' &&
                                item.toLowerCase() !== categoryToRemove.toLowerCase() &&
                                item.toLowerCase() !== raiddKey.toLowerCase()
                            );
                        }

                        // 3. Update fullAiResponse
                        if (newFullAiResponse) {
                            if (newFullAiResponse.raiddAnalysis) {
                                if (typeof newFullAiResponse.raiddAnalysis === 'object' && !Array.isArray(newFullAiResponse.raiddAnalysis)) {
                                    delete newFullAiResponse.raiddAnalysis[raiddKey];
                                    delete newFullAiResponse.raiddAnalysis[categoryToRemove];
                                } else if (Array.isArray(newFullAiResponse.raiddAnalysis)) {
                                    newFullAiResponse.raiddAnalysis = newFullAiResponse.raiddAnalysis.filter(item => 
                                        typeof item === 'string' &&
                                        item.toLowerCase() !== categoryToRemove.toLowerCase() &&
                                        item.toLowerCase() !== raiddKey.toLowerCase()
                                    );
                                }
                            }
                            
                            if (Array.isArray(newFullAiResponse.category)) {
                                newFullAiResponse.category = newFullAiResponse.category.filter(item => 
                                    typeof item === 'string' &&
                                    item.toLowerCase() !== categoryToRemove.toLowerCase() &&
                                    item.toLowerCase() !== raiddKey.toLowerCase()
                                );
                            }

                            if (newFullAiResponse[raiddKey] !== undefined) delete newFullAiResponse[raiddKey];
                        }
                    }
                }

                // Clean up empty objects/arrays
                if (newRaiddData && Object.keys(newRaiddData).length === 0) newRaiddData = null;
                if (newRaiddAnalysis && Array.isArray(newRaiddAnalysis) && newRaiddAnalysis.length === 0) newRaiddAnalysis = null;

                // Only delete if EVERYTHING is gone
                if (!newRaiddData && (!newRaiddAnalysis || newRaiddAnalysis.length === 0)) {
                    await prisma.aiDetection.delete({
                        where: { id: aiDetectionId },
                    });
                    console.log(`[RAIDD Creation] Auto-deleted full AI Detection record: ${aiDetectionId}`);
                } else {
                    await prisma.aiDetection.update({
                        where: { id: aiDetectionId },
                        data: {
                            raiddData: newRaiddData || {},
                            raiddAnalysis: newRaiddAnalysis || [],
                            fullAiResponse: newFullAiResponse
                        }
                    });
                    console.log(`[RAIDD Creation] Updated AI Detection record: removed selected types for ${aiDetectionId}`);
                }
            } catch (error) {
                console.error("Error auto-deleting/updating AI Detection after RAIDD creation:", error);
            }
        }

        // Populate individual models if we derived description from AI details
        if (project.projectAiDetails && typeof project.projectAiDetails === 'object' && project.projectAiDetails.raiddFlags) {
            await RaiddService.populateIndividualRaiddItems(prisma, createdRaidd.projectId, createdRaidd.id, project.projectAiDetails.raiddFlags, typesToCreate);
        }

        return createdRaidd;
    },
    getAllRaidds: async (prisma, projectId, userId) => {
        await verifyProjectOwnership(prisma, projectId, userId);

        const raidds = await prisma.raidd.findMany({
            where: { projectId, deleted_at: null },
            include: {
                project: {
                    select: {
                        name: true,
                        description: true,
                        clientName: true,
                        startDate: true,
                        endDate: true,
                        client: {
                            select: {
                                name: true,
                                email: true,
                                designation: true,
                                numberOfProjects: true,
                            },
                        },
                        manager: {
                            select: {
                                avatarUrl: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        projectAiDetails: true,
                        weeklySummaryDate: true,
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });

        return raidds.map(raidd => ({
            ...raidd,
            raisedBy: raidd.project?.manager ?? null,
        }));
    },

    getSingleRaidd: async (prisma, id, userId) => {
        const raidd = await prisma.raidd.findUnique({
            where: { id },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        clientName: true,
                        managerId: true,
                        deletedAt: true,
                        client: {
                            select: {
                                name: true,
                                email: true,
                                designation: true,
                                numberOfProjects: true,
                            },
                        },
                        manager: {
                            select: {
                                avatarUrl: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        projectAiDetails: true,
                        weeklySummaryDate: true,
                    },
                },
            },
        });

        if (
            !raidd ||
            raidd.project.managerId !== userId ||
            raidd.project.deletedAt !== null ||
            raidd.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "RAIDD record not found or access denied",
            );
        }

        return {
            ...raidd,
            raisedBy: raidd.project?.manager ?? null,
        };
    },

    updateRaidd: async (prisma, id, payload, userId) => {
        const raidd = await prisma.raidd.findUnique({
            where: { id },
            include: { project: true },
        });

        if (
            !raidd ||
            raidd.project.managerId !== userId ||
            raidd.project.deletedAt !== null ||
            raidd.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "RAIDD record not found or access denied",
            );
        }

        const updatedRaidd = await prisma.raidd.update({
            where: { id },
            data: {
                ...payload,
                assumptionValidationDueDate: payload.assumptionValidationDueDate ? new Date(payload.assumptionValidationDueDate) : undefined,
                decisionDueDate: payload.decisionDueDate ? new Date(payload.decisionDueDate) : undefined,
                updated_by: userId,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "raidd",
            crudId: id,
            action: "update",
            userId,
            projectId: raidd.projectId,
        });

        return updatedRaidd;
    },

    deleteRaidd: async (prisma, id, userId) => {
        const raidd = await prisma.raidd.findUnique({
            where: { id },
            include: { project: true },
        });

        if (
            !raidd ||
            raidd.project.managerId !== userId ||
            raidd.project.deletedAt !== null ||
            raidd.deleted_at !== null
        ) {
            throw new AppError(
                StatusCodes.FORBIDDEN,
                "RAIDD record not found or access denied",
            );
        }

        const deletedRaidd = await prisma.raidd.update({
            where: { id },
            data: {
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });

        await ActivityLogService.createLog(prisma, {
            type: "raidd",
            crudId: id,
            action: "delete",
            userId,
            projectId: raidd.projectId,
        });

        return deletedRaidd;
    },

    getAllMyRaidds: async (prisma, userId) => {
        return prisma.raidd.findMany({
            where: {
                project: {
                    managerId: userId,
                    deletedAt: null,
                },
                deleted_at: null,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        clientName: true,
                        startDate: true,
                        endDate: true,
                        client: {
                            select: {
                                name: true,
                                email: true,
                                numberOfProjects: true,
                            },
                        },
                        projectAiDetails: true,
                        weeklySummaryDate: true,
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });
    },

    syncSingleRaiddFromAi: async (prisma, raiddId, userId) => {
        console.log(`[RAIDD AI Sync] Sync for RAIDD ${raiddId} is now handled via AI Push API.`);
    },

    syncAllRaiddFromAi: async (prisma, projectsDataInput = null) => {
        console.log("[RAIDD AI Sync] Bulk sync is now handled via AI Push API.");
    },

    syncRaiddsForProjectFromAi: async (prisma, projectId, userId) => {
        try {
            console.log(`[RAIDD AI Sync] Sync for project ${projectId} is now handled via AI Push API.`);
            return;
        } catch (error) {
            console.error("RAIDD AI Sync failed:", error.message);
        }
    },

    syncIndividualItems: async (prisma, projectId, raiddFlags, raiddId = null, sourceIds = {}) => {
        try {
            const { emailId, outlookId, aiDetectionId } = sourceIds;
            const models = [
                { type: "RISK", key: "risks", model: "projectRisk" },
                { type: "ASSUMPTION", key: "assumptions", model: "projectAssumption" },
                { type: "ISSUE", key: "issues", model: "projectIssue" },
                { type: "DEPENDENCY", key: "dependencies", model: "projectDependency" },
                { type: "DECISION", key: "decisions", model: "projectDecision" }
            ];

            for (const { key, model } of models) {
                const items = raiddFlags[key];

                if (Array.isArray(items) && items.length > 0) {
                    for (const rawItem of items) {
                        const itemData = (typeof rawItem === 'object' && rawItem !== null) ? (rawItem.data || rawItem.description || rawItem.text || "") : rawItem;
                        if (typeof itemData !== 'string' || itemData.trim() === '') continue;

                        // Check for duplicate in the context of this project and data
                        let exists = await prisma[model].findFirst({ where: { projectId, data: itemData } });

                        // If not found, check if there is an unassociated email/outlook record with the same data
                        if (!exists) {
                            exists = await prisma[model].findFirst({
                                where: {
                                    data: itemData,
                                    projectId: null,
                                    OR: [
                                        emailId ? { emailId } : undefined,
                                        outlookId ? { outlookId } : undefined,
                                        aiDetectionId ? { aiDetectionId } : undefined
                                    ].filter(Boolean)
                                }
                            });
                        }

                        if (exists) {
                            // Update links if they are missing
                            const updateData = {};
                            if (projectId && !exists.projectId) updateData.projectId = projectId;
                            if (raiddId && !exists.raiddId) updateData.raiddId = raiddId;
                            if (emailId && !exists.emailId) updateData.emailId = emailId;
                            if (outlookId && !exists.outlookId) updateData.outlookId = outlookId;
                            if (aiDetectionId && !exists.aiDetectionId) updateData.aiDetectionId = aiDetectionId;

                            if (Object.keys(updateData).length > 0) {
                                await prisma[model].update({
                                    where: { id: exists.id },
                                    data: updateData
                                });
                            }
                        } else {
                            await prisma[model].create({
                                data: {
                                    projectId,
                                    raiddId: raiddId || undefined,
                                    emailId: emailId || undefined,
                                    outlookId: outlookId || undefined,
                                    aiDetectionId: aiDetectionId || undefined,
                                    data: itemData
                                }
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`[RAIDD Individual Sync] Failed to sync individual models:`, err.message);
        }
    },

    populateIndividualRaiddItems: async (prisma, projectId, raiddId, raiddFlags, types) => {
        // Filtering flags based on types if necessary, but usually we just sync all available flags
        await RaiddService.syncIndividualItems(prisma, projectId, raiddFlags, raiddId);
    }
};
