import jwt from "jsonwebtoken";
import { envVars } from "../config/env.js";


// JWT Token Generate Function
export const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
       envVars.JWT_SECRET_TOKEN,
        { expiresIn:envVars.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
       envVars.JWT_REFRESH_TOKEN,
        { expiresIn:envVars.JWT_REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
};