import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../utils/catchAsync.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { ProjectDocumentService } from "./projectDocument.service.js";
import prisma from "../../../prisma/client.js";

const uploadDocument = catchAsync(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new Error("Document files are required");
    }

    const { projectId, projectSummary, title } = req.body;
    let { keyPoints, actionPoints } = req.body;

    // Robust JSON parsing for multipart/form-data (handles single string or array of strings)
    const parseNestedData = (data) => {
        if (!data) return undefined;
        if (typeof data === "string") {
            try { return JSON.parse(data); } catch (e) { return undefined; }
        }
        if (Array.isArray(data)) {
            return data.map(item => {
                if (typeof item === "string") {
                    try { return JSON.parse(item); } catch (e) { return undefined; }
                }
                return item;
            }).filter(Boolean).flat();
        }
        return data;
    };

    keyPoints = parseNestedData(keyPoints);
    actionPoints = parseNestedData(actionPoints);

    const payloads = req.files.map(file => ({
        projectId,
        projectSummary,
        title,
        fileName: file.originalname,
        fileUrl: `${req.protocol}://${req.get("host")}/uploads/project-documents/${file.filename}`,
        filePath: `uploads/project-documents/${file.filename}`,
        keyPoints,
        actionPoints,
    }));

    const result = await ProjectDocumentService.uploadDocuments(prisma, payloads, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: `${result.length} document(s) uploaded successfully`,
        data: result,
    });
});

const getAllDocuments = catchAsync(async (req, res) => {
    const result = await ProjectDocumentService.getAllDocuments(prisma, req.params.projectId, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Documents fetched successfully",
        data: result,
    });
});

const deleteDocument = catchAsync(async (req, res) => {
    const result = await ProjectDocumentService.deleteDocument(prisma, req.params.id, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Document deleted successfully",
        data: result,
    });
});

const updateDocument = catchAsync(async (req, res) => {
    const result = await ProjectDocumentService.updateDocument(prisma, req.params.id, req.body, req.user.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Document updated successfully",
        data: result,
    });
});

export const ProjectDocumentController = {
    uploadDocument,
    getAllDocuments,
    deleteDocument,
    updateDocument,
};
