
import { EmailService } from './email.service.js';
import prisma from '../../../../prisma/client.js';
import { getAuthUrl, getTokens } from './utils/googleEmailOAuth.js';

const connect = async (req, res) => {
    try {
        const url = getAuthUrl(req.user.id);
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
        const { code, state: userId } = req.query;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Code is required' });
        }
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User state is required' });
        }

        const tokens = await getTokens(code);
        const account = await EmailService.connectEmailAccount(userId, tokens);

        res.status(200).json({
            success: true,
            message: 'Gmail connected successfully',
            isConnected: account.isConnected
        });
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
