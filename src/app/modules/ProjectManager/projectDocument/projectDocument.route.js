import express from "express";
import { ProjectDocumentController } from "./projectDocument.controller.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { ProjectDocumentValidation } from "./projectDocument.validation.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { createMulterUpload } from "../../../config/multer.config.js";

const router = express.Router();
const upload = createMulterUpload("project-documents");

// General Documents
router.post(
    "/upload-document",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    upload.array("document", 10),
    validateRequest(ProjectDocumentValidation.uploadDocumentSchema),
    ProjectDocumentController.uploadDocument,
);

router.get(
    "/documents/project/:projectId",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectDocumentController.getAllDocuments,
);

router.delete(
    "/documents/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectDocumentController.deleteDocument,
);

router.patch(
    "/documents/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    validateRequest(ProjectDocumentValidation.updateDocumentSchema),
    ProjectDocumentController.updateDocument,
);

export const ProjectDocumentRoutes = router;
