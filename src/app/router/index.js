import { Router } from "express";
import { ProjectManagerRoutes } from "../modules/Admin/project_manager/project_manager.route.js";
import { TeamRoutes } from "../modules/Admin/team/team.route.js";
import { AuthRouter } from "../modules/auth/auth.route.js";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { UserRoutes } from "../modules/user/user.route.js";
import { ProjectManagementRoutes } from "../modules/Admin/project_management/project_management.route.js";
import { PMProjectManagementRoutes } from "../modules/ProjectManager/project_management/project_management.route.js";
import { ProjectTaskRoutes } from "../modules/ProjectManager/projectTask/projectTask.route.js";
import { ProjectMilestoneRoutes } from "../modules/ProjectManager/projectMilestone/projectMilestone.route.js";
import { ProjectMeetingRoutes } from "../modules/ProjectManager/projectMeeting/projectMeeting.route.js";
import { ProjectDocumentRoutes } from "../modules/ProjectManager/projectDocument/projectDocument.route.js";
import { ProjectAssignmentRoutes } from "../modules/ProjectManager/projectAssignment/projectAssignment.route.js";
import { ProjectHealthRoutes } from "../modules/ProjectManager/projectHealth/projectHealth.route.js";

export const router = Router();
const moduleRoutes = [

  {
    path: "/user",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRouter,
  },
  {
    path: "/otp",
    route: OtpRouter,
  },
  // Admin Routes starts here
  {
    path: "/admin/team",
    route: TeamRoutes,
  },
  {
    path: "/admin/project-manager",
    route: ProjectManagerRoutes,
  },
  {
    path: "/admin/project-management",
    route: ProjectManagementRoutes,
  },
  // Admin Routes ends here
  // Project Manager Routes starts here
  {
    path: "/project-manager/project-management",
    route: PMProjectManagementRoutes,
  },
  {
    path: "/project-manager/project-task",
    route: ProjectTaskRoutes,
  },
  {
    path: "/project-manager/project-milestone",
    route: ProjectMilestoneRoutes,
  },
  {
    path: "/project-manager/project-meeting",
    route: ProjectMeetingRoutes,
  },
  {
    path: "/project-manager/project-document",
    route: ProjectDocumentRoutes,
  },
  {
    path: "/project-manager/project-assignment",
    route: ProjectAssignmentRoutes,
  },
  {
    path: "/project-manager/project-health",
    route: ProjectHealthRoutes,
  },
  // Project Manager Routes ends here
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});