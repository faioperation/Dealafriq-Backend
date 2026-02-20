import { AppError } from "../errorHelper/appError.js";

class DevBuildError extends AppError {
    constructor(message, statusCode) {
        super(statusCode, message);
    }
}

export default DevBuildError;