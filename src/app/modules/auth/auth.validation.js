import { z } from "zod";

const loginSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email address" }),
        password: z.string().min(1, { message: "Password is required" }),
    }),
});

const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email address" }),
    }),
});

const verifyForgotPasswordOtpSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email address" }),
        otp: z.string().length(6, { message: "OTP must be 6 digits" }),
    }),
});

const resetPasswordSchema = z.object({
    body: z.object({
        newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
    }),
});

const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z.string().min(1, { message: "Old password is required" }),
        newPassword: z.string().min(6, { message: "New password must be at least 6 characters" }),
    }),
});

export const AuthValidation = {
    loginSchema,
    forgotPasswordSchema,
    verifyForgotPasswordOtpSchema,
    resetPasswordSchema,
    changePasswordSchema,
};
