import httpStatus from 'http-status-codes';
import { catchAsync } from '../../../utils/catchAsync.js';
import { sendResponse } from '../../../utils/sendResponse.js';
import { MeetingService } from './meeting.service.js';

/**
 * Get latest meeting controller
 */
const getLatestMeeting = catchAsync(async (req, res) => {
    const result = await MeetingService.getLatestMeeting();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Latest meeting retrieved successfully',
        data: result
    });
});

const getAllMeetings = catchAsync(async (req, res) => {
    const result = await MeetingService.getAllMeetings(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Meetings retrieved successfully',
        data: result
    });
});

/**
 * Get single meeting controller
 */
const getSingleMeeting = catchAsync(async (req, res) => {
    const result = await MeetingService.getSingleMeeting(req.params.id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Meeting retrieved successfully',
        data: result
    });
});

export const MeetingController = {
    getLatestMeeting,
    getAllMeetings,
    getSingleMeeting
};
