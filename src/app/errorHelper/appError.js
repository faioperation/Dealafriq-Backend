export class AppError extends Error {
  constructor(statusCode, message, stack = "") {
    super(message);

    this.statusCode = statusCode;
    this.name = "AppError";

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}


