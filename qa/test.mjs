// Browser checks (Chromium + WebKit) against `node scripts/serve.mjs` on :4341 (BASE="" build). Playwright is borrowed from the archived v5-ab.
import { createRequire } from "node:module"; import path from "node:path"; import assert from "node:assert/strict"; import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(path.resolve(import.meta.dirname, "../../_archive/2026-11-03/v5-ab/node_modules/playwright"));
const U = (p = "/") => `http://localhost:4341${p}`;
for (const [name, eng] of [["chromium", chromium], ["webkit", webkit]]) {
  const b = await eng.launch(); const errs = [];
  for (const [w, h] of [[1360, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(e.message)); p.on("requestfailed", (r) => { if (!/abort|cancel/i.test(r.failure()?.errorText || "")) errs.push("failed " + r.url()); }); // aborted = lazy image cut off by our own navigation
    // 1. home: РРП names, drawing, red NEW, warranty, tenders, constructor -> request list
    await p.goto(U()); await p.waitForSelector(".mcard");
    const text = await p.locator("main").innerText();
    for (const n of ["РРП-300", "РРП-238", "РРП-3Д6", "РРП-3Д12", "12 месяцев", "Тендеры"]) assert.ok(text.includes(n), n);
    assert.equal(await p.locator(".mcard-spec", { hasText: "Гарантия" }).count(), 4);
    assert.equal(await p.locator(".models .mcard").last().getAttribute("id"), "model-novaya-razrabotka");
    assert.equal(await p.locator("#model-novaya-razrabotka .badge-new").evaluate((e) => getComputedStyle(e).backgroundColor), "rgb(179, 18, 42)");
    await p.locator("label.cfg-o", { hasText: "150" }).click(); await p.locator("label.cfg-o", { hasText: "1:2,95" }).first().click();
    await p.locator("label.cfg-o", { hasText: "1:2,62" }).click(); await p.locator("label.cfg-o", { hasText: "левое" }).click();
    await p.evaluate(() => localStorage.removeItem("rr-c19-cart")); await p.click("[data-cfg-add]");
    const cart = await p.evaluate(() => JSON.parse(localStorage.getItem("rr-c19-cart")));
    assert.equal(cart.length, 1); assert.equal(cart[0].des, "РРП-300"); assert.ok(/150 л\.с\./.test(cart[0].name) && /левое/.test(cart[0].name) && /1:2,62/.test(cart[0].name), cart[0].name);
    // 2. real addresses: card -> model page -> catalog -> node -> part, each its own URL
    await p.locator("#model-rrp-300 .mcard-h a").click(); await p.waitForURL("**/produkciya/rrp-300/"); assert.match(await p.locator("h1").innerText(), /РРП-300/);
    assert.ok(await p.locator("table.vtab tbody tr").count() >= 10, "variants table");
    await p.goto(U("/katalog/rrp-300/")); assert.ok((await p.locator(".tile").count()) === 26, "26 node tiles");
    await p.goto(U("/katalog/rrp-300/ris-3/")); assert.equal(await p.locator("table.spec tbody tr").count(), 16);
    await p.fill("[data-filter]", "прокладка"); assert.ok((await p.locator("table.spec tbody tr:not([hidden])").count()) < 16);
    await p.goto(U("/katalog/rrp-3d6/ris-89/")); assert.ok((await p.locator("table.spec thead th.c-q").count()) === 4, "four 3Д6 variants");
    await p.goto(U("/detal/525-16-113/")); await p.click(".part-buy [data-add]");
    assert.equal(await p.locator("[data-cart-count]").first().innerText(), "2");
    await p.click("[data-cart-open]"); assert.equal(await p.locator("#cart-items li").count(), 2); await p.click("[data-cart-close]");
    // 3. catalog list filter from ?q
    await p.goto(U("/katalog/vse/?q=525-16-113")); await p.waitForSelector("table.spec");
    assert.equal(await p.locator("table.spec tbody tr:not([hidden])").count(), 1);
    // 4. no horizontal overflow on the main page types
    for (const pg of ["/", "/produkciya/rrp-300/", "/katalog/", "/katalog/rrp-300/", "/katalog/rrp-300/ris-3/", "/detal/525-16-113/", "/dokumenty/"]) {
      await p.goto(U(pg)); await p.waitForLoadState("load");
      const over = await p.evaluate(() => { const bad = []; if (document.documentElement.scrollWidth > innerWidth) bad.push("page " + document.documentElement.scrollWidth); return bad; });
      assert.deepEqual(over, [], `${pg} @${w}`);
    }
    await ctx.close();
  }
  assert.deepEqual(errs, [], errs.join("\n")); console.log(name, "ok"); await b.close();
}
// 5. admin: Decap loads and lists the three collections (test-repo backend swapped in, the real config otherwise as written)
{
  const cfg = fs.readFileSync(path.resolve(import.meta.dirname, "../public/admin/config.yml"), "utf8").replace(/backend:\n  name: github\n  repo: .*\n  branch: .*\n/, "backend:\n  name: test-repo\n").replace("local_backend: true\n", "");
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.route("**/admin/config.yml", (r) => r.fulfill({ contentType: "text/yaml", body: cfg }));
  await p.goto(U("/admin/")); await p.getByRole("button", { name: "Войти" }).click(); await p.waitForSelector('a[href^="#/collections/"]', { timeout: 30000 });
  const side = await p.locator('a[href^="#/collections/"]').allInnerTexts();
  for (const t of ["Настройки сайта", "Продукция (модели)", "Запасные части"]) assert.ok(side.some((x) => x.includes(t)), t + " in " + side.join("|"));
  await p.goto(U("/admin/#/collections/parts/new")); for (const l of ["Обозначение", "Наименование", "Группа"]) await p.getByText(l, { exact: true }).first().waitFor({ timeout: 20000 });
  if (process.env.ADMIN_SHOT) await p.screenshot({ path: process.env.ADMIN_SHOT });
  assert.deepEqual(errs, [], errs.join("\n")); console.log("admin ok"); await b.close();
}
