import webpack from "webpack";
import config from "../cms/webpack.config.cjs";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { assertCmsModules } from "../lib/cms-security.cjs";

const compiler = webpack(config);
const stats = await new Promise((resolve, reject) => {
  compiler.run((error, result) => error ? reject(error) : resolve(result));
});
await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve()));
if (stats.hasErrors()) {
  console.error(stats.toString({ all: false, errors: true, errorDetails: true }));
  process.exitCode = 1;
} else {
  const packages = new Map();
  const seen = new Set();
  async function inspect(modules) {
    for (const item of modules) {
      if (seen.has(item)) continue;
      seen.add(item);
      if (item.modules) await inspect(item.modules);
      if (!item.resource) continue;
      const resource = item.resource.split("?")[0].replace(/\\/g, "/");
      const marker = "/node_modules/";
      const index = resource.lastIndexOf(marker);
      if (index < 0) continue;
      const pieces = resource.slice(index + marker.length).split("/");
      const name = pieces.slice(0, pieces[0].startsWith("@") ? 2 : 1).join("/");
      const root = resource.slice(0, index + marker.length) + name;
      if (!packages.has(root)) {
        const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
        packages.set(root, { name: pkg.name, version: pkg.version, files: [] });
      }
      packages.get(root).files.push("/" + relative(root, resource).replace(/\\/g, "/"));
    }
  }
  await inspect(stats.compilation.modules);
  const compiled = [...packages.values()].map(item => ({ ...item, files: [...new Set(item.files)].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  assertCmsModules(compiled);
  const assets = [];
  for (const asset of stats.compilation.getAssets()) {
    if (!/\.(?:js|wasm|woff2?|LICENSE\.txt)$/.test(asset.name)) continue;
    const contents = await readFile(join(config.output.path, asset.name));
    assets.push({ name: asset.name, sha256: createHash("sha256").update(contents).digest("hex") });
  }
  await writeFile(join(config.output.path, "build-manifest.json"), JSON.stringify({
    packages: compiled, assets: assets.sort((a, b) => a.name.localeCompare(b.name)),
  }, null, 2) + "\n");
  console.log("Verified patched CMS modules; no Plate or prebuilt Decap distributions.");
  console.log(stats.toString({ all: false, assets: true, warnings: true, timings: true }));
}
