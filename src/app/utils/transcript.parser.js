import fs from "fs";
import mammoth from "mammoth";

// VTT Parser
function parseVtt(filePath) {
  const content = fs.readFileSync(filePath, "utf8").replace(/\r/g, ""); // Normalize line endings
  const blocks = content.split(/\n\s*\n/); // Split by one or more empty lines

  const speeches = [];

  blocks.forEach((block) => {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l !== "");
    if (lines.length === 0 || lines[0] === "WEBVTT") return;

    // Find the line that actually contains the timestamp "-->"
    const timingIndex = lines.findIndex(line => line.includes(" --> "));
    if (timingIndex === -1) return;

    const [startTime, endTime] = lines[timingIndex].split(" --> ");
    
    // All lines after the timing line are considered the message text
    const textLines = lines.slice(timingIndex + 1);
    const fullText = textLines.join(" ").trim();

    if (fullText) {
      let speaker = "Unknown";
      let message = fullText;

      // Extract speaker if format is "Name: Message"
      if (fullText.includes(":")) {
        const colonIndex = fullText.indexOf(":");
        // Basic check to ensure colon isn't just part of a URL or time
        const potentialSpeaker = fullText.substring(0, colonIndex).trim();
        if (potentialSpeaker.length < 50) { // Speaker names are usually short
          speaker = potentialSpeaker;
          message = fullText.substring(colonIndex + 1).trim();
        }
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