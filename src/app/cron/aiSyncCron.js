import cron from "node-cron";
import prisma from "../prisma/client.js";
import axios from "axios";
import { envVars } from "../config/env.js";
import { LessonLearnService } from "../modules/ProjectManager/leasonLearn/leasonLearn.service.js";

const HEADER_CONFIG = {
    headers: {
        'Content-Type': 'application/json',
        "x-backend-service": envVars.INTERNAL_BACKEND_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
    }
};

// Initialize AI sync cron job
// Runs every 30 minutes: "*/30 * * * *"
export const initAiSyncCron = () => {
    // Schedule task to run every 30 minutes
    cron.schedule("*/30 * * * *", async () => {
        console.log("-----------------start 30m ai sync------------------------");
        console.log(`[${new Date().toISOString()}] Starting 30-Minute Active AI Sync Cron Job...`);
        
        try {
            // 1. Sync active Projects & Lesson Learns
            const activeProjects = await prisma.project.findMany({
                where: { deletedAt: null }
            });
            console.log(`[12h AI Sync] Found ${activeProjects.length} active projects for sync.`);
            for (const project of activeProjects) {
                const url = `${envVars.API_AI}/summary/project?id=${project.id}`;
                axios.post(url, {}, HEADER_CONFIG).catch(err => {
                    console.error(`[12h AI Sync] Project summary trigger failed for ${project.id}:`, err.message);
                });
                
                // Lesson Learn sync
                LessonLearnService.syncLessonLearnForProject(prisma, project, project.managerId).catch(err => {
                    console.error(`[12h AI Sync] Lesson Learn trigger failed for project ${project.id}:`, err.message);
                });
                
                await new Promise(r => setTimeout(r, 1000)); // Delay to prevent overloading
            }

            // 2. Sync active ProjectMeetings
            const activeMeetings = await prisma.projectMeeting.findMany({
                where: { deletedAt: null }
            });
            console.log(`[12h AI Sync] Found ${activeMeetings.length} active meetings for sync.`);
            for (const meeting of activeMeetings) {
                const url = `${envVars.API_AI}/summary/meeting?id=${meeting.id}`;
                axios.post(url, {}, HEADER_CONFIG).catch(err => {
                    console.error(`[12h AI Sync] Meeting summary trigger failed for ${meeting.id}:`, err.message);
                });
                await new Promise(r => setTimeout(r, 1000));
            }

            // 3. Sync active ProjectDocuments
            const activeDocuments = await prisma.projectDocument.findMany({
                where: { deletedAt: null }
            });
            console.log(`[12h AI Sync] Found ${activeDocuments.length} active documents for sync.`);
            for (const doc of activeDocuments) {
                const url = `${envVars.API_AI}/summary/document?id=${doc.id}`;
                axios.post(url, {}, HEADER_CONFIG).catch(err => {
                    console.error(`[12h AI Sync] Document summary trigger failed for ${doc.id}:`, err.message);
                });
                await new Promise(r => setTimeout(r, 1000));
            }

            // 4. Sync active Clients
            const activeClients = await prisma.client.findMany({
                where: { deletedAt: null }
            });
            console.log(`[12h AI Sync] Found ${activeClients.length} active clients for sync.`);
            for (const client of activeClients) {
                const url = `${envVars.API_AI}/summary/clients?id=${client.id}`;
                axios.post(url, {}, HEADER_CONFIG).catch(err => {
                    console.error(`[12h AI Sync] Client summary trigger failed for ${client.id}:`, err.message);
                });
                await new Promise(r => setTimeout(r, 1000));
            }

            // 5. Sync active Emails
            const activeEmails = await prisma.email.findMany({
                where: { deletedAt: null }
            });
            console.log(`[12h AI Sync] Found ${activeEmails.length} active emails for sync.`);
            for (const email of activeEmails) {
                const url = `${envVars.API_AI}/summary/emails?id=${email.id}`;
                axios.post(url, {}, HEADER_CONFIG).catch(err => {
                    console.error(`[12h AI Sync] Email summary trigger failed for ${email.id}:`, err.message);
                });
                await new Promise(r => setTimeout(r, 1000));
            }

            // 6. Sync active Outlooks
            const activeOutlooks = await prisma.outlook.findMany({
                where: { deletedAt: null }
            });
            console.log(`[12h AI Sync] Found ${activeOutlooks.length} active outlook records for sync.`);
            for (const outlook of activeOutlooks) {
                const url = `${envVars.API_AI}/summary/emails?id=${outlook.id}`;
                axios.post(url, {}, HEADER_CONFIG).catch(err => {
                    console.error(`[12h AI Sync] Outlook summary trigger failed for ${outlook.id}:`, err.message);
                });
                await new Promise(r => setTimeout(r, 1000));
            }

            console.log(`[${new Date().toISOString()}] 30-Minute AI Sync Cron Job trigger batch submitted.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] 30-Minute AI Sync Cron Job failed:`, error.message);
        }
        console.log("----------------end 30m ai sync-------------------------");
    });

    console.log("✅ 30-Minute AI Sync Cron Job scheduled successfully (runs every 30 minutes)");
};
