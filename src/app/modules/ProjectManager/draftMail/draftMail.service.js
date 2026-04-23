import { AiEmailSummaryUtils } from '../../../utils/aiEmailSummary.js';

/**
 * Generate AI reply for an email or outlook record
 * @param {string} id - Database ID of the record
 * @param {string} userId - ID of the user requesting
 * @param {string} type - 'email' or 'outlook'
 */
const generateAiReply = async (id, userId, type) => {
    return await AiEmailSummaryUtils.getGeneratedReply(userId, id, type);
};

export const DraftMailService = {
    generateAiReply
};
