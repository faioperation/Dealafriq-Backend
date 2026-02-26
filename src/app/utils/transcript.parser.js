import fs from "fs";
import mammoth from "mammoth";

// VTT Parser
function parseVtt(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const blocks = content.split("\n\n");

  const speeches = [];

  blocks.forEach((block) => {
    const lines = block.split("\n");

    if (lines[0] && lines[0].includes("-->")) {
      const [startTime, endTime] = lines[0].split(" --> ");
      const textLine = lines[1] || "";

      let speaker = "Unknown";
      let message = textLine;

      if (textLine.includes(":")) {
        const colonIndex = textLine.indexOf(":");
        speaker = textLine.substring(0, colonIndex).trim();
        message = textLine.substring(colonIndex + 1).trim();
      }

      speeches.push({
        startTime,
        endTime,
        speaker,
        message,
      });
    }
  });

  return { platform: "zoom", speeches };
}

// TXT Parser
function parseTxt(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const speeches = lines
    .filter((line) => line.trim() !== "")
    .map((line) => {
      let speaker = "Unknown";
      let message = line;

      if (line.includes(":")) {
        const colonIndex = line.indexOf(":");
        speaker = line.substring(0, colonIndex).trim();
        message = line.substring(colonIndex + 1).trim();
      }

      return {
        speaker,
        message,
      };
    });

  return { platform: "unknown", speeches };
}

// DOCX Parser
async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value.split("\n");

  const speeches = lines
    .filter((line) => line.trim() !== "")
    .map((line) => {
      let speaker = "Unknown";
      let message = line;

      if (line.includes(":")) {
        const colonIndex = line.indexOf(":");
        speaker = line.substring(0, colonIndex).trim();
        message = line.substring(colonIndex + 1).trim();
      }

      return {
        speaker,
        message,
      };
    });

  return { platform: "google_meet", speeches };
}

export const TranscriptParser = {
  parseVtt,
  parseTxt,
  parseDocx,
};