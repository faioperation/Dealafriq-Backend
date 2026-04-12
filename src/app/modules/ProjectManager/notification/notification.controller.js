import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { NotificationService } from "./notification.service.js";
import prisma from "../../../prisma/client.js";

//Get all notifications for the current user
const getNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.getNotifications(prisma, req.user.id, req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notifications fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

//Mark a notification as read
const markAsRead = catchAsync(async (req, res) => {
  const result = await NotificationService.markAsRead(prisma, req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notification marked as read successfully",
    data: result,
  });
});

//Mark all notifications as read
const markAllAsRead = catchAsync(async (req, res) => {
  const result = await NotificationService.markAllAsRead(prisma, req.user.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All notifications marked as read successfully",
    data: result,
  });
});

export const NotificationController = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
