const getPMDashboardData = async (prisma, pmId) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // 1. Overall Project Health (Average score of active projects)
    // Formula: Average of 'score' field in ProjectHealth table for PM's projects
    const healthResult = await prisma.projectHealth.aggregate({
        where: {
            project: {
                managerId: pmId,
                deletedAt: null,
            }
        },
        _avg: {
            score: true
        }
    });

    // 2. Upcoming Deadlines (Projects ending in next 30 days)
    // Source: Count of Project table where endDate is between now and +30 days
    const upcomingDeadlinesCount = await prisma.project.count({
        where: {
            managerId: pmId,
            deletedAt: null,
            endDate: {
                gte: now,
                lte: thirtyDaysFromNow,
            }
        }
    });

    // 3. Active Projects (ONGOING or IN_PROGRESS)
    // Source: Count of Project table where status is active
    const activeProjectsCount = await prisma.project.count({
        where: {
            managerId: pmId,
            deletedAt: null,
            status: {
                in: ["ONGOING", "IN_PROGRESS"]
            }
        }
    });

    // 4. KPI Chart Data (Monthly distribution by status for current year)
    // Source: Raw SQL query on projects table grouped by month and status
    const currentYear = new Date().getFullYear();
    const kpiDataRaw = await prisma.$queryRaw`
        SELECT 
            TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') AS month,
            status,
            COUNT(*)::int AS count
        FROM projects
        WHERE "managerId" = ${pmId} 
          AND EXTRACT(YEAR FROM "createdAt") = ${currentYear} 
          AND "deletedAt" IS NULL
        GROUP BY DATE_TRUNC('month', "createdAt"), status
        ORDER BY DATE_TRUNC('month', "createdAt")
    `;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedKPI = monthNames.map(m => {
        const monthData = kpiDataRaw.filter(d => d.month === m);
        return {
            month: m,
            completed: monthData.find(d => d.status === "COMPLETED")?.count || 0,
            ongoing: monthData.find(d => d.status === "ONGOING" || d.status === "IN_PROGRESS")?.count || 0,
            cancelled: monthData.find(d => d.status === "CANCELLED")?.count || 0,
        };
    });

    // 5. All Projects List
    // Source: Project table joined with User (for owner) and Tasks (for progress)
    const projects = await prisma.project.findMany({
        where: {
            managerId: pmId,
            deletedAt: null,
        },
        include: {
            createdBy: {
                select: { firstName: true, lastName: true }
            },
            _count: {
                select: { tasks: true }
            },
            tasks: {
                where: { status: "COMPLETED" },
                select: { id: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const projectList = projects.map(p => {
        // Progress Calculation: (Total Tasks / Completed Tasks) * 100
        const totalTasks = p._count.tasks;
        const completedTasks = p.tasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            projectId: p.id.split('-')[0], // derived from UUID prefix as short ID
            projectName: p.name,
            owner: `${p.createdBy.firstName} ${p.createdBy.lastName || ""}`.trim(),
            status: p.status,
            progress: progress,
            deadline: p.endDate ? p.endDate.toISOString().split('T')[0] : "N/A",
        };
    });

    return {
        stats: {
            overallHealth: Math.round(healthResult._avg.score || 0),
            upcomingDeadlines: upcomingDeadlinesCount,
            activeProjects: activeProjectsCount
        },
        kpiChart: formattedKPI,
        projects: projectList
    };
};

export const PMDashboardService = {
    getPMDashboardData,
};
