const paths = {
  cross: '<path fill="currentColor" stroke="none" d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
  filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M7 3H4c-1 0-1 1-1 2 0 8 8 16 16 16 1 0 2 0 2-1v-3l-5-2-2 2c-4-2-5-3-7-7l2-2-2-5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18z"/>',
  directions: '<path d="m21 3-6.5 18-3.7-7.8L3 9.5 21 3Z"/>',
  "arrow-right": '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  "arrow-left": '<path d="M20 12H5m6 6-6-6 6-6"/>',
  "arrow-up": '<path d="M12 20V5m-6 6 6-6 6 6"/>',
};

function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function withIcon(node, name, label) {
  node.innerHTML = icon(name);
  node.append(document.createTextNode(label));
  return node;
}
function external(label, url, className) {
  const node = element("a", className, label);
  node.href = url;
  node.target = "_blank";
  node.rel = "noopener noreferrer";
  return node;
}

document.querySelectorAll("[data-icon]").forEach(node => { node.innerHTML = icon(node.dataset.icon); });

const verified = {
  16606: {
    name: "BENU Farmacia Centrale 24H", phone: "+39051239690", hours: "Tutti i giorni, 24 ore su 24", alwaysOpen: true,
    registryAddress: "Piazza Maggiore, 6",
    site: "https://www.benufarma.it/farmacie/bologna/store-locator-6774-benu-farmacia-centrale-24h"
  },
  6995: {
    name: "Farmacia del Pavaglione", phone: "+39051221640", hours: "Lun–sab 08:30–19:30",
    registryAddress: "Via dell'Archiginnasio, 2/a",
    site: "https://farmaciadelpavaglione.it/contatti-orari-farmacia-bologna/"
  },
  6992: {
    name: "Antica Farmacia dei Servi", address: "Strada Maggiore, 39", phone: "+39051231638",
    registryAddress: "Via Strada Maggiore, 39",
    hours: "Lun–ven 08:30–20:00 · Sab–dom 09:00–19:00",
    site: "https://almafarmacie.it/pharmacy/dei-servi/"
  },
  16238: {
    name: "Farmacia De Sotgiu", phone: "+39070403080", hours: "Lun–sab 08:30–20:30",
    registryAddress: "Via Pasquale Paoli, 59",
    site: "https://www.farmaciadesotgiu.com/"
  },
  16245: {
    name: "Farmacia Dedola", phone: "+39070305829",
    registryAddress: "Via Curie, 31/33",
    hours: "Lun–ven 08:30–14:00 e 16:00–20:00 (ott–mar) / 16:30–20:30 (apr–set) · Sab 08:30–14:00",
    site: "https://www.farmaciadedola.it/"
  }
};
const osmContacts = window.recapitiOSM?.records || {};
const osmDays = { Mo: "Lun", Tu: "Mar", We: "Mer", Th: "Gio", Fr: "Ven", Sa: "Sab", Su: "Dom", PH: "Festivi" };
function communityDetails(id) {
  const record = osmContacts[id];
  if (!record) return undefined;
  const [type, osmId, phone, site, schedule] = record;
  const alwaysOpen = schedule === "24/7";
  const hours = alwaysOpen ? "Tutti i giorni, 24 ore su 24" : schedule?.split(";").map(rule =>
    rule.trim().replace(/\b(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, day => osmDays[day]).replace(/\boff\b/g, "chiuso")
      .replaceAll("-", "–").replace(/,(\S)/g, ", $1")
  ).join(" · ");
  return { phone, site, hours, alwaysOpen, source: "https://www.openstreetmap.org/" + type + "/" + osmId };
}
const collator = new Intl.Collator("it", { sensitivity: "base" });
const number = new Intl.NumberFormat("it-IT");
const kilometers = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const normalize = text => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const smallWords = new Set(["a", "al", "alla", "alle", "all'", "con", "dai", "dal", "de", "dei", "del", "della", "delle", "dell'", "di", "e", "in", "sul"]);
function titleCase(text) {
  return text.toLocaleLowerCase("it-IT").replace(/\p{L}+'?|\p{N}+\p{L}*/gu, (word, index) =>
    index > 0 && smallWords.has(word) ? word : word.charAt(0).toLocaleUpperCase("it-IT") + word.slice(1)
  );
}
function placeName(text) {
  return text ? titleCase(text.replace(/EMILIA ROMAGNA/gi, "Emilia-Romagna")) : "";
}

const loosePlaceKey = key => key.replace(/\b(?:di|del|della|nel|nell|nella|sul|sulla)\s+/g, "");
function villageName(raw) {
  const name = placeName((raw || "").replace(/^fraz(?:ione)?[.\s]+/i, "").trim());
  return ["", "capoluogo", "centro"].includes(normalize(name)) ? "" : name;
}
function buildCities() {
  const catalog = window.comuniIstat;
  const data = window.farmacie?.cities || [];
  const byCode = new Map();
  function addCity(code, label, province, region, alias = "", division, provinceName = province) {
    const key = normalize(label);
    const town = {
      code, label, key, province, region, division, provinceName, provinces: new Set([province]),
      aliases: new Set([normalize(alias), loosePlaceKey(key)].filter(value => value && value !== key)),
      localities: new Map(), pharmacies: []
    };
    byCode.set(code, town);
    return town;
  }
  const byName = new Map();
  for (const [code, name, province, region, alias, division, provinceName] of catalog?.cities || []) {
    const town = addCity(code, name, province, region, alias, division, provinceName);
    if (!byName.has(town.key)) byName.set(town.key, []);
    byName.get(town.key).push(town);
  }
  for (const [name, province, region, rows, code] of data) {
    const key = normalize(name);
    const successor = catalog?.redirects?.[code];
    const namesakes = byName.get(key) || [];
    const sameRegion = namesakes.filter(item => normalize(item.region) === normalize(region));
    const town = byCode.get(code) || byCode.get(successor)
      || (sameRegion.length === 1 ? sameRegion[0] : undefined)
      || (namesakes.length === 1 ? namesakes[0] : undefined)
      || addCity(code || key + "-" + province, placeName(name), province, placeName(region));
    town.provinces.add(province);
    const former = successor && key !== town.key ? placeName(name) : "";
    if (key !== town.key && !former) town.aliases.add(key);
    for (const row of rows) {
      const localities = [former, villageName(row[6])].filter(Boolean);
      localities.forEach(label => town.localities.set(normalize(label), label));
      town.pharmacies.push([...row, localities]);
    }
  }
  return [...byCode.values()].sort((a, b) => collator.compare(a.label, b.label) || collator.compare(a.province, b.province));
}
const cities = buildCities();
const byId = id => document.getElementById(id);
const sourcesDialog = byId("fonti");
const reportDialog = byId("report");
let reportTrigger;
reportDialog.addEventListener("close", () => {
  const trigger = reportTrigger?.isConnected ? reportTrigger
    : list.querySelector('[data-report="' + reportTrigger?.dataset.report + '"]');
  (trigger || directory).focus({ preventScroll: true });
});
document.querySelectorAll("[data-sources]").forEach(button => {
  button.addEventListener("click", () => sourcesDialog.showModal());
});
if (window.location.hash === "#fonti") sourcesDialog.showModal();
const directory = byId("risultati");
const list = byId("pharmacies");
const cityInput = byId("city");
const suggestions = byId("suggestions");
const filter = byId("filter");
const mapNotice = byId("map-empty");
const mapElement = byId("map");
const locationButton = byId("use-location");
const locationStatus = byId("location-status");
const showMore = byId("show-more");
const areaForm = byId("area-form");
const areaRegion = byId("area-region");
const areaProvince = byId("area-province");
const areaTown = byId("area-town");
const areaSubmit = byId("area-submit");
const areaButtons = [...document.querySelectorAll("[data-area]")];
const regionalHours = window.regionalPharmacyHours;
const shortDate = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
let regionalDay = regionalHours.today();

const pageSize = 6;
const nearbyBatchSize = 20;
const nearbyRadius = 50;
let city;
let nearby;
let locationRequest;
let pharmacies = [];
let page = 0;
let selection;
let view = "list";
let choices = [];
let activeChoice = -1;
let selectedPlace;
let markers = new Map();
let tileFailed = false;

const map = window.L ? L.map(mapElement, { scrollWheelZoom: false, zoomControl: false, zoomAnimation: false, zoomSnap: 0.5, maxZoom: 19 }) : null;
let layer;
let baseLayer;
if (map) {
  L.control.zoom({ position: "bottomright" }).addTo(map);
  baseLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxNativeZoom: 19, maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  baseLayer.on("tileerror", () => { tileFailed = true; updateMapNotice(); });
  baseLayer.on("tileload", () => { tileFailed = false; updateMapNotice(); });
  layer = L.layerGroup().addTo(map);
}

function addressLine(pharmacy) {
  const town = pharmacy.town.label + (nearby ? " (" + pharmacy.town.province + ")" : "");
  return [pharmacy.address, [pharmacy.postcode, town].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}
function directions(pharmacy) {
  const destination = pharmacy.address || !pharmacy.coords
    ? addressLine(pharmacy) + (nearby ? "" : ", " + pharmacy.town.province) + ", Italia"
    : pharmacy.coords.join(",");
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination);
}
function distanceLabel(distance) {
  const meters = Math.round(distance * 1000);
  return meters < 1000 ? number.format(meters) + " m" : kilometers.format(distance) + " km";
}
function dailyHours(pharmacy) {
  return pharmacy.daily?.date === regionalDay ? pharmacy.daily : undefined;
}
function dailyText(daily) {
  return "Orari del " + shortDate.format(new Date(daily.date + "T00:00:00Z")) + " · " + daily.hours;
}
function pharmacyTurn(pharmacy) {
  return pharmacy.turn?.date === regionalDay ? pharmacy.turn : undefined;
}
function turnText(turn) {
  return "Di turno · " + turn.date.split("-").reverse().join("/") + " · " + turn.hours;
}
function opensAllDay(pharmacy) {
  const daily = dailyHours(pharmacy);
  return pharmacy.info?.alwaysOpen && (!daily || daily.hours === "00:00–24:00");
}
function osmEditor(pharmacy) {
  const url = new URL("https://www.openstreetmap.org/edit");
  // The matched OSM object can also exist for a manually curated card.
  const [type, id] = osmContacts[pharmacy.id] || [];
  if (["node", "way", "relation"].includes(type) && /^[1-9]\d*$/.test(id)) {
    url.searchParams.set("editor", "id");
    url.searchParams.set(type, id);
  } else if (pharmacy.coords?.length === 2 && pharmacy.coords.every(Number.isFinite)) {
    url.hash = "map=19/" + pharmacy.coords.join("/");
  } else {
    return undefined;
  }
  return url;
}
function openReport(pharmacy, trigger) {
  const place = pharmacy.town.label + " (" + pharmacy.town.province + ")";
  const issue = new URL("https://github.com/CosmoNetinfo/Farmacia-facile-/issues/new");
  issue.search = new URLSearchParams({
    template: "segnalazione.yml",
    title: "Segnalazione: " + pharmacy.name + ", " + place,
    "id-ministeriale": pharmacy.id,
    farmacia: pharmacy.name,
    "comune-provincia": place
  });
  const editor = osmEditor(pharmacy);
  byId("report-pharmacy").textContent = pharmacy.name + " · " + place;
  byId("report-osm-section").hidden = !editor;
  byId("report-no-osm").hidden = Boolean(editor);
  const osmLink = byId("report-osm");
  if (editor) osmLink.href = editor;
  else osmLink.removeAttribute("href");
  byId("report-github").href = issue;
  reportTrigger = trigger;
  reportDialog.showModal();
}
function card(pharmacy) {
  const row = element("li", "pharmacy-card");
  row.dataset.id = pharmacy.id;
  const head = element("div", "card-head");
  const content = element("div", "card-text");
  const daily = dailyHours(pharmacy);
  const turn = pharmacyTurn(pharmacy);
  const hours = pharmacy.info?.hours;
  content.append(
    element("h3", "card-title", pharmacy.name),
    element("p", "card-address", addressLine(pharmacy))
  );
  if (pharmacy.distance !== undefined) content.append(element("p", "card-distance", distanceLabel(pharmacy.distance)));
  if (daily) content.append(withIcon(element("p", "card-hours daily-hours"), "clock", dailyText(daily)));
  if (turn) content.append(withIcon(element("p", "card-hours daily-hours"), "clock", turnText(turn)));
  if (hours || !daily) {
    content.append(withIcon(element("p", "card-hours"), "clock", daily ? "Orario abituale · " + hours : hours || "Orari non disponibili"));
  }
  head.append(withIcon(element("span", "card-icon"), "cross", ""), content);
  if (opensAllDay(pharmacy)) head.append(element("span", "status-badge", "24 ore"));
  row.append(head);

  const actions = element("div", "card-actions");
  if (map && pharmacy.coords) {
    const locate = withIcon(element("button", "card-action"), "pin", "Sulla mappa");
    locate.type = "button";
    locate.dataset.locate = pharmacy.id;
    locate.setAttribute("aria-label", "Sulla mappa: " + pharmacy.name);
    actions.append(locate);
  }
  if (pharmacy.info?.phone) {
    const phone = withIcon(element("a", "card-action"), "phone", "Chiama");
    phone.href = "tel:" + pharmacy.info.phone;
    phone.setAttribute("aria-label", "Chiama " + pharmacy.name + ", " + pharmacy.info.phone);
    actions.append(phone);
  }
  if (pharmacy.info?.site) actions.append(withIcon(external("", pharmacy.info.site, "card-action"), "globe", "Sito web"));
  actions.append(withIcon(external("", directions(pharmacy), "card-action"), "directions", "Indicazioni"));
  const report = element("button", "card-action", "Segnala o correggi");
  report.type = "button";
  report.dataset.report = pharmacy.id;
  report.setAttribute("aria-haspopup", "dialog");
  report.setAttribute("aria-controls", "report");
  actions.append(report);
  if (pharmacy.info?.source) actions.append(external("Fonte OSM", pharmacy.info.source, "card-source"));
  if (daily) actions.append(external(daily.label, daily.source, "card-source"));
  if (turn) actions.append(external(turn.label, turn.source, "card-source"));
  row.append(actions);
  return row;
}

function getMatches() {
  if (filter.value === "24h") return pharmacies.filter(opensAllDay);
  if (filter.value === "hours") return pharmacies.filter(pharmacy => pharmacy.info?.hours || dailyHours(pharmacy));
  if (filter.value === "phone") return pharmacies.filter(pharmacy => pharmacy.info?.phone);
  return pharmacies;
}
function pageRows(matches) {
  return matches.slice(page * pageSize, (page + 1) * pageSize);
}
function updateSelection() {
  list.querySelectorAll(".pharmacy-card").forEach(row => {
    const selected = Number(row.dataset.id) === selection;
    row.classList.toggle("is-selected", selected);
    row.querySelector("[data-locate]")?.setAttribute("aria-pressed", String(selected));
  });
  markers.forEach((marker, id) => {
    marker.getElement()?.classList.toggle("selected", id === selection);
    marker.setZIndexOffset(id === selection ? 1000 : 0);
  });
}
function updateMapNotice() {
  const message = !map ? "Mappa non disponibile. Le indicazioni restano accessibili dalle schede."
    : !markers.size && !nearby ? "Nessun segnaposto per questi risultati."
    : tileFailed && !nearby ? "Sfondo della mappa in caricamento. Puoi selezionare i segnaposti." : "";
  mapNotice.textContent = message;
  mapNotice.hidden = !message;
}
function fitMarkers() {
  if (!map || !mapElement.clientWidth) return;
  const points = [...markers.values()].map(marker => marker.getLatLng());
  if (nearby) points.push(nearby.origin);
  if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [52, 48], maxZoom: 16, animate: false });
  else if (points.length) map.setView(points[0], 16, { animate: false });
}
function popupContent(pharmacy) {
  const content = element("div");
  const daily = dailyHours(pharmacy);
  const turn = pharmacyTurn(pharmacy);
  content.append(
    element("strong", "", pharmacy.name),
    element("p", "", addressLine(pharmacy))
  );
  if (pharmacy.distance !== undefined) content.append(element("p", "card-distance", distanceLabel(pharmacy.distance)));
  if (daily) content.append(element("p", "daily-hours", dailyText(daily)));
  if (turn) content.append(element("p", "daily-hours", turnText(turn)));
  if (pharmacy.info?.hours) content.append(element("p", "", daily ? "Orario abituale · " + pharmacy.info.hours : pharmacy.info.hours));
  const actions = element("div", "popup-actions");
  actions.append(external("Indicazioni ↗", directions(pharmacy)));
  if (pharmacy.info?.phone) {
    const call = element("a", "", "Chiama");
    call.href = "tel:" + pharmacy.info.phone;
    actions.append(call);
  }
  if (pharmacy.info?.site) actions.append(external("Sito web ↗", pharmacy.info.site));
  if (pharmacy.info?.source) actions.append(external("Fonte OSM", pharmacy.info.source));
  if (daily) actions.append(external(daily.label, daily.source));
  if (turn) actions.append(external(turn.label, turn.source));
  content.append(actions);
  return content;
}
function fitMapView() {
  if (!mapElement.clientWidth) return;
  map.invalidateSize({ pan: false });
  if (markers.size || nearby) fitMarkers();
  else {
    const point = pharmacies.find(pharmacy => pharmacy.coords)?.coords;
    map.setView(point || [42.5, 12.5], point ? 13 : 5, { animate: false });
  }
  // Set the municipal view before attaching the tile layer again.
  if (city && !map.hasLayer(baseLayer)) baseLayer.addTo(map);
}
function updateMap(matches) {
  const rows = view === "map" || nearby ? matches : pageRows(matches);
  const located = rows.filter(pharmacy => pharmacy.coords);
  byId("map-count").textContent = number.format(located.length) + (located.length === 1 ? " farmacia sulla mappa" : " farmacie sulla mappa");
  byId("map-fit").disabled = !map || (!located.length && !nearby);
  byId("user-legend").hidden = !map || !nearby;
  byId("nearby-map-note").hidden = !map || !nearby;
  mapElement.classList.toggle("nearby-map", Boolean(nearby));
  if (map) {
    if (!city || !mapElement.clientWidth) baseLayer.remove();
    if (map.getZoom() !== undefined) map.stop();
    layer.clearLayers();
    markers = new Map();
    const pin = L.divIcon({ className: "map-pin", html: "<span>" + icon("cross") + "</span>", iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
    located.forEach(pharmacy => {
      const marker = L.marker(pharmacy.coords, { icon: pin, title: pharmacy.name, alt: pharmacy.name }).addTo(layer);
      marker.getElement()?.setAttribute("aria-label", pharmacy.name);
      marker.bindPopup(() => popupContent(pharmacy));
      marker.on("click", () => {
        selection = pharmacy.id;
        updateSelection();
      });
      markers.set(pharmacy.id, marker);
    });
    if (nearby) {
      const target = L.divIcon({ className: "user-pin", html: icon("target"), iconSize: [30, 30] });
      const label = "La tua posizione";
      const marker = L.marker(nearby.origin, { icon: target, title: label, zIndexOffset: 2000 }).addTo(layer);
      marker.getElement()?.setAttribute("aria-label", label);
      marker.bindPopup(label);
    }
    fitMapView();
  }
  updateSelection();
  updateMapNotice();
}
function render(refreshMap = true) {
  const matches = getMatches();
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  page = Math.min(page, pages - 1);
  const rows = pageRows(matches);
  byId("result-count").textContent = nearby && !nearby.ranked.length
    ? "Nessuna farmacia trovata entro 50 km. Puoi cercare per comune o frazione."
    : number.format(matches.length) + (matches.length === 1 ? " farmacia trovata" : " farmacie trovate");
  showMore.hidden = !nearby || pharmacies.length >= nearby.ranked.length;
  list.replaceChildren(...rows.map(card));
  byId("empty-list").hidden = matches.length > 0;
  byId("empty-list").textContent = "Nessuna farmacia corrisponde a questo filtro.";
  byId("pagination").hidden = pages === 1;
  byId("page-label").textContent = "Pagina " + number.format(page + 1) + " di " + number.format(pages);
  byId("prev").disabled = page === 0;
  byId("next").disabled = page + 1 >= pages;
  if (refreshMap) updateMap(matches);
  else updateSelection();
}

let turnRefreshTimer;
function loadRegionalHours() {
  clearTimeout(turnRefreshTimer);
  if (!city || !pharmacies.length) return;
  const turnDelay = regionalHours.turnRefreshDelay?.(city);
  if (turnDelay !== undefined) turnRefreshTimer = setTimeout(refreshRegionalDay, turnDelay);
  const requestedCity = city;
  const requestedDay = regionalDay;
  const rows = pharmacies;
  regionalHours.load(requestedCity, rows, requestedDay)?.then(() => {
    if (city !== requestedCity || regionalDay !== requestedDay || !rows.some(row => dailyHours(row) || pharmacyTurn(row))) return;
    const popup = markers.get(selection);
    const open = popup?.isPopupOpen();
    const mapChanges = filter.value === "hours" || filter.value === "24h";
    render(mapChanges);
    if (open) {
      const current = markers.get(selection);
      const pharmacy = rows.find(row => row.id === selection);
      if (current && pharmacy) current.setPopupContent(popupContent(pharmacy)).openPopup();
    }
  });
}
function refreshRegionalDay() {
  if (!city) return;
  const date = regionalHours.today();
  if (date === regionalDay) return;
  regionalDay = date;
  render();
  loadRegionalHours();
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshRegionalDay();
});

function renderProvinceOptions() {
  const container = byId("other-cities");
  const options = cities.filter(town => town.province === city.province && town.pharmacies.length)
    .sort((a, b) => b.pharmacies.length - a.pharmacies.length).slice(0, 5);
  container.replaceChildren();
  if (!options.length) return;
  container.append(element("span", "", "Altri comuni nella provincia"));
  for (const town of options) {
    const button = element("button", "", town.label);
    button.type = "button";
    button.addEventListener("click", () => choose(town));
    container.append(button);
  }
}
function toPharmacy([id, name, address, postcode, coords, type, village, localities], town, distance) {
  const official = verified[id];
  const info = official && normalize(official.registryAddress) === normalize(address) ? official : communityDetails(id);
  const standardName = name === name.toLocaleUpperCase("it-IT") ? titleCase(name) : name;
  const fullName = /\b(?:farmacia|farmacie|dispensario|apotheke)\b/i.test(standardName)
    ? standardName : (type.toLowerCase().includes("dispensario") ? "Dispensario " : "Farmacia ") + standardName;
  const street = info?.address || (address === address.toLocaleUpperCase("it-IT") ? titleCase(address) : address);
  return { id, name: info?.name || fullName, registryAddress: address, address: [street, villageName(village) || localities[0]].filter(value => value && value !== "-").join(", "), postcode: postcode === "-" ? "" : postcode, coords, info, town, distance };
}
function focusResults() {
  directory.focus({ preventScroll: true });
  directory.scrollIntoView({ block: "start" });
}
function resetLocation() {
  locationRequest = undefined;
  locationButton.removeAttribute("aria-disabled");
  locationStatus.textContent = "";
  nearby = undefined;
  byId("nearby-coverage").hidden = true;
}
function showCity(nextCity, scroll = false) {
  resetLocation();
  city = nextCity;
  regionalDay = regionalHours.today();
  directory.hidden = false;
  page = 0;
  selection = undefined;
  filter.value = "all";
  const sortDistance = ([lat, lon]) => (lat - 44.494) ** 2 + ((lon - 11.344) * 0.71) ** 2;
  const rows = city.locality ? city.pharmacies.filter(row => row[7].some(label => normalize(label) === normalize(city.locality))) : city.pharmacies;
  pharmacies = rows.map(row => toPharmacy(row, city)).sort((a, b) => {
    if (city.key === "bologna") {
      const curatedOrder = [16606, 6995, 6992];
      const rank = row => curatedOrder.includes(row.id) ? curatedOrder.indexOf(row.id) : curatedOrder.length;
      const priority = rank(a) - rank(b);
      if (priority) return priority;
      if (a.coords && b.coords) return sortDistance(a.coords) - sortDistance(b.coords);
      if (a.coords || b.coords) return a.coords ? -1 : 1;
    }
    return collator.compare(a.name, b.name);
  });
  const hasPharmacies = pharmacies.length > 0;
  byId("result-grid").hidden = !hasPharmacies;
  byId("view-toggle").hidden = !hasPharmacies;
  byId("no-pharmacies").hidden = hasPharmacies;
  if (!hasPharmacies) renderProvinceOptions();
  const location = city.locality ? city.label + " (" + city.province + ")" : city.region + " · " + city.province;
  withIcon(byId("location-label"), "pin", location);
  byId("result-title").textContent = "Farmacie a " + (city.locality || city.label);
  render();
  loadRegionalHours();
  if (scroll) focusResults();
}

function rankNearby(origin) {
  const radians = Math.PI / 180;
  const latitude = origin[0] * radians;
  const cosLatitude = Math.cos(latitude);
  const ranked = [];
  let excluded = 0;
  for (const town of cities) {
    for (const row of town.pharmacies) {
      const coords = row[4];
      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1]) ||
          Math.abs(coords[0]) > 90 || Math.abs(coords[1]) > 180) {
        excluded++;
        continue;
      }
      const targetLatitude = coords[0] * radians;
      const deltaLongitude = (coords[1] - origin[1]) * radians;
      const haversine = Math.sin((targetLatitude - latitude) / 2) ** 2 +
        cosLatitude * Math.cos(targetLatitude) * Math.sin(deltaLongitude / 2) ** 2;
      const distance = 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, haversine)));
      if (distance <= nearbyRadius) ranked.push({ row, town, distance });
    }
  }
  ranked.sort((a, b) => a.distance - b.distance || a.row[0] - b.row[0]);
  return { origin, ranked, excluded };
}
function appendNearbyBatch() {
  const start = pharmacies.length;
  for (const { row, town, distance } of nearby.ranked.slice(start, start + nearbyBatchSize)) {
    pharmacies.push(toPharmacy(row, town, distance));
  }
}
function showNearby(origin) {
  nearby = rankNearby(origin);
  city = undefined;
  clearTimeout(turnRefreshTimer);
  selectedPlace = undefined;
  cityInput.value = "";
  cityInput.setCustomValidity("");
  clearSuggestions();
  const url = new URL(window.location.href);
  for (const param of ["comune", "provincia", "frazione"]) url.searchParams.delete(param);
  url.hash = "risultati";
  if (url.href !== window.location.href) window.history.pushState(null, "", url);

  pharmacies = [];
  appendNearbyBatch();
  page = 0;
  selection = undefined;
  filter.value = "all";
  directory.hidden = false;
  const hasPharmacies = pharmacies.length > 0;
  byId("result-grid").hidden = !hasPharmacies;
  byId("view-toggle").hidden = !hasPharmacies;
  byId("no-pharmacies").hidden = true;
  byId("result-title").textContent = "Farmacie vicino a te";
  withIcon(byId("location-label"), "target", "Entro 50 km");
  const coverage = byId("nearby-coverage");
  coverage.textContent = "Distanze in linea d’aria. " + number.format(nearby.excluded) +
    (nearby.excluded === 1 ? " farmacia esclusa" : " farmacie escluse") + " dalla ricerca per posizione perché prive di coordinate.";
  coverage.hidden = false;
  render();
  focusResults();
}
function requestLocation() {
  if (locationRequest) return;
  if (!window.isSecureContext) {
    locationStatus.textContent = "La ricerca per posizione richiede HTTPS. Puoi cercare per comune o frazione.";
    return;
  }
  const request = {};
  locationRequest = request;
  locationButton.setAttribute("aria-disabled", "true");
  locationStatus.textContent = "In attesa del permesso di usare la posizione. Controlla la richiesta del browser.";
  const finish = message => {
    locationRequest = undefined;
    locationButton.removeAttribute("aria-disabled");
    locationStatus.textContent = message;
  };
  const unavailable = "Posizione non disponibile. Riprova o cerca per comune o frazione.";
  try {
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (locationRequest !== request) return;
      locationStatus.textContent = "Ricerca delle farmacie vicine in corso…";
      // Let the status reach the browser before scanning the directory.
      setTimeout(() => {
        if (locationRequest !== request) return;
        const { latitude, longitude } = coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          finish(unavailable);
          return;
        }
        finish("");
        showNearby([latitude, longitude]);
      }, 0);
    }, error => {
      if (locationRequest !== request) return;
      if (error.code === 1) {
        finish("Permesso negato. Puoi cambiare il permesso nelle impostazioni del browser oppure cercare per comune o frazione.");
      } else if (error.code === 3) {
        finish("Tempo scaduto per ottenere la posizione. Riprova o cerca per comune o frazione.");
      } else {
        finish(unavailable);
      }
    }, { timeout: 10000 });
  } catch {
    finish(unavailable);
  }
}

function clearSuggestions() {
  choices = [];
  activeChoice = -1;
  suggestions.hidden = true;
  suggestions.replaceChildren();
  cityInput.setAttribute("aria-expanded", "false");
  cityInput.removeAttribute("aria-activedescendant");
}
function findCities(text) {
  const query = normalize(text);
  if (!query) return [];
  const matches = [];
  for (const town of cities) {
    const suffix = query.slice(-2).toUpperCase();
    const qualified = query.at(-3) === " " && town.provinces.has(suffix) ? query.slice(0, -3) : "";
    const exact = key => key === query || key === qualified;
    const aliases = [...town.aliases];
    const locality = town.localities.get(query) || town.localities.get(qualified);
    if (exact(town.key)) matches.push({ town, rank: 0 });
    else if (aliases.some(exact)) matches.push({ town, rank: 1 });
    else if (locality) matches.push({ town, locality, rank: 2 });
    else if (town.key.startsWith(query) || aliases.some(key => key.startsWith(query))) matches.push({ town, rank: 3 });
    else {
      for (const [key, label] of town.localities) {
        if (key.startsWith(query)) matches.push({ town, locality: label, rank: 4 });
      }
      if (town.key.includes(query) || aliases.some(key => key.includes(query))) matches.push({ town, rank: 5 });
    }
  }
  return matches.sort((a, b) => a.rank - b.rank);
}
function selectPlace(candidate) {
  const duplicate = cities.some(other => other.key === candidate.key && other.province !== candidate.province);
  cityInput.value = (candidate.locality || candidate.label) + (duplicate && !candidate.locality ? " (" + candidate.province + ")" : "");
  cityInput.setCustomValidity("");
  selectedPlace = candidate;
  clearSuggestions();
}
function choose(candidate) {
  selectPlace(candidate);
  const url = new URL(window.location.href);
  url.searchParams.set("comune", candidate.label);
  url.searchParams.set("provincia", candidate.province);
  if (candidate.locality) url.searchParams.set("frazione", candidate.locality);
  else url.searchParams.delete("frazione");
  url.hash = "risultati";
  if (url.href !== window.location.href) window.history.pushState(null, "", url);
  showCity(candidate, true);
}
function showSuggestions() {
  cityInput.setCustomValidity("");
  clearSuggestions();
  choices = findCities(cityInput.value).slice(0, 7);
  if (!choices.length) return;
  choices.forEach(({ town, locality }, index) => {
    const option = element("li", "", locality || town.label);
    option.append(element("small", "", locality ? town.label + " (" + town.province + ")" : town.province));
    option.id = "city-option-" + index;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse") event.preventDefault();
    });
    option.addEventListener("click", () => selectPlace({ ...town, locality }));
    suggestions.append(option);
  });
  suggestions.hidden = false;
  cityInput.setAttribute("aria-expanded", "true");
}

byId("search").addEventListener("submit", event => {
  event.preventDefault();
  if (selectedPlace) {
    choose(selectedPlace);
    return;
  }
  const matches = findCities(cityInput.value);
  const first = matches[0];
  const uniqueExact = first?.rank < 3 && first.rank !== matches[1]?.rank;
  const candidate = choices[activeChoice] || (uniqueExact || matches.length === 1 ? first : null);
  if (candidate) choose({ ...candidate.town, locality: candidate.locality });
  else if (matches.length) {
    cityInput.focus();
    showSuggestions();
  } else {
    cityInput.setCustomValidity("Località non trovata. Prova con il nome del comune.");
    cityInput.reportValidity();
  }
});
cityInput.addEventListener("input", () => {
  selectedPlace = undefined;
  showSuggestions();
});
cityInput.addEventListener("focus", () => {
  if (!selectedPlace) showSuggestions();
});
cityInput.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!suggestions.hidden) event.preventDefault();
    clearSuggestions();
  }
  if (event.key === "Enter" && choices[activeChoice]) {
    event.preventDefault();
    const { town, locality } = choices[activeChoice];
    selectPlace({ ...town, locality });
    return;
  }
  if (!["ArrowDown", "ArrowUp"].includes(event.key) || !choices.length) return;
  event.preventDefault();
  const step = event.key === "ArrowDown" ? 1 : -1;
  activeChoice = activeChoice < 0 && step < 0 ? choices.length - 1 : (activeChoice + step + choices.length) % choices.length;
  [...suggestions.children].forEach((option, index) => option.setAttribute("aria-selected", String(index === activeChoice)));
  cityInput.setAttribute("aria-activedescendant", suggestions.children[activeChoice].id);
});
document.addEventListener("pointerdown", event => {
  if (!event.target.closest("#search")) clearSuggestions();
});
byId("search").addEventListener("focusout", event => {
  if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) clearSuggestions();
});

const divisions = { nord: [1, 2], centro: [3], sud: [4, 5] };
let areaCities = [];
function setOptions(select, placeholder, options) {
  select.replaceChildren(new Option(placeholder, ""), ...options.map(([value, label]) => new Option(label, value)));
  select.disabled = options.length === 0;
}
function updateAreaTowns() {
  const towns = areaCities.filter(town => town.region === areaRegion.value && town.province === areaProvince.value);
  setOptions(areaTown, "Scegli un comune", towns.map(town => [town.code, town.label]));
  areaSubmit.disabled = true;
}
function updateAreaProvinces() {
  const provinces = new Map(areaCities.filter(town => town.region === areaRegion.value)
    .map(town => [town.province, town.provinceName]));
  setOptions(areaProvince, "Scegli una provincia", [...provinces].sort((a, b) => collator.compare(a[1], b[1])));
  if (provinces.size === 1) areaProvince.selectedIndex = 1;
  updateAreaTowns();
}
for (const button of areaButtons) {
  button.addEventListener("click", () => {
    if (button.getAttribute("aria-pressed") === "true") return;
    for (const option of areaButtons) option.setAttribute("aria-pressed", String(option === button));
    areaCities = cities.filter(town => divisions[button.dataset.area].includes(town.division));
    const regions = [...new Set(areaCities.map(town => town.region))].sort(collator.compare);
    setOptions(areaRegion, "Scegli una regione", regions.map(name => [name, name]));
    updateAreaProvinces();
    areaForm.hidden = false;
  });
}
areaRegion.addEventListener("change", updateAreaProvinces);
areaProvince.addEventListener("change", updateAreaTowns);
areaTown.addEventListener("change", () => { areaSubmit.disabled = !areaTown.value; });
areaForm.addEventListener("submit", event => {
  event.preventDefault();
  const town = areaCities.find(item => item.code === areaTown.value);
  if (town) choose(town);
});

filter.addEventListener("change", () => { page = 0; selection = undefined; render(); });
showMore.addEventListener("click", () => {
  if (!nearby) return;
  const previousCount = getMatches().length;
  appendNearbyBatch();
  if (getMatches().length > previousCount) {
    page = Math.floor(previousCount / pageSize);
    selection = undefined;
  }
  render();
  focusResults();
});
for (const [button, step] of [[byId("prev"), -1], [byId("next"), 1]]) {
  button.addEventListener("click", () => {
    page += step;
    selection = undefined;
    render();
    focusResults();
  });
}

function setView(next) {
  if (view === next) return;
  view = next;
  directory.classList.toggle("map-view", view === "map");
  byId("list-view").setAttribute("aria-pressed", String(view === "list"));
  byId("map-view").setAttribute("aria-pressed", String(view === "map"));
  updateMap(getMatches());
}
byId("list-view").addEventListener("click", () => setView("list"));
byId("map-view").addEventListener("click", () => setView("map"));
byId("map-fit").addEventListener("click", fitMarkers);
list.addEventListener("click", event => {
  const report = event.target.closest("[data-report]");
  if (report) {
    const pharmacy = pharmacies.find(item => item.id === Number(report.dataset.report));
    if (pharmacy) openReport(pharmacy, report);
    return;
  }
  const locate = event.target.closest("[data-locate]");
  if (!locate || !map) return;
  selection = Number(locate.dataset.locate);
  const mobile = window.matchMedia("(max-width: 860px)").matches;
  if (mobile) setView("map");
  updateSelection();
  const marker = markers.get(selection);
  if (!marker) return;
  map.panTo(marker.getLatLng());
  marker.openPopup();
  if (mobile) {
    byId("map-view").focus({ preventScroll: true });
    byId("map").scrollIntoView({ block: "nearest" });
  }
});
if (map) {
  const observer = new ResizeObserver(() => {
    if (!mapElement.clientWidth) return;
    if (!selection) fitMapView();
    else map.invalidateSize({ pan: false });
  });
  observer.observe(mapElement);
}
function cityFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const town = normalize(params.get("comune") || "");
  if (!town) return undefined;
  const province = (params.get("provincia") || "").toUpperCase();
  const locality = normalize(params.get("frazione") || "");
  const match = findCities(town + (province ? " " + province : "")).find(item => item.rank < 3);
  const candidate = match?.town;
  return candidate && { ...candidate, locality: candidate.localities.get(locality) || match?.locality };
}
function restoreCity() {
  const nextCity = cityFromUrl();
  if (!nextCity) {
    resetLocation();
    city = undefined;
    clearTimeout(turnRefreshTimer);
    pharmacies = [];
    selection = undefined;
    selectedPlace = undefined;
    cityInput.value = "";
    cityInput.setCustomValidity("");
    clearSuggestions();
    directory.hidden = true;
    updateMap([]);
    return;
  }
  if (city?.code === nextCity.code && city.locality === nextCity.locality) return;
  selectPlace(nextCity);
  showCity(nextCity);
}
if (cities.length && window.farmacie?.date) {
  if (navigator.geolocation) {
    locationButton.hidden = false;
    locationButton.addEventListener("click", requestLocation);
  }
  const snapshot = document.querySelector("#fonti time");
  const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "UTC" });
  snapshot.dateTime = window.farmacie.date;
  snapshot.textContent = dateFormat.format(new Date(snapshot.dateTime + "T00:00:00Z"));
  byId("ministry-snapshot").hidden = false;
  if (window.recapitiOSM?.date) {
    const date = new Date(window.recapitiOSM.date + "T00:00:00Z");
    byId("osm-date").textContent = "Estrazione OpenStreetMap del " + dateFormat.format(date) + ". ";
    byId("osm-date").hidden = false;
  }
  restoreCity();
  window.addEventListener("popstate", restoreCity);
}
else {
  byId("directory-error").hidden = false;
}
