import test from "node:test";
import assert from "node:assert/strict";
import notes from "../lib/notes.cjs";
const note = { title: "A note", date: "2026-10-02", category: "Document Control", summary: "Summary", status: "published" };
test("drafts and future notes never publish", () => {
  assert.equal(notes.isPublished(note, "2026-10-02"), true);
  assert.equal(notes.isPublished({ ...note, status: "draft" }, "2026-10-02"), false);
  assert.equal(notes.isPublished({ ...note, date: "2026-10-03" }, "2026-10-02"), false);
  assert.equal(notes.isPublished({ ...note, status: undefined }, "2026-10-02"), false);
});
test("invalid dates, missing metadata, and inaccessible covers fail the build", () => {
  assert.throws(() => notes.validateNote({ ...note, date: "2026-02-30" }));
  assert.throws(() => notes.validateNote({ ...note, summary: "" }));
  assert.throws(() => notes.validateNote({ ...note, category: "Unknown" }));
  assert.throws(() => notes.validateNote({ ...note, cover_image: "/assets/uploads/test.jpg" }));
  assert.throws(() => notes.validateNote({ ...note, cover_image: "javascript:alert(1)", cover_alt: "Cover" }));
  assert.doesNotThrow(() => notes.validateNote({ ...note, cover_image: "/assets/uploads/test.jpg", cover_alt: "Cover" }));
});
test("structured metadata cannot close its script element", () => {
  const value = notes.articleSchema({ ...note, title: "</script><script>alert(1)</script>", page: { url: "/blog/a-note/" } });
  assert.ok(!value.includes("<"));
  assert.equal(JSON.parse(value).headline, "</script><script>alert(1)</script>");
});

