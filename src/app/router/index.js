import { Router } from "express";
import { ActivityLogRoutes } from "../modules/activityLog/activityLog.route.js";

import { ProjectManagerRoutes } from "../modules/Admin/project_manager/project_manager.route.js";
import { AdminProjectRoutes } from "../modules/Admin/project/project.route.js";
import { UserManagementRoutes } from "../modules/Admin/userManagement/userManagement.route.js";
import { DashboardRoutes } from "../modules/Admin/dashboard/dashboard.route.js";
import { AdminClientRoutes } from "../modules/Admin/clientManagement/adminClient.route.js";
import { AdminMeetingRoutes } from "../modules/Admin/MeetingManagement/meeting.route.js";
import { AdminDocumentRoutes } from "../modules/Admin/DocumentManagement/document.route.js";
import { AuthRouter } from "../modules/auth/auth.route.js";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { AiDetectionRoutes } from "../modules/ProjectManager/aiDetection/aiDetection.route.js";
import { EmailAccountRoutes } from "../modules/ProjectManager/emailManagement/email/email.route.js";
import { EmployeeRoutes } from "../modules/ProjectManager/employee/employee.route.js";
import { OutlookRoutes } from "../modules/ProjectManager/outlookManagement/outlook.route.js";
import { PMProjectManagementRoutes } from "../modules/ProjectManager/project_management/project_management.route.js";
import { ProjectAgreementRoutes } from "../modules/ProjectManager/projectAgreement/projectAgreement.route.js";
import { ProjectDocumentRoutes } from "../modules/ProjectManager/projectDocument/projectDocument.route.js";
import { ProjectMeetingRoutes } from "../modules/ProjectManager/projectMeeting/projectMeeting.route.js";
import { ProjectMilestoneRoutes } from "../modules/ProjectManager/projectMilestone/projectMilestone.route.js";
import { ProjectTaskRoutes } from "../modules/ProjectManager/projectTask/projectTask.route.js";
import { RaiddRoutes } from "../modules/ProjectManager/raiddManagement/raidd.route.js";
import { TeamRoutes } from "../modules/ProjectManager/team/team.route.js";
import { TranscriptRoutes } from "../modules/ProjectManager/transcriptManagement/transcript.route.js";
import { ClientRoutes } from "../modules/ProjectManager/clientManagement/client.route.js";
import { ZoomRoutes } from "../modules/ProjectManager/zoomManagement/zoom.route.js";
import { ProjectChatbotRoutes } from "../modules/ProjectManager/projectChatbot/projectChatbot.route.js";
import { ClientEmailRoutes } from "../modules/ProjectManager/emailManagement/clientEmail/clientEmail.route.js";
import { PMDashboardRoutes } from "../modules/ProjectManager/dashboard/pm_dashboard.route.js";
import { UserRoutes } from "../modules/user/user.route.js";
import { LessonLearnRoutes } from "../modules/ProjectManager/leasonLearn/leasonLearn.route.js";
import { GoogleCalendarRoutes } from "../modules/ProjectManager/googleCalender/googleCalender.route.js";
import { NotificationRoutes } from "../modules/ProjectManager/notification/notification.route.js";
import { DraftMailRoutes } from "../modules/ProjectManager/draftMail/draftMail.route.js";
import { AiPushRoutes } from "../modules/ProjectManager/aiPush/aiPush.routes.js";



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
    path: "/admin/dashboard",
    route: DashboardRoutes,
  },
  {
    path: "/admin/project-manager",
    route: ProjectManagerRoutes,
  },

  {
    path: "/admin/user-management",
    route: UserManagementRoutes,
  },
  {
    path: "/project",
    route: AdminProjectRoutes,
  },
  {
    path: "/admin/client-management",
    route: AdminClientRoutes,
  },
  {
    path: "/meeting-management",
    route: AdminMeetingRoutes,
  },
  {
    path: "/document-management",
    route: AdminDocumentRoutes,
  },
  // Admin Routes ends here
  // Project Manager Routes starts here
  {
    path: "/project-manager/dashboard",
    route: PMDashboardRoutes,
  },
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
    path: "/project-manager/project-agreement",
    route: ProjectAgreementRoutes,
  },
  {
    path: "/project-manager/team",
    route: TeamRoutes,
  },
  {
    path: "/project-manager/employees",
    route: EmployeeRoutes,
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
    path: "/zoom",
    route: ZoomRoutes,
  },
  {
    path: "/project-manager/client-management",
    route: ClientRoutes,
  },
  {
    path: "/project-manager/client-email",
    route: ClientEmailRoutes,
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
  {
    path: "/project-manager/outlook",
    route: OutlookRoutes,
  },
  {
    path: "/project-manager/lesson-learn",
    route: LessonLearnRoutes,
  },
  {
    path: "/project-manager/google-calendar",
    route: GoogleCalendarRoutes,
  },
  {
    path: "/project-manager/project-chatbot",
    route: ProjectChatbotRoutes,
  },
  {
    path: "/project-manager/notifications",
    route: NotificationRoutes,
  },
  {
    path: "/project-manager/draft-mail",
    route: DraftMailRoutes,
  },
  {
    path: "/ai-push",
    route: AiPushRoutes,
  },
  // Project Manager Routes ends here
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});