// Simulates what the admin writes when the owner edits (new photo upload, price removed, price added, text changed),
// rebuilds, and checks the generated pages. Restores every touched file afterwards.
import fs from "node:fs"; import path from "node:path"; import assert from "node:assert/strict"; import { execFileSync } from "node:child_process";
const R = path.resolve(import.meta.dirname, ".."), f = (p) => path.join(R, p);
const files = ["content/models/rr238.json", "content/settings.json", "content/parts/525-16-113.json", "content/parts/525-453.json"];
const backup = Object.fromEntries(files.map((p) => [p, fs.readFileSync(f(p), "utf8")]));
const upload = f("public/img/uploads/owner-test.webp"); fs.mkdirSync(path.dirname(upload), { recursive: true }); fs.copyFileSync(f("public/img/rrp300-drawing-640.webp"), upload);
const edit = (p, fn) => { const o = JSON.parse(backup[p]); fn(o); fs.writeFileSync(f(p), JSON.stringify(o, null, 2) + "\n"); };
try {
  edit("content/models/rr238.json", (m) => { m.picture = "/img/uploads/owner-test.webp"; m.picture_small = ""; });           // photo uploaded through the admin
  edit("content/parts/525-16-113.json", (p) => { p.price_rub = null; });                                                 // price removed
  edit("content/parts/525-453.json", (p) => { p.price_rub = 1234; });                                                    // price added
  edit("content/settings.json", (s) => { s.hero.title = "Заголовок, изменённый владельцем"; s.warranty.months = 24; });  // text changed
  execFileSync("node", ["build.mjs"], { cwd: R, stdio: "pipe" });
  const read = (p) => fs.readFileSync(f("dist/" + p + "/index.html"), "utf8");
  const home = read(""), model = read("produkciya/rrp-238"), p1 = read("detal/525-16-113"), p2 = read("detal/525-453");
  assert.match(home, /id="model-rrp-238"[\s\S]*?<img src="\/img\/uploads\/owner-test\.webp"/, "uploaded photo on the card");
  assert.ok(!home.includes('//img/uploads'), "no double slash in the photo path"); assert.match(model, /\/img\/uploads\/owner-test\.webp/, "photo on the model page");
  assert.ok(fs.existsSync(f("dist/img/uploads/owner-test.webp")), "uploaded file is published");
  assert.match(p1, /по запросу/); assert.ok(!/по прайсу 2025/.test(p1), "price removed");
  assert.match(p2, /1[\s\u00a0\u202f]234&nbsp;₽/, "price added");
  assert.match(home, /Заголовок, изменённый владельцем/); assert.match(home, /24 месяцев/);
  console.log("owner flow ok: photo, price removed, price added, text changed all reach the site");
} finally { for (const [p, c] of Object.entries(backup)) fs.writeFileSync(f(p), c); fs.rmSync(path.dirname(upload), { recursive: true, force: true }); execFileSync("node", ["build.mjs"], { cwd: R, stdio: "pipe" }); }
