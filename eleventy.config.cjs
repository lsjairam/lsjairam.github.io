const markdownIt = require("markdown-it");
const nunjucks = require("nunjucks");
const { isoDate, readingTime, articleSchema, validateNote } = require("./lib/notes.cjs");

module.exports = function (config) {
  config.setLibrary("njk", new nunjucks.Environment(new nunjucks.FileSystemLoader("_includes"), {
    autoescape: true,
  }));
  // No executable template expressions or raw HTML in authored Markdown.
  config.setLibrary("md", markdownIt({ html: false, linkify: true }));
  config.addPreprocessor("validate-notes", "md", (data, content) => {
    if (!data.page.inputPath.replace(/\\/g, "/").includes("/content/notes/")) return;
    validateNote(data);
    if (data.status === "published" && !content.trim()) throw new Error("Published notes require an article body");
  });
  for (const path of ["assets", "css", "js", "Samples", "admin", "CNAME"]) config.addPassthroughCopy(path);
  config.addPassthroughCopy({ "*.html": "." });
  config.addPassthroughCopy({ ".cms-build/*.js": "admin" });
  config.addPassthroughCopy({ ".cms-build/*.wasm": "admin" });
  config.addPassthroughCopy({ ".cms-build/*.woff*": "admin" });
  config.addPassthroughCopy({ ".cms-build/*.LICENSE.txt": "admin" });
  config.ignores.add(".cms-build/**");
  config.ignores.add("cms/**");
  config.ignores.add("README.md");
  config.ignores.add("docs/**");
  config.ignores.add("auth/**");
  config.ignores.add("tests/**");
  config.addWatchTarget("lib");
  config.addFilter("isoDate", isoDate);
  config.addFilter("readableDate", (date) => new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(isoDate(date) + "T00:00:00Z")));
  config.addFilter("readingTime", readingTime);
  config.addFilter("articleSchema", articleSchema);
  config.addCollection("notes", (collection) => collection.getFilteredByGlob("./content/notes/*.md")
    .filter((note) => note.data.isLive).sort((a, b) =>
      isoDate(b.data.date).localeCompare(isoDate(a.data.date)) || a.fileSlug.localeCompare(b.fileSlug)));
  return {
    dir: { input: ".", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: false,
  };
};

