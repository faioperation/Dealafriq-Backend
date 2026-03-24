import express from "express";
import { ProjectChatbotController } from "./projectChatbot.controller.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import { Role } from "../../../utils/role.js";
import { fileUpload } from "../../../config/fileUpload.js";

const router = express.Router();

// POST   /project-manager/project-chatbot/send
// Use form-data: content (text), sender (text), agentName? (text), document? (file)
router.post(
    "/send",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    fileUpload.single("document"),
    ProjectChatbotController.createMessage,
);

// GET    /project-manager/project-chatbot/
router.get(
    "/all",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectChatbotController.getMyMessages,
);

// GET    /project-manager/project-chatbot/:id
router.get(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectChatbotController.getSingleMessage,
);

// PATCH  /project-manager/project-chatbot/:id
// Use form-data: content? (text), agentName? (text), document? (file)
router.patch(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    fileUpload.single("document"),
    ProjectChatbotController.updateMessage,
);

// DELETE /project-manager/project-chatbot/clear
router.delete(
    "/clear",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectChatbotController.clearMyMessages,
);

// DELETE /project-manager/project-chatbot/:id
router.delete(
    "/:id",
    checkAuthMiddleware(Role.PROJECT_MANAGER),
    ProjectChatbotController.deleteMessage,
);

export const ProjectChatbotRoutes = router;
