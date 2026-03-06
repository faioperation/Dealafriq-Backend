import { ZodError } from "zod";

const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            const result = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
                cookies: req.cookies,
            });
            if (result.body) req.body = result.body;
            if (result.query) req.query = result.query;
            if (result.params) req.params = result.params;
            if (result.cookies) req.cookies = result.cookies;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues || error.errors || [];
                const errorSource = issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                }));
                const validationError = new Error("Validation failed");
                validationError.statusCode = 400;
                validationError.errorSource = errorSource;
                validationError.isZodError = true;
                next(validationError);
            } else {
                next(error);
            }
        }
    };
};

export default validateRequest;
