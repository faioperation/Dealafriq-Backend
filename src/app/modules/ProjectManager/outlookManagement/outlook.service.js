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
        const tokens = await OutlookOAuth.refreshToken(account.refreshToken);
        account = await prisma.emailAccount.update({
            where: { id: account.id },
            data: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || account.refreshToken,
                expiryDate: new Date(Date.now() + tokens.expires_in * 1000),
            },
        });
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

    if (existingAccount) {
        return await prisma.emailAccount.update({
            where: { id: existingAccount.id },
            data: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || existingAccount.refreshToken,
                expiryDate,
                email: email || existingAccount.email,
            },
        });
    }

    return await prisma.emailAccount.create({
        data: {
            userId,
            email,
            provider: 'outlook',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate,
        },
    });
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

        return response.data.value.map(msg => ({
            id: msg.id,
            subject: msg.subject,
            from: msg.from.emailAddress.address,
            snippet: msg.bodyPreview,
            receivedAt: msg.receivedDateTime,
        }));
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

                return retryResponse.data.value.map(msg => ({
                    id: msg.id,
                    subject: msg.subject,
                    from: msg.from.emailAddress.address,
                    snippet: msg.bodyPreview,
                    receivedAt: msg.receivedDateTime,
                }));
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

                await OutlookSyncService.syncOutlookEmail({
                    outlookMessageId: msg.id,
                    subject: msg.subject,
                    body: msg.body?.content || msg.bodyPreview,
                    senderEmail,
                    receiverEmail: account.email,
                    category: null, // Outlook graph doesn't give category easily like Gmail
                    receivedAt: msg.receivedDateTime,
                    source: 'outlook', // <-- Added source
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

    const where = {
        ...queryBuilder.where,
        created_by: userId,
        deletedAt: null
    };

    const gmailEmails = await prisma.email.findMany({
        where,
        include: { vendor: true },
        orderBy: { receivedAt: 'desc' },
        take: 20
    });

    const outlookEmails = await prisma.outlook.findMany({
        where,
        include: { vendor: true },
        orderBy: { receivedAt: 'desc' },
        take: 20
    });

    // Combine and sort
    const unified = [
        ...gmailEmails.map(e => ({ ...e, type: 'gmail' })),
        ...outlookEmails.map(e => ({ ...e, type: 'outlook' }))
    ].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    return unified.slice(0, 20);
};

export const OutlookService = {
    connectAccount,
    getInbox,
    disconnectAccount,
    syncAllConnectedAccounts,
    getUnifiedInbox
};
