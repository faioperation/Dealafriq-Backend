import { envVars } from "../../config/env.js";
import { sendEmail } from "../../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import DevBuildError from "../../lib/DevBuildError.js";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcrypt";
import prisma from "../../prisma/client.js";
import { OtpService } from "../otp/otp.service.js";

export const AuthService = {

  findByEmail: async (prisma, email) =>
    prisma.user.findUnique({ where: { email } }),
  findByUsername: async (prisma, username) =>
    prisma.user.findUnique({ where: { username } }),
  findById: async (prisma, id) => prisma.user.findUnique({ where: { id } }),

  resetPassword: async (payload) => {
    const { id, newPassword } = payload;

    // 2️⃣ Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new DevBuildError("User does not exist", StatusCodes.FORBIDDEN);
    }

    // 2.1️⃣ Check forgotPasswordStatus
    if (!user.forgotPasswordStatus) {
      throw new DevBuildError(
        "Please verify your forgot password OTP first",
        StatusCodes.FORBIDDEN
      );
    }

    // 3️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      Number(envVars.BCRYPT_SALT_ROUND || 10)
    );

    // 4️⃣ Update password
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashedPassword,
        forgotPasswordStatus: false,
      },
    });

    return true;
  },

  changePassword: async (id, oldPassword, newPassword) => {
    // 1. Fetch user
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new DevBuildError("User not found", StatusCodes.NOT_FOUND);
    }

    // 2. If user has no passwordHash (social login user), they can't "change" it this way
    if (!user.passwordHash) {
      throw new DevBuildError(
        "Social login users cannot change password this way. Please set a password first or use forgot password.",
        StatusCodes.BAD_REQUEST
      );
    }

    // 3. Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new DevBuildError("Invalid old password", StatusCodes.UNAUTHORIZED);
    }

    // 4. Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      Number(envVars.BCRYPT_SALT_ROUND || 10)
    );

    // 5. Update password
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashedPassword,
      },
    });

    return true;
  },
};

export const forgotPasswordService = async (prisma, email) => {
  await prisma.user.update({
    where: { email },
    data: { forgotPasswordStatus: false },
  });
  await OtpService.sendForgotPasswordOtp(prisma, email);
  return true;
};
