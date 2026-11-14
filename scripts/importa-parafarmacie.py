#!/usr/bin/env python3
"""Genera docs/parafarmacie.js dal dataset "Parafarmacie" del Ministero della Salute (IODL 2.0).
https://www.dati.salute.gov.it/it/dataset/parafarmacie/
Uso: python3 scripts/importa-parafarmacie.py [file.csv]   (senza argomento scarica il CSV più recente dalla pagina del dataset)
Gli ID sono 5.000.000 + codice del sito, per non collidere con gli ID delle farmacie."""
import csv, io, json, re, sys, pathlib, datetime, urllib.request
OUT = pathlib.Path(__file__).resolve().parent.parent / "docs" / "parafarmacie.js"
BASE = "https://www.dati.salute.gov.it"
def fetch(url): return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "FarmaciaVicino/1.0"}), timeout=120).read()
if len(sys.argv) > 1: raw = pathlib.Path(sys.argv[1]).read_bytes()
else:
    page = fetch(BASE + "/it/dataset/parafarmacie/").decode("utf-8", "replace")
    raw = fetch(BASE + re.search(r'/sites/default/files/opendata/FRM_PFARMA[^"]+\.csv', page).group(0))
text = raw.decode("utf-8-sig")
today = datetime.date.today()
def fix(s):
    s = (s or "").strip()
    if re.search(r"[ÂÃ][\u0080-¿]", s):
        try: s = s.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError): pass
    s = re.sub(r"\u00c3(?=\W|$)", "\u00e0", s)  # «LibertÃ» (accento finale troncato) -> «Libertà»
    s = re.sub(r"\u00c2|\u00e2(?=\W|$)", "", s)
    return re.sub(r"\s+", " ", s).strip()
SMALL = {"a", "al", "alla", "alle", "con", "dai", "dal", "de", "dei", "del", "della", "delle", "di", "e", "in", "sul", "da", "per", "il", "lo", "la", "i", "gli", "le", "dr", "dott", "dott.ssa"}
def titled(s):
    if s != s.upper() and s != s.lower(): return s
    return re.sub(r"[^\W\d_]+'?|\d+[^\W\d_]*", lambda m: m.group(0) if (m.start() > 0 and m.group(0).lower() in SMALL) else m.group(0)[:1].upper() + m.group(0)[1:].lower(), s.lower())
def date(s):
    try: return datetime.datetime.strptime(s, "%d/%m/%Y").date()
    except ValueError: return None
active = {}
for r in csv.DictReader(io.StringIO(text), delimiter=";"):
    code = r["codice_identificativo_sito"].strip()
    if not code or not r["codice_comune"] or not r["comune"] or not r["sito_logistico"].strip(): continue
    start, end = date(r["data_inizio_validita"]), date(r["data_fine_validita"])
    if start and start > today: continue
    if end and end < today: continue
    if code in active and (date(active[code]["data_inizio_validita"]) or today) >= (start or today): continue
    active[code] = r
cities = {}
for code, r in sorted(active.items(), key=lambda kv: int(kv[0])):
    key = r["codice_comune"]
    cities.setdefault(key, [fix(r["comune"]), r["sigla_provincia"], fix(r["regione"]), [], key])
    try:
        lat, lon = float(r["latitudine"].replace(",", ".")), float(r["longitudine"].replace(",", "."))
        coords = [round(lat, 6), round(lon, 6)] if 35 <= lat <= 48 and 6 <= lon <= 19 else None
    except ValueError: coords = None
    cities[key][3].append([5000000 + int(code), titled(fix(r["sito_logistico"])), titled(fix(r["indirizzo"])), r["cap"].strip() or "-", coords, "Parafarmacia", "-"])
out = {"date": today.isoformat(), "cities": list(cities.values())}
OUT.write_text("window.parafarmacie = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";", encoding="utf-8")
print(len(active), "parafarmacie attive in", len(cities), "comuni")
