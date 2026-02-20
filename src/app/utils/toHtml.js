export const toHtml = (text = "") => {
  return `${text
    .trim()
    .replace(/\n\s*\n/g, "")
    .replace(/\n/g, "<br/>")}`;
};