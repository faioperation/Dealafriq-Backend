import express from "express";
import { AdminClientController } from "./adminClient.controller.js";

const router = express.Router();

// Public route to get clients by Project Manager ID
router.get(
    "/by-pm/:projectManagerId",
    AdminClientController.getClientsByProjectManagerIdController
);

// Public route to get all clients
router.get(
    "/all",
    AdminClientController.getAllClientsController
);

// Public route to get a single client by ID
router.get(
    "/:clientId",
    AdminClientController.getClientByIdController
);

export const AdminClientRoutes = router;
