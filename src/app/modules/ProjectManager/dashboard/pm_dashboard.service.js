import { QueryBuilder } from "../../../utils/QueryBuilder.js";
import { projectSearchableFields } from "../../../constant.js";

const getPMDashboardData = async (prisma, pmId, query = {}) => {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Filter params for KPI Chart and Stats
    const year = Number(query.year);
    const filterMonth = query.month; // e.g., 'jan'
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    let dateFilter = {};
    if (year) {
        if (filterMonth) {
            const monthIndex = monthNames.findIndex(m => m.toLowerCase() === filterMonth.toLowerCase());
            if (monthIndex !== -1) {
                dateFilter = {
                    gte: new Date(year, monthIndex, 1),
                    lte: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
                };
            }
        } else {
            dateFilter = {
                gte: new Date(year, 0, 1),
                lte: new Date(year, 11, 31, 23, 59, 59, 999)
            };
        }
    }

    // 1. Overall Project Health (Filtered by date if provided)
    const projectsForHealth = await prisma.project.findMany({
        where: {
            managerId: pmId,
            deletedAt: null,
            ...(year && { createdAt: dateFilter })
        },
        select: {
            tasks: { select: { status: true } }
        }
    });

    let overallHealth = 0;
    if (projectsForHealth.length > 0) {
        const totalProgress = projectsForHealth.reduce((acc, p) => {
            const totalTasks = p.tasks?.length || 0;
            const completedTasks = p.tasks?.filter(t => t.status === "COMPLETED").length || 0;
            const progressNum = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            return acc + progressNum;
        }, 0);
        overallHealth = Math.round(totalProgress / projectsForHealth.length);
    }

    // 2. Upcoming Deadlines
    // If filtering by date: projects that HAD deadlines in that period
    // If not: projects having deadlines in next 7 days
    const deadlinesWhere = {
        managerId: pmId,
        deletedAt: null,
        endDate: year ? dateFilter : { gte: now, lte: sevenDaysFromNow }
    };
    const upcomingDeadlinesCount = await prisma.project.count({ where: deadlinesWhere });

    // 3. Active Projects
    // If filtering by date: projects created in that period
    // If not: currently ONGOING projects
    const activeProjectsWhere = {
        managerId: pmId,
        deletedAt: null,
        ...(year ? { createdAt: dateFilter } : { status: "ONGOING" })
    };
    const activeProjectsCount = await prisma.project.count({ where: activeProjectsWhere });

    // 4. KPI Chart Data (Uses year filter or defaults to now)
    const kpiYear = year || now.getFullYear();
    const kpiDataRaw = await prisma.$queryRaw`
        SELECT 
            TO_CHAR(DATE_TRUNC('month', "createdAt"), 'mon') AS month,
            status,
            COUNT(*)::int AS count
        FROM projects
        WHERE "managerId" = ${pmId} 
          AND EXTRACT(YEAR FROM "createdAt") = ${kpiYear} 
          AND "deletedAt" IS NULL
        GROUP BY DATE_TRUNC('month', "createdAt"), status
        ORDER BY DATE_TRUNC('month', "createdAt")
    `;

    // If a specific month is requested, only return that month in kpiChart
    const monthsToMap = filterMonth ? monthNames.filter(m => m.toLowerCase() === filterMonth.toLowerCase()) : monthNames;

    const formattedKPI = monthsToMap.map(m => {
        const monthData = kpiDataRaw.filter(d => d.month === m);
        return {
            month: m,
            year: kpiYear,
            completed: monthData.find(d => d.status === "COMPLETED")?.count || 0,
            ongoing: monthData.find(d => d.status === "ONGOING")?.count || 0,
            cancelled: monthData.find(d => d.status === "CANCELLED")?.count || 0,
        };
    });

    // 5. All Projects List with QueryBuilder
    const relationConfig = {
        manager: ["firstName", "lastName", "email"],
    };

    const queryCopy = { ...query };
    delete queryCopy.year;
    delete queryCopy.month;

    const queryBuilder = new QueryBuilder(queryCopy)
        .search(projectSearchableFields)
        .filter(relationConfig, { status: ["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"] })
        .sort("-createdAt", relationConfig)
        .paginate();

    const buildQuery = queryBuilder.build();
    buildQuery.where = {
        ...buildQuery.where,
        managerId: pmId,
        deletedAt: null,
        ...(year && { createdAt: dateFilter })
    };

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            ...buildQuery,
            include: {
                manager: {
                    select: { firstName: true, lastName: true }
                },
                tasks: { select: { status: true } }
            },
        }),
        prisma.project.count({ where: buildQuery.where })
    ]);

    const projectList = projects.map(p => {
        const totalTasks = p.tasks?.length || 0;
        const completedTasks = p.tasks?.filter(t => t.status === "COMPLETED").length || 0;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        return {
            projectId: p.id,
            projectName: p.name,
            owner: `${p.manager.firstName} ${p.manager.lastName || ""}`.trim(),
            status: p.status,
            progress: progressPercentage,
            deadline: p.endDate ? p.endDate.toISOString().split('T')[0] : "N/A",
        };
    });

    return {
        stats: {
            overallHealth: overallHealth,
            upcomingDeadlines: upcomingDeadlinesCount,
            activeProjects: activeProjectsCount
        },
        kpiChart: formattedKPI,
        projects: {
            meta: queryBuilder.getMeta(total),
            data: projectList
        }
    };
};

export const PMDashboardService = {
    getPMDashboardData,
};
