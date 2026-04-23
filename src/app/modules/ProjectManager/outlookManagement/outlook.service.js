import axios from "axios";
import prisma from "../../../prisma/client.js";
import { OutlookOAuth } from "./outlook/utils/outlookOAuth.js";
import { OutlookSyncService } from "./outlook/outlookSync.service.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";

const getValidToken = async (userId, forceRefresh = false) => {
    let account = await prisma.emailAccount.findFirst({
        where: { userId, provider: 'outlook' },
    });

    if (!account) {
        throw new Error('Outlook account not connected');
    }

    // Check if expired (with 5 min buffer) or if refresh is forced
    if (forceRefresh || new Date() >= new Date(account.expiryDate.getTime() - 5 * 60 * 1000)) {
        try {
            const tokens = await OutlookOAuth.refreshToken(account.refreshToken);
            account = await prisma.emailAccount.update({
                where: { id: account.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || account.refreshToken,
                    expiryDate: new Date(Date.now() + tokens.expires_in * 1000),
                    isConnected: true,
                },
            });
        } catch (refreshError) {
            await prisma.emailAccount.updateMany({
                where: { userId, provider: 'outlook' },
                data: { isConnected: false }
            });
            throw refreshError;
        }
    }

    return account.accessToken;
};

const connectAccount = async (userId, code) => {
    const tokens = await OutlookOAuth.getTokens(code);

    // Get user profile to get email
    const profileResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    console.log("Outlook Profile Response:", profileResponse.data);

    const email = profileResponse.data.mail || profileResponse.data.userPrincipalName;
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    const existingAccount = await prisma.emailAccount.findFirst({
        where: { userId, provider: 'outlook' }
    });

    const result = await (existingAccount ?
        prisma.emailAccount.update({
            where: { id: existingAccount.id },
            data: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || existingAccount.refreshToken,
                expiryDate,
                email: email || existingAccount.email,
                isConnected: true,
            },
        }) :
        prisma.emailAccount.create({
            data: {
                userId,
                email,
                provider: 'outlook',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiryDate,
                isConnected: true,
            },
        })
    );

    // Trigger immediate sync in background
    setTimeout(() => {
        OutlookService.syncAllConnectedAccounts().catch(err => {
            console.error('Initial Outlook sync failed:', err);
        });
    }, 1000);

    return result;
};

const getInbox = async (userId) => {
    let token = await getValidToken(userId);

    try {
        const response = await axios.get("https://graph.microsoft.com/v1.0/me/messages", {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                $top: 10,
                $select: "id,subject,from,bodyPreview,receivedDateTime"
            }
        });

        return response.data.value.map(msg => {
            let snippet = msg.bodyPreview || '';
            if (typeof snippet === 'string') {
                snippet = snippet.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                snippet = snippet.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                snippet = snippet.replace(/<[^>]*>?/gm, '');
                snippet = snippet.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s{2,}/g, ' ').trim();
            }

            return {
                id: msg.id,
                subject: msg.subject,
                from: msg.from.emailAddress.address,
                snippet: snippet,
                receivedAt: msg.receivedDateTime,
            };
        });
    } catch (error) {
        console.error("Outlook GetInbox Error:", error.response?.data || error.message);
        if (error.response?.headers?.['www-authenticate']) {
            console.log("WWW-Authenticate Header:", error.response.headers['www-authenticate']);
        }
        if (error.response && error.response.status === 401) {
            console.log("Token expired or invalid, attempting refresh...");
            token = await getValidToken(userId, true);

            try {
                const retryResponse = await axios.get("https://graph.microsoft.com/v1.0/me/messages", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        $top: 10,
                        $select: "id,subject,from,bodyPreview,receivedDateTime"
                    }
                });

                return retryResponse.data.value.map(msg => {
                    let snippet = msg.bodyPreview || '';
                    if (typeof snippet === 'string') {
                        snippet = snippet.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                        snippet = snippet.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                        snippet = snippet.replace(/<[^>]*>?/gm, '');
                        snippet = snippet.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s{2,}/g, ' ').trim();
                    }

                    return {
                        id: msg.id,
                        subject: msg.subject,
                        from: msg.from.emailAddress.address,
                        snippet: snippet,
                        receivedAt: msg.receivedDateTime,
                    };
                });
            } catch (retryError) {
                console.error("Outlook Retry Error Body:", retryError.response?.data || retryError.message);
                if (retryError.response?.headers?.['www-authenticate']) {
                    console.log("Retry WWW-Authenticate Header:", retryError.response.headers['www-authenticate']);
                }
                throw retryError;
            }
        }
        throw error;
    }
};

const disconnectAccount = async (userId) => {
    const account = await prisma.emailAccount.findFirst({
        where: { userId, provider: 'outlook' }
    });

    if (!account) {
        throw new Error('Outlook account not connected');
    }

    return await prisma.emailAccount.delete({
        where: { id: account.id }
    });
};

const syncAllConnectedAccounts = async () => {
    const accounts = await prisma.emailAccount.findMany({
        where: { provider: 'outlook' }
    });

    console.log(`Found ${accounts.length} connected Outlook accounts to sync.`);

    for (const account of accounts) {
        try {
            console.log(`Syncing Outlook for user: ${account.userId}`);
            const token = await getValidToken(account.userId);

            const response = await axios.get("https://graph.microsoft.com/v1.0/me/messages", {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    $top: 50,
                    $select: "id,subject,from,bodyPreview,receivedDateTime,body"
                }
            });

            const messages = response.data.value || [];

            for (const msg of messages) {
                const senderEmail = msg.from.emailAddress.address;

                // Clean the outlook HTML body to prevent CSS/JS from persisting
                let rawBody = msg.body?.content || msg.bodyPreview || '';
                if (typeof rawBody === 'string') {
                    rawBody = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                    rawBody = rawBody.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                    rawBody = rawBody.replace(/<[^>]*>?/gm, ''); // Remove all other HTML tags
                    rawBody = rawBody.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s{2,}/g, ' ').trim();
                }

                await OutlookSyncService.syncOutlookEmail({
                    outlookMessageId: msg.id,
                    outlookRawId: msg.id,
                    subject: msg.subject,
                    body: rawBody,
                    senderEmail,
                    receiverEmail: account.email,
                    category: 'personal', // Outlook graph doesn't give category easily like Gmail
                    receivedAt: msg.receivedDateTime,
                    source: 'outlook',
                    created_by: account.userId
                });
            }
            console.log(`Finished syncing Outlook for user: ${account.userId}`);
        } catch (error) {
            console.error(`Error syncing Outlook account ${account.id}:`, error.message);
        }
    }
};

const getUnifiedInbox = async (userId, query) => {
    const queryBuilder = new QueryBuilder(query).filter().build();

    // Base where clause for both Gmail and Outlook
    const baseWhere = {
        ...queryBuilder.where,
        created_by: userId,
        deletedAt: null,
    };

    // Gmail emails (no category filter needed)
    const gmailEmails = await prisma.email.findMany({
        where: baseWhere,
        include: { vendor: true },
        orderBy: { receivedAt: 'desc' },
        take: 20,
    });

    // Outlook emails filtered to 'personal' category only
    const outlookWhere = { ...baseWhere, category: 'personal' };
    const outlookEmails = await prisma.outlook.findMany({
        where: outlookWhere,
        include: { vendor: true },
        orderBy: { receivedAt: 'desc' },
        take: 20,
    });

    // Combine and sort most recent first
    const unified = [
        ...gmailEmails.map(e => ({ ...e, type: 'gmail' })),
        ...outlookEmails.map(e => ({ ...e, type: 'outlook' })),
    ].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    const sliced = unified.slice(0, 20);

    // Initialize overall stats counters
    const overallStats = {
        totalTasks: 0,
        totalIssues: 0,
        totalRisks: 0,
        totalAssumptions: 0,
        totalDependencies: 0,
        totalDecisions: 0,
        totalAiPossessed: 0,
    };

    // Compute overall stats while iterating through sliced
    sliced.forEach(item => {
        const ai = item.fullAiResponse || {};
        const raidd = ai.raiddAnalysis || {};
        
        // Helper to check if a category has any content (array with items or non-empty string)
        const hasContent = (val) => {
            if (!val) return false;
            if (Array.isArray(val)) return val.length > 0;
            if (typeof val === 'string') return val.trim().length > 0;
            return true; // Any other non-null truthy value
        };

        if (Array.isArray(item.tasks) && item.tasks.length > 0) overallStats.totalTasks += 1;
        
        if (hasContent(ai.issues) || hasContent(ai.issue) || hasContent(ai.totalIssues) || hasContent(raidd.issues) || hasContent(raidd.issue)) {
            overallStats.totalIssues += 1;
        }
        
        if (hasContent(ai.risks) || hasContent(ai.riskPoints) || hasContent(raidd.risks) || hasContent(raidd.riskPoints)) {
            overallStats.totalRisks += 1;
        }
        
        if (hasContent(ai.assumptions) || hasContent(ai.assumptionPoints) || hasContent(raidd.assumptions) || hasContent(raidd.assumptionPoints)) {
            overallStats.totalAssumptions += 1;
        }
        
        if (hasContent(ai.dependencies) || hasContent(ai.dependencyPoints) || hasContent(raidd.dependencies) || hasContent(raidd.dependencyPoints)) {
            overallStats.totalDependencies += 1;
        }
        
        if (hasContent(ai.decisions) || hasContent(ai.decisionPoints) || hasContent(raidd.decisions) || hasContent(raidd.decisionPoints)) {
            overallStats.totalDecisions += 1;
        }

        if (item.fullAiResponse) overallStats.totalAiPossessed += 1;
    });

    // Return only the data array and overall stats
    return { data: sliced, overallStats };
};

const getSingleUnifiedMessage = async (id, userId) => {
    // Try searching in Gmail emails first
    const gmailEmail = await prisma.email.findFirst({
        where: { id, created_by: userId },
        include: { vendor: true }
    });

    if (gmailEmail) {
        return { ...gmailEmail, type: 'gmail' };
    }

    // Try searching in Outlook emails
    const outlookEmail = await prisma.outlook.findFirst({
        where: { id, created_by: userId },
        include: { vendor: true }
    });

    if (outlookEmail) {
        return { ...outlookEmail, type: 'outlook' };
    }

    return null;
};

export const OutlookService = {
    connectAccount,
    getInbox,
    disconnectAccount,
    syncAllConnectedAccounts,
    getUnifiedInbox,
    getSingleUnifiedMessage
};
