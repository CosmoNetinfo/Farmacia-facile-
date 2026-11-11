(() => {
  const { fullAddressKey } = globalThis.pharmacyAddress;
  const dateFormat = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit"
  });
  const today = () => dateFormat.format();
  const clock = "(?:[01]\\d|2[0-3]):[0-5]\\d";
  const endClock = "(?:" + clock + "|24:00)";
  const intervalPattern = new RegExp("^(" + clock + ")\\s*-\\s*(" + endClock + ")$");
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
    }
  };
  const cache = new Map();
  function provider(town) {
    if (town.province === "BZ") return feeds.bz;
    if (town.region === "Friuli-Venezia Giulia") return feeds.fvg;
    return null;
  }

  function indexHours(rows, feed, date) {
    const index = new Map();
    for (const row of rows) {
      const [municipality, address, intervals] = feed.unpack(row, date);
      const code = String(municipality || "").padStart(6, "0");
      const key = fullAddressKey(address || "");
      if (!/^\d{6}$/.test(code) || !key || !intervals.length) continue;
      const ranges = intervals.map(value => intervalPattern.exec(value.trim()));
      if (ranges.some(range => !range || range[1] >= range[2])) continue;
      const joined = [...new Set(ranges.map(range => range[1] + "–" + range[2]))].sort().join(", ");
      const indexKey = code + "|" + key;
      if (index.has(indexKey)) index.set(indexKey, null);
      else index.set(indexKey, { date, hours: joined, source: feed.source, label: feed.label });
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
      .then(rows => indexHours(rows, feed, date))
      .catch(() => new Map())
      .finally(() => clearTimeout(timer));
    cache.set(feed, { date, expires: Date.now() + 15 * 60 * 1000, promise });
    return promise;
  }

  function load(town, pharmacies, date) {
    const feed = provider(town);
    if (!feed) return null;
    return download(feed, date).then(index => {
      const byAddress = new Map();
      for (const row of town.pharmacies) {
        const key = fullAddressKey(row[2]);
        if (!key) continue;
        byAddress.set(key, byAddress.has(key) ? null : row[0]);
      }
      for (const pharmacy of pharmacies) {
        const key = fullAddressKey(pharmacy.registryAddress);
        if (byAddress.get(key) !== pharmacy.id) continue;
        pharmacy.daily = index.get(town.code + "|" + key) || undefined;
      }
    });
  }

  globalThis.regionalPharmacyHours = { today, load };
})();
