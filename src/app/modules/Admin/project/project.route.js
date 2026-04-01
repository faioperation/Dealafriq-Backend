import express from "express";
import { AdminProjectController } from "./project.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";

const router = express.Router();

router.get(
    "/all",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    AdminProjectController.getAllProjects
);

router.get(
    "/all/with-raidd/for-ai",
    AdminProjectController.getAllProjectsWithRaidd
);

router.get(
    "/public",
    AdminProjectController.getLatestThreeProjects
);



router.get(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    AdminProjectController.getSingleProject
);
router.get(
    "/public/:id",
    AdminProjectController.getSingleProject
);

export const AdminProjectRoutes = router;
