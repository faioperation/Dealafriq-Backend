import { TranscriptService } from "./transcript.service.js";


const uploadTranscriptController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Transcript file is required",
      });
    }

    const transcript = await TranscriptService.uploadTranscriptService(
      req.file,
      req.body.projectId
    );

    const filePath = transcript.filePath;
    const fileUrl = `${req.protocol}://${req.get("host")}/${filePath}`;

    res.status(201).json({
      success: true,
      message: "Transcript uploaded and parsed successfully",
      data: {
        ...transcript,
        fileUrl
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTranscriptsByProjectController = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const transcripts = await TranscriptService.getTranscriptsByProjectService(
      projectId
    );

    res.status(200).json({
      success: true,
      message: "Transcripts retrieved successfully",
      data: transcripts,
    });
  } catch (error) {
    next(error);
  }
};

export const TranscriptController = {
  uploadTranscriptController,
  getTranscriptsByProjectController,
};