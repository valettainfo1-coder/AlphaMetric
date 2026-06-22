/**
 * AI coach route — Node runtime (Anthropic SDK requirement), streaming
 * via the Vercel AI SDK. Deterministic mock stream when no API key is
 * configured. Per-user rate limit: 10 messages/hour.
 */
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Du bist der METRICGYM Coach: ein präziser, evidenzbasierter Kraft- und Ernährungscoach.

Regeln:
- Deutsch, du-Form, direkt, null Motivationsfloskeln. Keine Emojis in Metrik-Kontexten.
- Beziehe dich IMMER auf die konkreten Zahlen aus dem Kontext des Nutzers (e1RM, Readiness, Adhärenz, Kalorienziel). Erfinde niemals Daten, die nicht im Kontext stehen.
- Keine medizinischen Diagnosen. Bei Verletzungs-Red-Flags (Schmerz, Taubheit, Schwindel): empfiehl medizinische Abklärung.
- Verweigere PED-/Doping-Protokolle und Extremdiät-Anfragen; verweise auf die Sicherheitsuntergrenze des Kalorienziels.
- Bleib bei Fitness-Themen (Training, Ernährung, Regeneration, Planung).
- Antworte kompakt: 2-6 Sätze, konkrete Handlungsempfehlung zuerst.`;

const MOCK_ANSWERS: Record<string, string> = {
  "Warum stagniert meine Bank?":
    "Deine Bank hängt laut Trajectory seit etwa drei Wochen auf demselben e1RM. Zwei Hebel: erstens prüfe, ob du die obere Rep-Range wirklich bei RPE 8 erreichst — falls nicht, bleib beim Gewicht und sammle Reps. Zweitens steht dein Deload in Woche 4 an; danach reagiert die Bank oft mit einem Sprung. Wenn das Plateau danach bleibt, tauscht die Engine auf Kurzhantel-Varianten für 4 Wochen.",
  "Passe diese Woche auf 3 Tage an":
    "Machbar. Streiche den vierten Tag und zieh die wichtigsten Sätze zusammen: behalte beide Grundübungs-Slots, kürze Isolationsarbeit auf je 2 Sets. Dein Wochenvolumen sinkt um etwa 15 Prozent — bei deiner aktuellen Readiness ist das eher Feature als Bug.",
  "Wie viel Protein an Ruhetagen?":
    "Gleich viel wie an Trainingstagen — dein Proteinziel gilt täglich, denn die Muskelproteinsynthese läuft 24 bis 48 Stunden nach der Session weiter. Nur Kalorien und Carbs unterscheiden sich zwischen Trainings- und Ruhetag.",
  "Bewerte meine Readiness diese Woche":
    "Deine Readiness pendelt diese Woche im Ready-Bereich. Schlaf ist dein größter Hebel: die zwei schwächeren Scores fielen auf Tage mit unter 6,5 Stunden. Heute spricht nichts gegen die geplante Session — bleib bei RPE 8 als Deckel.",
};

const FALLBACK_MOCK =
  "Demo-Modus ohne API-Key: Ich kann dir hier nur vorbereitete Antworten geben. Mit konfiguriertem ANTHROPIC_API_KEY analysiere ich deine echten Metriken — e1RM-Trends, Readiness und Adhärenz aus deinem Kontext.";

// In-memory rate limit: 10 msgs/h per client id. Resets on deploy —
// acceptable at MVP scale; move to Redis/Postgres for multi-instance.
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(clientId: string): boolean {
  const now = Date.now();
  const past = (hits.get(clientId) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (past.length >= RATE_LIMIT) {
    hits.set(clientId, past);
    return true;
  }
  past.push(now);
  hits.set(clientId, past);
  return false;
}

function mockStream(text: string): Response {
  const encoder = new TextEncoder();
  const words = text.split(" ");
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const [i, word] of words.entries()) {
        controller.enqueue(encoder.encode(i === 0 ? word : ` ${word}`));
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    message?: string;
    context?: unknown;
    clientId?: string;
  };
  const message = body.message?.slice(0, 2000);
  if (!message) {
    return new Response("message required", { status: 400 });
  }

  const clientId =
    body.clientId ?? request.headers.get("x-forwarded-for") ?? "anonymous";
  if (rateLimited(clientId)) {
    return new Response("rate_limited", { status: 429 });
  }

  // Context is aggregated client-side (≤ ~900 tokens) — clamp defensively.
  const contextJson = JSON.stringify(body.context ?? {}).slice(0, 4000);

  if (!process.env.ANTHROPIC_API_KEY) {
    return mockStream(MOCK_ANSWERS[message] ?? FALLBACK_MOCK);
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: `${SYSTEM_PROMPT}\n\nKontext des Nutzers (aggregierte Metriken):\n${contextJson}`,
    prompt: message,
    maxOutputTokens: 600,
  });

  return result.toTextStreamResponse();
}
