import { Prisma } from "@prisma/client";
import { envVars } from "../config/env.js";
import { AppError } from "../errorHelper/appError.js";

const getPrismaErrorMessage = (code, meta) => {
  const errorMessages = {
    P2002: () => `Already exists: ${meta?.target?.join(", ") || "unknown field"}. Please use a different value.`,
    P2025: () => "Record not found. The resource you're looking for doesn't exist.",
    P2003: () => `Invalid reference: ${meta?.field_name || "unknown field"}. This relationship doesn't exist.`,
    P2014: () => `Invalid relation: The relation between records cannot be established.`,
    P2011: () => `Required field missing: ${meta?.column || "unknown field"}. This field cannot be null.`,
    P2012: () => `Missing required field: ${meta?.column || "unknown field"}. Please provide this value.`,
  };
  return errorMessages[code]
    ? errorMessages[code]()
    : "Database operation failed. Please try again.";
};

export const globalErrorHandler = (
  err,
  req,
  res,
  next
) => {
  if (envVars.NODE_ENV === "development") {
    console.error(err);
  }

  let statusCode = 500;
  let message = "Something went wrong!";
  let errorSource = [];

  // ✅ Zod Validation Errors
  if (err.isZodError) {
    statusCode = 400;
    message = "Validation error. Please check the fields below.";
    errorSource = err.errorSource || [];
  }

  // ✅ Prisma Known Errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    message = getPrismaErrorMessage(err.code, err.meta);
    
    switch (err.code) {
      case "P2002":
        statusCode = 409;
        break;
      case "P2025":
        statusCode = 404;
        break;
      case "P2003":
      case "P2014":
        statusCode = 400;
        break;
      case "P2011":
      case "P2012":
        statusCode = 400;
        break;
      default:
        statusCode = 400;
    }
  }

  // ✅ Prisma Validation Errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid data format. Please check your input.";
  }

  // ✅ Custom App Error
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // ✅ Native Error
  else if (err instanceof Error) {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(errorSource.length > 0 && { errorSource }),
    ...(envVars.NODE_ENV === "development" && { stack: err.stack }),
  });
};
