// Static checks on dist/ (no browser): structure, SEO basics, internal links, content rules. Fails (exit 1) on any problem.
import fs from "node:fs"; import path from "node:path"; import assert from "node:assert/strict";
const DIST = path.resolve(import.meta.dirname, "../dist"), BASE = (process.env.BASE || "").replace(/\/$/, ""), INDEX = process.env.INDEX === "1";
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const pages = walk(DIST).filter((f) => f.endsWith(".html") && !/(^|\/)admin(-decap|-sveltia)?\//.test(path.relative(DIST, f)));
const count = (dir) => fs.readdirSync(path.join(import.meta.dirname, "../content", dir)).length;
const errs = [];
const bad = (m) => errs.push(m);
// 1. page counts match the content
const expected = 1 + count("models") + 2 /* katalog, vse */ + 4 /* model catalogs */ + count("nodes") + count("parts") + 2 /* dokumenty */ + 1 /* kontakty */ + 1 /* 404 */;
if (pages.length !== expected) bad(`pages ${pages.length}, expected ${expected}`);
const hrefs = new Map();
for (const f of pages) {
  const rel = path.relative(DIST, f), h = fs.readFileSync(f, "utf8");
  const one = (re, what) => { const n = (h.match(re) || []).length; if (n !== 1) bad(`${rel}: ${what} x${n}`); };
  one(/<title>[^<]{5,}<\/title>/g, "title"); one(/<meta name="description" content="[^"]{20,}"/g, "description"); one(/<link rel="canonical"/g, "canonical"); one(/<h1[ >]/g, "h1");
  if (!INDEX && !h.includes('name="robots" content="noindex')) bad(`${rel}: demo build without noindex`);
  for (const m of h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { bad(`${rel}: invalid JSON-LD`); } }
  if (/(^|[^П])РР-(300|238)(?![-.\d])/.test(h.replace(/<[^>]+>/g, " "))) bad(`${rel}: old РР- name`);
  if (/<img[^>]+src="[^"]*\/(img\/p\/|assets\/[0-9a-f]{12}-(?!420|900|2000))/.test(h) && rel.startsWith("detal")) bad(`${rel}: part photo`);
  for (const m of h.matchAll(/(?:href|src)="([^"#]+)(#[^"]*)?"/g)) { const v = m[1]; if (/^(https?:|mailto:|tel:|data:)/.test(v)) continue; hrefs.set(v, rel); }
}
// 2. internal links resolve
for (const [v, from] of hrefs) {
  if (!v.startsWith(BASE + "/") && v !== BASE) { if (v.startsWith("/")) bad(`${from}: link outside BASE ${v}`); continue; }
  const p = path.join(DIST, decodeURIComponent(v.slice(BASE.length)));
  if (!(fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, "index.html"))))) bad(`${from}: broken ${v}`);
}
// 3. sitemap and robots
const sm = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
if ((sm.match(/<loc>/g) || []).length !== pages.length - 1) bad("sitemap size");
const rb = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8");
if (INDEX ? !rb.includes("Sitemap:") : !rb.includes("Disallow: /")) bad("robots.txt does not match INDEX");
// 4. content rules
const home = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
for (const t of ["РРП-300", "РРП-238", "РРП-3Д6", "РРП-3Д12", ">NEW<", "12 месяцев", "Тендеры"]) if (!home.includes(t)) bad(`home lacks ${t}`);
if (errs.length) { console.error(errs.slice(0, 40).join("\n"), `\n${errs.length} problem(s)`); process.exit(1); }
console.log(`static check ok: ${pages.length} pages, ${hrefs.size} distinct internal links, sitemap ${pages.length - 1} urls`);
