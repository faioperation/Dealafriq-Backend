import { Router } from "express";
import { ActivityLogRoutes } from "../modules/activityLog/activityLog.route.js";
import { ProjectManagementRoutes } from "../modules/Admin/project_management/project_management.route.js";
import { ProjectManagerRoutes } from "../modules/Admin/project_manager/project_manager.route.js";
import { TeamRoutes } from "../modules/Admin/team/team.route.js";
import { AuthRouter } from "../modules/auth/auth.route.js";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { EmailAccountRoutes } from "../modules/ProjectManager/emailManagement/email/email.route.js";
import { PMProjectManagementRoutes } from "../modules/ProjectManager/project_management/project_management.route.js";
import { ProjectAgreementRoutes } from "../modules/ProjectManager/projectAgreement/projectAgreement.route.js";
import { ProjectDocumentRoutes } from "../modules/ProjectManager/projectDocument/projectDocument.route.js";
import { ProjectHealthRoutes } from "../modules/ProjectManager/projectHealth/projectHealth.route.js";
import { ProjectMeetingRoutes } from "../modules/ProjectManager/projectMeeting/projectMeeting.route.js";
import { ProjectMilestoneRoutes } from "../modules/ProjectManager/projectMilestone/projectMilestone.route.js";
import { ProjectTaskRoutes } from "../modules/ProjectManager/projectTask/projectTask.route.js";
import { TranscriptRoutes } from "../modules/ProjectManager/transcriptManagement/transcript.route.js";
import { VendorRoutes } from "../modules/ProjectManager/vendorManagement/vendor.route.js";
import { ZoomRoutes } from "../modules/ProjectManager/zoomManagement/zoom.route.js";
import { VendorEmailRoutes } from "../modules/ProjectManager/emailManagement/vendorEmail/vendorEmail.route.js";
import { UserRoutes } from "../modules/user/user.route.js";
import { UserManagementRoutes } from "../modules/Admin/userManagement/userManagement.route.js";
import { AiDetectionRoutes } from "../modules/ProjectManager/aiDetection/aiDetection.route.js";
import { RaiddRoutes } from "../modules/ProjectManager/raiddManagement/raidd.route.js";



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
  {
    path: "/admin/user-management",
    route: UserManagementRoutes,
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
    route: ProjectAgreementRoutes,
  },
  {
    path: "/project-manager/project-health",
    route: ProjectHealthRoutes,
  },
  {
    path: "/project-manager/project-agreement",
    route: ProjectAgreementRoutes,
  },
  {
    path: "/project-manager/project-transcript",
    route: TranscriptRoutes,
  },
  {
    path: "/project-manager/zoom",
    route: ZoomRoutes,
  },
  {
    path: "/project-manager/vendor-management",
    route: VendorRoutes,
  },
  {
    path: "/project-manager/vendor-email",
    route: VendorEmailRoutes,
  },
  {
    path: "/email-account-connection",
    route: EmailAccountRoutes,
  },
  {
    path: "/activity-log",
    route: ActivityLogRoutes,
  },
  {
    path: "/project-manager/ai-detection",
    route: AiDetectionRoutes,
  },
  {
    path: "/project-manager/raidd",
    route: RaiddRoutes,
  },
  // Project Manager Routes ends here
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});