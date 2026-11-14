// Legge le adesioni approvate da Supabase e stampa le voci pronte per docs/schede-verificate.js.
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/esporta-adesioni.mjs
// La chiave di servizio resta sul tuo computer: non va mai nel sito né nel repository.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("Imposta SUPABASE_URL e SUPABASE_SERVICE_KEY."); process.exit(1); }

const response = await fetch(url + "/rest/v1/adesioni?stato=eq.approvata&order=created_at", {
  headers: { apikey: key, Authorization: "Bearer " + key }
});
if (!response.ok) { console.error("Errore", response.status); process.exit(1); }
const rows = await response.json();

const q = value => JSON.stringify(value);
const today = new Date().toISOString().slice(0, 10);
const entries = rows.map(row => [
  "  {",
  "    id: " + row.pharmacy_id + ",",
  "    registryAddress: " + q(row.pharmacy_address) + ",",
  "    name: " + q(row.pharmacy_name) + ",",
  "    phone: " + q(row.phone) + ",",
  row.site ? "    site: " + q(row.site) + "," : null,
  "    hours: " + q(row.always_open ? "Tutti i giorni, 24 ore su 24" : row.hours_text) + ",",
  "    alwaysOpen: " + Boolean(row.always_open) + ",",
  row.servizi?.length ? "    services: " + q(row.servizi) + "," : null,
  "    verifiedOn: " + q(row.verificata_il || today) + ",",
  '    verifiedBy: "titolare"',
  "  }"
].filter(Boolean).join("\n"));

console.log(entries.join(",\n"));
console.error("\n" + rows.length + " voci. Incollale in docs/schede-verificate.js, poi imposta stato = 'pubblicata' su Supabase.");
