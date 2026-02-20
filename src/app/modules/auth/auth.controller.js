import DevBuildError from "../../lib/DevBuildError.js";
import { AuthService, forgotPasswordService } from "./auth.service.js";
import { OtpService } from "../otp/otp.service.js";
import jwt from "jsonwebtoken";
import { envVars } from "../../config/env.js";
import { createUserTokens } from "../../utils/userTokenGenerator.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { setAuthCookie } from "../../utils/setCookie.js";
import { StatusCodes } from "http-status-codes";
import passport from "passport";
import prisma from "../../prisma/client.js";

const credentialLogin = async (req, res, next) => {
  try {
    passport.authenticate("local", async (err, user, info) => {
      try {
        if (err) {
          return next(new DevBuildError(err, StatusCodes.UNAUTHORIZED));
        }

        if (!user) {
          return next(
            new DevBuildError(
              info?.message || "Authentication failed",
              StatusCodes.FORBIDDEN
            )
          );
        }

        // Generate access & refresh tokens
        const userToken = await createUserTokens(user);

        // Remove sensitive fields before sending user
        const { passwordHash, ...saveUser } = user;

        // Set cookies
        setAuthCookie(res, userToken);

        // Send response
        sendResponse(res, {
          success: true,
          message: "User logged in successfully",
          statusCode: StatusCodes.OK,
          data: {
            accessToken: userToken.accessToken,
            refreshToken: userToken.refreshToken,
            user: saveUser,
          },
        });
      } catch (innerError) {
        next(innerError);
      }
    })(req, res, next);
  } catch (error) {
    next(error);
  }
};

// ✅ Refresh Token

const getNewAccessToken = async (req, res, next) => {
  try {
    // const prisma = req.app.get("prisma"); // REMOVED
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new DevBuildError(
        "No refresh token received from cookies",
        StatusCodes.BAD_REQUEST
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, envVars.JWT_REFRESH_TOKEN);
    } catch (err) {
      throw new DevBuildError("Invalid refresh token", StatusCodes.FORBIDDEN);
    }

    const user = await AuthService.findById(prisma, decoded.id);

    if (!user) {
      throw new DevBuildError("User not found", StatusCodes.NOT_FOUND);
    }

    if (!user.isVerified) {
      throw new DevBuildError(
        "User is not verified. Please verify your email.",
        StatusCodes.FORBIDDEN
      );
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion },
      envVars.JWT_SECRET_TOKEN,
      { expiresIn: envVars.JWT_EXPIRES_IN }
    );

    setAuthCookie(res, {
      accessToken: newAccessToken,
      refreshToken,
    });

    sendResponse(res, {
      success: true,
      message: "New access token retrieved successfully",
      statusCode: StatusCodes.OK,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // Invalidate user tokens by incrementing version
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { tokenVersion: { increment: 1 } }
      });
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    sendResponse(res, {
      success: true,
      message: "User logged out successfully",
      statusCode: StatusCodes.OK,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    // const prisma = req.app.get("prisma"); // REMOVED
    const { email } = req.body;

    if (!email) {
      return sendResponse(res, {
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Email is required",
        data: null,
      });
    }

    await forgotPasswordService(prisma, email);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Forgot password OTP sent successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    // const prisma = req.app.get("prisma"); // REMOVED
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendResponse(res, {
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Email and OTP are required",
        data: null,
      });
    }

    const resetToken = await OtpService.verifyForgotPasswordOtp(prisma, email, otp);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "OTP verified successfully",
      data: { resetToken },
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { newPassword } = req.body;

    if (!newPassword) {
      return sendResponse(res, {
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "newPassword is required",
        data: null,
      });
    }

    const payload = { id, newPassword };

    await AuthService.resetPassword(payload);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Password reset successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const googleCallback = async (req, res, next) => {
  try {
    let redirectTo = req.query.state ? String(req.query.state) : "";

    // Prevent open redirect issues
    if (redirectTo.startsWith("/")) {
      redirectTo = redirectTo.slice(1);
    }

    const user = req.user; // comes from Passport Google Strategy

    if (!user) {
      throw new DevBuildError("User not found", StatusCodes.NOT_FOUND);
    }

    // Generate tokens
    const tokenInfo = await createUserTokens(user);

    // Set auth cookies
    setAuthCookie(res, tokenInfo);

    // Redirect to frontend
    res.redirect(`${envVars.FRONT_END_URL}/${redirectTo}`);
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new DevBuildError(
        "Both oldPassword and newPassword are required",
        StatusCodes.BAD_REQUEST
      );
    }

    await AuthService.changePassword(id, oldPassword, newPassword);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Password changed successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const getGoogleUrl = async (req, res, next) => {
  try {
    const redirect = req.query.redirect || "/";
    const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const params = new URLSearchParams({
      client_id: envVars.GOOGLE_CLIENT_ID,
      redirect_uri: envVars.GOOGLE_CALLBACK_URL,
      response_type: "code",
      scope: "profile email",
      state: redirect,
      access_type: "offline",
      prompt: "consent",
    });

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Google login URL retrieved successfully",
      data: {
        url: `${baseUrl}?${params.toString()}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const AuthController = {
  credentialLogin,
  getNewAccessToken,
  logout,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  googleCallback,
  changePassword,
  getGoogleUrl,
};
