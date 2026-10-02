const CATEGORIES = ["Document Control", "Coordination", "QA/QC", "Project Controls", "Digital Practice"];
const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
function isoDate(value) {
  const result = value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "");
  const date = new Date(result + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(date.valueOf()) ||
      date.toISOString().slice(0, 10) !== result) throw new Error("Note date must be a valid YYYY-MM-DD date");
  return result;
}
function isPublished(data, currentDay = today()) {
  return data.status === "published" && isoDate(data.date) <= currentDay;
}
function validateNote(data) {
  for (const field of ["title", "summary", "category"]) {
    if (typeof data[field] !== "string" || !data[field].trim()) throw new Error("Note requires " + field);
  }
  if (!CATEGORIES.includes(data.category)) throw new Error("Unknown Notes category: " + data.category);
  if (!["draft", "published"].includes(data.status)) throw new Error("Note status must be draft or published");
  isoDate(data.date);
  if (data.cover_image && !data.cover_alt?.trim()) throw new Error("Cover image requires descriptive alternative text");
  for (const image of [data.cover_image, data.seo?.image].filter(Boolean)) {
    if (!/^\/assets\/uploads\/[^?#]+$/.test(image) || image.includes("..")) {
      throw new Error("Note images must use /assets/uploads/ paths");
    }
  }
}
function readingTime(content) {
  const words = String(content || "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
function articleSchema(data) {
  const url = "https://engrllamas.com" + data.page.url;
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: data.seo?.title || data.title,
    description: data.seo?.description || data.summary,
    datePublished: isoDate(data.date),
    author: { "@type": "Person", name: "L. J. Llamas", url: "https://engrllamas.com/about.html" },
    mainEntityOfPage: url, url,
    ...(data.seo?.image || data.cover_image ? { image: "https://engrllamas.com" + (data.seo?.image || data.cover_image) } : {}),
  }).replace(/</g, "\\u003c");
}
module.exports = { CATEGORIES, today, isoDate, isPublished, validateNote, readingTime, articleSchema };

