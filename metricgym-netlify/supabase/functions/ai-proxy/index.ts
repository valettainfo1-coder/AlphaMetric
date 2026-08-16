/* METRICGYM ai-proxy — Supabase Edge Function.
   Aufgaben: (1) API-Keys bleiben serverseitig, (2) NUR angemeldete Nutzer
   (JWT-Pflicht), (3) Tier-Prüfung via my_tier() + Tageslimit (ai_usage),
   (4) Provider-Kette Gemini → OpenRouter → Groq, (5) Antwort-Kontrakt der
   App: {text} bzw. SSE-Zeilen `data:{"delta":"…"}`; Fehler: {error:{message}}.

   Deploy:
     supabase functions deploy ai-proxy
     supabase secrets set GEMINI_API_KEY=… OPENROUTER_API_KEY=… GROQ_API_KEY=…
   SQL (Tabellen/RPC): siehe SUPABASE_SETUP.md Abschnitt 4. */

import { createClient } from "npm:@supabase/supabase-js@2";

const LIMITS: Record<string, number> = { free: 5, pro: 60, elite: 200 };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: { message: "POST erwartet" } }, 405);

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // 1) JWT-Pflicht: der anon-Key allein reicht NICHT (sonst zahlt der Betreiber
  //    für anonyme Aufrufe). getUser() validiert das Token serverseitig.
  const asUser = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: { message: "Bitte melde dich an, um den Coach zu nutzen." } }, 401);

  // 2) Tier vom Server (elite_accounts + subscriptions) — niemals vom Client.
  let tier = "free";
  try {
    const { data } = await asUser.rpc("my_tier");
    if (data === "pro" || data === "elite") tier = data;
  } catch (_) { /* RPC fehlt → free */ }

  // 3) Tageslimit (Service-Role umgeht RLS; Tabelle ai_usage).
  const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const day = new Date().toISOString().slice(0, 10);
  const { data: row } = await admin.from("ai_usage")
    .select("count").eq("user_id", user.id).eq("day", day).maybeSingle();
  const used = row?.count ?? 0;
  const limit = LIMITS[tier] ?? LIMITS.free;
  if (used >= limit) {
    const msg = tier === "free"
      ? `Tageslimit erreicht (${limit} Coach-Antworten im FREE-Plan). Mit PRO sind es ${LIMITS.pro} pro Tag.`
      : "Tageslimit erreicht — morgen geht es weiter.";
    return json({ error: { message: msg } }, 429, { "Retry-After": "86400" });
  }
  await admin.from("ai_usage").upsert({ user_id: user.id, day, count: used + 1 });

  // 4) Request der App entgegennehmen.
  let body: any;
  try { body = await req.json(); } catch { return json({ error: { message: "Ungültiger Request" } }, 400); }
  const { mode = "complete", system = "", user: userMsg = "", history = [], json: wantJson = false, max, temp } = body;

  const GEMINI = Deno.env.get("GEMINI_API_KEY") ?? "";
  const OPENROUTER = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  const GROQ = Deno.env.get("GROQ_API_KEY") ?? "";
  const CEREBRAS = Deno.env.get("CEREBRAS_API_KEY") ?? "";
  const OR_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";
  const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
  /* Cerebras-Standardmodell: gemma-4-31b. Gegen die Alternativen gemessen
     (je 3 Läufe, gleicher Prompt):
       gemma-4-31b    ⌀ 599 ms · JSON-Modus liefert valides JSON
       gpt-oss-120b   ⌀ 660 ms · JSON-Modus liefert LEER — das Reasoning
                                 verbraucht das Token-Budget vor der Antwort
       zai-glm-4.7      langsam · 828 Token ohne jeden Inhalt
     Die App braucht kurze Antworten und strukturiertes JSON (Ernährungs-
     Erkennung), deshalb das schlanke Modell ohne Reasoning-Overhead.
     Ein Reasoning-Modell hier nur mit deutlich höherem max_tokens setzen. */
  const CB_MODEL = Deno.env.get("CEREBRAS_MODEL") ?? "gemma-4-31b";
  const CB_URL = "https://api.cerebras.ai/v1/chat/completions";

  // ---- Provider-Adapter --------------------------------------------------
  const geminiComplete = async (): Promise<string> => {
    const parts: any[] = [];
    if (typeof userMsg === "object" && userMsg?.images?.length) {
      for (const img of userMsg.images) {
        const m = /^data:(.+?);base64,(.+)$/.exec(img);
        if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
      }
      parts.push({ text: userMsg.text ?? "" });
    } else parts.push({ text: String(userMsg) });
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            maxOutputTokens: max ?? 1024, temperature: temp ?? 0.7,
            ...(wantJson ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    if (!r.ok) throw new Error(`gemini ${r.status}`);
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error("gemini leer");
    return text;
  };

  const openaiCompatComplete = async (url: string, key: string, model: string): Promise<string> => {
    const content = (typeof userMsg === "object" && userMsg?.text != null) ? userMsg.text : String(userMsg);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, max_tokens: max ?? 1024, temperature: temp ?? 0.7,
        ...(wantJson ? { response_format: { type: "json_object" } } : {}),
        messages: [{ role: "system", content: system }, { role: "user", content }],
      }),
    });
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("leer");
    return text;
  };

  // SSE-Stream im App-Kontrakt: data:{"delta":"…"}
  const openaiCompatStream = async (url: string, key: string, model: string): Promise<Response> => {
    const msgs = [{ role: "system", content: system },
      ...history.map((h: any) => ({ role: h.role === "user" ? "user" : "assistant", content: h.text ?? h.content ?? "" }))];
    const up = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, stream: true, temperature: temp ?? 0.7, messages: msgs }),
    });
    if (!up.ok || !up.body) throw new Error(`${url} ${up.status}`);
    const reader = up.body.getReader();
    const enc = new TextEncoder(); const dec = new TextDecoder();
    let buf = "";
    const stream = new ReadableStream({
      async pull(ctrl) {
        const { done, value } = await reader.read();
        if (done) { ctrl.enqueue(enc.encode("data: [DONE]\n\n")); ctrl.close(); return; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const ln of lines) {
          const t = ln.trim();
          if (!t.startsWith("data:")) continue;
          const d = t.slice(5).trim();
          if (!d || d === "[DONE]") continue;
          try {
            const delta = JSON.parse(d)?.choices?.[0]?.delta?.content ?? "";
            if (delta) ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          } catch { /* Teilzeile */ }
        }
      },
      cancel() { reader.cancel(); },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", ...CORS } });
  };

  // ---- Modus-Routing mit Fallback-Kette ----------------------------------
  try {
    if (mode === "stream") {
      const chain: Array<() => Promise<Response>> = [];
      // Cerebras zuerst: gemessen ⌀ 599 ms gegen ⌀ 1.147 ms bei Groq (je 3 Läufe).
      // Das SSE-Format ist identisch (choices[0].delta.content) — kein eigener Adapter.
      if (CEREBRAS) chain.push(() => openaiCompatStream(CB_URL, CEREBRAS, CB_MODEL));
      if (GROQ) chain.push(() => openaiCompatStream("https://api.groq.com/openai/v1/chat/completions", GROQ, GROQ_MODEL));
      if (OPENROUTER) chain.push(() => openaiCompatStream("https://openrouter.ai/api/v1/chat/completions", OPENROUTER, OR_MODEL));
      let last: unknown;
      for (const fn of chain) { try { return await fn(); } catch (e) { last = e; } }
      throw last ?? new Error("kein Stream-Provider konfiguriert");
    }
    // complete / vision
    const chain: Array<() => Promise<string>> = [];
    // Cerebras hat KEINEN Bild-Eingang — im Vision-Modus bleibt Gemini der einzige Weg.
    if (CEREBRAS && mode !== "vision") chain.push(() => openaiCompatComplete(CB_URL, CEREBRAS, CB_MODEL));
    if (GEMINI) chain.push(geminiComplete);
    if (OPENROUTER && mode !== "vision") chain.push(() => openaiCompatComplete("https://openrouter.ai/api/v1/chat/completions", OPENROUTER, OR_MODEL));
    if (GROQ && mode !== "vision") chain.push(() => openaiCompatComplete("https://api.groq.com/openai/v1/chat/completions", GROQ, GROQ_MODEL));
    let last: unknown;
    for (const fn of chain) { try { return json({ text: await fn() }); } catch (e) { last = e; } }
    throw last ?? new Error("kein Provider konfiguriert");
  } catch (e) {
    return json({ error: { message: "KI derzeit nicht erreichbar — versuch es gleich noch einmal. (" + String((e as Error)?.message ?? e).slice(0, 80) + ")" } }, 502);
  }
});
