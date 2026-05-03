// ═══════════════════════════════════════════════════════════════════
// /api/metrio — DIRECT Groq integration (no Flask dependency)
// Primary: qwen/qwen3-32b  →  Fallback: moonshotai/kimi-k2-instruct
//                           →  Fallback: llama-3.3-70b-versatile
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = [
  "qwen/qwen3-32b",
  "moonshotai/kimi-k2-instruct",
  "llama-3.3-70b-versatile",
];

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

function germanDate(): string {
  const d = new Date();
  const days = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
  const months = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const SYSTEM_PROMPT = `Du bist Metrio — ein S-Tier Aktienanalyst auf McKinsey / Goldman Sachs / JP Morgan Niveau.

HEUTIGES DATUM: ${germanDate()} (beziehe dich IMMER auf dieses Datum, nicht auf dein Trainingsdatum)

STIL (STRIKT):
- Antworten strukturiert mit Markdown: ### Überschriften, **fett** für Kernaussagen, nummerierte Listen, Bullet Points
- Klar, präzise, institutionell — keine Plattitüden, kein Smalltalk
- Konkrete Zahlen, Kennzahlen, Peer-Vergleiche wo möglich
- Immer: These → Begründung → Risiken/Gegenargumente → Fazit
- Deutsch, Sie-Form, professionell

/no_think`;

async function callGroq(model: string, messages: any[], apiKey: string) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 1400,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq ${model} HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { response: "GROQ_API_KEY fehlt in .env.local.", source: "error" },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ response: "Ungültiger Request-Body.", source: "error" }, { status: 400 });
  }

  const question: string =
    body?.userMessage ?? body?.question ?? body?.prompt ?? body?.message ?? "";
  const contextType: string = body?.contextType ?? "general_chat";
  const stockData = body?.stockData ?? null;
  const extraContext: string = body?.context ?? "";

  if (!question.trim()) {
    return NextResponse.json({ response: "Keine Frage übergeben.", source: "error" }, { status: 400 });
  }

  // Build rich context block if stockData is provided
  let contextBlock = "";
  if (stockData) {
    const parts: string[] = [];
    if (stockData.symbol) parts.push(`Ticker: ${stockData.symbol}`);
    if (stockData.name) parts.push(`Name: ${stockData.name}`);
    if (stockData.exchange) parts.push(`Börse: ${stockData.exchange}`);
    if (stockData.currency) parts.push(`Währung: ${stockData.currency}`);
    if (stockData.quote?.c !== undefined) parts.push(`Kurs: ${stockData.quote.c} ${stockData.currency ?? ""}`);
    if (stockData.quote?.dp !== undefined) parts.push(`Tagesveränderung: ${stockData.quote.dp}%`);
    if (stockData.profile?.finnhubIndustry) parts.push(`Branche: ${stockData.profile.finnhubIndustry}`);
    if (stockData.profile?.marketCapitalization) parts.push(`MarketCap: ${stockData.profile.marketCapitalization} Mio`);
    contextBlock = parts.join(" · ");
  }
  if (extraContext) contextBlock += (contextBlock ? "\n" : "") + extraContext;

  const userContent = contextBlock
    ? `AKTUELLER KONTEXT: ${contextBlock}\nKONTEXT-TYP: ${contextType}\n\nFRAGE:\n${question}`
    : question;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  let lastErr: string = "";
  for (const model of MODELS) {
    try {
      const raw = await callGroq(model, messages, apiKey);
      const answer = stripThink(raw);
      if (answer) {
        return NextResponse.json({ response: answer, source: "groq", model });
      }
    } catch (e: any) {
      lastErr = e?.message ?? String(e);
      continue;
    }
  }

  return NextResponse.json(
    {
      response: `Metrio ist aktuell überlastet. Bitte erneut versuchen. (${lastErr})`,
      source: "error",
    },
    { status: 503 }
  );
}
