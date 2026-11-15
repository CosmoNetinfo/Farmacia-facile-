#!/usr/bin/env python3
"""Genera docs/recapiti-parafarmacie.js: recapiti OpenStreetMap abbinati alle parafarmacie del Ministero.
© OpenStreetMap contributors, ODbL 1.0. Stesso formato di docs/recapiti-osm.js: [tipo, id OSM, telefono, sito, orari].
Estrazione (overpass-turbo.eu, «dati OSM grezzi»):
  [out:json][timeout:180]; area["ISO3166-1"="IT"][admin_level=2]->.it;
  (nwr(area.it)["shop"="chemist"]["name"~"parafarm",i]; nwr(area.it)["amenity"="pharmacy"]["name"~"parafarm",i];
   nwr(area.it)["amenity"="pharmacy"]["dispensing"="no"];); out center tags;
Uso: python3 scripts/recapiti-parafarmacie.py estrazione.json
Si scartano gli elementi con ref:msal (sono farmacie, non parafarmacie). Abbinamento: coordinate (<250 m), indirizzo e nome, punteggio >= 3 (>= 2 se il nome OSM contiene «parafarm» e il candidato è entro 120 m), candidato unico o nettamente migliore."""
import json, math, re, sys, pathlib, unicodedata
ROOT = pathlib.Path(__file__).resolve().parent.parent / "docs"
osm = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
if not osm.get("elements") or osm.get("remark"): sys.exit("Estrazione vuota o incompleta")
t = (ROOT / "parafarmacie.js").read_text(encoding="utf-8"); data = json.loads(t[t.index("{"):t.rindex("}") + 1])
rows = [dict(id=r[0], name=r[1], addr=r[2], cap=r[3], c=r[4], town=c[0]) for c in data["cities"] for r in c[3]]
def fold(s): s = unicodedata.normalize("NFKD", (s or "").lower()); return "".join(ch for ch in s if not unicodedata.combining(ch))
STOP = r"\b(parafarmacia|parafarmacie|farmacia|dott|dr|dottssa|dssa|snc|sas|srl|srls|di|del|della|dei|e|c|sdf|spa|n)\b"
def norm(s): return re.sub(r"[^a-z0-9]", "", re.sub(STOP, "", fold(s)))
def town(s): return re.sub(r"[^a-z]", "", fold(s))
SKIP = {"via", "viale", "piazza", "piazzale", "corso", "largo", "vicolo", "strada", "localita", "frazione", "vico", "traversa"}
def addr(street, number):
    return {x for x in re.findall(r"[a-z]{4,}", fold(street)) if x not in SKIP}, (re.search(r"\d+", number or "") or [""])[0] if number else ""
def addr_row(s):
    s = fold(s); m = re.search(r"(\d+)", s.split(",", 1)[1] if "," in s else s)
    return {x for x in re.findall(r"[a-z]{4,}", s.split(",")[0]) if x not in SKIP}, (m.group(1) if m else (re.search(r"(\d+)", s) or [""])[0] if re.search(r"(\d+)", s) else "")
def dist(a, b): return math.hypot((a[0] - b[0]) * 111000, (a[1] - b[1]) * 111000 * math.cos(math.radians(a[0])))
grid = {}
for r in rows:
    if r["c"]: grid.setdefault((round(r["c"][0], 2), round(r["c"][1], 2)), []).append(r)
def phone(raw):
    d = re.sub(r"[ ().-]", "", re.split(r"[;/,]", (raw or "").strip())[0]); d = re.sub(r"^0039", "+39", d)
    if re.fullmatch(r"\+39\d{6,12}", d): return d
    return "+39" + d if re.fullmatch(r"(?:0|3)\d{5,11}", d) else None
def site(raw):
    m = re.fullmatch(r"https?://[^\s/@]+\.[^\s/@]+\S*", (raw or "").strip()); return m.group(0) if m else None
def hours(raw):
    v = re.sub(r"\s*,\s*", ",", re.sub(r"\s*-\s*", "-", re.sub("[–−]", "-", (raw or "").strip())))
    if v == "24/7": return v
    day = "(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)"; tm = r"(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)"; per = tm + "-" + tm
    simple = re.compile(r"^(?:" + day + "(?:-" + day + ")?(?:," + day + "(?:-" + day + ")?)*\\s+)?(?:" + per + "(?:,\\s*" + per + ")*|off)$")
    return v if len(v) <= 240 and re.search(r"\d{2}:\d{2}", v) and all(simple.match(x.strip()) for x in v.split(";")) else None
found = {}; total = scartati = 0
for e in osm["elements"]:
    tg = e.get("tags", {})
    if "ref:msal" in tg: continue
    ph = phone(tg.get("contact:phone") or tg.get("phone") or tg.get("contact:mobile")); st = site(tg.get("contact:website") or tg.get("website")); hr = hours(tg.get("opening_hours"))
    if not (ph or st or hr): continue
    total += 1
    c = (e["lat"], e["lon"]) if "lat" in e else ((e["center"]["lat"], e["center"]["lon"]) if "center" in e else None)
    if not c: continue
    gs, gn = addr(tg.get("addr:street") or tg.get("addr:place"), tg.get("addr:housenumber")); best = []
    cand = [r for dx in (-.01, 0, .01) for dy in (-.01, 0, .01) for r in grid.get((round(c[0] + dx, 2), round(c[1] + dy, 2)), [])]
    for r in cand:
        d = dist(c, r["c"])
        if d > 250: continue
        if tg.get("addr:city") and town(tg["addr:city"]) != town(r["town"]): continue
        ps, pn = addr_row(r["addr"]); sc = 2 if d < 60 else 1
        if gs and ps and gs & ps: sc += 3 if gn and gn == pn else 1
        a, b = norm(tg.get("name")), norm(r["name"])
        if a and b and a == b: sc += 2
        elif a and b and len(min(a, b, key=len)) >= 5 and (a in b or b in a): sc += 1
        if sc >= 3 or (sc >= 2 and d < 120 and "parafarm" in fold(tg.get("name"))): best.append((sc, r["id"]))
    best.sort(reverse=True)
    if best and (len(best) == 1 or best[0][0] > best[1][0]):
        rid = best[0][1]
        rec = [e["type"], e["id"], ph, st, hr]
        old = found.get(rid)
        if not old or sum(x is not None for x in rec[2:]) > sum(x is not None for x in old[2:]): found[rid] = rec
    else: scartati += 1
date = osm["osm3s"]["timestamp_osm_base"][:10]
(ROOT / "recapiti-parafarmacie.js").write_text("/* © OpenStreetMap contributors. ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/ */\nwindow.recapitiParafarmacie = " + json.dumps({"date": date, "records": {str(k): v for k, v in found.items()}}, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print("elementi con recapiti:", total, "| abbinati:", len(found), "| ambigui/senza abbinamento:", scartati)
print("telefoni:", sum(1 for v in found.values() if v[2]), "siti:", sum(1 for v in found.values() if v[3]), "orari:", sum(1 for v in found.values() if v[4]))
