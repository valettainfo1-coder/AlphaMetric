"""
Metrio AI — Flask Backend powered by Groq (Qwen3 32B / Kimi K2)

POST /ask
  Body: { userMessage, contextType, stockData? }
  Returns: { response, source }
"""

import os
import re
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv

# Load .env.local from project root (one level up)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Primary: Qwen3 32B (cutoff Oct 2024) — best balance of quality + recency
# Fallback: Kimi K2 (cutoff Apr 2025) or Llama 3.3 70B
MODEL = "qwen/qwen3-32b"
FALLBACK_MODELS = ["moonshotai/kimi-k2-instruct", "llama-3.3-70b-versatile"]


def strip_think_tags(text: str) -> str:
    """Remove <think>...</think> blocks from qwen3 responses."""
    return re.sub(r"<think>[\s\S]*?</think>", "", text).strip()


# ─── System prompt builder ───────────────────────────────────────

def build_system_prompt(context_type: str, stock_data: dict | None) -> str:
    stock_context = build_stock_context(stock_data) if stock_data else ""

    # Inject real current date/time so the model never says "I don't know the date"
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%A, %d. %B %Y, %H:%M UTC")

    base = (
        f"AKTUELLES DATUM UND UHRZEIT: {date_str}\n\n"
        "Du bist Metrio, der S-Tier KI-Analyst von AlphaMetric — "
        "vergleichbar mit einem Senior Equity Research Analyst bei Goldman Sachs oder JP Morgan. "
        "Du analysierst Aktien, Portfolios und Märkte auf institutionellem Niveau. "
        "Du sprichst professionelles Deutsch, bist präzise, faktenbasiert und strukturiert. "
        "Du verwendest korrekte deutsche Umlaute (ä, ö, ü, ß). "
        "WICHTIG: Du hast Zugriff auf Echtzeit-Marktdaten, die dir bereitgestellt werden. "
        "Nutze IMMER die bereitgestellten Daten als Faktenbasis. "
        "Sage NIEMALS, dass du keinen Zugriff auf aktuelle Daten hast — die Daten werden dir im Kontext mitgegeben. "
        "Erwähne NIEMALS dein Training-Cutoff-Datum. "
        "Du gibst keine Anlageberatung gemäß § 85 WpHG — "
        "weise bei konkreten Kauf-/Verkaufsempfehlungen darauf hin.\n\n"
        "ANTWORT-STIL: Strukturiere deine Antworten wie ein McKinsey/Goldman Sachs Analyst:\n"
        "- Verwende klare Überschriften mit ### für Abschnitte\n"
        "- Nutze **fett** für Kennzahlen und wichtige Fakten\n"
        "- Nummeriere Hauptpunkte (1. 2. 3.)\n"
        "- Bullet Points (•) für Unterpunkte\n"
        "- Fasse am Ende mit einer klaren Einschätzung zusammen\n"
        "- Halte dich kurz und prägnant — kein Fließtext\n"
        "/no_think"
    )

    if context_type == "metric_explanation":
        return (
            f"{base}\n\nDu erklärst eine einzelne Finanzkennzahl im Kontext "
            "einer bestimmten Aktie. Sei präzise (3-5 Sätze). Nenne Benchmarks, "
            "Branchenvergleiche und was der Wert für diese spezifische Aktie "
            f"bedeutet.\n\n{stock_context}"
        )
    elif context_type == "factor_explanation":
        return (
            f"{base}\n\nDu erklärst einen Faktor aus dem AlphaMetric "
            "8-Faktor-Modell. Erkläre den Score im Kontext der Aktie, nenne "
            "die wichtigsten Treiber und was der Score für die Investmentthese "
            f"bedeutet. 4-6 Sätze.\n\n{stock_context}"
        )
    else:
        return (
            f"{base}\n\nDu beantwortest allgemeine Fragen zur Aktie oder zum Portfolio. "
            "Du hast Zugriff auf Live-Marktdaten. Antworte strukturiert wie ein Top-Analyst, "
            f"verwende Zahlen aus den bereitgestellten Daten.\n\n{stock_context}"
        )


def build_stock_context(s: dict | None) -> str:
    if not s:
        return ""
    lines = []
    symbol = s.get("symbol", "?")
    name = s.get("name") or symbol
    exchange = s.get("exchange", "?")
    currency = s.get("currency", "")

    lines.append(f"═══ AKTIE: {name} ({symbol} · {exchange}) ═══")

    q = s.get("quote")
    if q:
        d = q.get("d", 0)
        dp = q.get("dp", 0)
        sign = "+" if d >= 0 else ""
        sign_p = "+" if dp >= 0 else ""
        lines.append(
            f"Kurs: {q.get('c', '—')} {currency}  |  "
            f"Tagesänderung: {sign}{d} ({sign_p}{dp:.2f}%)"
        )
        lines.append(
            f"Eröffnung: {q.get('o', '—')}  |  Hoch: {q.get('h', '—')}  |  "
            f"Tief: {q.get('l', '—')}  |  Vortag: {q.get('pc', '—')}"
        )

    profile = s.get("profile")
    if profile:
        mcap = profile.get("marketCapitalization")
        if mcap:
            lines.append(f"Marktkapitalisierung: {mcap / 1000:.1f}B {currency}")
        industry = profile.get("finnhubIndustry")
        if industry:
            lines.append(f"Branche: {industry}")

    metrics = s.get("metrics")
    if metrics:
        ml = []
        mapping = [
            ("peBasicExclExtraTTM", "KGV (TTM)", "x", 1, 1),
            ("pbAnnual", "KBV", "x", 1, 2),
            ("evEbitdaTTM", "EV/EBITDA", "x", 1, 1),
            ("roeTTM", "ROE", "%", 100, 1),
            ("netProfitMarginTTM", "Nettomarge", "%", 100, 1),
            ("grossMarginTTM", "Bruttomarge", "%", 100, 1),
            ("beta", "Beta", "", 1, 2),
            ("dividendYieldIndicatedAnnual", "Dividendenrendite", "%", 1, 2),
            ("totalDebt_totalEquityAnnual", "D/E Ratio", "", 0.01, 2),
            ("currentRatioAnnual", "Current Ratio", "", 1, 2),
            ("revenueGrowth3Y", "Umsatzwachstum 3J", "%", 100, 1),
            ("52WeekHigh", "52W-Hoch", "", 1, 0),
            ("52WeekLow", "52W-Tief", "", 1, 0),
        ]
        for key, label, suffix, mult, dec in mapping:
            val = metrics.get(key)
            if val is not None:
                formatted = f"{val * mult:.{dec}f}" if dec > 0 else str(val)
                ml.append(f"{label}: {formatted}{suffix}")
        if ml:
            lines.append("\nKennzahlen:\n" + "\n".join(ml))

    rec = s.get("rec")
    if rec:
        lines.append(
            f"\nAnalysten-Konsens: Strong Buy {rec.get('strongBuy', 0)} | "
            f"Buy {rec.get('buy', 0)} | Hold {rec.get('hold', 0)} | "
            f"Sell {rec.get('sell', 0)} | Strong Sell {rec.get('strongSell', 0)}"
        )

    target = s.get("target")
    if target:
        lines.append(
            f"Kursziel: Mean {target.get('targetMean', '—')} | "
            f"High {target.get('targetHigh', '—')} | "
            f"Low {target.get('targetLow', '—')}"
        )

    return "\n".join(lines)


# ─── /ask endpoint ───────────────────────────────────────────────

@app.route("/ask", methods=["POST"])
def ask():
    body = request.get_json(silent=True) or {}
    user_message = body.get("userMessage", "").strip()

    if not user_message:
        return jsonify({"error": "userMessage ist erforderlich."}), 400

    context_type = body.get("contextType", "general_chat")
    stock_data = body.get("stockData")
    system_prompt = build_system_prompt(context_type, stock_data)

    models_to_try = [MODEL] + FALLBACK_MODELS
    last_error = None

    for model in models_to_try:
        try:
            chat = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.6,
                max_tokens=1024,
            )
            answer = strip_think_tags(chat.choices[0].message.content)
            return jsonify({"response": answer, "source": "groq", "model": model})
        except Exception as e:
            last_error = e
            print(f"[Metrio] {model} failed: {e}, trying next...")
            continue

    print(f"[Metrio] All models failed. Last error: {last_error}")
    return jsonify({
        "error": f"Groq API Fehler: {str(last_error)}",
        "source": "error",
    }), 500


# ─── /vision endpoint (screenshot import) ────────────────────────

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


@app.route("/vision", methods=["POST"])
def vision():
    body = request.get_json(silent=True) or {}
    image_base64 = body.get("imageBase64", "")
    mime_type = body.get("mimeType", "image/png")
    system_prompt = body.get("systemPrompt", "Extrahiere alle Aktien-Positionen aus diesem Screenshot als JSON-Array.")
    user_message = body.get("userMessage", "Extrahiere alle Aktien-Positionen aus diesem Portfolio-Screenshot.")

    if not image_base64:
        return jsonify({"error": "imageBase64 ist erforderlich."}), 400

    try:
        chat = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_message},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}",
                            },
                        },
                    ],
                },
            ],
            temperature=0.1,
            max_tokens=2000,
        )
        answer = strip_think_tags(chat.choices[0].message.content)
        return jsonify({"content": answer, "source": "groq-vision"})
    except Exception as e:
        print(f"[Metrio Vision] Groq error: {e}")
        return jsonify({
            "content": "[]",
            "error": f"Vision-Fehler: {str(e)}",
            "source": "error",
        }), 500


# ─── Health check ────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    has_key = bool(os.environ.get("GROQ_API_KEY"))
    return jsonify({"status": "ok", "model": MODEL, "fallbacks": FALLBACK_MODELS, "apiKey": has_key})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
