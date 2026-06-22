// METRICGYM — Groq-Proxy (Supabase Edge Function)
// Versteckt den Groq-API-Key serverseitig: Der Browser ruft DIESE Funktion auf,
// die Funktion hängt den geheimen Key an und leitet an Groq weiter (inkl. Streaming).
//
// Secret setzen (einmalig): GROQ_API_KEY = dein gsk_... Key
//   Dashboard → Edge Functions → (Funktion) → Secrets   ODER
//   CLI: supabase secrets set GROQ_API_KEY=gsk_xxx
//
// Deploy: Dashboard → Edge Functions → Deploy new function (Editor)  ODER
//   CLI: supabase functions deploy groq-proxy

const GROQ_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  if (!GROQ_KEY) {
    return new Response(JSON.stringify({ error: { message: "GROQ_API_KEY secret nicht gesetzt" } }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
  try {
    const body = await req.text(); // enthält model/messages/stream vom Client
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body,
    });
    // Antwort 1:1 zurückreichen (funktioniert für JSON UND für SSE-Streaming)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors,
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: String(e) } }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
