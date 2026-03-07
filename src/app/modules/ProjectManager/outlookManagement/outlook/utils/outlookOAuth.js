import axios from "axios";
import { envVars } from "../../../../../config/env.js";

const {
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_TENANT_ID,
    OUTLOOK_CALLBACK_URL
} = envVars;

export const OutlookOAuth = {
    getAuthUrl: (state) => {
        const url = `https://login.microsoftonline.com/${OUTLOOK_TENANT_ID}/oauth2/v2.0/authorize`;
        const params = new URLSearchParams({
            client_id: OUTLOOK_CLIENT_ID,
            response_type: "code",
            redirect_uri: OUTLOOK_CALLBACK_URL,
            response_mode: "query",
            scope: "offline_access User.Read Mail.Read",
            state,
        });
        return `${url}?${params.toString()}`;
    },

    getTokens: async (code) => {
        const url = `https://login.microsoftonline.com/${OUTLOOK_TENANT_ID}/oauth2/v2.0/token`;
        const params = new URLSearchParams({
            client_id: OUTLOOK_CLIENT_ID,
            client_secret: OUTLOOK_CLIENT_SECRET,
            code,
            redirect_uri: OUTLOOK_CALLBACK_URL,
            grant_type: "authorization_code",
            scope: "offline_access User.Read Mail.Read",
        });

        const response = await axios.post(url, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        return response.data;
    },

    refreshToken: async (refreshToken) => {
        const url = `https://login.microsoftonline.com/${OUTLOOK_TENANT_ID}/oauth2/v2.0/token`;
        const params = new URLSearchParams({
            client_id: OUTLOOK_CLIENT_ID,
            client_secret: OUTLOOK_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
            scope: "offline_access User.Read Mail.Read",
        });

        const response = await axios.post(url, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        return response.data;
    }
};
