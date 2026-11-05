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

## Admin (Decap CMS)

Local, no server and no account: in this folder run `npx decap-server` (the official Decap local proxy), then `node scripts/serve.mjs`, open http://localhost:4341/admin/. `local_backend: true` in `public/admin/config.yml` makes the admin edit the real files in `content/`. After saving, run `node build.mjs` and reload.

Production: the GitHub backend needs an OAuth proxy (see https://decapcms.org/docs/external-oauth-clients/); the site itself can be on any host, only the admin login depends on it. Collections: «Настройки сайта», «Продукция (модели)» (specs, variants, constructor options, NEW status, SEO), «Запасные части» (377 + new).

## Content rules kept from earlier revisions

Products are named РРП (реверс-редукторная передача): РРП-300, РРП-238, РРП-3Д6, РРП-3Д12; document titles keep their real name (РР-300.РЭ). Drawings, no photos (only РРП-300 is drawn so far; the rest show a placeholder). Warranty 12 months on all products. Tender participation block. Red NEW on the new hydraulic gearbox. Constructor for РРП-300 with the owner's options; the request list is a mail draft only on a click. Prices are the 2025 price list, labelled as such. Archive prices stay out of structured data.

## Not ported from c-r18 (still in `v6-demo/c-r18`)

Clickable callouts on the РРП-300 section drawing, the per-variant selector on drawing pages (c-r19 shows all variants in one table), the model-switch bar. Drawing-page tables and the 3Д6/3Д12 section legends are read-only in the admin.

## Regenerating content

`node scripts/extract.mjs` rebuilds `content/` and `public/` from `../v6-demo` (c-r18). It overwrites hand edits, so use it only to start over.

## Publishing

`.github/workflows/pages.yml` builds and deploys on every push to `main` (set repository variables `SITE_URL`, `BASE`, `INDEXABLE` for a real domain). Nothing is published yet.
