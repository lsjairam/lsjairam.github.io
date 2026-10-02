// Serve an isolated QA harness and the actual production assets on loopback only.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import webpack from "webpack";
import production from "../cms/webpack.config.cjs";

const testRoot = resolve(".test-output/cms-browser");
const siteRoot = resolve("_site");
const compiler = webpack({ ...production,
  entry: "./tests/browser/backend.js", cache: false, devtool: false,
  optimization: { minimize: false },
  output: { ...production.output, path: testRoot, filename: "test-backend.js", publicPath: "/admin-test/" },
});
const stats = await new Promise((resolve, reject) => compiler.run((error, result) => error ? reject(error) : resolve(result)));
await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve()));
if (stats.hasErrors()) throw new Error(stats.toString({ all: false, errors: true }));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".yml": "text/yaml",
  ".wasm": "application/wasm", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405).end(); return; }
    let path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let root = path.startsWith("/admin-test/") ? testRoot : siteRoot;
    let file;
    if (path === "/admin-test/" || path === "/admin-test/index.html") {
      file = resolve("tests/browser/index.html");
    } else {
      if (root === testRoot) path = path.slice("/admin-test".length);
      if (path.endsWith("/")) path += "index.html";
      file = resolve(root, "." + path);
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch { res.writeHead(404).end("Not found"); }
}).listen(8085, "127.0.0.1", () => console.log("Local-only editor test: http://127.0.0.1:8085/admin-test/ (in-memory, no GitHub writes)"));
