import cron from "node-cron";
import prisma from "../prisma/client.js";
import { PMProjectManagementService } from "../modules/ProjectManager/project_management/project_management.service.js";
import { ProjectMeetingService } from "../modules/ProjectManager/projectMeeting/projectMeeting.service.js";
import { RaiddService } from "../modules/ProjectManager/raiddManagement/raidd.service.js";
import { ProjectDocumentService } from "../modules/ProjectManager/projectDocument/projectDocument.service.js";
import { ClientService } from "../modules/ProjectManager/clientManagement/client.service.js";

import { ClientEmailService } from "../modules/ProjectManager/emailManagement/clientEmail/clientEmail.service.js";
import { OutlookSyncService } from "../modules/ProjectManager/outlookManagement/outlook/outlookSync.service.js";
import { LessonLearnService } from "../modules/ProjectManager/leasonLearn/leasonLearn.service.js";

/**
 * Initialize AI sync cron job
 * Runs every 15 minutes
 */
export const initAiSyncCron = () => {
    // Schedule task to run every 15 minutes
    // Cron expression: minute, hour, day of month, month, day of week
    cron.schedule("0 0 * * 0", async () => {
        console.log("-----------------start ai sync------------------------");
        console.log(`[${new Date().toISOString()}] Starting Bulk AI Sync Cron Job...`);
        try {
            // 1. Sync Meetings (All projects)
            console.log("Syncing Meetings AI Summary...🍊");
            await ProjectMeetingService.syncAiMeetingSummary(prisma, null);

            // 2. Sync Projects (All projects)
            console.log("Syncing Projects AI Summary & Progress...🛑");
            const projectsData = await PMProjectManagementService.syncAllProjectsFromAi(prisma);

            // 2.5 Sync Documents (All documents)
            console.log("Syncing Documents AI Summary...📄");
            await ProjectDocumentService.syncAllDocumentsFromAi(prisma);

            // 3. Sync RAIDD (All projects) - reusing project data if available
            // console.log("Syncing RAIDD AI Data...🚄");
            // await RaiddService.syncAllRaiddFromAi(prisma, projectsData);

            // 3.5 Sync Lesson Learns (All active projects)
            console.log("Syncing Lesson Learns AI Data...🧠");
            await LessonLearnService.syncAllLessonLearnsFromAi(prisma);

            // 4. Sync Clients (All clients)
            console.log("Syncing Clients AI Summary...🏪");
            await ClientService.syncAllClientsFromAi(prisma);

            // 5. Sync Emails & Outlook (Daily checks)
            console.log("Syncing Gmail & Outlook AI Summaries...📧");
            await ClientEmailService.syncAllEmailsFromAi(prisma);
            await OutlookSyncService.syncAllOutlooksFromAi(prisma);

            console.log(`[${new Date().toISOString()}] Bulk AI Sync Cron Job completed successfully.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Bulk AI Sync Cron Job failed:`, error.message);
        }
        console.log("----------------end ai sync-------------------------");
    });

  console.log("✅ AI Sync Cron Job scheduled successfully (runs every 7 days at 12:00 AM)");
};
