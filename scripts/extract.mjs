// One-time extraction: c-r18 data (v6-demo) -> content/*.json (the single source of truth, edited by hand or through
// the Decap admin) + public/ (images, fonts, css, pdfs). Run again only to rebuild content from c-r18 from scratch.
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
const SRC = path.resolve(import.meta.dirname, "../../v6-demo"), OUT = path.resolve(import.meta.dirname, "..");
const read = (p) => fs.readFileSync(path.join(SRC, p), "utf8");
const win = {}; const ctx = vm.createContext({ window: win });
vm.runInContext(read("shared/data.js"), ctx); vm.runInContext(read("c-r18/nodes3d6.js"), ctx);
const D = win.RR, T = win.RR3D6;
const norm = (s) => String(s).toLowerCase().replace(/[\s\-–.]/g, "").replace(/ё/g, "е");

// ---- same merges the c-r18 engine does at load time (r17 3Д6 catalog, r18 names, r13 gear specs)
const RRP = { rr300: ["РРП-300", "rrp-300"], rr238: ["РРП-238", "rrp-238"], "3d6": ["РРП-3Д6", "rrp-3d6"], "3d12": ["РРП-3Д12", "rrp-3d12"] };
const by = new Map(D.catalog.map((p) => [norm(p.des), p]));
for (const c of T.catalog) { const p = by.get(norm(c.des)); if (p) { if (!p.models.includes("3d6")) p.models.push("3d6"); p.figs3d6 = c.figs; } else D.catalog.push({ des: c.des, name: c.name, type: c.type, models: ["3d6"], figs3d6: c.figs }); }
D.catalog.sort((a, b) => (a.des < b.des ? -1 : a.des > b.des ? 1 : 0));
const appSrc = read("c-r18/app.js");
const gearSpecs = vm.runInNewContext("(" + appSrc.match(/const gearSpecs = (\{[\s\S]*?\n  \});/)[1] + ")");
const GEAR_FIG = vm.runInNewContext("(" + appSrc.match(/const GEAR_FIG = (\{[\s\S]*?\n  \});/)[1] + ")");
for (const [id, g] of Object.entries(gearSpecs)) { const m = D.models.find((x) => x.id === id); const f = m.specs.find(([l]) => l === "Передаточное отношение, передний ход"); if (f) f[1] = g.fwd; const at = m.specs.findIndex(([l]) => l === "Масса"); m.specs.splice(at < 0 ? m.specs.length : at, 0, ...g.add); }

const w = (f, o) => { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); fs.writeFileSync(path.join(OUT, f), JSON.stringify(o, null, 2) + "\n"); };
const used = new Set(); const A = (p) => { if (!p) return p; const q = p.replace(/^\.\.\//, ""); used.add(q); return q; };
const kv = (a) => a.map(([label, value]) => ({ label, value }));

// ---- settings
w("content/settings.json", {
  company: { ...D.company, bank: "Банк ГПБ (АО), г. Москва", bik: "044525823", rs: "40702810200000030619", ks: "30101810200000000823" },
  cert: { no: D.cert.no, from: D.cert.from, to: D.cert.to, issuer: D.cert.issuer, scan: A(D.cert.img), scan_large: "assets/rko-06552-1200.webp", pdf: A(D.cert.pdf), scope: D.cert.scope },
  hero: { eyebrow: "Инженерные решения для судового флота", title: "Судовые реверс-редукторы. Производство, ремонт, запчасти.", lead: "Реверс-редукторные передачи РРП-300, РРП-238, РРП-3Д6 и РРП-3Д12. Техническое сопровождение, ремонт и подбор запасных частей по заводской документации.", picture: "img/rrp300-drawing.webp", picture_small: "img/rrp300-drawing-640.webp", picture_caption: "РРП-300", picture_note: "Гидравлическая реверс-редукторная передача" },
  warranty: { months: 12, title: "Гарантия на всю продукцию", text: "Гарантийный срок 12 месяцев распространяется на все изделия ООО «Дело»." },
  tenders: { title: "Участие в тендерах и закупках", text: "Участвуем в тендерах и конкурсных закупках. Подготовим коммерческое предложение, технические характеристики и документы, включая свидетельство РКО № 06552." },
  services: ["Ремонт судовых реверс-редукторов", "Ремонт рулевых машин РГ-0,25", "Техническая поддержка", "Изготовление деталей судового машиностроения", "Разработка технической документации судового машиностроения"],
  seo: { site_name: "Реверс-редуктор · ООО «Дело»", default_description: "Судовые реверс-редукторные передачи РРП-300, РРП-238, РРП-3Д6 и РРП-3Д12: производство, ремонт, запасные части по заводским каталогам. ООО «Дело», Барнаул." },
});
// ---- models (+ the clutch card and the NEW card, which have no catalog yet)
const constructorRR300 = { enabled: true, groups: [
  { key: "hp", label: "Мощность", unit: " л.с.", options: ["150", "300"] },
  { key: "fwd", label: "Передаточное отношение, передний ход", unit: "", options: ["1:2,04", "1:2,95"] },
  { key: "rev", label: "Передаточное отношение, задний ход", unit: "", options: ["1:2,18", "1:2,62", "1:2,95"] },
  { key: "rot", label: "Вращение", unit: "", options: ["левое", "правое"] }] };
D.models.forEach((m, i) => {
  const [name, slug] = RRP[m.id];
  w(`content/models/${m.id}.json`, { id: m.id, slug, name, designation: m.designation, kind: m.kind, order: i + 1, status: "ready",
    picture: m.id === "rr300" ? "img/rrp300-drawing.webp" : "", picture_small: m.id === "rr300" ? "img/rrp300-drawing-640.webp" : "",
    picture_alt: m.id === "rr300" ? "Реверс-редукторная передача РРП-300, технический рисунок" : "",
    applicability: (m.specs.find(([l]) => l === "Применяемость") || ["", ""])[1], key: kv(m.key), specs: kv(m.specs),
    variants: m.variants.map(([code, rotation, hp, forward, reverse, fingers]) => ({ code, rotation, hp, forward, reverse, fingers })),
    constructor: m.id === "rr300" ? constructorRR300 : { enabled: false, groups: [] },
    seo: { title: `${name}: реверс-редукторная передача, характеристики и запчасти`, description: `${name} (${m.designation}), ${m.kind} реверс-редуктор. Характеристики, каталог запасных частей с чертежами. Гарантия 12 месяцев. ООО «Дело», Барнаул.` } });
});
w("content/models/mufta-ms.json", { id: "mufta-ms", slug: "mufta-ms", name: "Муфта сцепления МС", designation: "", kind: "муфта сцепления", order: 5, status: "info", picture: "", picture_small: "", picture_alt: "",
  applicability: "Гидравлическая СБ525-01-14, механическая СБ1226-00-2.", key: [], specs: [], variants: [], constructor: { enabled: false, groups: [] },
  seo: { title: "Муфта сцепления МС для судовых реверс-редукторов", description: "Муфты сцепления: гидравлическая СБ525-01-14 и механическая СБ1226-00-2. ООО «Дело», Барнаул." } });
w("content/models/novaya-razrabotka.json", { id: "novaya-razrabotka", slug: "novaya-razrabotka", name: "Гидравлический реверс-редуктор", designation: "", kind: "новая разработка", order: 6, status: "new", picture: "", picture_small: "", picture_alt: "",
  applicability: "Новая модель в линейке ООО «Дело». Характеристики и сроки выпуска сообщим по запросу.", key: [], specs: [], variants: [], constructor: { enabled: false, groups: [] },
  seo: { title: "Новая разработка: гидравлический реверс-редуктор", description: "Новая модель гидравлического реверс-редуктора в линейке ООО «Дело». Характеристики и сроки по запросу." } });

// ---- parts: one file per designation (no part photos, no source URLs: client rules)
const slugs = new Set(); const tr = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
const slugOf = (des) => { let s = des.toLowerCase().replace(/[а-яё]/g, (c) => tr[c]).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "part"; let u = s, i = 2; while (slugs.has(u)) u = `${s}-${i++}`; slugs.add(u); return u; };
const modelSlug = (id) => RRP[id][1];
for (const p of D.catalog) w(`content/parts/${slugOf(p.des)}.json`, { designation: p.des.replace(/РР-(300|238)(?![-.\d])/g, "РРП-$1"), name: p.name.replace(/РР-(300|238)(?![-.\d])/g, "РРП-$1"), type: p.type, models: p.models.map(modelSlug),
  figures: { "rrp-300": p.figs || [], "rrp-3d6": p.figs3d6 || [] }, depends_on_variant: !!p.vardep, price_rub: D.prices[p.des] ?? null });

// ---- drawing nodes
const nodeOut = (modelId, nd, extra = {}) => w(`content/nodes/${modelSlug(modelId)}-ris-${nd.fig}.json`, { model: modelSlug(modelId), fig: nd.fig, title: nd.title,
  image: A(nd.img), image_large: A(nd.img2), thumb: A(nd.th), width: nd.w, height: nd.h, variants: nd.vars,
  rows: nd.rows.map((r, i) => ({ pos: r[0], designation: r[1], name: r[2], qty: nd.qa[i], note: nd.note[i] || "" })), footnotes: nd.foot || {}, ...extra });
D.nodes.forEach((nd) => nodeOut("rr300", nd)); T.nodes.forEach((nd) => nodeOut("3d6", nd));
// ---- overview drawings (section of РРП-300; manual sections of 3Д6/3Д12)
w("content/figures.json", {
  "rrp-300": [{ title: "Продольный разрез РРП-300", image: A(D.section.src), image_large: A(D.section.src2), width: D.section.w, height: D.section.h, legend: D.section.legend.map(([n, t]) => ({ pos: n.join(", "), name: t })) }],
  "rrp-3d6": GEAR_FIG["3d6"].map((f) => ({ title: f.title, image: A(f.src), thumb: A(f.th), width: f.w, height: f.h, pdf_page: f.page || "", legend: f.legend.map(([n, t]) => ({ pos: n, name: t })) })),
  "rrp-3d12": GEAR_FIG["3d12"].map((f) => ({ title: f.title, image: A(f.src), thumb: A(f.th), width: f.w, height: f.h, pdf_page: f.page || "", legend: f.legend.map(([n, t]) => ({ pos: n, name: t })) })),
});
w("content/scans.json", D.scans.map((s) => ({ n: s.n, title: s.title, thumb: A(s.t), full: A(s.f) })));
// ---- documents
w("content/documents.json", [
  { group: "Руководства по эксплуатации", items: [
    { title: "Руководство по эксплуатации РР-300.РЭ", product: "РРП-300", format: "PDF · 24 с. · 3,6 МБ", links: [{ label: "Открыть", href: A(D.manual.pdf) }] },
    { title: "Судовые дизели 3Д6 и 7Д6 (В. Ф. Вершинина, З. С. Трумуль, 1972)", product: "РРП-3Д6", format: "PDF · скан · 88 с. · 21,2 МБ", links: [{ label: "Открыть", href: "assets/3d6-7d6-sudovye-dizeli-1972.pdf" }, { label: "Реверс-редуктор", href: "assets/3d6-7d6-sudovye-dizeli-1972.pdf#page=25" }] },
    { title: "Руководство по эксплуатации дизелей Д12 (Д12 РЭ)", product: "РРП-3Д12", format: "PDF · скан · 235 с. · 11,6 МБ", links: [{ label: "Открыть", href: "assets/d12-rukovodstvo-po-ekspluatacii.pdf" }, { label: "Реверс-редуктор", href: "assets/d12-rukovodstvo-po-ekspluatacii.pdf#page=103" }] }] },
  { group: "Каталоги деталей", items: [
    { title: "Каталог деталей реверс-редуктора РРП-300", product: "РРП-300", format: `Сканы · ${D.scans.length} стр.`, links: [{ label: "Листать", href: "/dokumenty/katalog-rrp-300/" }, { label: "Подбор по каталогу", href: "/katalog/rrp-300/" }] },
    { title: "Каталог деталей реверс-редуктора РРП-3Д6", product: "РРП-3Д6", format: `Чертежи · ${T.nodes.length} рис.`, links: [{ label: "Подбор по каталогу", href: "/katalog/rrp-3d6/" }] },
    { title: "Каталог деталей реверс-редуктора РРП-3Д12", product: "РРП-3Д12", soon: true, links: [] },
    { title: "Каталог деталей муфт сцепления", product: "Муфта МС", soon: true, links: [] }] },
  { group: "Инструкции по ремонту", items: [{ title: "Инструкции по ремонту реверс-редукторов", product: "Реверс-редукторы", soon: true, links: [] }] },
]);
// ---- public files
const cp = (from, to) => { fs.mkdirSync(path.dirname(path.join(OUT, to)), { recursive: true }); fs.cpSync(path.join(SRC, from), path.join(OUT, to), { recursive: true }); };
["assets/rko-06552-1200.webp", "assets/3d6-7d6-sudovye-dizeli-1972.pdf", "assets/d12-rukovodstvo-po-ekspluatacii.pdf"].forEach((f) => used.add(f));
for (const f of used) { if (f.startsWith("img/")) cp("c-r18/" + f, "public/" + f); else cp(f, "public/" + f); }
for (const f of ["rrp300-drawing.webp", "rrp300-drawing-640.webp", "draft-marks.svg", "gear-giant.svg", "gear-train-dark.svg", "gear-train-light.svg", "propeller.svg"]) cp("c-r18/img/" + f, "public/img/" + f);
cp("c-r18/blueprint.webp", "public/img/blueprint.webp"); cp("shared/fonts", "public/fonts"); cp("shared/fonts.css", "public/fonts.css");
const css = read("c-r18/style.css").replaceAll("../assets/", "assets/"); fs.writeFileSync(path.join(OUT, "public/site.css"), css);
for (const m of css.matchAll(/url\((assets\/[^)]+)\)/g)) cp(m[1], "public/" + m[1]);
console.log("parts", D.catalog.length, "nodes", D.nodes.length + T.nodes.length, "files", used.size);
