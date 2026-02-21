
import { createUserService, UserService } from "./user.service.js";

import { StatusCodes } from "http-status-codes";
import DevBuildError from "../../lib/DevBuildError.js";
import prisma from "../../prisma/client.js";
import { sendResponse } from "../../utils/sendResponse.js";


const registerUser = async (req, res, next) => {
  try {
    const picture = req.file ? {
      url: `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`,
      path: `uploads/avatars/${req.file.filename}`
    } : null;
    const payload = {
      prisma,
      ...req.body,
      picture,
    };

    const result = await createUserService(payload);

    sendResponse(res, {
      success: true,
      message: "User registered successfully. OTP has been sent to your email for verification.",
      statusCode: StatusCodes.CREATED,
      data: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        message: result.message,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUserInfo = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user.id;

    const user = await UserService.findUserInfoById(prisma, userId);

    if (!user) {
      throw new DevBuildError("User not found", 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};



// User details by ID
const userDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await UserService.findByIdWithProfile(prisma, id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsersWithProfile = async (req, res) => {
  try {
    const users = await UserService.findAllWithProfile(prisma);

    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("getAllUsersWithProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      isActive,
      isDeleted,
      role,
      isVerified,
      oauthProvider,
      oauthProviderId,
      tokenVersion,
      createdAt,
      updatedAt,
      deletedAt,
      forgotPasswordStatus,
      passwordHash,
      id,
      ...allowedUpdates
    } = req.body;

    // Handle profile picture update if a new file is uploaded
    if (req.file) {
      const avatarUrlPath = `uploads/avatars/${req.file.filename}`;
      const avatarUrl = `${req.protocol}://${req.get('host')}/${avatarUrlPath}`;
      allowedUpdates.avatarUrl = avatarUrl;
      allowedUpdates.avatarUrlPath = avatarUrlPath;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: allowedUpdates,
      });

      // Sync to ProjectManager if it exists
      if (allowedUpdates.firstName || allowedUpdates.lastName) {
        await tx.projectManager.updateMany({
          where: { userId: user.id },
          data: {
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      }

      return user;
    });

    // Manually exclude fields from response since `omit` might not differ in runtime or to be extra safe
    const userResponse = { ...updatedUser };
    const restrictedFields = [
      "isActive",
      "isDeleted",
      "role",
      "isVerified",
      "oauthProvider",
      "oauthProviderId",
      "tokenVersion",
      "forgotPasswordStatus",
      "passwordHash"
    ];

    restrictedFields.forEach(field => delete userResponse[field]);

    sendResponse(res, {
      success: true,
      message: "Profile updated successfully",
      statusCode: StatusCodes.OK,
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { userId, ...data } = req.body;

    // This is a generic update, typically for ADMIN use. 
    // For self-update, use updateProfile.

    if (!userId) {
      throw new DevBuildError("userId is required", StatusCodes.BAD_REQUEST);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data,
      });

      // Sync to ProjectManager if it exists
      if (data.firstName || data.lastName) {
        await tx.projectManager.updateMany({
          where: { userId: user.id },
          data: {
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      }

      return user;
    });

    sendResponse(res, {
      success: true,
      message: "User updated successfully",
      statusCode: StatusCodes.OK,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    const { id } = req.user;

    if (!req.file) {
      throw new DevBuildError("No file uploaded", 400);
    }

    const avatarUrlPath = `uploads/avatars/${req.file.filename}`;
    const avatarUrl = `${req.protocol}://${req.get('host')}/${avatarUrlPath}`;
    const result = await UserService.updateAvatar(prisma, id, avatarUrl, avatarUrlPath);

    sendResponse(res, {
      success: true,
      message: "Avatar uploaded successfully",
      statusCode: StatusCodes.OK,
      data: {
        avatarUrl,
        avatarUrlPath,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const UserController = { registerUser, userDetails, getAllUsersWithProfile, updateUser, getUserInfo, uploadAvatar, updateProfile };
