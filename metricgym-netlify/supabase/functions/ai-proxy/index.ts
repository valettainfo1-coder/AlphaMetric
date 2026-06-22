// METRICGYM — KI-Proxy (Supabase Edge Function)
// Versteckt ALLE KI-Keys serverseitig. Der Browser ruft nur diese Funktion auf; sie führt
// die Provider-Kette Gemini → OpenRouter → Groq mit geheimen Keys aus und gibt das Ergebnis
// (Text oder SSE-Stream) zurück. So liegt kein einziger Key mehr im Client.
//
// Secrets setzen (einmalig):
//   supabase secrets set GEMINI_API_KEY=...   OPENROUTER_API_KEY=...   GROQ_API_KEY=...
// Deploy:
//   supabase functions deploy ai-proxy
// Danach in config.js:  useAiProxy: true   (und die Keys dort entfernen)

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const OR_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const GROQ_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";
const OR_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Body = {
  mode?: "complete" | "vision" | "stream";
  system?: string;
  user?: string | { text?: string; images?: string[] };
  history?: { role: string; content: string }[];
  json?: boolean;
  max?: number;
  temp?: number;
};

// dataURL ("data:image/jpeg;base64,…") → Gemini inline_data part
function dataURLpart(u: string) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(u || "");
  return m ? { inline_data: { mime_type: m[1], data: m[2] } } : null;
}

// ---------- Gemini ----------
async function geminiComplete(b: Body): Promise<string> {
  if (!GEMINI_KEY) throw new Error("no gemini key");
  const parts: unknown[] = [];
  if (typeof b.user === "string") parts.push({ text: b.user });
  else {
    if (b.user?.text) parts.push({ text: b.user.text });
    for (const u of b.user?.images ?? []) { const p = dataURLpart(u); if (p) parts.push(p); }
  }
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: b.temp ?? 0.5, maxOutputTokens: b.max ?? 800,
      ...(b.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (b.system) body.systemInstruction = { parts: [{ text: b.system }] };
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    { method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_KEY }, body: JSON.stringify(body) },
  );
  if (!r.ok) throw new Error("Gemini " + r.status + " " + (await r.text()).slice(0, 120));
  const j = await r.json();
  return (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
}

// ---------- OpenAI-kompatibel (OpenRouter / Groq) ----------
function oaiMessages(b: Body) {
  const messages: unknown[] = [];
  if (b.system) messages.push({ role: "system", content: b.system });
  if (typeof b.user === "string") messages.push({ role: "user", content: b.user });
  else {
    const content: unknown[] = [{ type: "text", text: b.user?.text ?? "" }];
    for (const u of b.user?.images ?? []) content.push({ type: "image_url", image_url: { url: u } });
    messages.push({ role: "user", content });
  }
  return messages;
}
async function oaiComplete(url: string, key: string, model: string, extraHeaders: Record<string, string>, b: Body): Promise<string> {
  if (!key) throw new Error("no key");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({
      model, messages: oaiMessages(b), temperature: b.temp ?? 0.5, max_tokens: b.max ?? 800,
      ...(b.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(model + " " + r.status);
  return (await r.json()).choices?.[0]?.message?.content ?? "";
}
const orComplete = (b: Body) =>
  oaiComplete("https://openrouter.ai/api/v1/chat/completions", OR_KEY, OR_MODEL,
    { "HTTP-Referer": "https://metricgym.app", "X-Title": "METRICGYM" }, b);
const groqComplete = (b: Body) =>
  oaiComplete("https://api.groq.com/openai/v1/chat/completions", GROQ_KEY, GROQ_MODEL, {}, b);

// ---------- Provider-Kette ----------
async function chain(b: Body): Promise<{ text: string; provider: string }> {
  const steps: [string, () => Promise<string>][] = [
    ["gemini", () => geminiComplete(b)],
    ["openrouter", () => orComplete(b)],
    ["groq", () => groqComplete(b)],
  ];
  let lastErr: unknown;
  for (const [name, fn] of steps) {
    if (name === "gemini" && !GEMINI_KEY) continue;
    if (name === "openrouter" && !OR_KEY) continue;
    if (name === "groq" && !GROQ_KEY) continue;
    try { return { text: await fn(), provider: name }; } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("Keine KI verfügbar");
}

// ---------- Streaming (Gemini SSE; sonst Voll-Antwort als ein Chunk) ----------
async function streamResponse(b: Body): Promise<Response> {
  // Chat-Verlauf → user-Feld für die Kette nutzen wir nur bei Nicht-Gemini-Fallback.
  const enc = new TextEncoder();
  const sys = b.system ?? "";
  const history = b.history ?? [];
  // Versuch: Gemini-Streaming
  if (GEMINI_KEY) {
    try {
      const contents = history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
        { method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_KEY },
          body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: sys }] }, generationConfig: { temperature: 0.6, maxOutputTokens: 700 } }) },
      );
      if (!r.ok || !r.body) throw new Error("Gemini stream " + r.status);
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      const stream = new ReadableStream({
        async pull(ctrl) {
          const { done, value } = await reader.read();
          if (done) { ctrl.enqueue(enc.encode("data: [DONE]\n\n")); ctrl.close(); return; }
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const ln of lines) {
            const t = ln.trim(); if (!t.startsWith("data:")) continue;
            const d = t.slice(5).trim(); if (!d || d === "[DONE]") continue;
            try {
              const tok = (JSON.parse(d).candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
              if (tok) ctrl.enqueue(enc.encode("data: " + JSON.stringify({ delta: tok }) + "\n\n"));
            } catch { /* skip */ }
          }
        },
      });
      return new Response(stream, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    } catch { /* fällt unten auf Voll-Antwort zurück */ }
  }
  // Fallback ohne Stream: Kette als ein Chunk
  const lastUser = history.length ? history[history.length - 1].content : (typeof b.user === "string" ? b.user : "");
  const res = await chain({ system: sys, user: lastUser, max: 700, temp: 0.6 });
  const body = "data: " + JSON.stringify({ delta: res.text }) + "\n\ndata: [DONE]\n\n";
  return new Response(body, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  if (!GEMINI_KEY && !OR_KEY && !GROQ_KEY) return json({ error: { message: "Keine KI-Secrets gesetzt (GEMINI_API_KEY / OPENROUTER_API_KEY / GROQ_API_KEY)" } }, 500);
  let b: Body;
  try { b = await req.json(); } catch { return json({ error: { message: "Ungültiger Body" } }, 400); }
  try {
    if (b.mode === "stream") return await streamResponse(b);
    const res = await chain(b); // complete + vision
    return json({ text: res.text, provider: res.provider });
  } catch (e) {
    return json({ error: { message: String((e as Error)?.message ?? e) } }, 502);
  }
});
