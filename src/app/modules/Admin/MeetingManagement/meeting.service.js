import prisma from "../../../prisma/client.js";
import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { projectMeetingSearchableFields } from "../../../constant.js";

/**
 * Get the latest project meeting
 */
const getLatestMeeting = async () => {
    return await prisma.projectMeeting.findFirst({
        orderBy: {
            createdAt: 'desc'
        },
        select: {
            id: true,
            projectId: true,
            title: true,
            meetingDate: true,
            createdAt: true,
            lastMeetingSummary: true,
            notes: true,
            agenda: true,
            aiMeetingSummary: true,
            project: {
                select: {
                    id: true,
                    name: true,
                    description: true
                }
            },
            actionPoints: {
                select: {
                    id: true,
                    content: true,
                    status: true
                }
            },
            keyPoints: {
                select: {
                    id: true,
                    content: true,
                    status: true
                }
            }
        }
    });
};

/**
 * Get all project meetings with pagination and search
 */
const getAllMeetings = async (query) => {
    const queryBuilder = new QueryBuilder(query)
        .search(projectMeetingSearchableFields)
        .filter({}, {})
        .sort("-createdAt")
        .paginate();

    const buildQuery = queryBuilder.build();

    const [result, total] = await Promise.all([
        prisma.projectMeeting.findMany({
            ...buildQuery,
            select: {
                id: true,
                projectId: true,
                title: true,
                meetingDate: true,
                createdAt: true,
                transcriptData: true
            },
        }),
        prisma.projectMeeting.count({ where: buildQuery.where }),
    ]);

    return {
        meta: queryBuilder.getMeta(total),
        data: result,
    };
};

/**
 * Get single project meeting by ID
 */
const getSingleMeeting = async (id) => {
    return await prisma.projectMeeting.findUnique({
        where: { id },
        select: {
            id: true,
            projectId: true,
            title: true,
            meetingDate: true,
            createdAt: true,
            transcriptData: true,
        },
    });
};

export const MeetingService = {
    getLatestMeeting,
    getAllMeetings,
    getSingleMeeting
};
