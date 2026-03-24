import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { GoogleCalendarService } from "./googleCalender.service.js";

const syncEvents = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.body;
    const result = await GoogleCalendarService.syncEvents(userId, projectId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Google Calendar events synced successfully",
        data: result,
    });
});

const getEvents = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.query;
    const result = await GoogleCalendarService.getEvents(userId, projectId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Google Calendar events fetched successfully",
        data: result,
    });
});

const deleteEvent = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    await GoogleCalendarService.deleteEvent(userId, id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Google Calendar event deleted successfully",
        data: null,
    });
});

export const GoogleCalendarController = {
    syncEvents,
    getEvents,
    deleteEvent,
};
