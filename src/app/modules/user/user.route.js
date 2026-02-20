import express from "express";
import { createMulterUpload } from "../../config/multer.config.js";
import { checkAuthMiddleware } from "../../middleware/checkAuthMiddleware.js";
import validateRequest from "../../middleware/validateRequest.js";
import { Role } from "../../utils/role.js";
import { UserController } from "./user.controller.js";
import { UserValidation } from "./user.validation.js";

const upload = createMulterUpload("avatars");

const router = express.Router();

router.post("/register", upload.single("avatar"), validateRequest(UserValidation.registerUserSchema), UserController.registerUser);
router.get("/profile/me", checkAuthMiddleware(...Object.values(Role)), UserController.getUserInfo);

// router.get("/profile", checkAuthMiddleware(...Object.values(Role)) , UserController.getUserProfile);

router.get("/user-details/:id", checkAuthMiddleware(...Object.values(Role)), UserController.userDetails);

router.get("/all",checkAuthMiddleware(Role.ADMIN), UserController.getAllUsersWithProfile);

router.post("/update-user", checkAuthMiddleware(Role.SYSTEM_OWNER), UserController.updateUser);

router.patch(
    "/update-profile",
    checkAuthMiddleware(...Object.values(Role)),
    upload.single("avatar"),
    validateRequest(UserValidation.updateProfileSchema),
    UserController.updateProfile
);

router.patch(
    "/upload-avatar",
    checkAuthMiddleware(...Object.values(Role)),
    upload.single("avatar"),
    UserController.uploadAvatar
);

export const UserRoutes = router;
