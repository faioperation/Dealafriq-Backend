import { Role } from "../../../utils/role.js";

const getDashboardStats = async (prisma) => {
    const ongoingCount = await prisma.project.count({
        where: { status: "ONGOING", deletedAt: null },
    });

    const completedCount = await prisma.project.count({
        where: { status: "COMPLETED", deletedAt: null },
    });

    const cancelledCount = await prisma.project.count({
        where: { status: "CANCELLED", deletedAt: null },
    });

    // Project Growth (Monthly counts for the current year)
    const currentYear = new Date().getFullYear();
    const projectGrowth = await prisma.$queryRaw`
        SELECT 
            TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') AS month,
            COUNT(*)::int AS count
        FROM projects
        WHERE EXTRACT(YEAR FROM "createdAt") = ${currentYear} AND "deletedAt" IS NULL
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt")
    `;

    // Ensure all 12 months are present (optional but good for consistency)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedGrowth = monthNames.map(m => {
        const found = projectGrowth.find(pg => pg.month === m);
        return { month: m, count: found ? found.count : 0 };
    });

    // Project Managers List with Assigned Project Counts
    const projectManagers = await prisma.user.findMany({
        where: {
            role: Role.PROJECT_MANAGER,
            isDeleted: false,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            projectsManaged: {
                where: { deletedAt: null },
                select: { id: true }
            }
        }
    });

    const formattedManagers = projectManagers.map(pm => ({
        id: pm.id,
        name: `${pm.firstName} ${pm.lastName || ""}`.trim(),
        email: pm.email,
        assignedProjects: pm.projectsManaged.length
    }));

    return {
        stats: {
            ongoingProjects: ongoingCount,
            completedProjects: completedCount,
            cancelledProjects: cancelledCount
        },
        projectGrowth: formattedGrowth,
        projectManagers: formattedManagers
    };
};

export const DashboardService = {
    getDashboardStats,
};
