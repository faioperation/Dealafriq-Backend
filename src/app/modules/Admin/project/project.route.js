import express from "express";
import { AdminProjectController } from "./project.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
// import { checkInternalService } from "../../../middleware/checkInternalService.js";

const router = express.Router();

router.get(
    "/all",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    AdminProjectController.getAllProjects
);

router.get(
    "/all/with-raidd/for-ai",
    // checkInternalService(),
    AdminProjectController.getAllProjectsWithRaidd
);

router.get(
    "/with-raidd/for-ai/:id",
    // checkInternalService(),
    AdminProjectController.getProjectWithRaiddById
);

router.get(
    "/public",
    // checkInternalService(),
    AdminProjectController.getLatestThreeProjects
);



router.get(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
    AdminProjectController.getSingleProject
);
router.get(
    "/public/:id",
    // checkInternalService(),
    AdminProjectController.getSingleProject
);

export const AdminProjectRoutes = router;
