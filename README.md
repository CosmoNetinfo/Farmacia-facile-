# Farmacia Vicino

> **Versione beta — fase embrionale.** Il progetto è appena nato e cambia ogni giorno. Funziona, ma i dati sono incompleti e alcune funzioni sono ancora da costruire. Non usarlo come unica fonte per decisioni urgenti: in caso di emergenza chiama il 112.

**Farmacia Vicino** è una web app gratuita per trovare le farmacie italiane. Si cerca per comune o frazione, si consultano indirizzi, orari e recapiti disponibili e si vedono le farmacie sulla mappa.

**Provala online:** <https://cosmonetinfo.github.io/Farmacia-facile-/>

Sviluppata da [CosmoNet.info](https://www.cosmonet.info/).

## Cosa fa oggi

- **Farmacie vicino a te**: premendo «Usa la mia posizione», l’app mostra le prime 20 farmacie entro 50 km, ordinate per distanza in linea d’aria. «Mostra altre» aggiunge altri risultati. La mappa mostra i segnaposti delle farmacie e della tua posizione.
- **Ricerca per comune o frazione**, con suggerimenti mentre scrivi. Accenti e apostrofi non contano, e i comuni fusi o rinominati portano al comune attuale.
- **Navigazione per zona**: Nord, Centro, Sud e isole, poi regione, provincia e comune.
- **Elenco e mappa** (Leaflet + OpenStreetMap), sei schede per pagina, con passaggio rapido da una vista all'altra.
- **Filtri**: tutte le farmacie, con orari pubblicati, con numero di telefono, aperte 24 ore.
- **Orari del giorno** per Friuli-Venezia Giulia e Provincia autonoma di Bolzano, letti dal browser dai dati aperti regionali.
- **Farmacie di turno a Firenze**, con data e attribuzione al Comune. Il turno è indicato separatamente dagli orari di apertura.
- **Link condivisibili**: l'indirizzo della pagina contiene comune, provincia ed eventuale frazione, ad esempio `?comune=Spoleto&provincia=PG`.
- **Nessun backend e nessun account**: è un sito statico, la ricerca avviene nel browser.
- **Pannello "Fonti dei dati"** con tutte le fonti, le licenze e le date di estrazione.
- **Segnala o correggi** da ogni scheda. Puoi aprire l’editor OpenStreetMap quando è disponibile un punto, aprire un modulo GitHub precompilato o contattare CosmoNet via WhatsApp o Telegram.
- Ha manifest e icone per essere aggiunta alla schermata Home. Una modalità offline non c'è ancora.

## Dati al momento (misurati l'11 novembre 2026)

| Dato | Quante farmacie | Quota |
|------|-----------------|-------|
| Farmacie nell'anagrafe | 20.777 | 100% |
| Con coordinate | 18.941 | 91,2% |
| Con almeno un recapito da OpenStreetMap | 2.376 | 11,4% |
| Con numero di telefono | 1.946 | 9,4% |
| Con orari pubblicati | 1.186 | 5,7% |
| Con sito web | 813 | 3,9% |

L'anagrafe ha data 11 novembre 2026, l'estrazione OpenStreetMap 10 novembre 2026. I numeri cambiano a ogni aggiornamento.

## Limiti attuali (beta)

- La ricerca per posizione include solo le farmacie con coordinate. Gli orari del giorno di FVG e Bolzano si consultano nella ricerca per comune.
- Gli orari del giorno coprono solo FVG e Bolzano. Per il resto d'Italia mancano o arrivano solo da OpenStreetMap, dove sono volontari a inserirli.
- La ricerca per comune mostra i turni solo per Firenze e solo per le farmacie abbinate univocamente per via e civico, con riscontro sul nome. Civici rossi, multipli o assenti restano esclusi.
- Telefoni, siti e orari da OpenStreetMap sono abbinati alle farmacie in modo prudente: se l'abbinamento è dubbio, il dato non viene mostrato.
- Alcuni segnaposto sulla mappa possono essere approssimativi.
- Le farmacie di turno non sono gestite in modo uniforme a livello nazionale.
- I nomi arrivano dall'anagrafe e non sono ripuliti: possono contenere la forma societaria.
- Solo a Bologna le schede sono ordinate per vicinanza al centro. Altrove l'ordine è alfabetico.
- **Chiama sempre la farmacia per confermare gli orari**, soprattutto nei festivi.

## Fonti dei dati

| Dato | Fonte | Licenza |
|------|-------|---------|
| Anagrafe e indirizzi delle farmacie | [Ministero della Salute](https://www.dati.salute.gov.it/it/dataset/farmacie/) | IODL 2.0 |
| Comuni, denominazioni e fusioni | [ISTAT – SITUAS](https://situas.istat.it/web/) | — |
| Orari del giorno (FVG) | [Regione Friuli-Venezia Giulia](https://www.dati.friuliveneziagiulia.it/Salute-e-Sanit-/Farmacie/jbxd-m6xe) | IODL 2.0 |
| Orari del giorno (Bolzano) | [Provincia autonoma di Bolzano](https://data.civis.bz.it/dataset/farmacie-di-turno-dell-alto-adige1) | CC0 1.0 |
| Turni del giorno (Firenze) | [Comune di Firenze, Turni Farmacie](https://opendata.comune.fi.it/page_dataset_show?id=cac33ab9-7331-4ecc-a365-712e6913da08) | CC BY 4.0 |
| Recapiti, orari e alcune coordinate | © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) | ODbL 1.0 |

Cinque farmacie (tre a Bologna, due a Cagliari) hanno schede curate a mano sui siti dei titolari.

## Come è fatto

```
docs/                     il sito pubblicato (HTML, CSS, JS, dati)
  index.html, app.js      interfaccia e logica di ricerca
  farmacie.js             anagrafe del Ministero (generato)
  comuni.js               comuni e frazioni ISTAT (generato)
  recapiti-osm.js         telefoni, siti e orari da OpenStreetMap (generato)
  orari-regionali.js      orari del giorno da FVG e Bolzano e turni di Firenze, letti dal browser
  indirizzi.js            normalizzazione degli indirizzi per gli abbinamenti
  leaflet/                libreria mappe
aggiorna-dati.ps1         scarica Ministero e ISTAT e rigenera i dati
importa-farmacie.ps1      converte il CSV del Ministero in farmacie.js
importa-comuni.py         converte i dati ISTAT in comuni.js
importa-recapiti.mjs      abbina le farmacie a OpenStreetMap (estrazione Overpass)
.github/workflows/        pubblicazione su GitHub Pages e aggiornamento mensile
```

Stack: HTML, CSS e JavaScript senza framework, Leaflet per la mappa, PowerShell, Python e Node.js per gli script dati, GitHub Actions e GitHub Pages per la pubblicazione.

## Aggiornamento dei dati

Il workflow `Aggiorna dati e pubblica il sito` parte a ogni modifica di `docs/`, il primo giorno di ogni mese e su richiesta. Controlla che il Ministero abbia pubblicato una versione non più vecchia di quella presente, scarica anagrafe e comuni e verifica che l'estrazione copra almeno venti regioni. Controlla anche la sintassi dei file JavaScript. Se qualcosa cambia, fa il commit e ripubblica il sito.

L'estrazione di OpenStreetMap **non è ancora automatica**: l'aggiornamento mensile toglie solo i recapiti che non tornano più con la nuova anagrafe.

In locale, con PowerShell 7, Python 3 e `curl`:

```
pwsh ./aggiorna-dati.ps1
```

I recapiti da OpenStreetMap si rigenerano con un'estrazione Overpass delle farmacie italiane:

```
node importa-recapiti.mjs estrazione-overpass.json
```

## Provarlo in locale

Non serve installare nulla. Basta servire la cartella `docs/` con un server statico qualsiasi, ad esempio:

```
cd docs
python3 -m http.server 8080
```

poi apri `http://localhost:8080`.

## Privacy

Il codice non richiede account e non salva dati personali. Il browser contatta i server di OpenStreetMap per i riquadri della mappa, Google Fonts per i caratteri e i server regionali per gli orari dei comuni di FVG e Bolzano. Solo nella ricerca per il Comune di Firenze, il browser contatta `datigis.comune.fi.it` per leggere il file pubblico dei turni. Il pulsante "Indicazioni" apre Google Maps.

La posizione si chiede solo quando premi «Usa la mia posizione». L’app calcola le distanze sul dispositivo e tiene le coordinate in memoria per la ricerca corrente, senza inviarle a servizi esterni, inserirle nell’URL o salvarle nel browser. In questa vista la mappa mostra i segnaposti su una griglia locale, senza richieste ai server della cartografia.

«Segnala o correggi» apre i servizi esterni solo quando selezioni un link. GitHub richiede un account e le segnalazioni inviate sono pubbliche. Il modulo riceve ID ministeriale, nome, comune e provincia della farmacia. I link WhatsApp e Telegram aprono i rispettivi servizi senza testo precompilato o dati della farmacia nell’URL.

## Contribuire

Il progetto è in una fase molto iniziale e ogni aiuto è benvenuto: segnalazioni di dati sbagliati, idee, test su dispositivi diversi. Apri una issue indicando comune, provincia e cosa ti aspettavi di vedere.

Puoi correggere telefono, sito e orari (`opening_hours`) su OpenStreetMap dal dialogo «Segnala o correggi». Le modifiche arrivano al prossimo aggiornamento dell’estrazione OpenStreetMap. Per segnalare un errore a CosmoNet, anche per una farmacia priva di coordinate e di un oggetto OpenStreetMap abbinato, puoi usare GitHub, WhatsApp o Telegram.

## Licenza e attribuzioni

I dati restano soggetti alle licenze delle fonti indicate sopra. In particolare i recapiti derivati da OpenStreetMap sono © OpenStreetMap contributors, ODbL 1.0.

La licenza del codice non è ancora stata scelta.
