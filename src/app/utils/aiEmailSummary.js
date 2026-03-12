import axios from 'axios';


const getAiEmailSummary = async (body) => {
    if (!body) return null;

    try {
        const response = await axios.post('https://test4.fireai.agency/summary/emails', {
            body: body
        }, {
            headers: {
                'x-backend-service': 'PROJECT_AI_BACKEND'
            }
        });

        let data = response.data;
        console.log('AI API Raw Response:', JSON.stringify(data, null, 2));

        if (!data) return null;

        // The AI API might return an array or an object with a 'data' array
        if (data.data && Array.isArray(data.data)) {
            data = data.data[0];
        } else if (Array.isArray(data)) {
            data = data[0];
        }

        if (!data) {
            console.log('AI API: No data found after parsing response');
            return null;
        }

        console.log('AI API: Parsed data object:', JSON.stringify(data, null, 2));

        // Extract tasks
        const tasks = data.tasks || [];

        let raiddAnalysisStr = null;
        let decisionsStr = null;

        if (data.raiddAnalysis) {
            const raidd = data.raiddAnalysis;

            // Extract decisions separately as requested
            if (raidd.decisions && Array.isArray(raidd.decisions) && raidd.decisions.length > 0) {
                decisionsStr = raidd.decisions.join('\n');
            } else if (raidd.decisions && typeof raidd.decisions === 'string') {
                decisionsStr = raidd.decisions;
            }

            // Find first field that has value for raiddAnalysis (excluding decisions since it's separate)
            const keys = ['risks', 'assumptions', 'issues', 'dependencies'];
            for (const key of keys) {
                if (raidd[key]) {
                    if (Array.isArray(raidd[key]) && raidd[key].length > 0) {
                        raiddAnalysisStr = raidd[key].join('\n');
                        break;
                    } else if (typeof raidd[key] === 'string' && raidd[key].trim() !== '') {
                        raiddAnalysisStr = raidd[key];
                        break;
                    }
                }
            }
        }

        return {
            tasks,
            raiddAnalysis: raiddAnalysisStr,
            decisions: decisionsStr,
            sentiment: data.sentiment || null
        };
    } catch (error) {
        console.error('AI Summary API Error:', error.response?.data || error.message);
        return null;
    }
};

export const AiEmailSummaryUtils = {
    getAiEmailSummary
};
