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
        const url = `${envVars.API_AI}/summary/email-draft?id=${emailId}`;
        console.log(`[Email Reply Generate] Hitting AI API: ${url}`);
        
        let response;
        try {
            response = await axios.post(url, {}, {
                headers: {
                    'Content-Type': 'application/json',
                    "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
                }
            });
        } catch (postErr) {
            console.log(`[Email Reply Generate] POST failed (${postErr.message}), trying GET request...`);
            response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    "x-backend-service": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9sTOlGEcqrij9J70RUO8Clh0"
                }
            });
        }

        if (response.data) {
            console.log(`[Email Reply Generate] Capturing AI response. Saving to database...`);
            
            // Check if record exists in Email or Outlook and update generatedReply with the full response data
            let record = await prisma.email.findUnique({ where: { id: emailId } });
            if (record) {
                await prisma.email.update({
                    where: { id: emailId },
                    data: {
                        generatedReply: response.data
                    }
                });
                console.log(`[Email Reply Generate] Saved response to Email model generatedReply for ID: ${emailId}`);
            } else {
                record = await prisma.outlook.findUnique({ where: { id: emailId } });
                if (record) {
                    await prisma.outlook.update({
                        where: { id: emailId },
                        data: {
                            generatedReply: response.data
                        }
                    });
                    console.log(`[Email Reply Generate] Saved response to Outlook model generatedReply for ID: ${emailId}`);
                } else {
                    console.error(`[Email Reply Generate] Record not found in Email or Outlook for ID: ${emailId}`);
                }
            }
        }
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
