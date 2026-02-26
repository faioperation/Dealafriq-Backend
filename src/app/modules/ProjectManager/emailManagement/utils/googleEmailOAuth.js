import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID_EMAIL;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET_EMAIL;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL_EMAIL;

export const createOAuth2Client = () => {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_CALLBACK_URL
    );
};

export const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
];

export const getAuthUrl = (state) => {
    const oauth2Client = createOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GMAIL_SCOPES,
        prompt: 'consent',
        state,
    });
};


export const getTokens = async (code) => {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};
