"""Adds the 3Д12 reverse-gear drawing catalog (Рис. 120-134) and the mechanical clutch СБ1226-00-2 (Рис. 135-141)
from the owner's Word file (New docs) into content/nodes, content/parts and public/img.

Usage: python3 scripts/add_3d12.py "<docx>" "<folder 312>" "<folder 1226____>"
Re-runnable: nodes are rewritten, parts are merged by normalized designation (figures lists are rebuilt for these two models).
Only the 3Д12А / 3Д12АЛ columns carry data in the reverse-gear tables and only 2Д12Б in the clutch tables
(the other columns are checked to be empty). OKP codes are dropped (garbled by the scan), as in the 3Д6 build.
"""
import json, re, subprocess, sys, tempfile, zipfile, glob, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAT = dict(zip("ABCEHKMOPTXaceoprxy", "АВСЕНКМОРТХасеорху"))
GROUP = {"Вал": "Валы", "Валик": "Валы", "Шестерня": "Шестерни", "Диск": "Диски", "Подшипник": "Подшипники", "Шарикоподшипник": "Подшипники",
         "Роликоподшипник": "Подшипники", "Втулка": "Втулки и стаканы", "Стакан": "Втулки и стаканы", "Крышка": "Крышки и корпуса",
         "Корпус": "Крышки и корпуса", "Кольцо": "Кольца", "Шайба": "Шайбы", "Гайка": "Гайки, болты, винты", "Болт": "Гайки, болты, винты",
         "Винт": "Гайки, болты, винты", "Шпилька": "Гайки, болты, винты", "Заклепка": "Гайки, болты, винты", "Пружина": "Пружины",
         "Прокладка": "Прокладки и уплотнения", "Муфта": "Муфты и полумуфты"}
# scan typos: fixed only when the right word is certain
NAME_FIX = {"Шаqба чистая 12": "Шайба чистая 12", "Шарнкоподшнпннк 60214": "Шарикоподшипник 60214", "Роликоподшипннк 7616К": "Роликоподшипник 7616К",
            "Роликоподшнпннк 7610": "Роликоподшипник 7610", "Колько фиксатора": "Кольцо фиксатора"}
# table index in the docx -> (model, fig, title); file names of the drawings give the titles
TABLES = {1: 120, 3: 121, 5: 122, 7: 123, 9: 125, 11: 126, 14: 127, 16: 128, 18: 129, 20: 130, 22: 131, 24: 132, 26: 133, 28: 134,
          31: 135, 35: 136, 38: 137, 42: 138, 46: 139, 50: 140, 54: 141}
TITLES = {120: "Реверс-редуктор", 121: "Корпус реверс-редуктора", 122: "Реверсивная муфта. Вал переднего хода",
          123: "Реверсивная муфта. Вал заднего хода и барабан муфты", 125: "Реверсивная муфта. Бугель шарикоподшипника",
          126: "Вилка включения реверс-редуктора", 127: "Ведущая шестерня заднего хода", 128: "Ведущая шестерня переднего хода",
          129: "Крышка вала переднего хода", 130: "Передняя крышка выходного вала", 131: "Вал выходной",
          132: "Задняя крышка выходного вала", 133: "Шестерня промежуточная заднего хода", 134: "Рычаг управления реверс-редуктором",
          135: "Муфта сцепления", 136: "Корпус муфты сцепления", 137: "Механизм муфты сцепления. Вал и барабан муфты",
          138: "Механизм муфты сцепления. Ролик включения", 139: "Механизм муфты сцепления. Бугель шарикоподшипника",
          140: "Вилка включения муфты", 141: "Выходной фланец муфты сцепления"}
TR = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя", "a b v g d e e zh z i y k l m n o p r s t u f h c ch sh sch _ y _ e yu ya".split()))


def cell(c):
    return "".join("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", r)) for r in re.findall(r"<w:r[ >].*?</w:r>", c, flags=re.S)).strip()


def des_of(raw):
    d, _, mark = raw.strip().partition("\\")
    d = "".join(LAT.get(ch, ch) for ch in d)
    d = re.sub(r"^[Сс][Бб]\.?\s*", "СБ", d)
    return d, mark


def fix_name(n):
    n = " ".join(n.split())
    n = NAME_FIX.get(n, n)
    n = re.sub(r"\bM(?=\d)", "М", n); n = re.sub(r"(?<=\d)H\b", "Н", n); n = re.sub(r"(?<=\d)[Xx](?=\d)", "х", n); n = re.sub(r"(?<=\d) [Xx] (?=\d)", "х", n)
    return n[0].upper() + n[1:]


def norm(s):
    return re.sub(r"[\s\-–.]", "", str(s).lower()).replace("ё", "е")


def slug_of(des, taken):
    s = re.sub(r"[^a-z0-9]+", "-", re.sub(r"[а-яё]", lambda m: TR[m.group(0)], des.lower())).strip("-") or "part"
    u, i = s, 2
    while u in taken:
        u = f"{s}-{i}"; i += 1
    return u


def webp(src, base, w_list=((" ", 900), ("-420", 420), ("-1400", 1400))):
    tmp = Path(tempfile.mkdtemp())
    for suf, w in (("", 900), ("-420", 420), ("-1400", 1400)):
        png = tmp / "t.png"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vf", f"crop=iw-16:ih-16:8:8,scale={w}:-2", str(png)], check=True)
        subprocess.run(["cwebp", "-quiet", "-q", "82", str(png), "-o", str(base) + suf + ".webp"], check=True)


def main(docx, d312, d1226):
    tmp = Path(tempfile.mkdtemp())
    with zipfile.ZipFile(docx) as z:
        z.extractall(tmp)
    xml = (tmp / "word/document.xml").read_text(encoding="utf8")
    tabs = re.findall(r"<w:tbl>.*?</w:tbl>", xml, flags=re.S)
    imgs = {}
    for folder in (d312, d1226):
        for f in glob.glob(os.path.join(folder, "Рис.*.jpg")):
            imgs[int(re.match(r"Рис\.(\d+)", os.path.basename(f)).group(1))] = f
    parts = {}  # norm -> (slug, dict)
    for f in glob.glob(str(ROOT / "content/parts/*.json")):
        d = json.load(open(f, encoding="utf8")); parts[norm(d["designation"])] = (Path(f).stem, d)
    taken = {v[0] for v in parts.values()}
    for model in ("rrp-3d12", "mufta-ms"):  # rebuild figure lists of these models
        for _, d in parts.values():
            d["figures"][model] = []
    stats = {}
    for ti, fig in TABLES.items():
        model = "rrp-3d12" if fig <= 134 else "mufta-ms"
        vcol = (8, 9) if fig <= 134 else (7,)
        variants = ["3Д12А", "3Д12АЛ"] if fig <= 134 else ["2Д12Б"]
        rows_x = [[cell(c) for c in re.findall(r"<w:tc>.*?</w:tc>", tr, flags=re.S)] for tr in re.findall(r"<w:tr[ >].*?</w:tr>", tabs[ti], flags=re.S)]
        assert rows_x[0][0].startswith("N"), (ti, rows_x[0][:2])
        foot, rows = {}, []
        for r in rows_x[1:]:
            if len(r) != 16:
                m = re.match(r"(\d)\.\s*(.+?)\.?$", r[0])
                if m:
                    t = m.group(2); foot[m.group(1)] = t[0].upper() + t[1:] + "."
                continue
            q = [None if x in ("", "-") else int(x) for x in r[5:]]
            assert all(x is None for k, x in enumerate(q) if k not in vcol), (fig, r)
            d, mark = des_of(r[2])
            if d.startswith("31 2"):
                raise SystemExit(f"designation lost in the scan: fig {fig} {r}")
            if d == "СБ1226-03-1":  # source marks both barrel rows «1»; the pair 1226-17\\1 / 1225-17-2\\2 shows the second one is the post-1978 variant
                mark = "2"
            rows.append({"pos": int(r[0]) if r[0].isdigit() else 0, "designation": d, "name": fix_name(r[1]), "qty": [q[k] for k in vcol], "note": mark})
        base = ROOT / f"public/img/{'3d12' if model == 'rrp-3d12' else 'mufta'}/ris-{fig}"
        base.parent.mkdir(parents=True, exist_ok=True)
        has_img = fig in imgs
        w = h = 0
        if has_img:
            webp(imgs[fig], base)
            sz = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", imgs[fig]], capture_output=True, text=True).stdout
            iw, ih = [int(x) for x in re.findall(r"pixel\w+:\s*(\d+)", sz)]
            w, h = 900, round(900 * (ih - 16) / (iw - 16))
        folder = "3d12" if model == "rrp-3d12" else "mufta"
        node = {"model": model, "fig": fig, "title": TITLES[fig], "image": f"img/{folder}/ris-{fig}.webp" if has_img else "",
                "image_large": f"img/{folder}/ris-{fig}-1400.webp" if has_img else "", "thumb": f"img/{folder}/ris-{fig}-420.webp" if has_img else "",
                "width": w, "height": h, "variants": variants, "rows": rows, "footnotes": foot}
        (ROOT / f"content/nodes/{model}-ris-{fig}.json").write_text(json.dumps(node, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
        stats[fig] = len(rows)
        for r in rows:
            k = norm(r["designation"])
            if k not in parts:
                s = slug_of(r["designation"], taken); taken.add(s)
                typ = "Прочие детали" if r["designation"].startswith("СБ") else GROUP.get(r["name"].split()[0], "Прочие детали")
                parts[k] = (s, {"designation": r["designation"], "name": r["name"], "type": typ, "models": [], "figures": {"rrp-300": [], "rrp-3d6": [], model: []},
                                "depends_on_variant": False, "price_rub": None})
            d = parts[k][1]
            if model not in d["models"]:
                d["models"].append(model)
            d["figures"].setdefault(model, [])
            if fig not in d["figures"][model]:
                d["figures"][model].append(fig)
    for s, d in parts.values():
        (ROOT / f"content/parts/{s}.json").write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(stats, sum(stats.values()), "rows;", len(parts), "parts total")


if __name__ == "__main__":
    main(*sys.argv[1:4])
