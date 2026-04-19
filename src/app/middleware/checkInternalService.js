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

        // Accept either the internal backend service key or the AI service identifier
        const allowedKeys = [
            envVars.INTERNAL_BACKEND_SERVICE_KEY,
            // If you later define a dedicated AI secret, you can add it here, e.g., envVars.AI_SERVICE_SECRET
        ];
        if (!secretKey || !allowedKeys.includes(secretKey)) {
            throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized access. Invalid or missing service key.");
        }
        next();
    };
};
