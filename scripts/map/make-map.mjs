// One-time asset generator: renders two annotated map images (street and district level) from OpenStreetMap tiles and the
// road and building geometry in osm-data.json (Overpass, fetched 2026-11-05). Output: public/img/map-close.webp, map-district.webp.
// Needs internet (Leaflet 1.9.4 from cdnjs, tiles from tile.openstreetmap.org) and cwebp. Run: node scripts/map/make-map.mjs
import { createRequire } from "node:module"; import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve(import.meta.dirname, "../../../_archive/2026-11-03/v5-ab/node_modules/playwright"));
const OUT = path.resolve(import.meta.dirname, "../../public/img"), TMP = fs.mkdtempSync("/tmp/mapgen-");
const data = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "osm-data.json"), "utf8")).elements;
const P = [53.2563675, 83.7063668];
const line = (e) => e.geometry.map((g) => [g.lat, g.lon]);
const by = (name) => data.filter((e) => e.tags?.name === name).map(line);
const building = data.filter((e) => e.tags?.building).map(line);
const html = (cfg) => `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css">
<style>html,body{margin:0}#map{width:1400px;height:860px;font:600 15px/1.2 "Helvetica Neue",Arial,sans-serif}
.lbl{background:#fff;border:2px solid #102b3a;color:#102b3a;padding:4px 9px;border-radius:3px;box-shadow:none;font-weight:700}
.lbl.red{border-color:#b3122a;color:#b3122a;font-size:17px}.lbl.dis{border-color:#b3122a;background:#b3122a;color:#fff}
.leaflet-tooltip:before{display:none}.pin{width:22px;height:22px;border-radius:50% 50% 50% 0;background:#b3122a;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 0 0 2px #b3122a}
.leaflet-control-attribution{font-size:12px}</style><div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script>const C=${JSON.stringify(cfg)};const m=L.map("map",{zoomControl:false,attributionControl:true,zoomSnap:0.5}).setView(C.center,C.zoom);
const t=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© участники OpenStreetMap (openstreetmap.org/copyright)"}).addTo(m);
for(const l of C.lines){for(const g of l.ways){L.polyline(g,{color:"#fff",weight:l.w+6,opacity:.95,lineCap:"round"}).addTo(m);L.polyline(g,{color:l.color,weight:l.w,lineCap:"round"}).addTo(m);}
 if(l.label){L.tooltip({permanent:true,direction:l.dir||"top",className:"lbl",offset:l.off||[0,0]}).setLatLng(l.at).setContent(l.label).addTo(m);}}
for(const b of C.buildings){L.polygon(b,{color:"#b3122a",weight:3,fillColor:"#b3122a",fillOpacity:.45}).addTo(m);}
L.marker(C.point,{icon:L.divIcon({className:"",html:'<div class="pin"></div>',iconSize:[22,22],iconAnchor:[11,28]})}).addTo(m);
L.tooltip({permanent:true,direction:C.pdir||"right",className:"lbl dis",offset:C.poff||[18,-14]}).setLatLng(C.point).setContent("ООО «Дело»").addTo(m);
window.ready=new Promise(r=>t.on("load",()=>setTimeout(r,1500)));</script>`;
const near = (ways, t) => ways.flat().reduce((a, g) => ((g[0] - t[0]) ** 2 + (g[1] - t[1]) ** 2 < (a[0] - t[0]) ** 2 + (a[1] - t[1]) ** 2 ? g : a));
const zoo = by("Зоотехническая улица"), ger = by("улица Герцена"), zm = by("Змеиногорский тракт"), yt = by("Южный тракт");
const close = { center: [P[0] + 0.0004, P[1] - 0.0012], zoom: 17, point: P, buildings: building, lines: [
  { ways: zoo, w: 7, color: "#174758", label: "ул. Зоотехническая", at: near(zoo, [P[0] - 0.0014, P[1] - 0.0016]), dir: "bottom", off: [0, 12] },
  { ways: ger, w: 7, color: "#174758", label: "ул. Герцена", at: near(ger, [P[0] + 0.0013, P[1] - 0.0046]), dir: "left", off: [-10, 0] }] };
const district = { center: [P[0] + 0.012, P[1] - 0.02], zoom: 12, point: P, pdir: "top", poff: [0, -34], buildings: [], lines: [
  { ways: zm, w: 6, color: "#174758", label: "Змеиногорский тракт", at: near(zm, [P[0] - 0.045, P[1] - 0.0035]), dir: "left", off: [-8, 0] },
  { ways: yt, w: 6, color: "#b78e5a", label: "Южный тракт", at: near(yt, [P[0] + 0.009, P[1] + 0.013]), dir: "right", off: [10, -26] }] };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 860 }, extraHTTPHeaders: { Referer: "https://siplay01.github.io/reverse-reduktor-c-r19/" } });
for (const [name, cfg] of [["map-close", close], ["map-district", district]]) {
  const p = await ctx.newPage(); await p.setContent(html(cfg), { waitUntil: "load" }); await p.evaluate(() => window.ready); await p.waitForTimeout(800);
  const png = path.join(TMP, name + ".png"); await p.locator("#map").screenshot({ path: png });
  execFileSync("cwebp", ["-q", "86", png, "-o", path.join(OUT, name + ".webp")], { stdio: "ignore" }); console.log("wrote", name, fs.statSync(path.join(OUT, name + ".webp")).size); await p.close();
}
await b.close();
