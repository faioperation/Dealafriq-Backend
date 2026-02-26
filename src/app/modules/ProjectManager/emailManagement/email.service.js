import { google } from 'googleapis';
import prisma from '../../../prisma/client.js';
import { createOAuth2Client } from './utils/googleEmailOAuth.js';


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
            data: updateData,
        });
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
};

const connectEmailAccount = async (userId, tokens) => {
    const expiryDate = new Date(tokens.expiry_date);

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
            },
        });
    }

    return await prisma.emailAccount.create({
        data: {
            userId,
            provider: 'google',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate,
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
            const date = headers.find((h) => h.name === 'Date')?.value || '';

            return {
                id: detail.data.id,
                subject,
                from,
                snippet: detail.data.snippet,
                date,
            };
        })
    );

    return formattedEmails;
};

export const EmailService =  {
    connectEmailAccount,
    getInbox,
};
