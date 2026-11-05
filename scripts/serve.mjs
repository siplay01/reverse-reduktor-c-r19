// Tiny static server for dist/ (no dependencies): node scripts/serve.mjs [port]
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const DIST = path.resolve(import.meta.dirname, "../dist"), port = +process.argv[2] || 4341;
const T = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain" };
http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(new URL(req.url, "http://x").pathname)); if (!p.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) { res.writeHead(404, { "content-type": T[".html"] }).end(fs.readFileSync(path.join(DIST, "404.html"))); return; }
  res.writeHead(200, { "content-type": T[path.extname(p)] || "application/octet-stream" }).end(fs.readFileSync(p));
}).listen(port, () => console.log("http://localhost:" + port + "/"));
