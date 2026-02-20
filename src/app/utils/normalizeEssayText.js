export const normalizeEssayText = (text = "") => {
  if (typeof text !== "string") return text;

  return text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
};
