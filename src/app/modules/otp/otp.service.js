import crypto from "crypto";
import jwt from "jsonwebtoken";
import { envVars } from "../../config/env.js";
import { redisClient } from "../../config/redis.config.js";
import DevBuildError from "../../lib/DevBuildError.js";
import { sendEmail } from "../../utils/sendEmail.js";

const OTP_EXPIRATION = 2 * 60; // 2 minutes

// HELPERS for OTP generation

const generateOtp = (length = 6) =>
  crypto.randomInt(10 ** (length - 1), 10 ** length).toString();


export const OtpService = {
  // ✅ Send OTP
  sendOtp: async (prisma, email, name) => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isVerified: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new DevBuildError("User not found", 404);
    }

    if (user.isVerified) {
      throw new DevBuildError("You are already verified", 401);
    }

    const otp = generateOtp();
    const redisKey = `otp:${email}`;

    await redisClient.set(redisKey, otp, {
      EX: OTP_EXPIRATION,
    });

    const displayName = name || (user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName);

    await sendEmail({
      to: email,
      subject: "Verification OTP",
      templateName: "otp",
      templateData: {
        name: displayName,
        otp,
      },
    });
  },

  // ✅ Verify OTP
  verifyOtp: async (prisma, email, otp) => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new DevBuildError("User not found", 404);
    }

    if (user.isVerified) {
      throw new DevBuildError("You are already verified", 401);
    }

    const redisKey = `otp:${email}`;
    const savedOtp = await redisClient.get(redisKey);

    if (!savedOtp) {
      throw new DevBuildError("Invalid or expired OTP", 401);
    }

    if (savedOtp !== otp) {
      throw new DevBuildError("Invalid OTP", 401);
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });
    await redisClient.del(redisKey);
  },

  // ✅ Send Forgot Password OTP
  sendForgotPasswordOtp: async (prisma, email) => {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new DevBuildError("User not found", 404);
    }

    if (!user.isVerified) {
      throw new DevBuildError("User is not verified", 401);
    }

    const otp = generateOtp();
    const redisKey = `forgot-password:${email}`;

    await redisClient.set(redisKey, otp, {
      EX: OTP_EXPIRATION,
    });

    const displayName = user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;

    await sendEmail({
      to: email,
      subject: "Forgot Password OTP",
      templateName: "forgotPassword",
      templateData: {
        name: displayName,
        otp,
      },
    });
  },

  // ✅ Verify Forgot Password OTP & Return Token
  verifyForgotPasswordOtp: async (prisma, email, otp) => {
    const redisKey = `forgot-password:${email}`;
    const savedOtp = await redisClient.get(redisKey);

    if (!savedOtp || savedOtp !== otp) {
      throw new DevBuildError("Invalid or expired OTP", 401);
    }

    // OTP is valid, generate a short-lived reset token
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new DevBuildError("User not found", 404);
    }

    const resetToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      envVars.JWT_SECRET_TOKEN,
      { expiresIn: "10m" }
    );

    await prisma.user.update({
      where: { email },
      data: { forgotPasswordStatus: true },
    });

    await redisClient.del(redisKey);
    return resetToken;
  },
};
