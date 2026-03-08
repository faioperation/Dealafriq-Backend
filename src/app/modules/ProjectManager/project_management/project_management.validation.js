import { z } from "zod";

const parseJSON = (val) => {
    if (typeof val === "string") {
        try {
            return JSON.parse(val);
        } catch (e) {
            return val;
        }
    }
    return val;
};

const parseMeetings = (val) => {
    let parsed = val;
    if (typeof val === "string") {
        try {
            parsed = JSON.parse(val);
        } catch (e) {
            // Handle single URL or comma-separated URLs
            if (val.trim().startsWith("http")) {
                parsed = val.split(",").map((v) => v.trim());
            }
        }
    }

    if (typeof parsed === "string") {
        return [{ meetingUrl: parsed }];
    }

    if (Array.isArray(parsed)) {
        return parsed.map((item) => {
            if (typeof item === "string") {
                return { meetingUrl: item };
            }
            return item;
        });
    }

    return parsed;
};

const createProjectSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
        weeklyMeetingSummary: z.string().optional(),
        health: z.preprocess(parseJSON, z.array(z.object({
            field: z.enum(["OVERALL_STATUS", "BUDGET_STATUS", "TEAM_SENTIMENT"]),
            healthStatus: z.enum(["ON_TRACK", "PENDING", "AT_RISK", "OFF_TRACK", "GOOD", "EXCELLENT", "LOW"]),
            score: z.number().int().optional(),
            status: z.string().optional(),
        }))).optional(),
        meetings: z.preprocess(parseMeetings, z.array(z.object({
            title: z.string().optional(),
            meetingUrl: z.string().url("Invalid meeting URL").optional().or(z.literal("")),
            meetingDate: z.string().optional(),
        }))).optional(),
        documents: z.preprocess(parseJSON, z.array(z.object({
            fileName: z.string().optional(),
            filePath: z.string().optional(),
            fileUrl: z.string().url().optional(),
            title: z.string().optional(),
        }))).optional(),
        agreements: z.preprocess(parseJSON, z.array(z.object({
            fileName: z.string().optional(),
            filePath: z.string().optional(),
            fileUrl: z.string().url().optional(),
            fileType: z.string().optional(),
        }))).optional(),
    }),
});

const updateProjectSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["DRAFT", "IN_PROGRESS", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
        weeklyMeetingSummary: z.string().optional(),
    }),
});

export const ProjectManagerProjectValidation = {
    createProjectSchema,
    updateProjectSchema,
};
