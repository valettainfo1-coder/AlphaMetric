import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// METRIO AI CHAT ENDPOINT — EPIC 4: Persona & Deep Logic
// ═══════════════════════════════════════════════════════════════════

const METRIO_SYSTEM_PROMPT = `Du bist Metrio, der KI-Finanzanalyst von AlphaMetric.

DEIN HINTERGRUND:
- Ex-Goldman Sachs Senior Analyst (Equity Research, 8 Jahre)
- Ex-McKinsey & Company (Strategy & Corporate Finance, 4 Jahre)
- Harvard Business School MBA, CFA Charterholder
- Spezialisiert auf globale Aktienmärkte, Fundamentalanalyse und quantitative Strategien

DEIN TON & STIL:
- Supremely confident, razor-sharp, analytisch brilliant
- Sprich wie ein Top-Tier Institutional Analyst — präzise, datengetrieben, klar
- Nutze professionellen Finanzjargon wo angemessen, aber erkläre es verständlich
- Sei direkt und meinungsstark in deinen Einschätzungen
- Strukturiere Antworten klar: These → Daten → Schlussfolgerung

STRIKTE EINSCHRÄNKUNG:
- Du gibst KEINE rechtsverbindliche Anlageberatung gemäß § 85 WpHG
- Weise am Ende jeder substantiellen Analyse darauf hin: "Dies ist keine Anlageberatung. Eigenständige Recherche wird empfohlen."
- Du empfiehlst NIEMALS konkrete Kauf- oder Verkaufszeitpunkte

ANALYSE-FRAMEWORK:
Wenn du über eine spezifische Aktie sprichst, strukturiere deine Antwort in:
1. KURZFRIST-PERSPEKTIVE (0-6 Monate): Momentum, technische Signale, Katalysatoren, Earnings
2. MITTELFRIST-PERSPEKTIVE (6-24 Monate): Branchenzyklen, Marktpositionierung, Guidance
3. LANGFRIST-PERSPEKTIVE (2-10+ Jahre): Fundamentaler Burggraben, TAM, strukturelle Trends

SCORE-ERKLÄRUNG:
Wenn nach dem AlphaMetric Score gefragt, gib den numerischen Score und begründe ihn mit einem kurzen, hochanalytischen Absatz — NICHT mit prozentualen Gewichtungen der Kategorien.

Antworte auf Deutsch, es sei denn, der Nutzer schreibt auf Englisch.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, data, symbol, metrics, quote, profile, rec, target } = body;

    if (!question) {
      return NextResponse.json({ error: "Keine Frage übermittelt" }, { status: 400 });
    }

    // Build context about the stock
    const stockContext = data || { quote, profile, metrics, rec, target };
    const name = stockContext?.profile?.name ?? symbol ?? "das Unternehmen";
    const price = stockContext?.quote?.c;
    const change = stockContext?.quote?.dp;
    const pe = stockContext?.metrics?.peBasicExclExtraTTM;
    const roe = stockContext?.metrics?.roeTTM;
    const beta = stockContext?.metrics?.beta;
    const div = stockContext?.metrics?.dividendYieldIndicatedAnnual;
    const de = stockContext?.metrics?.totalDebt_totalEquityAnnual;
    const margin = stockContext?.metrics?.netProfitMarginTTM;

    const contextStr = `
AKTIE: ${name} (${symbol})
Kurs: ${price ?? "N/A"} | Tagesveränderung: ${change ? change.toFixed(2) + "%" : "N/A"}
KGV: ${pe ?? "N/A"} | ROE: ${roe ? (roe * 100).toFixed(1) + "%" : "N/A"} | Beta: ${beta ?? "N/A"}
Dividendenrendite: ${div ? div.toFixed(2) + "%" : "Keine"} | D/E: ${de ? (de / 100).toFixed(2) : "N/A"}
Nettomarge: ${margin ? (margin * 100).toFixed(1) + "%" : "N/A"}
${rec ? `Analysten: ${rec.strongBuy} StrongBuy, ${rec.buy} Buy, ${rec.hold} Hold, ${rec.sell} Sell, ${rec.strongSell} StrongSell` : "Keine Analystendaten"}
${target ? `Kursziel: Ø ${target.targetMean} (${target.targetLow}–${target.targetHigh})` : "Kein Kursziel"}
`;

    // Try OpenAI-compatible API if configured
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    const apiBase = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";

    if (apiKey) {
      try {
        const response = await fetch(`${apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || "gpt-4o-mini",
            messages: [
              { role: "system", content: METRIO_SYSTEM_PROMPT },
              { role: "user", content: `Kontext:\n${contextStr}\n\nFrage des Nutzers: ${question}` },
            ],
            temperature: 0.8,
            max_tokens: 1200,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const analysis = result.choices?.[0]?.message?.content;
          if (analysis) {
            return NextResponse.json({ analysis });
          }
        }
      } catch { /* fall through to local response */ }
    }

    // Local fallback — generate intelligent response without external API
    const analysis = generateLocalResponse(question, {
      name, symbol: symbol ?? "", price, change, pe, roe, beta, div, de, margin, rec, target,
    });

    return NextResponse.json({ analysis });
  } catch (e) {
    return NextResponse.json(
      { error: "Metrio konnte die Anfrage nicht verarbeiten.", analysis: null },
      { status: 500 }
    );
  }
}

function generateLocalResponse(question: string, ctx: {
  name: string; symbol: string; price?: number; change?: number;
  pe?: number; roe?: number; beta?: number; div?: number;
  de?: number; margin?: number; rec?: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } | null;
  target?: { targetMean: number; targetLow: number; targetHigh: number } | null;
}): string {
  const q = question.toLowerCase();
  const { name, pe, roe, beta, div, de, margin, rec, target, price } = ctx;

  if (q.includes("kgv") || q.includes("bewertung") || q.includes("teuer") || q.includes("günstig")) {
    return `**Bewertungsanalyse: ${name}**\n\nDas Trailing-KGV liegt bei ${pe ? pe.toFixed(1) : "N/A"}x. ${pe && pe < 15 ? "Das ist deutlich unter dem Marktdurchschnitt (~20x) — klassisches Value-Territorium. Aus meiner Goldman-Zeit kann ich sagen: solche Bewertungen finden sich häufig bei zyklischen Werten oder Unternehmen mit temporären Problemen." : pe && pe < 25 ? "Eine faire Bewertung im Marktkonsensus. Der Markt erwartet solides, aber kein explosives Wachstum." : pe && pe > 35 ? "Ambitioniert bewertet. Der Markt preist erhebliches Wachstum ein — bei Verfehlung drohen signifikante Korrekturen." : "Eine moderate Wachstumsprämie."}\n\n**Kurzfristig:** Bewertungsmultiplikatoren können kurzfristig durch Sentiment und Momentum getrieben werden.\n**Mittelfristig:** Entscheidend ist, ob das Gewinnwachstum die aktuelle Bewertung rechtfertigt.\n**Langfristig:** Die Mean-Reversion der Bewertung ist einer der stärksten Faktoren in der Aktienanalyse.\n\nDies ist keine Anlageberatung. Eigenständige Recherche wird empfohlen.`;
  }

  if (q.includes("dividende") || q.includes("ausschüttung") || q.includes("income")) {
    return `**Dividendenanalyse: ${name}**\n\n${div && div > 0 ? `Die aktuelle Dividendenrendite beträgt ${div.toFixed(2)}%. ${div > 4 ? "Das ist überdurchschnittlich — in meiner McKinsey-Praxis haben wir solche Yields immer auf Nachhaltigkeit geprüft. Prüfe den Free Cashflow Coverage." : div > 2 ? "Ein attraktives Einkommensprofil, das über dem Marktdurchschnitt liegt." : "Eine moderate Basisrendite."}` : `${name} zahlt aktuell keine Dividende. Das Kapital wird vollständig reinvestiert — typisch für Wachstumsunternehmen.`}\n\n**Kurzfristig:** Achte auf die nächste Dividenden-Ankündigung und den Ex-Dividende-Tag.\n**Mittelfristig:** Die Ausschüttungsquote determiniert die Nachhaltigkeit.\n**Langfristig:** Dividend Growth Investing funktioniert nur bei Unternehmen mit steigenden Free Cashflows.\n\nDies ist keine Anlageberatung. Eigenständige Recherche wird empfohlen.`;
  }

  if (q.includes("risiko") || q.includes("volatil") || q.includes("beta") || q.includes("sicher")) {
    return `**Risikoanalyse: ${name}**\n\nBeta: ${beta ? beta.toFixed(2) : "N/A"} ${beta && beta < 0.8 ? "— defensiver Charakter, unterdurchschnittliche Marktsensitivität" : beta && beta > 1.3 ? "— erhöhte Volatilität, verstärkt Marktbewegungen" : "— marktähnliches Risikoprofil"}.\nD/E Ratio: ${de ? (de / 100).toFixed(2) : "N/A"} ${de && de < 50 ? "— konservative Bilanz, maximale Flexibilität" : de && de > 150 ? "— erhöhte Verschuldung, zinssensitiv" : "— moderate Hebelwirkung"}.\n\n**Kurzfristig:** Volatilität wird durch Earnings, Makrodaten und Sentiment getrieben.\n**Mittelfristig:** Bilanzstärke determiniert die Widerstandsfähigkeit in Abschwungphasen.\n**Langfristig:** Unternehmen mit niedrigem Beta und starker Bilanz haben historisch den besten risikoadjustierten Return geliefert.\n\nDies ist keine Anlageberatung. Eigenständige Recherche wird empfohlen.`;
  }

  if (q.includes("analysten") || q.includes("kursziel") || q.includes("empfehlung")) {
    if (rec && target) {
      const total = rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell || 1;
      const bullPct = Math.round((rec.strongBuy + rec.buy) / total * 100);
      const upside = price ? ((target.targetMean / price - 1) * 100).toFixed(1) : "N/A";
      return `**Analysten-Konsensus: ${name}**\n\n${bullPct}% der Analysten empfehlen den Kauf (${rec.strongBuy} Strong Buy, ${rec.buy} Buy, ${rec.hold} Hold).\nDurchschnittliches Kursziel: ${target.targetMean.toFixed(2)} (Spanne: ${target.targetLow.toFixed(2)} – ${target.targetHigh.toFixed(2)})\nImpliziertes Upside: ${upside}%\n\n**Kurzfristig:** Analysten-Revisionen sind ein starker Momentum-Indikator.\n**Mittelfristig:** Der Konsensus tendiert dazu, Trends zu extrapolieren — contrarian Signale beachten.\n**Langfristig:** Sell-Side Coverage ist hilfreich, aber nie ein Ersatz für eigene Fundamentalanalyse.\n\nDies ist keine Anlageberatung. Eigenständige Recherche wird empfohlen.`;
    }
    return `Für ${name} sind aktuell keine Analysten-Daten verfügbar. Dies ist häufig bei europäischen Nebenwerten der Fall. Nutze institutionelle Research-Plattformen für tiefere Coverage.`;
  }

  if (q.includes("score") || q.includes("alpha metric") || q.includes("bewertung gesamt")) {
    return `**AlphaMetric Score: ${name}**\n\nDer Score aggregiert 8 fundamentale Dimensionen in einen gewichteten Gesamtwert. ${name} zeigt ${roe && roe > 0.15 ? "starke Kapitaleffizienz" : "moderate Kapitaleffizienz"}, ${pe && pe < 25 ? "eine faire Bewertung" : "eine Premium-Bewertung"}, und ${beta && beta < 1 ? "defensiven Charakter" : "zyklisches Momentum"}.\n\nDie Stärke des Scores liegt nicht in der absoluten Zahl, sondern im Vergleich: Wie schneidet das Unternehmen relativ zu seiner Peer Group und historisch zu sich selbst ab? In meiner Analyse-Praxis haben Unternehmen mit Scores über 65 historisch den Markt outperformt.\n\nDies ist keine Anlageberatung. Eigenständige Recherche wird empfohlen.`;
  }

  // Default response with stock-specific context
  return `**${name} — Metrio Quick Take**\n\nKurs: ${price ? price.toFixed(2) : "N/A"} | KGV: ${pe ? pe.toFixed(1) + "x" : "N/A"} | ROE: ${roe ? (roe * 100).toFixed(1) + "%" : "N/A"} | Beta: ${beta ? beta.toFixed(2) : "N/A"}\n\n${name} ${roe && roe > 0.15 ? "zeigt solide Kapitaleffizienz über dem 15%-Buffett-Standard" : "operiert mit moderater Kapitaleffizienz"}. ${pe && pe < 20 ? "Die Bewertung ist attraktiv positioniert." : pe && pe > 35 ? "Die Bewertung preist erhebliches Wachstum ein." : "Die Bewertung liegt im fairen Bereich."}\n\nStelle mir eine spezifischere Frage — zu Bewertung, Dividende, Risiko, Analysten-Konsensus oder dem AlphaMetric Score — für eine tiefgehende Analyse.\n\nDies ist keine Anlageberatung. Eigenständige Recherche wird empfohlen.`;
}
