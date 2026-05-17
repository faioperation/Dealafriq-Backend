import axios from 'axios';
import prisma from '../prisma/client.js';
import { envVars } from '../config/env.js';

const getAiEmailSummary = async (id, body) => {
    try {
        const response = await axios.post(`${envVars.API_AI}/summary/email`, {
            email_id: id,
            body: body
        }, {
            headers: {
                'Content-Type': 'application/json',
                "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
            }
        });
        return response.data;
    } catch (error) {
        console.error(`AI Email Summary API Error for email ${id}:`, error.message);
        return null;
    }
};



const getGeneratedReply = async (userId, emailId, type) => {
    try {
        const response = await axios.post(`${envVars.API_AI}/reply/generate`, {
            user_id: userId,
            message_id: emailId,
            type: type
        }, {
            headers: {
                'Content-Type': 'application/json',
                "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
            }
        });
        return response.data;
    } catch (error) {
        console.error(`AI Reply Generation API Error for ${type} ${emailId}:`, error.message);
        return null;
    }
};

export const AiEmailSummaryUtils = {
    getAiEmailSummary,
    getGeneratedReply
};
