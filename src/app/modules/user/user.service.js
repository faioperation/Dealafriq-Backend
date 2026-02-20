import bcrypt from "bcrypt";
import { envVars } from "../../config/env.js";
import DevBuildError from "../../lib/DevBuildError.js";
import { Role } from "../../utils/role.js";
import { OtpService } from "../otp/otp.service.js";

export const UserService = {

  // BASIC FIND METHODS

  findByEmail: async (prisma, email) =>
    prisma.user.findUnique({ where: { email } }),

  findByUsername: async (prisma, username) =>
    prisma.user.findUnique({ where: { username } }),

  findById: async (prisma, id) =>
    prisma.user.findUnique({ where: { id } }),


  // ✅ ONLY USER INFO (NO PROFILE)

  findUserInfoById: async (prisma, id) =>
  prisma.user.findUnique({
    where: { id },
    omit: {
      passwordHash: true,
      forgotPasswordStatus: true,
      isVerified: true,
      isDeleted: true,
      oauthProvider: true,
      tokenVersion: true,
      oauthProviderId: true,
    },
  }),

  // UPDATE / DELETE

  update: async (prisma, id, data) =>
    prisma.user.update({
      where: { id },
      data,
    }),

  delete: async (prisma, id) =>
    prisma.user.delete({
      where: { id },
    }),


  // USER + FULL PROFILE

  findByIdWithProfile: async (prisma, id) =>
    prisma.user.findUnique({
      where: { id },
    }),

  findAllWithProfile: async (prisma) =>
    prisma.user.findMany({}),

  updateAvatar: async (prisma, id, avatarUrl, avatarUrlPath) =>
    prisma.user.update({
      where: { id },
      data: { avatarUrl, avatarUrlPath },
    }),
};


export const createUserService = async (payload) => {
  const { prisma, email, password, picture, firstName, lastName, ...rest } = payload;

  if (!email || !password) {
    throw new DevBuildError("Email and password are required", 400);
  }

  if (!firstName) {
    throw new DevBuildError("firstName is required", 400);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new DevBuildError("User already exists", 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    Number(envVars.BCRYPT_SALT_ROUND || 10)
  );

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      avatarUrl: picture?.url,
      avatarUrlPath: picture?.path,
      isVerified: false,
      role: Role.PROJECT_MANAGER, // Default role
      oauthProvider: "email",
      firstName,
      lastName,
      ...rest,
    },
  });

  // Send OTP for email verification
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  await OtpService.sendOtp(prisma, email, fullName);

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    message: "User registered successfully. OTP sent to your email.",
  };
};



