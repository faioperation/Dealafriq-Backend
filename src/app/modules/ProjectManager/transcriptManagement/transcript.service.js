import path from "path";
import prisma from "../../../prisma/client.js";

import { TranscriptParser } from "../../../utils/transcript.parser.js";


//  parseVtt,
//     parseTxt,
//     parseDocx

const uploadTranscriptService = async (file, projectId) => {
  const ext = path.extname(file.originalname).toLowerCase();
  let parsedResult;

  if (ext === ".vtt") {
    parsedResult = TranscriptParser.parseVtt(file.path);
  } else if (ext === ".txt") {
    parsedResult = TranscriptParser.parseTxt(file.path);
  } else if (ext === ".docx") {
    parsedResult = await TranscriptParser.parseDocx(file.path);
  } else {
    throw new Error("Unsupported file type");
  }

  // Ensure file.path is relative to the project root for consistent storage in DB
  // Multer usually gives path like "src/uploads/..."
  const relativeFilePath = file.path.replace(/\\/g, "/");

  const transcript = await prisma.meetingTranscript.create({
    data: {
      platform: parsedResult.platform,
      fileName: file.originalname,
      filePath: relativeFilePath,
      fileType: ext.replace(".", ""),
      parsedData: parsedResult,
      projectId: projectId || null,
    },
  });

  return transcript;
};

const getTranscriptsByProjectService = async (projectId) => {
  const transcripts = await prisma.meetingTranscript.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return transcripts;
};

export const TranscriptService = {
  uploadTranscriptService,
  getTranscriptsByProjectService,
};