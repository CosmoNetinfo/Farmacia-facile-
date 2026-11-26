// Farmacia Vicino: avvisa su Telegram quando arriva un'adesione e permette di approvarla.
// Segreti da impostare: TELEGRAM_BOT_TOKEN, HOOK_SECRET, TELEGRAM_CHAT_ID.
// Va pubblicata con "Verify JWT" disattivato: i pulsanti sono protetti da HOOK_SECRET e dal tuo ID chat.
const env = (name: string) => Deno.env.get(name) ?? "";
const TOKEN = env("TELEGRAM_BOT_TOKEN");
const CHAT = env("TELEGRAM_CHAT_ID");
const SECRET = env("HOOK_SECRET");
const REST = env("SUPABASE_URL") + "/rest/v1/adesioni";
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");

async function telegram(method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Telegram ${method}: ${r.status}`);
}

async function db(query: string, init: RequestInit = {}) {
  const r = await fetch(REST + query, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
  });
  if (!r.ok) throw new Error(`Database: ${r.status}`);
  return await r.json();
}

function text(a: any) {
  return [
    "🏥 Nuova richiesta Farmacia Vicino",
    `${a.pharmacy_name} (ID ${a.pharmacy_id})`,
    a.pharmacy_address,
    a.phone ? `Telefono: ${a.phone}` : "",
    a.site ? `Sito: ${a.site}` : "",
    a.always_open || a.hours_text ? `Orari: ${a.always_open ? "24 ore su 24" : a.hours_text}` : "",
    a.servizi?.length ? `Servizi: ${a.servizi.join(", ")}` : "",
    a.da_sviluppatore ? "Inserita da te (sviluppatore)" : `Inviata da: ${a.referente_nome} (${a.referente_ruolo}), ${a.referente_email}`,
    "Controlla i dati prima di approvare.",
  ].filter(Boolean).join("\n");
}

const notify = (a: any) => telegram("sendMessage", {
  chat_id: CHAT, text: text(a), link_preview_options: { is_disabled: true },
  reply_markup: { inline_keyboard: a.da_sviluppatore ? [
    [{ text: "✅ Attiva", callback_data: `c:${a.id}` }],
    [{ text: "❌ Rifiuta", callback_data: `r:${a.id}` }],
  ] : [
    [{ text: "✅ Approva: dati della farmacia", callback_data: `f:${a.id}` }],
    [{ text: "✅ Approva: visto da CosmoNet", callback_data: `c:${a.id}` }],
    [{ text: "❌ Rifiuta", callback_data: `r:${a.id}` }],
  ] },
});

Deno.serve(async (req) => {
  if (!TOKEN || !SECRET) return new Response("Configurazione mancante", { status: 500 });
  const url = new URL(req.url);

  // Da aprire una volta nel browser: collega il bot a questa funzione (ripeterlo è innocuo).
  if (req.method === "GET" && url.searchParams.has("setup")) {
    await telegram("setWebhook", {
      url: `${env("SUPABASE_URL")}/functions/v1/adesioni-telegram`,
      secret_token: SECRET, allowed_updates: ["message", "callback_query"],
    });
    return new Response("Bot collegato. Scrivi /attesa al bot.");
  }
  if (req.method !== "POST") return new Response("Non autorizzato", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fromTelegram = req.headers.get("x-telegram-bot-api-secret-token") === SECRET;

  // 1) Avviso dal database: arriva solo l'identificativo, i dati si leggono dalla tabella.
  //    Ogni richiesta in attesa viene notificata una volta sola.
  if (!fromTelegram) {
    if (!/^[0-9a-f-]{36}$/.test(body.nuova ?? "")) return new Response("Non autorizzato", { status: 401 });
    if (CHAT) {
      const rows = await db(`?id=eq.${body.nuova}&stato=eq.da_verificare&notificata=is.false`,
        { method: "PATCH", body: JSON.stringify({ notificata: true }) });
      for (const row of rows) await notify(row);
    }
    return new Response("ok");
  }

  // 2) Messaggi al bot.
  const message = body.message;
  if (message) {
    const id = String(message.chat.id);
    if (!CHAT) {
      await telegram("sendMessage", { chat_id: id, text: `Il tuo ID chat è ${id}. Salvalo nel segreto TELEGRAM_CHAT_ID.` });
    } else if (id === CHAT && message.text?.startsWith("/attesa")) {
      const rows = await db("?stato=eq.da_verificare&order=created_at&limit=20");
      if (!rows.length) await telegram("sendMessage", { chat_id: CHAT, text: "Nessuna richiesta in attesa." });
      for (const row of rows) await notify(row);
    }
    return new Response("ok");
  }

  // 3) Pulsanti Approva / Rifiuta: solo dalla tua chat.
  const q = body.callback_query;
  if (q) {
    const match = /^([fcr]):([0-9a-f-]{36})$/.exec(q.data ?? "");
    if (!CHAT || String(q.from.id) !== CHAT || !match) return new Response("ok");
    const [, action, id] = match;
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
    const change = action === "r"
      ? { stato: "rifiutata" }
      : { stato: "approvata", verificata_il: today, verificato_da: action === "f" ? "titolare" : "cosmonet" };
    const rows = await db(`?id=eq.${id}&stato=eq.da_verificare`, { method: "PATCH", body: JSON.stringify(change) });
    const result = !rows.length ? "Richiesta già gestita." : action === "r" ? "❌ Rifiutata." : "✅ Approvata: è nell'app.";
    await telegram("answerCallbackQuery", { callback_query_id: q.id, text: result });
    if (q.message) {
      await telegram("editMessageText", {
        chat_id: CHAT, message_id: q.message.message_id, text: `${q.message.text}\n\n${result}`,
        link_preview_options: { is_disabled: true },
      });
    }
  }
  return new Response("ok");
});
