import prisma from "../../../prisma/client.js";

/**
 * Get the latest project meeting
 */
const getLatestMeeting = async () => {
    return await prisma.projectMeeting.findFirst({
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    description: true
                }
            },
            actionPoints: true,
            keyPoints: true
        }
    });
};

export const MeetingService = {
    getLatestMeeting
};
