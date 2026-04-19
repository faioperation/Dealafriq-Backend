import { StatusCodes } from "http-status-codes";
import { AppError } from "../errorHelper/appError.js";
import { envVars } from "../config/env.js";

/**
 * Middleware to check for a specific secret header.
 * Used to protect internal or AI-facing endpoints.
 */
export const checkInternalService = () => {
    return (req, res, next) => {
        const secretKey = req.headers["x-backend-service"];

        if (!secretKey || secretKey !== envVars.INTERNAL_BACKEND_SERVICE_KEY) {
            throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized access. Invalid or missing service key.");
        }
        next();
    };
};
