import express from "express";

import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

import validateRequest from "../../../middleware/validateRequest.js";

import { Role } from "../../../utils/role.js";
import { EmployeeController } from "./employee.controller.js";
import { EmployeeValidation } from "./employee.validation.js";

const router = express.Router();

router.post(
  "/create",
  checkAuthMiddleware(...Object.values(Role)),
  validateRequest(EmployeeValidation.createEmployeeSchema),
  EmployeeController.createEmployee
);

router.get(
  "/all",
  checkAuthMiddleware(...Object.values(Role)),
  EmployeeController.getAllEmployees
);

router.get(
  "/:id",
  checkAuthMiddleware(...Object.values(Role)),
  EmployeeController.getSingleEmployee
);

router.patch(
  "/:id",
  checkAuthMiddleware(...Object.values(Role)),
  validateRequest(EmployeeValidation.updateEmployeeSchema),
  EmployeeController.updateEmployee
);

router.delete(
  "/:id",
  checkAuthMiddleware(...Object.values(Role)),
  EmployeeController.deleteEmployee
);

router.post(
  "/approve/:id",
  checkAuthMiddleware(Role.ADMIN, Role.SYSTEM_OWNER),
  EmployeeController.approveEmployee
);

export const EmployeeRoutes = router;