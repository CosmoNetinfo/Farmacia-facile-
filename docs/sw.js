// Service worker di Farmacia Vicino: permette di riaprire l'app senza connessione.
// Strategia: rete per prima (dati sempre aggiornati), copia salvata se la rete manca.
// Cambia VERSIONE quando vuoi forzare la pulizia delle copie salvate.
const VERSIONE = "v1";
const CACHE = "farmacia-vicino-" + VERSIONE;
const BASE = [
  "./", "index.html", "styles.css", "app.js", "favicon.svg", "manifest.webmanifest",
  "farmacie.js", "comuni.js", "recapiti-osm.js", "indirizzi.js", "orari-regionali.js",
  "schede-verificate.js", "servizi.js", "leaflet/leaflet.js", "leaflet/leaflet.css"
];

self.addEventListener("install", event => {
  // Le copie precaricate sono "best effort": un file mancante non blocca l'installazione.
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(BASE.map(url => cache.add(url)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // mappe, font e servizi esterni restano alla rete
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const home = await caches.match("index.html", { ignoreSearch: true });
        if (home) return home;
      }
      return Response.error();
    })
  );
});
