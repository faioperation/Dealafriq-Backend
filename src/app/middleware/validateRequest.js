import { ZodError } from "zod";

const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
                cookies: req.cookies,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorSource = error.errors.map((err) => ({
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
