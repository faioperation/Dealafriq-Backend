
import { StatusCodes } from "http-status-codes";
import prisma from "../../../prisma/client.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { TeamService } from "./team.service.js";


export const TeamController = {
  createTeam: catchAsync(async (req, res) => {
    const result = await TeamService.createTeam(
      prisma,
      req.body,
      req.user.id
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Team created successfully",
      data: result,
    });
  }),

  getAllTeams: catchAsync(async (req, res) => {
    const result = await TeamService.getAllTeams(prisma);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Teams retrieved successfully",
      data: result,
    });
  }),

  getSingleTeam: catchAsync(async (req, res) => {
    const result = await TeamService.getSingleTeam(
      prisma,
      req.params.id
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Team retrieved successfully",
      data: result,
    });
  }),

  updateTeam: catchAsync(async (req, res) => {
    const result = await TeamService.updateTeam(
      prisma,
      req.params.id,
      req.body,
      req.user.id
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Team updated successfully",
      data: result,
    });
  }),

  deleteTeam: catchAsync(async (req, res) => {
    const result = await TeamService.deleteTeam(
      prisma,
      req.params.id,
      req.user.id
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Team deleted successfully",
      data: result,
    });
  }),
};