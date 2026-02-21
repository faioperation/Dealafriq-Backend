import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectTaskService } from "./projectTask.service.js";

const createTask = catchAsync(async (req, res) => {
    const result = await ProjectTaskService.createTask(prisma, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Task created successfully",
        data: result,
    });
});

const getAllTasks = catchAsync(async (req, res) => {
    const result = await ProjectTaskService.getAllTasks(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Tasks fetched successfully",
        data: result,
    });
});

const getSingleTask = catchAsync(async (req, res) => {
    const result = await ProjectTaskService.getSingleTask(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Task fetched successfully",
        data: result,
    });
});

const updateTask = catchAsync(async (req, res) => {
    const result = await ProjectTaskService.updateTask(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Task updated successfully",
        data: result,
    });
});

const deleteTask = catchAsync(async (req, res) => {
    const result = await ProjectTaskService.deleteTask(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Task deleted successfully",
        data: { id: req.params.id },
    });
});

export const ProjectTaskController = {
    createTask,
    getAllTasks,
    getSingleTask,
    updateTask,
    deleteTask,
};
