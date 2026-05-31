import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../errorHelper/appError.js";

const getAllPublicLessonLearns = async (prisma) => {
    const lessonLearns = await prisma.lessonLearn.findMany({
        where: { deleted_at: null },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    managerId: true,
                    client: {
                        select: { name: true, email: true }
                    },
                    projectOwner: {
                        select: { firstName: true, lastName: true }
                    }
                }
            }
        },
        orderBy: [
            { loggedDate: 'desc' },
            { created_at: 'desc' }
        ]
    });

    return lessonLearns.map(lessonLearn => {
        const { current_situation_summary, aiResponse, ...rest } = lessonLearn;
        const ownerName = rest.project?.projectOwner ? `${rest.project.projectOwner.firstName} ${rest.project.projectOwner.lastName}` : null;
        const clientData = rest.project?.client ? { name: rest.project.client.name, email: rest.project.client.email } : null;
        return {
            ...rest,
            client: clientData,
            ownerName
        };
    });
};

const getSinglePublicLessonLearn = async (prisma, id) => {
    const lessonLearn = await prisma.lessonLearn.findUnique({
        where: { id },
        include: {
            project: {
                select: {
                    id: true,
                    managerId: true,
                    deletedAt: true,
                    client: {
                        select: { name: true, email: true }
                    },
                    projectOwner: {
                        select: { firstName: true, lastName: true }
                    }
                },
            },
        },
    });

    if (
        !lessonLearn ||
        lessonLearn.project?.deletedAt !== null ||
        lessonLearn.deleted_at !== null
    ) {
        throw new AppError(
            StatusCodes.NOT_FOUND,
            "LessonLearn record not found"
        );
    }

    const { current_situation_summary, aiResponse, ...lessonLearnWithoutExcluded } = lessonLearn;
    const ownerName = lessonLearn.project?.projectOwner ? `${lessonLearn.project.projectOwner.firstName} ${lessonLearn.project.projectOwner.lastName}` : null;
    const clientData = lessonLearn.project?.client ? { name: lessonLearn.project.client.name, email: lessonLearn.project.client.email } : null;
    return { ...lessonLearnWithoutExcluded, client: clientData, ownerName };
};

export const LessonLearnPublicService = {
    getAllPublicLessonLearns,
    getSinglePublicLessonLearn,
};
