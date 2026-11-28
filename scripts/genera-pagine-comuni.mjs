// Genera le pagine statiche per regione e per comune (docs/farmacie/) e la sitemap.
// Uso: node scripts/genera-pagine-comuni.mjs
// Rilancialo dopo ogni aggiornamento di docs/farmacie.js, recapiti-osm.js o schede-verificate.js.
import fs from "node:fs";
import path from "node:path";

const docs = path.resolve(import.meta.dirname, "..", "docs");
const BASE = "https://cosmonetinfo.github.io/Farmacia-facile-/";
const load = file => { const window = {}; new Function("window", fs.readFileSync(path.join(docs, file), "utf8"))(window); return window; };
const { farmacie } = load("farmacie.js");
const { comuniIstat } = load("comuni.js");
const osm = load("recapiti-osm.js").recapitiOSM?.records || {};
const regional = load("recapiti-regionali.js").recapitiRegionali?.records || {};
const verified = new Map((load("schede-verificate.js").schedeVerificate || []).map(r => [r.id, r]));
const servizi = new Map(load("servizi.js").servizi);

const normalize = t => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slug = t => normalize(t).replace(/ /g, "-");
const small = new Set(["a", "al", "alla", "alle", "con", "dai", "dal", "de", "dei", "del", "della", "delle", "di", "e", "in", "sul", "da", "d", "l", "dell", "all", "sull", "dello"]);
const titleCase = t => t.toLocaleLowerCase("it-IT").replace(/[\p{L}']+/gu, (w, i) => (i > 0 && small.has(w)) ? w : w.charAt(0).toLocaleUpperCase("it-IT") + w.slice(1))
  .replace(/\b(\p{L})'(\p{L})/gu, (m, a, b) => a + "'" + b.toLocaleUpperCase("it-IT"));
const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const days = { Mo: "Lun", Tu: "Mar", We: "Mer", Th: "Gio", Fr: "Ven", Sa: "Sab", Su: "Dom", PH: "Festivi" };
const osmHours = s => s === "24/7" ? "Tutti i giorni, 24 ore su 24" : s?.split(";").map(r => r.trim().replace(/\b(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, d => days[d]).replace(/\boff\b/g, "chiuso").replaceAll("-", "–").replace(/,(\S)/g, ", $1")).join(" · ");

const istat = new Map(comuniIstat.cities.map(c => [c[0], c]));
const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "UTC" }).format(new Date(farmacie.date + "T00:00:00Z"));

const towns = new Map();
for (const [name, province, region, rows, code] of farmacie.cities) {
  const known = istat.get(code);
  const key = code || normalize(name) + "-" + province;
  if (!towns.has(key)) towns.set(key, {
    label: known ? known[1] : titleCase(name), province: known ? known[2] : province,
    provinceName: known ? known[6] : province, region: known ? known[3] : titleCase(region), rows: []
  });
  towns.get(key).rows.push(...rows);
}
const list = [...towns.values()];
const used = new Set();
for (const t of list.sort((a, b) => a.region.localeCompare(b.region, "it") || a.label.localeCompare(b.label, "it"))) {
  t.regionSlug = slug(t.region.split("/")[0]);
  let s = slug(t.label) + "-" + t.province.toLowerCase();
  while (used.has(t.regionSlug + "/" + s)) s += "-2";
  used.add(t.regionSlug + "/" + s);
  t.slug = s;
}

const head = (depth, title, description, canonical, extra = "") => {
  const up = "../".repeat(depth);
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${up}styles.css?v=9">
  <link rel="stylesheet" href="${up}adesione.css?v=3">
  <link rel="stylesheet" href="${up}pagine.css">
${extra}</head>
<body>
  <header class="topbar">
    <div class="wrap topbar-inner">
      <a class="brand" href="${up}" aria-label="Farmacia Vicino, torna alla home">
        <img class="brand-mark" src="${up}favicon.svg" alt="" width="36" height="36"><span>Farmacia<span class="brand-accent">Vicino</span></span>
        <span class="brand-beta">Beta</span>
      </a>
    </div>
  </header>
  <main class="adesione pagina">
`;
};
const foot = depth => `    <p class="note">Questo sito non è un servizio di emergenza. In caso di emergenza, chiama il <a href="tel:112">112</a>. · <a href="${"../".repeat(depth)}privacy.html">Privacy</a></p>
  </main>
</body>
</html>
`;
const crumbs = items => `{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[${items.map(([n, u], i) => `{"@type":"ListItem","position":${i + 1},"name":${JSON.stringify(n)},"item":"${u}"}`).join(",")}]}`;
const write = (rel, html) => { const f = path.join(docs, "farmacie", rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
fs.rmSync(path.join(docs, "farmacie"), { recursive: true, force: true });

const urls = [BASE];
const byRegion = Map.groupBy(list, t => t.regionSlug);

for (const t of list) {
  const rows = t.rows.slice().sort((a, b) => a[1].localeCompare(b[1], "it"));
  const items = rows.map(([id, name, address, cap, , type]) => {
    const info = verified.get(id) && normalize(verified.get(id).registryAddress) === normalize(address) ? verified.get(id) : undefined;
    const rec = osm[id];
    const phone = info?.phone || rec?.[2] || regional[id]?.[0];
    const mobile = info?.mobile;
    const hours = info ? info.hours : osmHours(rec?.[4]);
    const title = info?.name || (/\b(?:farmacia|farmacie|dispensario|apotheke)\b/i.test(name) ? titleCase(name) : (/dispensario/i.test(type) ? "Dispensario " : "Farmacia ") + titleCase(name));
    const street = /\p{Lu}{3,}/u.test(address) ? titleCase(address) : address;
    const svc = (info?.services || []).filter(k => servizi.has(k)).map(k => `<li>${esc(servizi.get(k))}</li>`).join("");
    return `      <li class="farmacia">
        <h3>${esc(title)}</h3>
        <p>${esc(street)}${cap && cap !== "-" ? ", " + esc(cap) : ""} ${esc(t.label)}</p>
${hours ? `        <p class="orari">${esc(hours)}</p>\n` : ""}${phone ? `        <p><a href="tel:${esc(phone)}">${esc(phone.replace(/^\+39/, ""))}</a></p>\n` : ""}${mobile ? `        <p>Cellulare: <a href="tel:${esc(mobile)}">${esc(mobile.replace(/^\+39/, ""))}</a>${info.whatsapp ? ` · <a href="https://wa.me/${esc(mobile.replace(/\D/g, ""))}">WhatsApp</a>` : ""}</p>\n` : ""}${svc ? `        <ul class="service-chips">${svc}</ul>\n` : ""}      </li>`;
  }).join("\n");
  const n = rows.length;
  const where = `${t.label} (${t.province})`;
  const url = `${BASE}farmacie/${t.regionSlug}/${t.slug}.html`;
  const app = `../../?comune=${encodeURIComponent(t.label)}&amp;provincia=${t.province}`;
  const title = `Farmacie a ${where}: indirizzi e recapiti | Farmacia Vicino`;
  const description = `${n === 1 ? "La farmacia" : `Le ${n} farmacie`} di ${t.label} (${t.province}) dall'anagrafe del Ministero della Salute: indirizzi, e dove disponibili telefono e orari. Apri la mappa →`;
  const ld = `  <script type="application/ld+json">${crumbs([["Farmacia Vicino", BASE], ["Farmacie in Italia", BASE + "farmacie/"], [t.region.split("/")[0], `${BASE}farmacie/${t.regionSlug}.html`], [t.label, url]])}</script>\n`;
  write(`${t.regionSlug}/${t.slug}.html`, head(2, title, description.slice(0, 300), url, ld) + `    <p class="crumbs"><a href="../../">Home</a> › <a href="../">Farmacie in Italia</a> › <a href="../${t.regionSlug}.html">${esc(t.region.split("/")[0])}</a></p>
    <h1>Farmacie a ${esc(t.label)} (${t.province})</h1>
    <p class="lead">${n === 1 ? "Nell'anagrafe del Ministero della Salute risulta 1 farmacia" : `Nell'anagrafe del Ministero della Salute risultano ${n} farmacie`} a ${esc(t.label)}, in provincia di ${esc(t.provinceName)}. Dati aggiornati all'${date}. Chiama sempre prima di uscire: orari e turni possono cambiare.</p>
    <p><a class="primary" href="${app}">Apri la mappa e le farmacie di turno</a></p>
    <ul class="farmacie">
${items}
    </ul>
    <p class="note">Telefoni e orari sono mostrati solo dove disponibili da OpenStreetMap o da controlli di CosmoNet. Sei una farmacia? <a href="../../adesione.html">Comunica i tuoi dati</a>.</p>
` + foot(2));
  urls.push(url);
}

for (const [rs, towns] of byRegion) {
  const regionName = towns[0].region.split("/")[0];
  const url = `${BASE}farmacie/${rs}.html`;
  const provinces = Map.groupBy(towns, t => t.provinceName);
  const body = [...provinces].sort((a, b) => a[0].localeCompare(b[0], "it")).map(([prov, ts]) =>
    `    <h2>${esc(prov)}</h2>\n    <ul class="comuni">\n${ts.map(t => `      <li><a href="${rs}/${t.slug}.html">${esc(t.label)}</a></li>`).join("\n")}\n    </ul>`).join("\n");
  write(`${rs}.html`, head(1, `Farmacie in ${regionName}: elenco dei comuni | Farmacia Vicino`, `Elenco dei comuni di ${regionName} con le farmacie dell'anagrafe del Ministero della Salute: scegli il comune e trova indirizzi e recapiti →`, url,
    `  <script type="application/ld+json">${crumbs([["Farmacia Vicino", BASE], ["Farmacie in Italia", BASE + "farmacie/"], [regionName, url]])}</script>\n`) +
    `    <p class="crumbs"><a href="../">Home</a> › <a href="./">Farmacie in Italia</a></p>\n    <h1>Farmacie in ${esc(regionName)}</h1>\n    <p class="lead">${towns.length} comuni con almeno una farmacia. Scegli il tuo comune.</p>\n${body}\n` + foot(1));
  urls.push(url);
}

const regions = [...byRegion].sort((a, b) => a[1][0].region.localeCompare(b[1][0].region, "it"));
write("index.html", head(1, "Farmacie in Italia: elenco per regione e comune | Farmacia Vicino", "Trova le farmacie italiane per regione e comune, con i dati ufficiali del Ministero della Salute. Scegli la regione →", BASE + "farmacie/",
  `  <script type="application/ld+json">${crumbs([["Farmacia Vicino", BASE], ["Farmacie in Italia", BASE + "farmacie/"]])}</script>\n`) +
  `    <p class="crumbs"><a href="../">Home</a></p>\n    <h1>Farmacie in Italia</h1>\n    <p class="lead">Elenco per regione e comune dall'anagrafe del Ministero della Salute, aggiornata all'${date}.</p>\n    <ul class="comuni">\n${regions.map(([rs, ts]) => `      <li><a href="${rs}.html">${esc(ts[0].region.split("/")[0])}</a> <span>${ts.reduce((s, t) => s + t.rows.length, 0).toLocaleString("it-IT")} farmacie</span></li>`).join("\n")}\n    </ul>\n` + foot(1));
urls.splice(1, 0, BASE + "farmacie/");

const lastmod = farmacie.date;
fs.writeFileSync(path.join(docs, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`);
console.log(list.length + " comuni, " + byRegion.size + " regioni, " + urls.length + " URL in sitemap");
