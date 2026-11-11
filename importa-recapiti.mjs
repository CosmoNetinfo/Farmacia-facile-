import { readFileSync, writeFileSync } from "node:fs";
import "./docs/indirizzi.js";
const { normalize, addressKey, fullAddressKey } = globalThis.pharmacyAddress;

const [osmPath] = process.argv.slice(2);
if (!osmPath) {
  console.error("Uso: node importa-recapiti.mjs <estrazione-overpass.json>");
  process.exit(1);
}

const anagrafe = readFileSync(new URL("./docs/farmacie.js", import.meta.url), "utf8");
const cities = JSON.parse(anagrafe.trim().replace(/^window\.farmacie = /, "").replace(/;$/, "")).cities;
const osm = JSON.parse(readFileSync(osmPath, "utf8"));
if (!osm.osm3s?.timestamp_osm_base || !osm.elements?.length || osm.remark) {
  throw new Error("L'estrazione OpenStreetMap è vuota o incompleta.");
}

function pharmacyName(value = "") {
  return normalize(value)
    .split(/\b(?:srl|s r l|s a s|sas|snc|s n c|dott|dottoressa|dr|societa)\b/)[0]
    .replace(/^farmacia\s+/, "").trim();
}

function add(index, key, row) {
  if (!key) return;
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(row);
}
const streetIndex = new Map();
const nameIndex = new Map();
const idIndex = new Map();
const genericNames = new Set(["", "farmacia", "comunale", "centrale", "nuova", "rurale", "municipale", "di turno"]);
for (const [city, , , pharmacies] of cities) {
  const town = normalize(city);
  for (const [id, name, address, postcode, coords, , village] of pharmacies) {
    const street = fullAddressKey(address);
    const label = pharmacyName(name);
    const row = { id, town, postcode, coords, street, label, village: normalize(village) };
    idIndex.set(id, row);
    if (street) add(streetIndex, street, row);
    if (coords && !genericNames.has(label) && label.length >= 4) add(nameIndex, label, row);
  }
}

function distance(a, b) {
  if (!a || !b) return Infinity;
  const meanLatitude = (a[0] + b[0]) * Math.PI / 360;
  return 111195 * Math.hypot(a[0] - b[0], (a[1] - b[1]) * Math.cos(meanLatitude));
}

function match(element) {
  const { tags } = element;
  const coords = element.center ? [element.center.lat, element.center.lon]
    : Number.isFinite(element.lat) ? [element.lat, element.lon] : null;
  const town = normalize(tags["addr:city"]);
  const postcode = tags["addr:postcode"];
  const street = addressKey(tags["addr:street"] || tags["addr:place"], tags["addr:housenumber"]);
  const label = pharmacyName(tags.name);
  const reference = tags["ref:msal"];
  if (reference !== undefined) {
    // Le parafarmacie hanno un codice con zeri iniziali in OpenStreetMap.
    const row = /^[1-9]\d*$/.test(reference) ? idIndex.get(Number(reference)) : undefined;
    if (!row) return null;
    const near = distance(coords, row.coords);
    const areaAgrees = (town && (town === row.town || town === row.village)) || (postcode && postcode === row.postcode);
    const sameAddress = street && street === row.street;
    const sameName = label.length >= 4 && !genericNames.has(label) && label === row.label;
    if ((sameAddress && (areaAgrees || near < 450))
      || (near < 130 && (!town || areaAgrees))
      || (sameName && areaAgrees && (!street || !row.street || sameAddress))) {
      return { row, byReference: true };
    }
    return null;
  }
  const consistent = row => (!town || row.town === town) && (!postcode || row.postcode === postcode);
  const exact = (streetIndex.get(street) || []).filter(row =>
    consistent(row) && (town || postcode || distance(coords, row.coords) < 100)
  );
  if (exact.length) return exact.length === 1 ? { row: exact[0], byReference: false } : null;

  const named = (nameIndex.get(label) || []).filter(row =>
    consistent(row) && (!street || !row.street || street === row.street) && distance(coords, row.coords) < 80
  );
  return named.length === 1 ? { row: named[0], byReference: false } : null;
}

function phoneNumber(raw = "") {
  const compact = raw.trim().replace(/[ ().-]/g, "").replace(/^0039/, "+39");
  if (/^\+39\d{6,12}$/.test(compact)) return compact;
  if (/^(?:0|3)\d{5,11}$/.test(compact)) return "+39" + compact;
  return null;
}

function website(raw = "") {
  try {
    const url = new URL(raw.trim());
    if (["https:", "http:"].includes(url.protocol) && url.hostname.includes(".") && !url.username && !url.password) return url.href;
  } catch {}
  return null;
}

function hours(raw = "") {
  const value = raw.trim().replace(/[–−]/g, "-").replace(/\s*-\s*/g, "-").replace(/\s*,\s*/g, ",");
  if (value === "24/7") return value;
  const day = "(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)";
  const time = "(?:(?:[01]\\d|2[0-3]):[0-5]\\d|24:00)";
  const period = time + "-" + time;
  const simple = new RegExp("^(?:" + day + "(?:-" + day + ")?(?:," + day + "(?:-" + day + ")?)*\\s+)?(?:" + period + "(?:,\\s*" + period + ")*|off)$");
  return value.length <= 240 && /\d{2}:\d{2}/.test(value) && value.split(";").every(rule => simple.test(rule.trim())) ? value : null;
}

const matches = new Map();
for (const element of osm.elements) {
  if (!["node", "way", "relation"].includes(element.type) || !Number.isSafeInteger(element.id)
    || element.tags?.amenity !== "pharmacy" || element.tags.dispensing === "no") continue;
  const tags = element.tags;
  const phone = phoneNumber(tags["contact:phone"] || tags.phone);
  const site = website(tags["contact:website"] || tags.website);
  const opening = hours(tags.opening_hours);
  if (!phone && !site && !opening) continue;
  const found = match(element);
  if (found) add(matches, found.row.id, {
    byReference: found.byReference,
    details: [element.type, element.id, phone, site, opening]
  });
}

const records = {};
for (const [id, candidates] of matches) {
  const references = candidates.filter(item => item.byReference);
  const preferred = references.length ? references : candidates;
  if (preferred.length === 1) records[id] = preferred[0].details;
}
const date = osm.osm3s.timestamp_osm_base.slice(0, 10);
const values = Object.values(records);
if (!values.length) throw new Error("Nessun abbinamento affidabile.");
const data = JSON.stringify({ date, records });
const license = "/* © OpenStreetMap contributors. ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/ */";
writeFileSync(new URL("./docs/recapiti-osm.js", import.meta.url), license + "\nwindow.recapitiOSM = " + data + ";\n");
console.log(JSON.stringify({
  date, records: values.length, phones: values.filter(row => row[2]).length,
  websites: values.filter(row => row[3]).length, hours: values.filter(row => row[4]).length
}));
