/* Minimal static file server for local preview.
 *
 *   node build/serve.mjs [port]
 *
 * Serves the project root and refuses to serve anything outside it.
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.argv[2]) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ico": "image/x-icon",
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let rel = normalize(url).replace(/^([/\\])+/, "");
  if (rel === "") rel = "index.html";

  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  let target = file;
  try {
    if (statSync(target).isDirectory()) target = join(target, "index.html");
    statSync(target);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(join(ROOT, "404.html")).pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(target).pipe(res);
}).listen(PORT, () => {
  console.log(`The Nuts Company -> http://127.0.0.1:${PORT}/`);
});
