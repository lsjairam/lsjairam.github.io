import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const root = resolve(".");
test("real site build generates articles and index, excludes drafts, and preserves static pages", async () => {
  const temp = await mkdtemp(join(tmpdir(), "engrllamas-build-"));
  const input = join(temp, "source");
  const output = join(temp, "output");
  await mkdir(input);
  try {
    // Run the actual configuration against an isolated source copy.
    for (const path of ["_includes", "_data", "templates", "content", "lib", "admin", "css", "js", "CNAME",
      "index.html", "about.html", "cv.html", "artifacts.html", "contact.html"]) {
      await cp(join(root, path), join(input, path), { recursive: true });
    }
    // Directory data imports the copied lib; package imports in config resolve from the real repo.
    const fixture = (title, status, date, body) => "---\n" + YAML.stringify({
      title, status, date, category: "Document Control", summary: 'Summary with "quotes" & symbols',
      cover_image: "/assets/uploads/test.svg", cover_alt: "Drawing register example",
      seo: { title: "Custom SEO title", description: "Custom SEO description" },
    }) + "---\n\n" + body;
    await mkdir(join(input, "assets/uploads"), { recursive: true });
    await writeFile(join(input, "assets/uploads/test.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240"><rect width="640" height="240" fill="#1759b7"/></svg>');
    await writeFile(join(input, "content/notes/build-test-note.md"), fixture('A note & "title"', "published", "2020-01-02",
      "## Practical heading\n\nA **Markdown** article with a [link](/artifacts.html).\n\n![Inline image](/assets/uploads/test.svg)\n\n{{ 7 * 7 }}\n\n<script>alert(1)</script>"));
    await writeFile(join(input, "content/notes/build-test-draft.md"), fixture("Never publish this draft", "draft", "2020-01-03", "DRAFT BODY"));
    await writeFile(join(input, "content/notes/build-test-future.md"), fixture("Never publish this future note", "published", "2099-01-03", "FUTURE BODY"));
    const result = spawnSync(process.execPath, [
      join(root, "node_modules/@11ty/eleventy/cmd.cjs"),
      "--output=" + output, "--config=" + join(root, "eleventy.config.cjs"),
    ], { cwd: input, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.ok((await readdir(join(output, "blog"))).includes("build-test-note"), result.stdout + result.stderr);
    const index = await readFile(join(output, "blog/index.html"), "utf8");
    const article = await readFile(join(output, "blog/build-test-note/index.html"), "utf8");
    assert.ok(index.includes("/blog/build-test-note/"));
    assert.ok(index.includes("A note &amp;"));
    assert.ok(!index.includes("Never publish this"));
    assert.ok(article.includes("<h2>Practical heading</h2>"));
    assert.ok(article.includes("<strong>Markdown</strong>"));
    assert.ok(article.includes("{{ 7 * 7 }}"));
    assert.ok(!article.includes("<script>alert(1)</script>"));
    assert.ok(article.includes('href="https://engrllamas.com/blog/build-test-note/"'));
    assert.ok(article.includes("Custom SEO description"));
    assert.ok(article.includes('src="/assets/uploads/test.svg"'));
    const structured = JSON.parse(article.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(structured.headline, "Custom SEO title");
    assert.equal(structured.datePublished, "2020-01-02");
    const directories = await readdir(join(output, "blog"));
    assert.ok(!directories.includes("build-test-draft"));
    assert.ok(!directories.includes("build-test-future"));
    const sitemap = await readFile(join(output, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes("/blog/build-test-note/"));
    assert.ok(!sitemap.includes("draft") && !sitemap.includes("future"));
    for (const path of ["index.html", "about.html", "cv.html", "artifacts.html", "contact.html", "CNAME"]) {
      assert.deepEqual(await readFile(join(output, path)), await readFile(join(root, path)));
    }
    await assert.rejects(readFile(join(output, "auth/worker.mjs")));
    await assert.rejects(readFile(join(output, "content/notes/build-test-draft.md")));
    const cms = YAML.parse(await readFile(join(output, "admin/config.yml"), "utf8"));
    assert.equal(cms.backend.repo, "lsjairam/lsjairam.github.io");
    assert.equal(cms.publish_mode, "editorial_workflow");
    assert.equal(cms.public_folder, "/assets/uploads");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

