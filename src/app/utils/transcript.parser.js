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

      const [speaker, ...messageParts] = textLine.split(":");

      speeches.push({
        startTime,
        endTime,
        speaker: speaker?.trim() || "Unknown",
        message: messageParts.join(":").trim(),
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
      const [speaker, ...messageParts] = line.split(":");

      return {
        speaker: speaker?.trim() || "Unknown",
        message: messageParts.join(":").trim(),
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
      const [speaker, ...messageParts] = line.split(":");

      return {
        speaker: speaker?.trim() || "Unknown",
        message: messageParts.join(":").trim(),
      };
    });

  return { platform: "google_meet", speeches };
}

export const TranscriptParser = {
  parseVtt,
  parseTxt,
  parseDocx,
};