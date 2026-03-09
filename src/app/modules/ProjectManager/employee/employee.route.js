import express from "express";


import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { Role } from "../../../utils/role.js";
import { EmployeeController } from "./employee.controller.js";
import { EmployeeValidation } from "./employee.validation.js";

const router = express.Router();

router.post(
    "/create",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.PROJECT_MANAGER),
    validateRequest(EmployeeValidation.createEmployeeSchema),
    EmployeeController.createEmployee
);

router.get(
    "/all",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.PROJECT_MANAGER),
    EmployeeController.getAllEmployees
);

router.get(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.PROJECT_MANAGER),
    EmployeeController.getSingleEmployee
);

router.patch(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.PROJECT_MANAGER),
    validateRequest(EmployeeValidation.updateEmployeeSchema),
    EmployeeController.updateEmployee
);

router.delete(
    "/:id",
    checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER, Role.PROJECT_MANAGER),
    EmployeeController.deleteEmployee
);

export const EmployeeRoutes = router;
