"""Prepara il catalogo dei comuni e delle fusioni dai report ISTAT SITUAS 61 e 128."""

import argparse
from collections import defaultdict
import csv
import io
import json
import re
from pathlib import Path
from zipfile import ZipFile

SOURCE = "https://situas.istat.it/web/"


def rows(path):
    return json.loads(path.read_text(encoding="utf-8"), strict=False)["resultset"]


def successors(records, municipalities, sardinia):
    destinations = defaultdict(set, sardinia)
    for record in records:
        source = record.get("PRO_COM_T", "")
        target = record.get("PRO_COM_T_REL", "")
        if re.fullmatch(r"\d{6}", source or "") and re.fullmatch(r"\d{6}", target or ""):
            destinations[source].add(target)
    redirects = {}
    for source in sorted(destinations):
        current = source
        visited = set()
        while current not in municipalities and current not in visited:
            visited.add(current)
            candidates = destinations.get(current, ())
            if len(candidates) != 1:
                break
            current = next(iter(candidates))
        if source != current and current in municipalities:
            redirects[source] = current
    return redirects


def sardinian_codes(path, municipalities):
    codes = defaultdict(set)
    with ZipFile(path) as archive:
        [filename] = [entry for entry in archive.namelist() if entry.lower().endswith(".csv")]
        with io.TextIOWrapper(archive.open(filename), encoding="cp1252", newline="") as source:
            for row in csv.reader(source, delimiter=";"):
                if len(row) > 4 and row[2] in municipalities and re.fullmatch(r"\d{6}", row[4]):
                    codes[row[4]].add(row[2])
    return codes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("catalogo", type=Path, help="SITUAS 61, codici e denominazioni")
    parser.add_argument("soppressioni", type=Path, help="SITUAS 128, comuni soppressi")
    parser.add_argument("sardegna", type=Path, help="ZIP ISTAT di ricodifica dei comuni sardi")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "docs" / "comuni.js")
    args = parser.parse_args()

    municipalities = {}
    for row in rows(args.catalogo):
        code = row["PRO_COM_T"]
        name = row.get("COMUNE_IT") or row["COMUNE"]
        province = row["SIGLA_AUTOMOBILISTICA"]
        region = row["DEN_REG"]
        alias = row.get("COMUNE_A", "")
        zone = row["COD_RIP"]
        province_name = row["DEN_UTS"]
        if code in municipalities or not re.fullmatch(r"\d{6}", code) or not all((name, province, region, province_name)) or zone not in range(1, 6):
            raise ValueError(f"Riga ISTAT non valida: {code} {name}")
        municipalities[code] = [code, name, province, region, alias, zone, province_name]
    if len(municipalities) < 7800:
        raise ValueError("Il foglio non contiene l'elenco nazionale completo.")
    redirects = successors(rows(args.soppressioni), municipalities, sardinian_codes(args.sardegna, municipalities))
    payload = json.dumps(
        {"cities": list(municipalities.values()), "redirects": redirects},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    args.output.write_text(f"/* Fonte: ISTAT — {SOURCE} */\nwindow.comuniIstat = {payload};\n", encoding="utf-8")
    print(f"{len(municipalities)} comuni ISTAT, {len(redirects)} codici storici ricondotti a un comune attuale.")


if __name__ == "__main__":
    main()
