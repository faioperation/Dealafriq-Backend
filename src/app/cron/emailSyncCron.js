import cron from "node-cron";
import { EmailService } from "../modules/ProjectManager/emailManagement/email/email.service.js";
import { OutlookService } from "../modules/ProjectManager/outlookManagement/outlook.service.js";
import { GoogleCalendarService } from "../modules/ProjectManager/googleCalender/googleCalender.service.js";

/**
 * Initialize email sync cron job
 * Runs every 30 minutes
 */
export const initEmailSyncCron = () => {
    // Schedule task to run every minute
    cron.schedule("* * * * *", async () => {
        try {
            await EmailService.syncAllConnectedAccounts();
            await OutlookService.syncAllConnectedAccounts();
            await GoogleCalendarService.syncAllConnectedCalendars();
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Sync Cron Job failed:`, error.message);
        }
    });

    console.log("✅  Email, Outlook & Calendar Sync Cron Job scheduled (runs every minute)");
};
