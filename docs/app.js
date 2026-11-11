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
  "arrow-down-right": '<path d="m6 6 12 12m-8 0h8v-8"/>'
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
    site: "https://www.benufarma.it/farmacie/bologna/store-locator-6774-benu-farmacia-centrale-24h"
  },
  6995: {
    name: "Farmacia del Pavaglione", phone: "+39051221640", hours: "Lun–sab 08:30–19:30",
    site: "https://farmaciadelpavaglione.it/contatti-orari-farmacia-bologna/"
  },
  6992: {
    name: "Antica Farmacia dei Servi", address: "Strada Maggiore, 39", phone: "+39051231638",
    hours: "Lun–ven 08:30–20:00 · Sab–dom 09:00–19:00",
    site: "https://almafarmacie.it/pharmacy/dei-servi/"
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

const data = window.farmacie?.cities || [];
const cities = data.map(([name, province, region, pharmacies]) => {
  const label = placeName(name);
  return { label, key: normalize(label), province, region: placeName(region), pharmacies };
}).sort((a, b) => collator.compare(a.label, b.label) || collator.compare(a.province, b.province));
const byId = id => document.getElementById(id);
const directory = byId("risultati");
const list = byId("pharmacies");
const cityInput = byId("city");
const suggestions = byId("suggestions");
const filter = byId("filter");
const mapNotice = byId("map-empty");
const quickLinks = [...document.querySelectorAll("[data-city]")];

const pageSize = 6;
let city;
let pharmacies = [];
let page = 0;
let selection;
let view = "list";
let choices = [];
let activeChoice = -1;
let markers = new Map();
let tileFailed = false;

const map = window.L ? L.map("map", { scrollWheelZoom: false, zoomControl: false, zoomSnap: 0.5, maxZoom: 19 }) : null;
let layer;
if (map) {
  L.control.zoom({ position: "bottomright" }).addTo(map);
  const base = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxNativeZoom: 19, maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  base.on("tileerror", () => { tileFailed = true; updateMapNotice(); });
  base.on("tileload", () => { tileFailed = false; updateMapNotice(); });
  base.addTo(map);
  layer = L.layerGroup().addTo(map);
}

function addressLine(pharmacy) {
  return [pharmacy.address, [pharmacy.postcode, city.label].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}
function directions(pharmacy) {
  const destination = pharmacy.address || !pharmacy.coords
    ? addressLine(pharmacy) + ", " + city.province + ", Italia"
    : pharmacy.coords.join(",");
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination);
}
function card(pharmacy) {
  const row = element("li", "pharmacy-card");
  row.dataset.id = pharmacy.id;
  const head = element("div", "card-head");
  const content = element("div", "card-text");
  const hours = pharmacy.info?.hours || "Orari non disponibili";
  content.append(
    element("h3", "card-title", pharmacy.name),
    element("p", "card-address", addressLine(pharmacy)),
    withIcon(element("p", "card-hours"), "clock", hours)
  );
  head.append(withIcon(element("span", "card-icon"), "cross", ""), content);
  if (pharmacy.info?.alwaysOpen) head.append(element("span", "status-badge", "24 ore"));
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
  if (pharmacy.info?.source) actions.append(external("Fonte OSM", pharmacy.info.source, "card-source"));
  row.append(actions);
  return row;
}

function getMatches() {
  if (filter.value === "24h") return pharmacies.filter(pharmacy => pharmacy.info?.alwaysOpen);
  if (filter.value === "hours") return pharmacies.filter(pharmacy => pharmacy.info?.hours);
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
    : !markers.size ? "Nessun segnaposto per questi risultati."
    : tileFailed ? "Sfondo della mappa in caricamento. Puoi selezionare i segnaposti." : "";
  mapNotice.textContent = message;
  mapNotice.hidden = !message;
}
function fitMarkers() {
  if (!map || !markers.size || !byId("map").clientWidth) return;
  const points = [...markers.values()].map(marker => marker.getLatLng());
  if (points.length === 1) map.setView(points[0], 16);
  else map.fitBounds(L.latLngBounds(points), { padding: [52, 48], maxZoom: 16, animate: false });
}
function popupContent(pharmacy) {
  const content = element("div");
  content.append(
    element("strong", "", pharmacy.name),
    element("p", "", addressLine(pharmacy))
  );
  if (pharmacy.info?.hours) content.append(element("p", "", pharmacy.info.hours));
  const actions = element("div", "popup-actions");
  actions.append(external("Indicazioni ↗", directions(pharmacy)));
  if (pharmacy.info?.phone) {
    const call = element("a", "", "Chiama");
    call.href = "tel:" + pharmacy.info.phone;
    actions.append(call);
  }
  if (pharmacy.info?.site) actions.append(external("Sito web ↗", pharmacy.info.site));
  if (pharmacy.info?.source) actions.append(external("Fonte OSM", pharmacy.info.source));
  content.append(actions);
  return content;
}
function updateMap(matches) {
  const rows = view === "map" ? matches : pageRows(matches);
  const located = rows.filter(pharmacy => pharmacy.coords);
  byId("map-count").textContent = number.format(located.length) + (located.length === 1 ? " farmacia sulla mappa" : " farmacie sulla mappa");
  byId("map-fit").disabled = !map || !located.length;
  if (map) {
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
    if (byId("map").clientWidth) {
      map.invalidateSize({ pan: false });
      if (markers.size) fitMarkers();
      else map.setView(pharmacies.find(pharmacy => pharmacy.coords)?.coords || [42.5, 12.5], pharmacies.some(pharmacy => pharmacy.coords) ? 13 : 5);
    }
  }
  updateSelection();
  updateMapNotice();
}
function render() {
  const matches = getMatches();
  const rows = pageRows(matches);
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  byId("result-count").textContent = number.format(matches.length) + (matches.length === 1 ? " farmacia trovata" : " farmacie trovate");
  list.replaceChildren(...rows.map(card));
  byId("empty-list").hidden = matches.length > 0;
  byId("empty-list").textContent = "Nessuna farmacia corrisponde a questo filtro.";
  byId("pagination").hidden = pages === 1;
  byId("page-label").textContent = "Pagina " + number.format(page + 1) + " di " + number.format(pages);
  byId("prev").disabled = page === 0;
  byId("next").disabled = page + 1 >= pages;
  updateMap(matches);
}

function showCity(nextCity, scroll = false) {
  city = nextCity;
  page = 0;
  selection = undefined;
  filter.value = "all";
  const sortDistance = ([lat, lon]) => (lat - 44.494) ** 2 + ((lon - 11.344) * 0.71) ** 2;
  pharmacies = city.pharmacies.map(([id, name, address, postcode, coords, type, village]) => {
    const info = verified[id] || communityDetails(id);
    const standardName = name === name.toLocaleUpperCase("it-IT") ? titleCase(name) : name;
    const fullName = /\b(?:farmacia|farmacie|dispensario|apotheke)\b/i.test(standardName)
      ? standardName : (type.toLowerCase().includes("dispensario") ? "Dispensario " : "Farmacia ") + standardName;
    const street = info?.address || (address === address.toLocaleUpperCase("it-IT") ? titleCase(address) : address);
    return { id, name: info?.name || fullName, address: [street, village ? placeName(village) : ""].filter(value => value && value !== "-").join(", "), postcode: postcode === "-" ? "" : postcode, coords, info };
  }).sort((a, b) => {
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
  withIcon(byId("location-label"), "pin", city.region);
  byId("result-title").textContent = "Farmacie a " + city.label;
  quickLinks.forEach(button => button.setAttribute("aria-pressed", String(normalize(button.dataset.city) === city.key)));
  render();
  if (scroll) {
    directory.focus({ preventScroll: true });
    directory.scrollIntoView({ block: "start" });
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
  const begins = [];
  const contains = [];
  for (const candidate of cities) {
    const qualified = candidate.key + " " + candidate.province.toLowerCase();
    if (candidate.key === query || qualified === query) begins.unshift(candidate);
    else if (candidate.key.startsWith(query)) begins.push(candidate);
    else if (candidate.key.includes(query)) contains.push(candidate);
  }
  return [...begins, ...contains];
}
function choose(candidate) {
  const duplicate = cities.some(other => other.key === candidate.key && other.province !== candidate.province);
  cityInput.value = candidate.label + (duplicate ? " (" + candidate.province + ")" : "");
  cityInput.setCustomValidity("");
  clearSuggestions();
  const url = new URL(window.location.href);
  url.searchParams.set("comune", candidate.label);
  url.searchParams.set("provincia", candidate.province);
  url.hash = "risultati";
  if (url.href !== window.location.href) window.history.pushState(null, "", url);
  showCity(candidate, true);
}
function showSuggestions() {
  cityInput.setCustomValidity("");
  clearSuggestions();
  choices = findCities(cityInput.value).slice(0, 7);
  if (!choices.length) return;
  choices.forEach((candidate, index) => {
    const option = element("li", "", candidate.label);
    option.append(element("small", "", candidate.province));
    option.id = "city-option-" + index;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.addEventListener("pointerdown", event => event.preventDefault());
    option.addEventListener("click", () => choose(candidate));
    suggestions.append(option);
  });
  suggestions.hidden = false;
  cityInput.setAttribute("aria-expanded", "true");
}

byId("search").addEventListener("submit", event => {
  event.preventDefault();
  const matches = findCities(cityInput.value);
  const exact = matches.filter(candidate => [candidate.key, candidate.key + " " + candidate.province.toLowerCase()].includes(normalize(cityInput.value)));
  const candidate = choices[activeChoice] || (exact.length === 1 ? exact[0] : null) || (matches.length === 1 ? matches[0] : null);
  if (candidate) choose(candidate);
  else if (matches.length) {
    cityInput.focus();
    showSuggestions();
  } else {
    cityInput.setCustomValidity("Comune non trovato. Controlla il nome e riprova.");
    cityInput.reportValidity();
  }
});
cityInput.addEventListener("input", showSuggestions);
cityInput.addEventListener("focus", showSuggestions);
cityInput.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!suggestions.hidden) event.preventDefault();
    clearSuggestions();
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
  if (!event.currentTarget.contains(event.relatedTarget)) clearSuggestions();
});
quickLinks.forEach(button => button.addEventListener("click", () => {
  const candidate = cities.find(item => item.key === normalize(button.dataset.city));
  if (candidate) choose(candidate);
}));
filter.addEventListener("change", () => { page = 0; selection = undefined; render(); });
for (const [button, step] of [[byId("prev"), -1], [byId("next"), 1]]) {
  button.addEventListener("click", () => {
    page += step;
    selection = undefined;
    render();
    directory.focus({ preventScroll: true });
    directory.scrollIntoView({ block: "start" });
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
    if (!byId("map").clientWidth) return;
    map.invalidateSize({ pan: false });
    if (markers.size && !selection) fitMarkers();
  });
  observer.observe(byId("map"));
}
function cityFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const town = normalize(params.get("comune") || "");
  const province = (params.get("provincia") || "").toUpperCase();
  return cities.find(candidate => candidate.key === town && (!province || candidate.province === province))
    || cities.find(candidate => candidate.key === "bologna") || cities[0];
}
function restoreCity() {
  const nextCity = cityFromUrl();
  if (!nextCity || city === nextCity) return;
  cityInput.value = new URLSearchParams(window.location.search).has("comune") ? nextCity.label : "";
  cityInput.setCustomValidity("");
  clearSuggestions();
  showCity(nextCity);
}
if (cities.length) {
  const snapshot = document.querySelector("#fonti time");
  const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "UTC" });
  snapshot.dateTime = window.farmacie.date;
  snapshot.textContent = dateFormat.format(new Date(snapshot.dateTime + "T00:00:00Z"));
  if (window.recapitiOSM?.date) {
    const date = new Date(window.recapitiOSM.date + "T00:00:00Z");
    byId("osm-date").textContent = "Estrazione OpenStreetMap del " + dateFormat.format(date) + ". ";
    byId("osm-date").hidden = false;
  }
  restoreCity();
  window.addEventListener("popstate", restoreCity);
}
else {
  byId("result-count").textContent = "L’anagrafe non è disponibile.";
  byId("map-fit").disabled = true;
  updateMapNotice();
}
