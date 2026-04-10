const getPMDashboardData = async (prisma, pmId) => {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // 1. Overall Project Health (Average progress of PM's active projects)
    // Requirement: see project progress and add a percentage based on it
    const projectsForHealth = await prisma.project.findMany({
        where: {
            managerId: pmId,
            deletedAt: null,
        },
        select: {
            projectProgress: true
        }
    });

    let overallHealth = 0;
    if (projectsForHealth.length > 0) {
        const totalProgress = projectsForHealth.reduce((acc, p) => {
            const progressNum = parseInt(p.projectProgress?.replace('%', '') || "0", 10);
            return acc + progressNum;
        }, 0);
        overallHealth = Math.round(totalProgress / projectsForHealth.length);
    }

    // 2. Upcoming Deadlines (Projects ending in next 7 days)
    // Requirement: show only those project count here, these project have 7 days to deliver
    const upcomingDeadlinesCount = await prisma.project.count({
        where: {
            managerId: pmId,
            deletedAt: null,
            endDate: {
                gte: now,
                lte: sevenDaysFromNow,
            }
        }
    });

    // 3. Active Projects (Only ONGOING)
    // Requirement: just show only ongoing project count here
    const activeProjectsCount = await prisma.project.count({
        where: {
            managerId: pmId,
            deletedAt: null,
            status: "ONGOING"
        }
    });

    // 4. KPI Chart Data (Monthly distribution by status for current year)
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
            year: currentYear,
            completed: monthData.find(d => d.status === "COMPLETED")?.count || 0,
            ongoing: monthData.find(d => d.status === "ONGOING")?.count || 0,
            cancelled: monthData.find(d => d.status === "CANCELLED")?.count || 0,
        };
    });

    // 5. All Projects List
    const projects = await prisma.project.findMany({
        where: {
            managerId: pmId,
            deletedAt: null,
        },
        include: {
            manager: {
                select: { firstName: true, lastName: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const projectList = projects.map(p => {
        return {
            projectId: p.id.split('-')[0], // derived from UUID prefix as short ID
            projectName: p.name,
            owner: `${p.manager.firstName} ${p.manager.lastName || ""}`.trim(),
            status: p.status,
            progress: parseInt(p.projectProgress?.replace('%', '') || "0", 10),
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
        projects: projectList
    };
};

export const PMDashboardService = {
    getPMDashboardData,
};
