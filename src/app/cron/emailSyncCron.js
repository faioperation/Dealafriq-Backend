import cron from "node-cron";
import { EmailService } from "../modules/ProjectManager/emailManagement/email/email.service.js";

/**
 * Initialize email sync cron job
 * Runs every 30 minutes
 */
export const initEmailSyncCron = () => {
    // Schedule task to run every 30 minutes
    // Cron expression: minute, hour, day of month, month, day of week
    // cron.schedule("*/5 * * * *", async () => {
    cron.schedule("* * * * *", async () => {
        console.log("-----------------------------------------");
        console.log(`[${new Date().toISOString()}] Starting Email Sync Cron Job...`);
        try {
            await EmailService.syncAllConnectedAccounts();
            console.log(`[${new Date().toISOString()}] Email Sync Cron Job completed successfully.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Email Sync Cron Job failed:`, error.message);
        }
        console.log("-----------------------------------------");
    });

    console.log("✅ Email Sync Cron Job scheduled successfully (every 30 minutes)");
};
