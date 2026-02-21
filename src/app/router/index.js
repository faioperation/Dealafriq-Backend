import { Router } from "express";
import { ProjectManagerRoutes } from "../modules/Admin/project_manager/project_manager.route.js";
import { TeamRoutes } from "../modules/Admin/team/team.route.js";
import { AuthRouter } from "../modules/auth/auth.route.js";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { UserRoutes } from "../modules/user/user.route.js";
// ... (rest of imports)

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
  // Admin Routes ends here
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});