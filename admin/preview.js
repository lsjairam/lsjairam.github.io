/* Decap provides React and createClass for its preview extensions. */
(function () {
  CMS.registerPreviewStyle("/css/archivo.css");
  CMS.registerPreviewStyle("/css/portfolio.css");
  CMS.registerPreviewStyle("/css/notes.css");
  var h = window.h;
  var Preview = window.createClass({
    render: function () {
      var entry = this.props.entry;
      var data = entry.get("data");
      var cover = data.get("cover_image");
      var date = data.get("date");
      return h("article", {},
        h("header", { className: "page-hero site-width note-hero" },
          h("p", { className: "eyebrow" }, "Notes · " + (data.get("category") || "")),
          h("h1", {}, data.get("title") || "Untitled note"),
          h("p", { className: "page-lead" }, data.get("summary") || ""),
          h("p", { className: "note-byline" }, "L. J. Llamas · " + (date ? String(date).slice(0, 10) : ""))),
        h("div", { className: "site-width note-content" },
          cover ? h("figure", { className: "note-cover" },
            h("img", { src: this.props.getAsset(cover).toString(), alt: data.get("cover_alt") || "" }),
            data.get("cover_caption") ? h("figcaption", {}, data.get("cover_caption")) : null) : null,
          h("div", { className: "note-body" }, this.props.widgetFor("body"))));
    },
  });
  CMS.registerPreviewTemplate("notes", Preview);
})();

