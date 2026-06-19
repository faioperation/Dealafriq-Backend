import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { OutlookCalendarService } from "./outlookCalender.service.js";

const syncEvents = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.body;
    const result = await OutlookCalendarService.syncEvents(userId, projectId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Outlook Calendar events synced successfully",
        data: result,
    });
});

const getEvents = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { projectId } = req.query;
    const result = await OutlookCalendarService.getEvents(userId, projectId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Outlook Calendar events fetched successfully",
        data: result,
    });
});

const deleteEvent = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    await OutlookCalendarService.deleteEvent(userId, id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Outlook Calendar event deleted successfully",
        data: null,
    });
});

export const OutlookCalendarController = {
    syncEvents,
    getEvents,
    deleteEvent,
};
