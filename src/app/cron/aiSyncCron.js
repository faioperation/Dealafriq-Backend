import cron from "node-cron";
import prisma from "../prisma/client.js";
import { PMProjectManagementService } from "../modules/ProjectManager/project_management/project_management.service.js";
import { ProjectMeetingService } from "../modules/ProjectManager/projectMeeting/projectMeeting.service.js";
import { RaiddService } from "../modules/ProjectManager/raiddManagement/raidd.service.js";

/**
 * Initialize AI sync cron job
 * Runs every 15 minutes
 */
export const initAiSyncCron = () => {
    // Schedule task to run every 15 minutes
    // Cron expression: minute, hour, day of month, month, day of week
    cron.schedule("0 0 * * *", async () => {
        console.log("-----------------start ai sync------------------------");
        console.log(`[${new Date().toISOString()}] Starting Bulk AI Sync Cron Job...`);
        try {
            // 1. Sync Meetings (All projects)
            console.log("Syncing Meetings AI Summary...🍊");
            await ProjectMeetingService.syncAiMeetingSummary(prisma, null);

            // 2. Sync Projects (All projects)
            console.log("Syncing Projects AI Summary & Progress...🛑");
            const projectsData = await PMProjectManagementService.syncAllProjectsFromAi(prisma);

            // 3. Sync RAIDD (All projects) - reusing project data if available
            console.log("Syncing RAIDD AI Data...🚄");
            await RaiddService.syncAllRaiddFromAi(prisma, projectsData);

            console.log(`[${new Date().toISOString()}] Bulk AI Sync Cron Job completed successfully.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Bulk AI Sync Cron Job failed:`, error.message);
        }
        console.log("----------------end ai sync-------------------------");
    });

  console.log("✅ AI Sync Cron Job scheduled successfully (runs daily at 12:00 AM)");
};
