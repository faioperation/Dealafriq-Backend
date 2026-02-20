import express from "express";
import { AuthController } from "./auth.controller.js";
import passport from "passport";
import { envVars } from "../../config/env.js";
import { Role } from "../../utils/role.js";
import { checkAuthMiddleware } from "../../middleware/checkAuthMiddleware.js";
import validateRequest from "../../middleware/validateRequest.js";
import { AuthValidation } from "./auth.validation.js";

const router = express.Router();
router.post("/login", validateRequest(AuthValidation.loginSchema), AuthController.credentialLogin);
router.post("/refresh-token", AuthController.getNewAccessToken);
router.post("/logout", AuthController.logout);
router.post("/forgot-password", validateRequest(AuthValidation.forgotPasswordSchema), AuthController.forgotPassword);
router.post("/verify-forgot-password-otp", validateRequest(AuthValidation.verifyForgotPasswordOtpSchema), AuthController.verifyForgotPasswordOtp);
router.post(
  "/reset-password",
  checkAuthMiddleware(...Object.values(Role)),
  validateRequest(AuthValidation.resetPasswordSchema),
  AuthController.resetPassword
);
router.post(
  "/change-password",
  checkAuthMiddleware(...Object.values(Role)),
  validateRequest(AuthValidation.changePasswordSchema),
  AuthController.changePassword
);
// Google login
router.get("/google/url", AuthController.getGoogleUrl);
router.get("/google", (req, res, next) => {
  let redirect = req.query.redirect || "/";

  if (typeof redirect === "string" && redirect.startsWith("/")) {
    redirect = redirect.slice(1);
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: redirect,
    session: false,
  })(req, res, next);
});

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${envVars.FRONT_END_URL}/login?error=Google login failed&isError=true`,
  }),
  AuthController.googleCallback
);

export const AuthRouter = router;
