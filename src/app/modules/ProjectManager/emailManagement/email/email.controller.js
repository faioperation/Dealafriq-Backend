
import { EmailService } from './email.service.js';
import { getAuthUrl, getTokens } from './utils/googleEmailOAuth.js';

const connect = async (req, res) => {
    try {
        const url = getAuthUrl(req.user.id);
        res.status(200).json({ success: true, url });
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
        await EmailService.connectEmailAccount(userId, tokens);

        res.status(200).json({ success: true, message: 'Gmail connected successfully' });
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
        res.status(200).json({ success: true, message: 'Gmail account disconnected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const EmailController = {
    connect,
    callback,
    getInbox,
    disconnect,
};
