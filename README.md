# Реверс-редуктор c-r19: portable static site + git-based admin

Revision 19 of the site (2026-11-04). Same look as `v6-demo/c-r18`, rebuilt so it can move between hosts (GitHub Pages, Russian shared hosting, .com, anything that serves files) and so every model, drawing and part has its own address for search engines.

## How it works

- `content/*.json` is the database: `settings.json` (company, hero, warranty, tenders, contacts), `models/` (6 cards), `parts/` (377, one file each), `nodes/` (36 drawing pages with part tables), `figures.json`, `documents.json`, `scans.json`.
- `build.mjs` (plain Node, zero dependencies) turns content + `public/` into `dist/`: 429 pages, `sitemap.xml`, `robots.txt`, JSON-LD (Organization, Product, BreadcrumbList), canonical and Open Graph per page.
- `public/admin/` is the Decap CMS admin (loaded from the jsDelivr CDN, pinned 3.17.1). It edits the same JSON files through git.
- Deploy = copy `dist/` anywhere. Nothing runs on the server.

## Commands

```
node build.mjs                      # build into dist/ (root-domain build, noindex)
node scripts/serve.mjs 4341         # serve dist/ at http://localhost:4341/
node qa/static-check.mjs            # structure, SEO tags, every internal link, sitemap, РРП names
node qa/test.mjs                    # browser tests (Chromium + WebKit, 1360 and 390 px) + admin loads (needs internet for the CDN)
```

Build options (environment): `SITE_URL` (absolute address for canonical and sitemap), `BASE` (path prefix, `/reverse-reduktor-c-r19` on GitHub Pages, empty on a domain), `INDEX=1` (allow indexing; without it every page is `noindex` and `robots.txt` disallows all). Moving hosts = change these three values and rebuild.

## Admin

Two admins read the same `public/admin/config.yml` and the same `content/` files:

- `/admin/` = **Sveltia CMS** (primary, pinned 0.255.0): modern UI, Russian when the browser language is Russian, works on a phone. Two ways to use it:
  - **On the published site (any browser):** «Sign In Using Access Token», paste a GitHub fine-grained token with Contents (read/write) on this repository. Every save becomes a commit on `main`; the Pages workflow rebuilds and republishes in about a minute. No OAuth server needed. The token stays in that browser only.
  - **Locally (Chrome, Edge or Brave only, not Safari or Firefox):** `node build.mjs && node scripts/serve.mjs 4341`, open http://localhost:4341/admin/, «Work with Local Repository», pick this folder. Edits go to the files; rebuild and reload to see them.
- `/admin-decap/` = **Decap CMS** (fallback, pinned 3.17.1): needs `npx decap-server` in this folder for local editing (`local_backend: true`); production login needs an OAuth proxy.

Collections: «Настройки сайта» (hero, big NEW banner, warranty, tenders, map coordinates and directions text, company, SEO), «Продукция (модели)», «Запасные части» (377 + new).

Why Sveltia: it supports token sign-in (Decap does not), its local mode needs no helper server, and it is actively maintained (checked 2026-11-04). Its documentation says that the CMS reads the same config as Decap; the automated test creates a part through its form and sees it in the list.

## Contacts page

`/kontakty/` («Как нас найти»): address, phone, e-mail, buttons «Построить маршрут» and «Открыть в Яндекс.Картах», and the Yandex map widget. The map loads only after a click on «Показать карту» (Yandex sets its own cookies). Coordinates (53.2563675, 83.7063668) come from a one-time OpenStreetMap lookup of the address and were checked on the Yandex map; they and the optional «Как добраться» text are editable in the admin. Directions text and working hours are empty until the owner supplies them (nothing is invented).

## Content rules kept from earlier revisions

Products are named РРП (реверс-редукторная передача): РРП-300, РРП-238, РРП-3Д6, РРП-3Д12; document titles keep their real name (РР-300.РЭ). Drawings, no photos (only РРП-300 is drawn so far; the rest show a placeholder). Warranty 12 months on all products. Tender participation block. Red NEW on the new hydraulic gearbox. Constructor for РРП-300 with the owner's options; the request list is a mail draft only on a click. Prices are the 2025 price list, labelled as such. Archive prices stay out of structured data.

## Not ported from c-r18 (still in `v6-demo/c-r18`)

Clickable callouts on the РРП-300 section drawing, the per-variant selector on drawing pages (c-r19 shows all variants in one table), the model-switch bar. Drawing-page tables and the 3Д6/3Д12 section legends are read-only in the admin.

## Regenerating content

`node scripts/extract.mjs` rebuilds `content/` and `public/` from `../v6-demo` (c-r18). It overwrites hand edits, so use it only to start over.

## Publishing

`.github/workflows/pages.yml` builds and deploys on every push to `main` (set repository variables `SITE_URL`, `BASE`, `INDEXABLE` for a real domain). Nothing is published yet.
