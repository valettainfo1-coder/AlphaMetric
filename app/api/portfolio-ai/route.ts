import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// PORTFOLIO AI ENDPOINT — Institutional-Grade Portfolio Analyst
//
// 1. Primary: Groq (Llama 3.3 70B) — DIRECT (no Flask required)
// 2. Fallback: Anthropic → OpenAI → optional Flask → Local heuristic
//
// Flask is fully optional. End-users never need to run Python.
// Deploy only needs GROQ_API_KEY (or ANTHROPIC_API_KEY / OPENAI_API_KEY).
// ═══════════════════════════════════════════════════════════════════

const FLASK_URL = process.env.FLASK_BACKEND_URL || "";

type ChatMsg = { role: string; content: string };

async function callGroqDirect(systemPrompt: string, messages: ChatMsg[], maxTokens: number): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.length < 20) return null;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({
            role: m.role === "assistant" || m.role === "ai" ? "assistant" : "user",
            content: m.content,
          })),
        ],
        temperature: 0.55,
        max_tokens: maxTokens,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content ?? null;
    return typeof txt === "string" && txt.trim().length > 0 ? txt : null;
  } catch {
    return null;
  }
}

async function callGroqViaFlask(systemPrompt: string, messages: ChatMsg[]): Promise<string | null> {
  if (!FLASK_URL) return null;
  try {
    const lastUserMsg = messages.filter(m => m.role === "user").pop()?.content ?? "";
    const res = await fetch(`${FLASK_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userMessage: `${systemPrompt}\n\n---\n\nKonversation:\n${messages.map(m => `${m.role}: ${m.content}`).join("\n")}\n\nBeantworte die letzte Nachricht des Users: ${lastUserMsg}`,
        contextType: "general_chat",
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response ?? null;
  } catch {
    return null;
  }
}

// ── Heuristic local analysis ─────────────────────────────────────
type PortfolioState = {
  positions?: number;
  totalValue?: number;
  cashBalance?: number;
};

function fmtEur(n: number): string {
  return `€${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildHeuristic(state: PortfolioState | undefined, lastUserMsg: string, isFitCheck: boolean, fitCheck?: { symbol?: string; name?: string; sector?: string }): string {
  const posCount = state?.positions ?? 0;
  const totalVal = state?.totalValue ?? 0;
  const cash = state?.cashBalance ?? 0;
  const cashPct = totalVal > 0 ? (cash / totalVal) * 100 : (cash > 0 ? 100 : 0);

  if (isFitCheck && fitCheck) {
    return [
      `**Fit-Check: ${fitCheck.symbol ?? ""} ${fitCheck.name ? `(${fitCheck.name})` : ""}**`,
      "",
      `Dein Portfolio hat aktuell **${posCount} Positionen** bei einem Gesamtwert von **${fmtEur(totalVal)}**.`,
      "",
      `**Diversifikations-Regeln (institutionell):**`,
      `• Einzelposition: max. 10–15% pro Titel (bei < 20 Positionen eher 5–8%).`,
      `• Sektor: max. 25–30% pro Sektor${fitCheck.sector ? ` — prüfe ob ${fitCheck.sector} bereits übergewichtet ist` : ""}.`,
      `• Region: USA-Allokation zwischen 40–70% empfohlen, Europa 20–40%.`,
      `• Cash-Quote: 5–15% für Opportunitäten gesund; aktuell **${cashPct.toFixed(1)}%**.`,
      "",
      `**Verdikt (Heuristik):** ${posCount < 10 ? "VORSICHT ⚠️ — Portfolio noch zu klein, jede neue Position hat hohe Auswirkung" : "NEUTRAL ⚖️ — weitere Einzelaktie nur mit klarem These-Argument"}.`,
      "",
      `_Hinweis: Detaillierte Korrelations-/Beta-Analyse wird aktiviert sobald GROQ_API_KEY / ANTHROPIC_API_KEY gesetzt ist._`,
      "",
      `⚠️ Keine Anlageberatung. § 85 WpHG.`,
    ].join("\n");
  }

  // Generic portfolio chat
  const intents = {
    rebalance: /rebalanc|umschicht|verteil/i.test(lastUserMsg),
    risk:      /risiko|beta|volatil|drawdown|crash/i.test(lastUserMsg),
    income:    /dividend|income|cashflow|ausschüttung/i.test(lastUserMsg),
    tax:       /steuer|tax|fifo|teilfreistellung/i.test(lastUserMsg),
    diversify: /diversif|konzentr|klumpen|sektor|region/i.test(lastUserMsg),
  };

  const header = posCount > 0
    ? `**Portfolio-Snapshot:** ${posCount} Positionen · ${fmtEur(totalVal)} Gesamtwert · Cash-Quote **${cashPct.toFixed(1)}%**`
    : `Dein Portfolio ist noch leer. Füge Positionen über das Trading-Terminal hinzu.`;

  const blocks: string[] = [header, ""];

  if (posCount === 0) {
    blocks.push(
      `**Einstieg mit System:**`,
      `1. Definiere deinen **Horizont** (< 3 Jahre = wenig Aktien; 10+ Jahre = Aktienquote 70–90%).`,
      `2. Starte mit **3–5 Welt-ETFs** als Kern (MSCI World, FTSE All-World, Emerging Markets).`,
      `3. Ergänze 3–8 **Einzeltitel** nach Qualitätskriterien (ROIC > 15%, FCF-Marge > 15%, Nettoverschuldung moderat).`,
      `4. Halte **5–15% Cash** als Opportunitäts-Reserve.`,
    );
  } else {
    // Diversification guidance
    if (posCount < 8) {
      blocks.push(`• **Konzentration:** Mit nur ${posCount} Positionen hast du ein hohes Idiosynkratisches Risiko. Institutioneller Richtwert: 15–25 Positionen für stabile Diversifikation.`);
    } else if (posCount > 40) {
      blocks.push(`• **Overdiversifikation:** ${posCount} Positionen erschweren Überwachung. Ab ~30 Titeln nähert sich das Portfolio einem ETF an — prüfe ob Einzeltitel wirklich Alpha liefern.`);
    } else {
      blocks.push(`• **Anzahl Positionen:** ${posCount} ist im gesunden Bereich (15–30).`);
    }

    if (cashPct < 3) blocks.push(`• **Cash-Quote:** ${cashPct.toFixed(1)}% ist sehr niedrig — keine Reserve für Nachkäufe bei Korrekturen.`);
    else if (cashPct > 25) blocks.push(`• **Cash-Quote:** ${cashPct.toFixed(1)}% ist hoch — Renditeopportunität wird verpasst.`);
    else blocks.push(`• **Cash-Quote:** ${cashPct.toFixed(1)}% ist ein gesunder Puffer.`);

    // Intent-specific
    if (intents.risk) {
      blocks.push("", `**Risiko-Check:** Portfolio-Beta ideal zwischen 0.8–1.1. Drawdown-Ziel: max. 25% in einem Krisen-Jahr. Prüfe in der Portfolio-Analyse die Sektor- und FX-Exposure.`);
    }
    if (intents.diversify) {
      blocks.push("", `**Diversifikations-Guardrails:** Max 25% pro Sektor, 15% pro Einzeltitel, 70% pro Region (USA oft Ausnahme bis 75%).`);
    }
    if (intents.rebalance) {
      blocks.push("", `**Rebalancing-Regel:** Jährlich oder bei Abweichung > 5 %-Punkte vom Ziel. Tax-effizient: zuerst neue Cashflows in unterallokierte Bereiche, dann erst verkaufen.`);
    }
    if (intents.income) {
      blocks.push("", `**Einkommens-Portfolio:** Ziel-Ausschüttungsquote 2–4% netto. Achte auf **Dividenden-Kontinuität ≥ 10 Jahre** und **Payout Ratio < 70%**. Steuerlich: Teilfreistellung bei Aktien-ETFs 30%.`);
    }
    if (intents.tax) {
      blocks.push("", `**Steuern (DE):** Teilfreistellung 30% bei Aktien-ETFs (> 51% Aktien), 15% bei Misch-ETFs (≥ 25%). FIFO gilt beim Verkauf. Verlustverrechnung Aktien ↔ Aktien nur untereinander.`);
    }
  }

  blocks.push(
    "",
    `_Für tiefergehende KI-Analyse (Sektorkorrelationen, Stress-Tests, Alpha-Attribution) setze \`GROQ_API_KEY\` in der Serverumgebung — sofort aktiv, kein Python nötig._`,
    "",
    `⚠️ Keine Anlageberatung. Nur zur Finanzbildung. § 85 WpHG.`,
  );

  return blocks.join("\n");
}

// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { systemPrompt, messages, portfolioState, fitCheck, mode, imageBase64 } = body;

    // ── SCREENSHOT IMPORT MODE: Groq Vision, direct ─────────────
    if (mode === "screenshot_import" && imageBase64) {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        return NextResponse.json({ content: "[]", error: "GROQ_API_KEY fehlt in .env.local" });
      }
      const mime = (body.mimeType || "image/png").replace("image/jpg", "image/jpeg");
      const dataUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:${mime};base64,${imageBase64}`;

      const systemText =
        systemPrompt ||
        `Du bist ein Portfolio-Daten-Extraktor. Analysiere den Screenshot eines Broker-Portfolios (Trade Republic, Scalable, ING, Comdirect, Consorsbank, DKB etc.) und extrahiere ALLE Aktien/ETF-Positionen.

Gib NUR ein JSON-Array zurück, jedes Element mit:
- "symbol": Ticker (z.B. "AAPL", "MSFT", "SAP.DE") — wenn kein Ticker sichtbar, leite ihn aus dem Firmennamen ab
- "name": Firmenname
- "shares": Anzahl Anteile als Zahl (falls nicht erkennbar: 1)

Beispiel: [{"symbol":"AAPL","name":"Apple Inc.","shares":8},{"symbol":"SAP.DE","name":"SAP SE","shares":12}]

WICHTIG: Nur das JSON-Array, keine Erklärung, kein Markdown. Wenn du keine Positionen erkennst, gib [] zurück. Shares MUSS eine Zahl sein.`;

      const VISION_MODELS = [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
      ];

      const userPayload = {
        role: "user" as const,
        content: [
          { type: "text", text: "Extrahiere alle Aktien-/ETF-Positionen aus diesem Portfolio-Screenshot. NUR JSON-Array." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      };

      let lastErr = "";
      for (const model of VISION_MODELS) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemText },
                userPayload,
              ],
              temperature: 0.1,
              max_tokens: 1800,
            }),
          });
          if (!res.ok) {
            lastErr = `${model}: HTTP ${res.status}`;
            continue;
          }
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content ?? "";
          if (content) {
            return NextResponse.json({ content, source: `groq-vision:${model.split("/").pop()}` });
          }
        } catch (e: unknown) {
          lastErr = `${model}: ${e instanceof Error ? e.message : "fetch failed"}`;
          continue;
        }
      }
      return NextResponse.json({
        content: "[]",
        error: `Vision-Modelle nicht erreichbar: ${lastErr}`,
      });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ content: "Keine Nachricht erhalten." });
    }

    // ── FIT-CHECK MODE ──────────────────────────────────────────
    const isFitCheck = !!fitCheck;
    const fitCheckSystemPrompt = isFitCheck
      ? `${systemPrompt}

SPECIAL MODE: FIT-CHECK
The user is considering adding a new stock to their portfolio. Analyze:
1. Does this stock fit the existing portfolio? Check sector concentration.
2. Would it increase or decrease diversification?
3. Currency/geographic risk impact.
4. Quick verdict: PASST GUT ✅, NEUTRAL ⚠️, or VORSICHT ❌

Keep it concise — max 6 sentences. Be specific about the numbers.
Stock being considered: ${fitCheck.symbol} (${fitCheck.name}, Sektor: ${fitCheck.sector}, Börse: ${fitCheck.exchange})`
      : systemPrompt;

    const effectiveSystemPrompt = isFitCheck ? fitCheckSystemPrompt : systemPrompt;
    const maxTokens = isFitCheck ? 450 : 1500;

    // ── 1) Groq direct (primary) ─────────────────────────────────
    const groqDirect = await callGroqDirect(effectiveSystemPrompt, messages, maxTokens);
    if (groqDirect) {
      return NextResponse.json({ content: groqDirect, source: "groq-direct" });
    }

    // ── 2) Anthropic ─────────────────────────────────────────────
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && anthropicKey.length > 20) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:  "POST",
          headers: {
            "Content-Type":      "application/json",
            "x-api-key":         anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model:      process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
            max_tokens: maxTokens,
            system:     effectiveSystemPrompt,
            messages:   messages.map((m: ChatMsg) => ({
              role:    m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.content
            ?.map((block: { type: string; text?: string }) =>
              block.type === "text" ? block.text : ""
            )
            .filter(Boolean)
            .join("\n") ?? "";
          if (text) return NextResponse.json({ content: text, source: "anthropic" });
        }
      } catch { /* fall through */ }
    }

    // ── 3) OpenAI-compatible ─────────────────────────────────────
    const openaiKey = process.env.OPENAI_API_KEY;
    const apiBase = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
    if (openaiKey && openaiKey.length > 10) {
      try {
        const res = await fetch(`${apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model:       process.env.AI_MODEL || "gpt-4o-mini",
            messages:    [
              { role: "system", content: effectiveSystemPrompt },
              ...messages,
            ],
            temperature: 0.55,
            max_tokens:  maxTokens,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return NextResponse.json({ content: text, source: "openai" });
        }
      } catch { /* fall through */ }
    }

    // ── 4) Optional Flask (only if explicitly configured) ───────
    if (FLASK_URL) {
      const flaskResult = await callGroqViaFlask(effectiveSystemPrompt, messages);
      if (flaskResult) return NextResponse.json({ content: flaskResult, source: "flask" });
    }

    // ── 5) Heuristic local fallback — NEVER tells user to run Python
    const lastUser = messages.filter((m: ChatMsg) => m.role === "user").pop()?.content ?? "";
    const heuristic = buildHeuristic(portfolioState as PortfolioState | undefined, lastUser, isFitCheck, fitCheck);
    return NextResponse.json({ content: heuristic, source: "heuristic" });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    // Always return 200 with content so the chat UI can render something useful.
    return NextResponse.json(
      { content: `Metrio Heuristik aktiv (Backend-Fallback). ${msg}`, source: "error-fallback" },
      { status: 200 },
    );
  }
}
