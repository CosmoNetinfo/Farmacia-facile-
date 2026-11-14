#!/usr/bin/env python3
"""Genera docs/recapiti-regionali.js: telefoni da open data regionali, abbinati all'anagrafe del Ministero.

Fonti (solo licenze aperte):
  L = Regione Lombardia, dataset "Farmacie" (CC0 1.0)            https://www.dati.lombardia.it/Sanit-/Farmacie/rzp3-qudj
  F = Regione Friuli-Venezia Giulia, dataset "Farmacie" (IODL 2.0) https://www.dati.friuliveneziagiulia.it/Salute-e-Sanit-/Farmacie/jbxd-m6xe
Uso: python3 scripts/recapiti-regionali.py   (dalla radice del repo; serve rete)
Regole: abbinamento per comune + indirizzo/coordinate/nome con punteggio >= 3 e candidato unico;
        i telefoni già presenti in OpenStreetMap non vengono toccati (OSM ha la precedenza nell'app).
"""
import csv, io, json, math, re, unicodedata, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent / "docs"
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "FarmaciaVicino/1.0"}), timeout=90).read().decode("utf-8")
def js(name):
    t = (ROOT / name).read_text(encoding="utf-8"); return json.loads(t[t.index("{"):t.rindex("}") + 1])
data = js("farmacie.js")
osm = json.loads((lambda t: t[t.index('{"date'):t.rindex("}") + 1])((ROOT / "recapiti-osm.js").read_text(encoding="utf-8")))["records"]
ph = [dict(id=r[0], name=r[1], addr=r[2], c=r[4], town=t[0]) for t in data["cities"] for r in t[3]]
def fold(s):
    s = unicodedata.normalize("NFKD", s.lower()); return "".join(ch for ch in s if not unicodedata.combining(ch))
STOP = r"\b(farmacia|dott|dr|dottssa|snc|sas|srl|di|del|della|dei|e|c|sdf|spa|comunale|n)\b"
def norm(s): return re.sub(r"[^a-z0-9]", "", re.sub(STOP, "", fold(s)))
def town(s): return re.sub(r"[^a-z]", "", fold(s))
def addr(s):
    s = fold(s); m = re.search(r"(\d+)", s.split(",", 1)[1] if "," in s else s)
    skip = {"via", "viale", "piazza", "piazzale", "corso", "largo", "vicolo", "strada", "localita", "frazione", "vico", "traversa"}
    return {t for t in re.findall(r"[a-z]{4,}", s.split(",")[0]) if t not in skip}, (m.group(1) if m else "")
def dist(a, b): return math.hypot((a[0] - b[0]) * 111000, (a[1] - b[1]) * 111000 * math.cos(math.radians(a[0])))
def phone(raw):
    first = re.split(r"[/;,-]|\se\s", raw or "")[0]; d = re.sub(r"\D", "", first)
    if d.startswith("0039"): d = d[4:]
    elif d.startswith("39") and len(d) > 10: d = d[2:]
    return "+39" + d if re.fullmatch(r"(0\d{5,10}|3\d{8,9}|80\d{7,8})", d) else None
bytown = {}
for p in ph: bytown.setdefault(town(p["town"]), []).append(p)
def match(rows, label):
    out = {}; amb = 0
    for g in rows:
        if not g["tel"]: continue
        gs, gn = addr(g["addr"]); best = []
        for p in bytown.get(town(g["town"]), []):
            ps, pn = addr(p["addr"]); sc = 0
            if gs and ps and gs & ps: sc += 3 if gn and gn == pn else 1
            if g["c"] and p["c"]:
                d = dist(g["c"], p["c"]); sc += 2 if d < 60 else 1 if d < 200 else 0
            a, b = norm(g["name"]), norm(p["name"])
            if a and b and a == b: sc += 2
            elif a and b and len(min(a, b, key=len)) >= 5 and (a in b or b in a): sc += 1
            if sc >= 3: best.append((sc, p["id"]))
        best.sort(reverse=True)
        if best and (len(best) == 1 or best[0][0] > best[1][0]): out[best[0][1]] = g["tel"]
        elif best: amb += 1
    print(label, "abbinati", len(out), "ambigui scartati", amb); return out
def ll(a, b):
    try: return (float(a), float(b))
    except ValueError: return None
L = [dict(tel=phone(r["TELEFONO"]), c=ll(r["LAT"], r["LNG"]), addr=r["INDIRIZZO"], name=r["DENOM_FARMACIA"], town=r["LOCALITA"])
     for r in csv.DictReader(io.StringIO(get("https://www.dati.lombardia.it/resource/rzp3-qudj.csv?$limit=5000")))]
F = [dict(tel=phone(r["telefono"]), c=ll(r["latitudine"], r["longitudine"]), addr=r["indirizzo"], name=r["insegna"] or r["ragionesociale"], town=r["comune"])
     for r in csv.DictReader(io.StringIO(get("https://www.dati.friuliveneziagiulia.it/resource/jbxd-m6xe.csv?$limit=5000")))]
records = {}
for key, found in (("L", match(L, "Lombardia")), ("F", match(F, "FVG"))):
    for i, tel in found.items():
        if osm.get(str(i), [None] * 3)[2]: continue
        records.setdefault(str(i), [tel, key])
out = {"date": datetime.date.today().isoformat(),
       "sources": {"L": {"label": "Regione Lombardia (CC0 1.0), dato del 2020", "url": "https://www.dati.lombardia.it/Sanit-/Farmacie/rzp3-qudj"},
                   "F": {"label": "Regione Friuli-Venezia Giulia (IODL 2.0)", "url": "https://www.dati.friuliveneziagiulia.it/Salute-e-Sanit-/Farmacie/jbxd-m6xe"}},
       "records": records}
(ROOT / "recapiti-regionali.js").write_text("/* Telefoni da open data regionali: Regione Lombardia (CC0 1.0) e Regione Friuli-Venezia Giulia (IODL 2.0). Generato da scripts/recapiti-regionali.py */\nwindow.recapitiRegionali = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print("telefoni nuovi:", len(records))
