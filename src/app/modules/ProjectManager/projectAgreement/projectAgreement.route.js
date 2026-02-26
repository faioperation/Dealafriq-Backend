import express from "express";
import { ProjectAgreementController } from "./projectAgreement.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { ProjectAgreementValidation } from "./projectAgreement.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { slaUpload } from "../../../config/slaUpload.js";

const router = express.Router();

router.post(
    "/upload",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    slaUpload.array("agreement", 10),
    validateRequest(ProjectAgreementValidation.uploadAgreementSchema),
    ProjectAgreementController.uploadAgreement,
);

router.get(
    "/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectAgreementController.getAllAgreements,
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectAgreementController.getSingleAgreement,
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectAgreementController.deleteAgreement,
);

export const ProjectAgreementRoutes = router;
