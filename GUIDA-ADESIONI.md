# Adesione delle farmacie: come funziona

1. La farmacia compila `docs/adesione.html`: sceglie il comune e la farmacia dall'anagrafe, poi indica telefono, sito, orari e chi compila.
2. La richiesta arriva nella tabella `adesioni` di Supabase con stato `da_verificare`. Il sito può solo inserire, non leggere.
3. Tu verifichi (vedi sotto) e cambi lo stato in `approvata` o `rifiutata`, con una nota.
4. `scripts/esporta-adesioni.mjs` stampa le voci approvate nel formato di `docs/schede-verificate.js`, con `verifiedBy: "titolare"`. La scheda mostra «Verificato dal titolare».
5. Dopo la pubblicazione imposta lo stato su `pubblicata`.

## Come verificare
- Richiama il numero della farmacia che risulta dall'anagrafe o da OpenStreetMap, non quello scritto nel modulo, e chiedi conferma.
- Controlla che il dominio dell'email o del sito sia coerente con la farmacia.
- Se il numero indicato è diverso da quello già noto, chiedi il motivo prima di approvare.
- Nel dubbio rifiuta: una scheda spoglia è meglio di una sbagliata.

## Prima di attivarlo
- Informativa in `docs/privacy.html`: controlla tempi di conservazione e contatti prima di linkare il modulo dalla home.
- Scegliere il progetto Supabase, eseguire `supabase/adesioni.sql` e inserire URL e chiave pubblica (anon) in cima a `docs/adesione.js`. La chiave anon può stare nel sito: la protezione è nelle regole della tabella.
- Pubblicare un'informativa privacy per l'email del referente (dato personale). Il testo va deciso da te: io non sono un avvocato.
- Valutare un anti-spam più forte, ad esempio Cloudflare Turnstile. Ora c'è solo un campo trappola e limiti di lunghezza.
- Aggiungere il link alla pagina solo quando il modulo è attivo, ad esempio dal testo «Sei una farmacia? Scrivici su WhatsApp» nella home.
