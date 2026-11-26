"use strict";

// Configurazione del servizio che riceve le richieste (Supabase).
// Finché restano vuoti, il modulo è visibile ma non invia nulla.
const SUPABASE_URL = "https://tvrezwiqyoaigyxkzzkr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kjsyLiZm7PW7d7XPxAzbBg_Xa-Jz17_";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const byId = id => document.getElementById(id);
const form = byId("adesione-form");
const esito = byId("esito");

function titleCase(text) {
  return text.toLowerCase().replace(/(^|[\s'’.(-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
}

function showMessage(kind, text) {
  esito.className = "msg " + kind;
  esito.textContent = text;
}

// Orari: una riga per lunedì-venerdì, oppure una per ogni giorno
const grid = byId("hours-grid");
function addRow(key, label) {
  const row = document.createElement("div");
  row.className = "hours-grid";
  row.dataset.row = key;
  const name = document.createElement("strong");
  name.textContent = label;
  row.append(name);
  for (let slot = 0; slot < 4; slot += 1) {
    const input = document.createElement("input");
    input.type = "time";
    input.setAttribute("aria-label", label + (slot % 2 ? " chiude " : " apre ") + (slot > 1 ? "nel pomeriggio" : "al mattino"));
    row.append(input);
  }
  grid.append(row);
}
addRow("week", "Lun–ven");
DAYS.forEach((day, index) => addRow(String(index), day));

const inputs = key => [...grid.querySelectorAll('[data-row="' + key + '"] input')];
const rowKey = index => index < 5 && !byId("diversi").checked ? "week" : String(index);

function showRows() {
  const different = byId("diversi").checked;
  for (const row of grid.children) {
    const key = row.dataset.row;
    row.hidden = key === "week" ? different : Number(key) < 5 && !different;
  }
}
byId("diversi").addEventListener("change", event => {
  // Passando ai giorni separati si parte dagli orari già scritti.
  if (event.target.checked) {
    const week = inputs("week").map(input => input.value);
    for (let day = 0; day < 5; day += 1) inputs(String(day)).forEach((input, slot) => { input.value = week[slot]; });
  }
  showRows();
});
byId("copia-sab").addEventListener("click", () => {
  const source = inputs(rowKey(4)).map(input => input.value);
  inputs("5").forEach((input, slot) => { input.value = source[slot]; });
});
showRows();

byId("always").addEventListener("change", event => {
  byId("hours-wrap").hidden = event.target.checked;
});

const dayValues = index => inputs(rowKey(index)).map(input => input.value);

function dayText(index) {
  const values = dayValues(index);
  const parts = [];
  if (values[0] && values[1]) parts.push(values[0] + "–" + values[1]);
  if (values[2] && values[3]) parts.push(values[2] + "–" + values[3]);
  // Orario continuato scritto solo come apertura mattina e chiusura sera.
  if (values[0] && !values[1] && !values[2] && values[3]) parts.push(values[0] + "–" + values[3]);
  return parts.join(", ");
}

function hoursSummary() {
  const texts = DAYS.map((_, index) => dayText(index));
  const groups = [];
  texts.forEach((text, index) => {
    if (!text) return;
    const last = groups[groups.length - 1];
    if (last && last.text === text && last.end === index - 1) last.end = index;
    else groups.push({ text, start: index, end: index });
  });
  return groups.map(group => {
    const label = group.start === group.end ? DAYS[group.start] : DAYS[group.start] + "–" + DAYS[group.end].toLowerCase();
    return label + " " + group.text;
  }).join(" · ");
}

function incompleteDay() {
  return DAYS.findIndex((_, index) => {
    const values = dayValues(index);
    if (values[0] && !values[1] && !values[2] && values[3]) return false; // orario continuato
    return Boolean(values[0]) !== Boolean(values[1]) || Boolean(values[2]) !== Boolean(values[3]) || (!values[0] && values[2]);
  });
}

// Modalità sviluppatore: si apre con adesione.html?sviluppatore. Il codice lo controlla il database.
const CODE_KEY = "fvDevCode";
function savedCode() { try { return localStorage.getItem(CODE_KEY) || ""; } catch { return ""; } }
function storeCode(value) { try { value ? localStorage.setItem(CODE_KEY, value) : localStorage.removeItem(CODE_KEY); } catch {} }
const developer = new URLSearchParams(window.location.search).has("sviluppatore") || Boolean(savedCode());
if (developer) {
  byId("titolo").textContent = "Inserisci i dati";
  byId("intro").textContent = "Scrivi quello che hai visto. Riceverai la notifica e deciderai se attivarlo.";
  byId("dev-box").hidden = false;
  byId("dev-code").value = savedCode();
  for (const node of document.querySelectorAll(".solo-farmacia")) node.hidden = true;
  byId("phone").required = false;
  byId("invia").textContent = "Invia per l'approvazione";
}
byId("dev-exit").addEventListener("click", () => { storeCode(""); window.location.href = "adesione.html"; });

// Farmacie più vicine: la posizione resta sul dispositivo.
byId("vicine").addEventListener("click", () => {
  const status = byId("vicine-stato");
  if (!navigator.geolocation) { status.textContent = "Posizione non disponibile."; return; }
  status.textContent = "Cerco…";
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const scale = Math.cos(coords.latitude * Math.PI / 180);
    const near = [];
    for (const city of cities) for (const row of city[3]) {
      const point = row[4];
      if (!point || point.length !== 2 || !point.every(Number.isFinite)) continue;
      const meters = Math.hypot(point[0] - coords.latitude, (point[1] - coords.longitude) * scale) * 111320;
      near.push({ meters, city, row });
    }
    near.sort((a, b) => a.meters - b.meters);
    selectFarmacia.replaceChildren(new Option("Scegli tra le più vicine", ""));
    for (const { meters, city, row } of near.slice(0, 12)) {
      const option = new Option(Math.round(meters) + " m · " + titleCase(row[1]) + " — " + row[2], String(row[0]));
      option.dataset.name = row[1];
      option.dataset.address = row[2];
      option.dataset.comune = titleCase(city[0]) + " (" + city[1] + ")";
      selectFarmacia.append(option);
    }
    selectFarmacia.disabled = false;
    comuneInput.value = "";
    status.textContent = "Scegli dall'elenco qui sotto.";
  }, () => { status.textContent = "Posizione non concessa o non disponibile."; }, { enableHighAccuracy: true, timeout: 15000 });
});

// Comune e farmacia, dall'anagrafe già caricata nel sito
const comuniLista = byId("comuni-lista");
const comuneInput = byId("comune");
const selectFarmacia = byId("farmacia");
let cities = [];

function initCities() {
  // Farmacie e parafarmacie, unite per comune
  const byKey = new Map();
  for (const source of [window.farmacie, window.parafarmacie]) {
    for (const city of (source && source.cities) || []) {
      const key = city[0] + "|" + city[1];
      const entry = byKey.get(key);
      if (entry) entry[3] = entry[3].concat(city[3]);
      else byKey.set(key, [city[0], city[1], city[2], city[3].slice()]);
    }
  }
  cities = [...byKey.values()];
  const labels = cities.map(city => titleCase(city[0]) + " (" + city[1] + ")").sort((a, b) => a.localeCompare(b, "it"));
  comuniLista.replaceChildren(...labels.map(label => {
    const option = document.createElement("option");
    option.value = label;
    return option;
  }));
}

function loadPharmacies() {
  const city = cities.find(entry => titleCase(entry[0]) + " (" + entry[1] + ")" === comuneInput.value);
  selectFarmacia.replaceChildren();
  if (!city) {
    selectFarmacia.disabled = true;
    selectFarmacia.append(new Option("Scegli prima il comune", ""));
    return;
  }
  selectFarmacia.disabled = false;
  selectFarmacia.append(new Option("Scegli la tua attività", ""));
  city[3].slice().sort((a, b) => a[1].localeCompare(b[1], "it")).forEach(pharmacy => {
    const option = new Option((pharmacy[0] >= 5000000 ? "Parafarmacia " : "") + titleCase(pharmacy[1]) + " — " + pharmacy[2], String(pharmacy[0]));
    option.dataset.name = pharmacy[1];
    option.dataset.address = pharmacy[2];
    selectFarmacia.append(option);
  });
}

comuneInput.addEventListener("input", loadPharmacies);
selectFarmacia.addEventListener("change", () => {
  const comune = selectFarmacia.selectedOptions[0]?.dataset.comune;
  if (comune) comuneInput.value = comune;
});
function initServizi() {
  const box = byId("servizi-lista");
  for (const [key, label] of window.servizi || []) {
    const item = document.createElement("label");
    item.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = key;
    const text = document.createElement("span");
    text.textContent = label;
    item.append(input, text);
    box.append(item);
  }
}
function prefillFromUrl() {
  const id = Number(new URLSearchParams(window.location.search).get("farmacia"));
  if (!id) return;
  const city = cities.find(entry => entry[3].some(pharmacy => pharmacy[0] === id));
  if (!city) return;
  comuneInput.value = titleCase(city[0]) + " (" + city[1] + ")";
  loadPharmacies();
  selectFarmacia.value = String(id);
}
window.addEventListener("load", () => { initCities(); initServizi(); prefillFromUrl(); });

function normalizePhone(raw) {
  const digits = raw.replace(/[^\d+]/g, "");
  const national = digits.startsWith("+39") ? digits.slice(3) : digits.startsWith("0039") ? digits.slice(4) : digits;
  return /^\d{6,11}$/.test(national) ? "+39" + national : null;
}

function validSite(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : false;
  } catch { return false; }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  esito.className = ""; esito.textContent = "";
  if (byId("sito-esca").value) return; // trappola per i bot

  const chosen = selectFarmacia.selectedOptions[0];
  const phone = normalizePhone(byId("phone").value);
  const site = validSite(byId("site").value.trim());
  const always = byId("always").checked;
  const hours = always ? "" : hoursSummary();
  const email = byId("email").value.trim();

  if (!chosen || !chosen.value) return showMessage("err", "Scegli la tua farmacia o parafarmacia.");
  const typedPhone = byId("phone").value.trim();
  const code = byId("dev-code").value.trim();
  if (developer && !code) return showMessage("err", "Scrivi il codice sviluppatore.");
  if (!phone && (!developer || typedPhone)) return showMessage("err", "Controlla il numero di telefono: servono solo cifre, con il prefisso.");
  if (site === false) return showMessage("err", "Il sito deve iniziare con http:// o https://.");
  if (!always && incompleteDay() !== -1) return showMessage("err", "Controlla gli orari: ogni fascia ha bisogno di apertura e chiusura.");
  if (!developer && !always && !hours) return showMessage("err", "Inserisci gli orari, oppure indica che è aperta 24 ore su 24.");
  if (developer && !always && !hours && !phone && !site) return showMessage("err", "Inserisci almeno orari, telefono o sito.");
  if (!developer) {
  if (!byId("nome").value.trim() || !byId("ruolo").value) return showMessage("err", "Indica nome e ruolo di chi compila.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showMessage("err", "Controlla l'indirizzo email.");
  if (!byId("c-pub").checked || !byId("c-priv").checked) return showMessage("err", "Servono entrambi i consensi.");
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return showMessage("err", "Il modulo non è ancora attivo. Scrivici su WhatsApp.");

  const body = {
    pharmacy_id: Number(chosen.value),
    pharmacy_name: chosen.dataset.name,
    pharmacy_address: chosen.dataset.address,
    phone: phone || null, site: site || null,
    hours_text: hours || null,
    always_open: always,
    servizi: [...document.querySelectorAll("#servizi-lista input:checked")].map(box => box.value),
    ...(developer ? { codice_dev: code } : {
      referente_nome: byId("nome").value.trim(),
      referente_ruolo: byId("ruolo").value,
      referente_email: email,
      consenso_pubblicazione: true,
      consenso_privacy: true
    })
  };

  byId("invia").disabled = true;
  try {
    const response = await fetch(SUPABASE_URL + "/rest/v1/adesioni", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        Prefer: "return=minimal"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail.includes("codice_non_valido") ? "codice" : String(response.status));
    }
    if (developer) storeCode(code);
    form.reset();
    byId("dev-code").value = savedCode();
    byId("hours-wrap").hidden = false;
    showRows();
    loadPharmacies();
    showMessage("ok", developer ? "Inviato. Approvalo dalla notifica." : "Richiesta inviata. Ti scriveremo per la verifica prima di pubblicare i dati.");
  } catch (error) {
    showMessage("err", error.message === "codice" ? "Codice sviluppatore non valido." : "Invio non riuscito. Riprova più tardi o scrivici su WhatsApp.");
  } finally {
    byId("invia").disabled = false;
  }
});
