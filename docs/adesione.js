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

// Orari: griglia con quattro campi per giorno
const grid = byId("hours-grid");
DAYS.forEach((day, index) => {
  const row = document.createElement("div");
  row.className = "hours-grid";
  const name = document.createElement("strong");
  name.textContent = day;
  row.append(name);
  for (let slot = 0; slot < 4; slot += 1) {
    const input = document.createElement("input");
    input.type = "time";
    input.dataset.day = String(index);
    input.dataset.slot = String(slot);
    input.setAttribute("aria-label", day + (slot % 2 ? " chiude " : " apre ") + (slot > 1 ? "nel pomeriggio" : "al mattino"));
    row.append(input);
  }
  grid.append(row);
});

byId("always").addEventListener("change", event => {
  byId("hours-wrap").hidden = event.target.checked;
});

function dayText(index) {
  const values = [0, 1, 2, 3].map(slot => grid.querySelector('[data-day="' + index + '"][data-slot="' + slot + '"]').value);
  const parts = [];
  if (values[0] && values[1]) parts.push(values[0] + "–" + values[1]);
  if (values[2] && values[3]) parts.push(values[2] + "–" + values[3]);
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
    const values = [0, 1, 2, 3].map(slot => grid.querySelector('[data-day="' + index + '"][data-slot="' + slot + '"]').value);
    return Boolean(values[0]) !== Boolean(values[1]) || Boolean(values[2]) !== Boolean(values[3]) || (!values[0] && values[2]);
  });
}

// Comune e farmacia, dall'anagrafe già caricata nel sito
const comuniLista = byId("comuni-lista");
const comuneInput = byId("comune");
const selectFarmacia = byId("farmacia");
let cities = [];

function initCities() {
  cities = (window.farmacie && window.farmacie.cities) || [];
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
  selectFarmacia.append(new Option("Scegli la farmacia", ""));
  city[3].slice().sort((a, b) => a[1].localeCompare(b[1], "it")).forEach(pharmacy => {
    const option = new Option(titleCase(pharmacy[1]) + " — " + pharmacy[2], String(pharmacy[0]));
    option.dataset.name = pharmacy[1];
    option.dataset.address = pharmacy[2];
    selectFarmacia.append(option);
  });
}

comuneInput.addEventListener("input", loadPharmacies);
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
window.addEventListener("load", () => { initCities(); initServizi(); });

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

  if (!chosen || !chosen.value) return showMessage("err", "Scegli la tua farmacia.");
  if (!phone) return showMessage("err", "Controlla il numero di telefono: servono solo cifre, con il prefisso.");
  if (site === false) return showMessage("err", "Il sito deve iniziare con http:// o https://.");
  if (!always && incompleteDay() !== -1) return showMessage("err", "Controlla gli orari: ogni fascia ha bisogno di apertura e chiusura.");
  if (!always && !hours) return showMessage("err", "Inserisci gli orari, oppure indica che è aperta 24 ore su 24.");
  if (!byId("nome").value.trim() || !byId("ruolo").value) return showMessage("err", "Indica nome e ruolo di chi compila.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showMessage("err", "Controlla l'indirizzo email.");
  if (!byId("c-pub").checked || !byId("c-priv").checked) return showMessage("err", "Servono entrambi i consensi.");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return showMessage("err", "Il modulo non è ancora attivo. Scrivici su WhatsApp.");

  const body = {
    pharmacy_id: Number(chosen.value),
    pharmacy_name: chosen.dataset.name,
    pharmacy_address: chosen.dataset.address,
    phone, site: site || null,
    hours_text: hours || null,
    always_open: always,
    servizi: [...document.querySelectorAll("#servizi-lista input:checked")].map(box => box.value),
    referente_nome: byId("nome").value.trim(),
    referente_ruolo: byId("ruolo").value,
    referente_email: email,
    consenso_pubblicazione: true,
    consenso_privacy: true
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
    if (!response.ok) throw new Error(String(response.status));
    form.reset();
    byId("hours-wrap").hidden = false;
    loadPharmacies();
    showMessage("ok", "Richiesta inviata. Ti scriveremo per la verifica prima di pubblicare i dati.");
  } catch {
    showMessage("err", "Invio non riuscito. Riprova più tardi o scrivici su WhatsApp.");
  } finally {
    byId("invia").disabled = false;
  }
});
