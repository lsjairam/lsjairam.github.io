import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { assertCmsModules } from "../lib/cms-security.cjs";
import { cmsAssetPath } from "../lib/cms-assets.cjs";
test("preview resolves site uploads as repository assets without rewriting external URLs", () => {
  assert.equal(cmsAssetPath("/assets/uploads/test-cover.svg"), "test-cover.svg");
  for (const path of ["https://example.com/image.png", "/assets/portfolio-building.jpg", "image.png", null]) {
    assert.equal(cmsAssetPath(path), path);
  }
});
const safe = [
  { name: "trim", version: "0.0.3", files: ["/index.js"] },
  { name: "uuid", version: "11.1.1", files: ["/dist/esm-browser/v4.js"] },
];
test("CMS module guard rejects vulnerable versions and prebuilt distributions", () => {
  assert.doesNotThrow(() => assertCmsModules(safe));
  for (const item of [
    { name: "@platejs/core", version: "49.2.21", files: [] },
    { name: "decap-cms", version: "3.16.3", files: [] },
    { name: "decap-cms-backend-test", version: "3.5.3", files: [] },
    { name: "decap-cms-core", version: "3.19.1", files: ["/dist/decap-cms-core.js"] },
    { name: "trim", version: "0.0.1", files: [] },
    { name: "uuid", version: "8.3.2", files: [] },
  ]) assert.throws(() => assertCmsModules([...safe, item]));
  assert.throws(() => assertCmsModules([]));
});
test("actual browser build contains patched modules and matches its manifest", async () => {
  const manifest = JSON.parse(await readFile(new URL("../.cms-build/build-manifest.json", import.meta.url), "utf8"));
  assertCmsModules(manifest.packages);
  assert.ok(manifest.packages.some(item => item.name === "decap-cms-backend-github"));
  assert.ok(manifest.packages.some(item => item.name === "decap-cms-widget-markdown"));
  for (const asset of manifest.assets) {
    assert.ok(!asset.name.includes("/") && !asset.name.endsWith(".map"));
    const contents = await readFile(new URL("../.cms-build/" + asset.name, import.meta.url));
    assert.equal(createHash("sha256").update(contents).digest("hex"), asset.sha256);
  }
  assert.ok(manifest.assets.some(asset => asset.name === "decap-cms.js"));
});
