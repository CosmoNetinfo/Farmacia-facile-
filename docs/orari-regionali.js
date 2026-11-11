(() => {
  const { addressKey, fullAddressKey, normalize } = globalThis.pharmacyAddress;
  const florenceCode = "048017";
  const dateFormat = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit"
  });
  const today = () => dateFormat.format();
  const clock = "(?:[01]\\d|2[0-3]):[0-5]\\d";
  const endClock = "(?:" + clock + "|24:00)";
  const intervalPattern = new RegExp("^(" + clock + ")\\s*-\\s*(" + endClock + ")$");
  const florenceInterval = /^(\d{1,2})[.:](\d{2})\s*\/\s*(\d{1,2})[.:](\d{2})$/;
  const singleCivic = /^\d+[a-qs-z]?$/;

  function florenceAddress(row) {
    const street = row.VIA;
    const number = row.NCIVICO;
    const suffix = row.ESPONENTECIV ?? "";
    if (typeof street !== "string" || !["string", "number"].includes(typeof number) ||
        typeof suffix !== "string" || row.TIPO_CIVICO) return "";
    const civic = String(number).trim();
    if (!/^\d+(?:\s*\/?\s*[a-z])?$/i.test(civic) ||
        (suffix.trim() && (!/^\d+$/.test(civic) || !/^\/?\s*[a-z]$/i.test(suffix.trim())))) return "";
    const key = addressKey(street, civic + suffix);
    return singleCivic.test(key.split("|")[1]) ? key : "";
  }

  function florenceName(name) {
    const label = normalize(name).replace(/^farmacia(?: |$)/, "");
    const municipal = /^comunale (?:n )?(\d+)(?: |$)/.exec(label);
    return municipal ? "comunale " + municipal[1] : label;
  }
  const feeds = {
    fvg: {
      url: () => "https://www.dati.friuliveneziagiulia.it/resource/jbxd-m6xe.json?$limit=1000",
      source: "https://www.dati.friuliveneziagiulia.it/Salute-e-Sanit-/Farmacie/jbxd-m6xe",
      label: "Regione FVG",
      unpack(row, date) {
        const intervals = [];
        for (const [key, type] of Object.entries(row)) {
          const field = key.match(/^(orari_\d+)_tipo$/)?.[1];
          if (!field || type !== "normale") continue;
          const start = row[field + "_da"];
          const end = row[field + "_a"];
          if (!start?.startsWith(date + "T") || !end) continue;
          const endDate = end.slice(0, 10);
          let endTime = end.slice(11, 16);
          if (endDate !== date) {
            const tomorrow = new Date(Date.parse(date + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
            if (endDate !== tomorrow || endTime !== "00:00") continue;
            endTime = "24:00";
          }
          intervals.push(start.slice(11, 16) + "-" + endTime);
        }
        return [row.idcomune, row.indirizzo, intervals];
      }
    },
    bz: {
      url: date => "https://daten.buergernetz.bz.it/services/pharmacy/v1/json?date=" + date.split("-").reverse().join("."),
      source: "https://data.civis.bz.it/dataset/farmacie-di-turno-dell-alto-adige1",
      label: "Provincia di Bolzano",
      unpack(row, date) {
        const intervals = row.DATE?.startsWith(date + "T") && row.PHAR_TIMETABLE
          ? row.PHAR_TIMETABLE.split("/") : [];
        return [row.GEME_ISTAT, row.PHAR_ADRESS_I, intervals];
      }
    },
    firenze: {
      url: () => "https://datigis.comune.fi.it/json/turno_farmacie.json",
      source: "https://opendata.comune.fi.it/page_dataset_show?id=cac33ab9-7331-4ecc-a365-712e6913da08",
      label: "Fonte: Comune di Firenze, CC BY 4.0",
      field: "turn",
      records: data => data?.type === "FeatureCollection" ? data.features : [],
      unpack(feature, date) {
        const row = feature?.properties;
        if (row?.DATA_VALIDITA !== date.split("-").reverse().join("-")) return [];
        const schedule = typeof row.ORARIO_TURNO === "string" ? row.ORARIO_TURNO.trim() : "";
        const intervals = /^H24$/i.test(schedule) ? ["00:00-24:00"] : schedule.split(/\s+-\s+/).map(value => {
          const range = florenceInterval.exec(value.trim());
          return range ? range[1].padStart(2, "0") + ":" + range[2] + "-" + range[3].padStart(2, "0") + ":" + range[4] : "";
        });
        return [florenceCode, "", intervals, florenceAddress(row), row.DENOMINAZIONE];
      }
    }
  };
  const cache = new Map();
  function provider(town) {
    if (town.code === florenceCode) return feeds.firenze;
    if (town.province === "BZ") return feeds.bz;
    if (town.region === "Friuli-Venezia Giulia") return feeds.fvg;
    return null;
  }

  function indexHours(rows, feed, date) {
    const index = new Map();
    for (const row of rows) {
      const [municipality, address, intervals, sourceKey, name] = feed.unpack(row, date);
      const code = String(municipality || "").padStart(6, "0");
      const key = feed.field === "turn" ? sourceKey : fullAddressKey(address || "");
      if (!/^\d{6}$/.test(code) || !key || !intervals?.length) continue;
      const indexKey = code + "|" + key;
      if (feed.field === "turn" && (index.has(indexKey) || typeof name !== "string" || !florenceName(name))) {
        index.set(indexKey, null);
        continue;
      }
      const ranges = intervals.map(value => intervalPattern.exec(value.trim()));
      if (ranges.some(range => !range || range[1] >= range[2])) {
        if (feed.field === "turn") index.set(indexKey, null);
        continue;
      }
      const joined = [...new Set(ranges.map(range => range[1] + "–" + range[2]))].sort().join(", ");
      if (index.has(indexKey)) index.set(indexKey, null);
      else index.set(indexKey, { date, hours: joined, source: feed.source, label: feed.label, name });
    }
    return index;
  }

  function download(feed, date) {
    const previous = cache.get(feed);
    if (previous?.date === date && previous.expires > Date.now()) return previous.promise;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const promise = fetch(feed.url(date), { signal: controller.signal, cache: "no-cache" })
      .then(response => {
        if (!response.ok) throw new Error("Orari regionali non disponibili");
        return response.json();
      })
      .then(data => indexHours(feed.records ? feed.records(data) : data, feed, date))
      .catch(() => new Map())
      .finally(() => clearTimeout(timer));
    cache.set(feed, { date, expires: Date.now() + 15 * 60 * 1000, promise });
    return promise;
  }

  function load(town, pharmacies, date) {
    const feed = provider(town);
    if (!feed) return null;
    return download(feed, date).then(index => {
      const field = feed.field || "daily";
      const byAddress = new Map();
      for (const row of town.pharmacies) {
        const key = fullAddressKey(row[2]);
        if (!key) continue;
        byAddress.set(key, byAddress.has(key) ? null : row[0]);
      }
      for (const pharmacy of pharmacies) {
        const key = fullAddressKey(pharmacy.registryAddress);
        pharmacy[field] = undefined;
        if (byAddress.get(key) !== pharmacy.id) continue;
        const record = index.get(town.code + "|" + key);
        if (!record || (field === "turn" && florenceName(record.name) !== florenceName(pharmacy.name))) continue;
        pharmacy[field] = record;
      }
    });
  }

  function turnRefreshDelay(town) {
    if (town.code !== florenceCode) return undefined;
    const now = Date.now();
    const date = dateFormat.format(now);
    let start = now;
    let end = now + 26 * 60 * 60 * 1000;
    // Find the next midnight in Rome, including days with a clock change.
    while (end - start > 1) {
      const middle = Math.floor((start + end) / 2);
      if (dateFormat.format(middle) === date) start = middle;
      else end = middle;
    }
    return end - now;
  }

  globalThis.regionalPharmacyHours = { today, load, turnRefreshDelay };
})();
