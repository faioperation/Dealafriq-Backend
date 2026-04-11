
import { EmailService } from './email.service.js';
import prisma from '../../../../prisma/client.js';
import { getAuthUrl, getTokens } from './utils/googleEmailOAuth.js';
import { envVars } from '../../../../config/env.js';

const connect = async (req, res) => {
    try {
        const { redirectUrl } = req.query;

        // Encode both userId and redirectUrl into the state parameter
        const stateObj = {
            userId: req.user.id,
            redirectUrl: redirectUrl || `${envVars.FRONT_END_URL}/data-source`
        };
        const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

        const url = getAuthUrl(state);
        const account = await prisma.emailAccount.findFirst({
            where: { userId: req.user.id, provider: 'google' }
        });
        res.status(200).json({
            success: true,
            url,
            isConnected: account ? account.isConnected : false
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const callback = async (req, res) => {
    try {
        const { code, state: encodedState } = req.query;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Code is required' });
        }
        if (!encodedState) {
            return res.status(400).json({ success: false, message: 'User state is required' });
        }

        // Decode the state parameter to get userId and redirectUrl
        const stateObj = JSON.parse(Buffer.from(encodedState, 'base64url').toString('utf-8'));
        const userId = stateObj.userId;
        const redirectUrl = stateObj.redirectUrl;

        const tokens = await getTokens(code);
        const account = await EmailService.connectEmailAccount(userId, tokens);

        // Redirect to the frontend data-source page dynamically
        res.redirect(redirectUrl);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const getInbox = async (req, res) => {
    try {
        const { category } = req.query;
        const emails = await EmailService.getInbox(req.user.id, category);
        res.status(200).json({ success: true, data: emails });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const disconnect = async (req, res) => {
    try {
        await EmailService.disconnectEmailAccount(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Gmail account disconnected successfully',
            isConnected: false
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getStatus = async (req, res) => {
    try {
        const result = await EmailService.getAllConnectionStatus(req.user.id);
        const formattedData = result.map(acc => ({
            source: acc.provider === 'google' ? 'GMAIL' : acc.provider,
            email: acc.email,
            isConnected: acc.isConnected
        }));

        // Also fetch Zoom connection status
        const zoomAccount = await prisma.zoomAccount.findFirst({
            where: { connectedUserId: req.user.id }
        });

        if (zoomAccount) {
            formattedData.push({
                source: 'ZOOM',
                email: zoomAccount.zoomEmail,
                isConnected: true
            });
        } else {
            formattedData.push({
                source: 'ZOOM',
                email: null,
                isConnected: false
            });
        }

        const googleAccount = result.find(acc => acc.provider === 'google');
        if (googleAccount) {
            formattedData.push({
                source: 'GOOGLE_CALENDAR',
                email: googleAccount.email,
                isConnected: googleAccount.isConnected
            });
        } else {
            formattedData.push({
                source: 'GOOGLE_CALENDAR',
                email: null,
                isConnected: false
            });
        }

        res.status(200).json({
            success: true,
            message: "Fetched Successfully",
            data: formattedData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const EmailController = {
    connect,
    callback,
    getInbox,
    disconnect,
    getStatus
};
