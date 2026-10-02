const { isPublished, validateNote } = require("../../lib/notes.cjs");
module.exports = {
  layout: "note.njk",
  eleventyComputed: {
    isLive: (data) => {
      validateNote(data);
      return isPublished(data);
    },
    permalink: (data) => data.isLive ? "/blog/" + data.page.fileSlug + "/index.html" : false,
    eleventyExcludeFromCollections: (data) => !data.isLive,
  },
};

