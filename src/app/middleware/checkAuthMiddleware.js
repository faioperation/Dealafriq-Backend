

import jwt from "jsonwebtoken";
import prisma from "../prisma/client.js";
import { envVars } from "../config/env.js";

export const checkAuthMiddleware =
  (...allowedRoles) =>
    async (req, res, next) => {
      console.log("🔥 Auth middleware hit:", req.originalUrl);

      try {
        let token = req.headers.authorization;

        if (!token) {
          return res.status(401).json({
            success: false,
            message: "No token provided",
          });
        }

        const jwtToken = token.replace(/^Bearer\s*/i, "");
        const decoded = jwt.verify(jwtToken, envVars.JWT_SECRET_TOKEN);

        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "User not found",
          });
        }

        if (allowedRoles.length && !allowedRoles.includes(user.role)) {
          return res.status(403).json({
            success: false,
            message: "Forbidden",
          });
        }

        // New check: Validate token version
        if (decoded.tokenVersion !== user.tokenVersion) {
          return res.status(401).json({
            success: false,
            message: "Token is invalid (logged out or version mismatch)",
          });
        }

        if (!user.isVerified) {
          return res.status(403).json({
            success: false,
            message: "User is not verified. Please verify your email.",
          });
        }

        req.user = user;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }
    };
