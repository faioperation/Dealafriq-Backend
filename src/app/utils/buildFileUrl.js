import { envVars } from "../config/env.js";

export const buildFileUrl = (filePath, req) => {
  const baseUrl = envVars.BACKEND_URL || (req && `${req.protocol}://${req.get("host")}`);
  if (!baseUrl) {
    throw new Error("BACKEND_URL is not configured and request object is not available to build URL.");
  }

  const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");
  const trimmedFilePath = filePath.replace(/^\/+/, "");

  return `${trimmedBaseUrl}/${trimmedFilePath}`;
};
