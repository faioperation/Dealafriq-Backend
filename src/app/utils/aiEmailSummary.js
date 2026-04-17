import axios from 'axios';
import { envVars } from '../config/env.js';


const getAiEmailSummary = async (body) => {
    if (!body) return null;

    try {
        const apiUrl = `${envVars.API_AI}/summary/emails`;
        console.log(`[AI Utility] Calling AI API: ${apiUrl} (Body length: ${body.length})`);
        
        const response = await axios.post(apiUrl, {
            body: body
        }, {
            headers: {
                'x-backend-service': 'PROJECT_AI_BACKEND'
            },
            timeout: 300000 // 5 minutes
        });

        let data = response.data;
        console.log('[AI Utility] AI API Raw Response received');

        if (!data) {
            console.log('[AI Utility] AI API: No data found in response');
            return null;
        }

        // The AI API might return an array or an object with a 'data' array
        if (data.data && Array.isArray(data.data)) {
            data = data.data[0];
        } else if (Array.isArray(data)) {
            data = data[0];
        }

        if (!data) {
            console.log('[AI Utility] AI API: No data found after parsing response array');
            return null;
        }

        console.log('[AI Utility] AI API: Parsed data object:', JSON.stringify(data, null, 2));

        // Extract tasks (prefer tasks, fallback to actionPoints)
        let tasks = data.tasks || [];
        if ((!tasks || tasks.length === 0) && data.actionPoints) {
            tasks = data.actionPoints;
        }

        let raiddAnalysisKey = null;
        let raiddMessageValue = null;
        let decisionsStr = null;

        // Try to get decisions from root first if available
        if (data.decisionPoints) {
            if (Array.isArray(data.decisionPoints) && data.decisionPoints.length > 0) {
                decisionsStr = data.decisionPoints.join('\n');
            } else if (typeof data.decisionPoints === 'string') {
                decisionsStr = data.decisionPoints;
            }
        }

        if (data.raiddAnalysis) {
            const raidd = data.raiddAnalysis;

            // Extract decisions from raiddAnalysis if root decisionsStr is still null
            if (!decisionsStr) {
                if (raidd.decisions && Array.isArray(raidd.decisions) && raidd.decisions.length > 0) {
                    decisionsStr = raidd.decisions.join('\n');
                } else if (raidd.decisions && typeof raidd.decisions === 'string') {
                    decisionsStr = raidd.decisions;
                }
            }

            // Find first field that has value for raiddAnalysis (excluding decisions since it's separate)
            const keys = ['risks', 'assumptions', 'issues', 'dependencies'];
            for (const key of keys) {
                if (raidd[key]) {
                    if (Array.isArray(raidd[key]) && raidd[key].length > 0) {
                        raiddAnalysisKey = key;
                        raiddMessageValue = raidd[key].join('\n');
                        break;
                    } else if (typeof raidd[key] === 'string' && raidd[key].trim() !== '') {
                        raiddAnalysisKey = key;
                        raiddMessageValue = raidd[key];
                        break;
                    }
                }
            }
        }

        const result = {
            tasks,
            raiddAnalysis: data.category || (raiddAnalysisKey ? [raiddAnalysisKey] : []),
            raiddMessage: raiddMessageValue,
            decisions: decisionsStr,
            sentiment: data.sentiment || null,
            summary: data.summary || null,
            fullAiResponse: response.data // Include the full raw response from the API
        };

        console.log('[AI Utility] Returning result to service:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('[AI Utility] AI Summary API Error:', error.response?.data || error.message);
        return null;
    }
};


/**
 * Call AI Chatbot API to generate a reply
 * @param {string} userId - ID of the user
 * @param {string} emailId - ID of the email/outlook record
 * @param {string} type - 'email' or 'outlook'
 */
const getGeneratedReply = async (userId, emailId, type) => {
    if (!userId || !emailId) return null;

    try {
        const apiUrl = `${envVars.AI_CHATBOT_API}/emails/draft-reply`;
        console.log(`[AI Chatbot] Requesting reply for ${type} ID: ${emailId} (User: ${userId})`);

        const response = await axios.post(apiUrl, {
            user_id: userId,
            email_id: emailId
        }, {
            headers: {
                'x-backend-service': 'PROJECT_AI_BACKEND'
            },
            timeout: 300000 // 5 minutes
        });

        if (response.data) {
            console.log(`[AI Chatbot] Response received for ${type} ID: ${emailId}`);
            
            // Update the database record with the response
            if (type === 'email') {
                await prisma.email.update({
                    where: { id: emailId },
                    data: { generatedReply: response.data }
                });
            } else if (type === 'outlook') {
                await prisma.outlook.update({
                    where: { id: emailId },
                    data: { generatedReply: response.data }
                });
            }
            console.log(`[AI Chatbot] Database updated for ${type} ID: ${emailId}`);
            return response.data;
        }
        
        return null;
    } catch (error) {
        console.error(`[AI Chatbot] Error generating reply for ${type} ID: ${emailId}:`, error.response?.data || error.message);
        return null;
    }
};

export const AiEmailSummaryUtils = {
    getAiEmailSummary,
    getGeneratedReply
};
