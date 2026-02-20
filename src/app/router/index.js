import { Router } from "express";
import { EmployeeRoutes } from "../modules/Admin/employee/employee.route.js";
import { TeamRoutes } from "../modules/Admin/team/team.route.js";
import { AuthRouter } from "../modules/auth/auth.route.js";
import { OtpRouter } from "../modules/otp/otp.route.js";
import { UserRoutes } from "../modules/user/user.route.js";




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
    path: "/admin/employee",
    route: EmployeeRoutes,
  },
  // Admin Routes ends here
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});