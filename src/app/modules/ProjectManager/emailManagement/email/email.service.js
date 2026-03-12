import { google } from 'googleapis';
import prisma from '../../../../prisma/client.js';
import { createOAuth2Client } from './utils/googleEmailOAuth.js';
import { VendorEmailService } from '../vendorEmail/vendorEmail.service.js';

const getEmailBody = (payload) => {
    if (!payload) return '';
    let bodyData = '';
    
    const findBodyPart = (parts) => {
        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                return part.body.data;
            }
            if (part.mimeType === 'text/html' && part.body && part.body.data) {
                return part.body.data;
            }
            if (part.parts) {
                const found = findBodyPart(part.parts);
                if (found) return found;
            }
        }
        return null;
    };

    if (payload.parts) {
        bodyData = findBodyPart(payload.parts) || '';
    } else if (payload.body && payload.body.data) {
        bodyData = payload.body.data;
    }

    if (!bodyData) return '';

    try {
        const base64Data = bodyData.replace(/-/g, '+').replace(/_/g, '/');
        const buff = Buffer.from(base64Data, 'base64');
        let decodedText = buff.toString('utf-8');
        
        // CRITICAL FIX: Strip entire style and script blocks before parsing the rest
        decodedText = decodedText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        decodedText = decodedText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        
        // Clean up format: normalize newlines, handle soft wraps
        // Replace literal string "\r\n" and actual \r\n characters with standard \n
        decodedText = decodedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Handle escaped literals which occasionally come from stringified JSON representations
        decodedText = decodedText.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
        
        // Split text by 2 or more newlines (paragraph boundaries)
        const paragraphs = decodedText.split(/\n{2,}/);
        
        // Clean each paragraph: replace single newlines with spaces, strip HTML tags just in case
        const cleanParagraphs = paragraphs.map(p => {
            // Remove basic HTML tags if any sneaked into text/plain
            const noHtml = p.replace(/<[^>]*>?/gm, '');
            // Replace single newlines with spaces and collapse multiple spaces
            return noHtml.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
        });
        
        // Rejoin paragraphs with a space to completely remove \n from the response
        return cleanParagraphs.filter(p => p.length > 0).join(' ');
    } catch (e) {
        return '';
    }
};


const getGmailClient = async (userId) => {
    const account = await prisma.emailAccount.findFirst({
        where: { userId, provider: 'google' },
    });

    if (!account) {
        throw new Error('Email account not connected');
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
        expiry_date: account.expiryDate.getTime(),
    });

    try {
        // Automatically refresh token if expired
        oauth2Client.on('tokens', async (tokens) => {
            const updateData = {
                accessToken: tokens.access_token,
                expiryDate: new Date(tokens.expiry_date),
            };
            if (tokens.refresh_token) {
                updateData.refreshToken = tokens.refresh_token;
            }

            await prisma.emailAccount.update({
                where: { id: account.id },
                data: {
                    ...updateData,
                    isConnected: true
                },
            });
        });

        return google.gmail({ version: 'v1', auth: oauth2Client });
    } catch (error) {
        await prisma.emailAccount.update({
            where: { id: account.id },
            data: { isConnected: false }
        });
        throw error;
    }
}

const connectEmailAccount = async (userId, tokens) => {
    const expiryDate = new Date(tokens.expiry_date);

    // Fetch account email address
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;

    const existingAccount = await prisma.emailAccount.findFirst({
        where: { userId, provider: 'google' }
    });

    if (existingAccount) {
        return await prisma.emailAccount.update({
            where: { id: existingAccount.id },
            data: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || existingAccount.refreshToken,
                expiryDate,
                email: email || existingAccount.email,
                isConnected: true,
            },
        });
    }

    return await prisma.emailAccount.create({
        data: {
            userId,
            email,
            provider: 'google',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate,
            isConnected: true,
        },
    });
};

const getInbox = async (userId, category = null) => {
    const gmail = await getGmailClient(userId);

    let q = '';
    if (category) {
        const categoryUpper = category.toUpperCase();
        q = `category:${categoryUpper}`;
    }

    const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
        q,
    });

    const messages = response.data.messages || [];
    const formattedEmails = await Promise.all(
        messages.map(async (msg) => {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
            });

            const headers = detail.data.payload.headers;
            const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
            const from = headers.find((h) => h.name === 'From')?.value || '(Unknown Sender)';
            const dateHeader = headers.find((h) => h.name === 'Date')?.value || '';
            const receivedAt = dateHeader ? new Date(dateHeader) : null;

            const categoryLabel = detail.data.labelIds?.find(l => l.startsWith('CATEGORY_'));
            const category = categoryLabel ? categoryLabel.replace('CATEGORY_', '').toLowerCase() : null;

            return {
                id: detail.data.id,
                subject,
                from,
                snippet: detail.data.snippet,
                body: getEmailBody(detail.data.payload) || detail.data.snippet || '',
                date: dateHeader,
                receivedAt,
                category
            };
        })
    );

    return formattedEmails;
};

const syncAllConnectedAccounts = async () => {
    const accounts = await prisma.emailAccount.findMany({
        where: { provider: 'google' }
    });

    console.log(`Found ${accounts.length} connected email accounts to sync.`);

    for (const account of accounts) {
        try {
            console.log(`Syncing account for user: ${account.userId}`);
            const gmail = await getGmailClient(account.userId);

            // Ensure we have the account email
            let accountEmail = account.email;
            if (!accountEmail) {
                const profile = await gmail.users.getProfile({ userId: 'me' });
                accountEmail = profile.data.emailAddress;
                // Save it for next time
                await prisma.emailAccount.update({
                    where: { id: account.id },
                    data: { email: accountEmail }
                });
            }

            const response = await gmail.users.messages.list({
                userId: 'me',
                maxResults: 50, // Increased to 50 emails
            });

            const messages = response.data.messages || [];

            for (const msg of messages) {
                const receiverEmail = accountEmail; // Use the actual Gmail address

                // Check if already exists in DB to avoid unnecessary detail fetch
                const existing = await prisma.email.findUnique({
                    where: {
                        gmailMessageId_receiverEmail: {
                            gmailMessageId: msg.id,
                            receiverEmail: receiverEmail
                        }
                    }
                });

                if (existing) continue;

                const detail = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                });

                const headers = detail.data.payload.headers;
                const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
                const fromHeader = headers.find((h) => h.name === 'From')?.value || '';

                // Extract email address from "Name <email@example.com>" or just "email@example.com"
                const senderEmailMatch = fromHeader.match(/<(.+?)>/) || [null, fromHeader];
                const senderEmail = senderEmailMatch[1].trim();

                const toHeader = headers.find((h) => h.name === 'To')?.value || '';

                // Extract body snippet or full body if needed
                const body = getEmailBody(detail.data.payload) || detail.data.snippet || '';

                const dateHeader = headers.find((h) => h.name === 'Date')?.value || '';
                const receivedAt = dateHeader ? new Date(dateHeader) : null;

                const categoryLabel = detail.data.labelIds?.find(l => l.startsWith('CATEGORY_'));
                const category = categoryLabel ? categoryLabel.replace('CATEGORY_', '').toLowerCase() : null;

                await VendorEmailService.syncEmail({
                    gmailMessageId: msg.id,
                    subject,
                    body,
                    senderEmail,
                    receiverEmail: accountEmail, // Use the actual Gmail address
                    category,
                    receivedAt,
                    source: 'email',
                    created_by: account.userId // Audit as synced by this user's account
                });
            }
            console.log(`Finished syncing account: ${account.userId}`);
        } catch (error) {
            console.error(`Error syncing account ${account.id}:`, error.message);
        }
    }
};

const disconnectEmailAccount = async (userId) => {
    const account = await prisma.emailAccount.findFirst({
        where: { userId, provider: 'google' }
    });

    if (!account) {
        throw new Error('Email account not connected');
    }

    return await prisma.emailAccount.delete({
        where: { id: account.id }
    });
};

const getAllConnectionStatus = async (userId) => {
    return await prisma.emailAccount.findMany({
        where: { userId },
        select: {
            provider: true,
            email: true,
            isConnected: true
        }
    });
};

export const EmailService = {
    connectEmailAccount,
    getInbox,
    syncAllConnectedAccounts,
    disconnectEmailAccount,
    getAllConnectionStatus
};
