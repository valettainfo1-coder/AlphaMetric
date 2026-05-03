"use client";
// ═══════════════════════════════════════════════════════════════════
// /stock/[symbol] — GOLDMAN SACHS–LEVEL STOCK DASHBOARD
//
// Round 3 Rebuild:
//   1. Scroll-to-top fix, proper German umlauts (ä,ö,ü,ß)
//   2. Core metrics panel RIGHT of TradingView chart + "Frag Metrio" per metric
//   3. 8-Factor Quant Model (institutional categories) + "Frag Metrio" per box
//   4. Alpha Score semi-circle gauge + Bull/Bear signals + deep-dive accordion
//   5. Metrio Chat UI with "[Aktie] jetzt analysieren" quick-action
//   6. All Metrio AI calls → /api/metrio (Groq/Llama backend)
//
// DOES NOT TOUCH: exchange-registry, ticker resolution, portfolio logic
// ═══════════════════════════════════════════════════════════════════

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import {
  Send, TrendingUp, TrendingDown, ChevronLeft, ChevronDown, ChevronUp,
  Brain, Star, Plus, BookmarkPlus,
  Shield, BarChart2, Zap, Target, DollarSign,
  Users, Lock, Activity, PieChart, AlertTriangle,
  TrendingUp as Growth,
  Info, X,
} from "lucide-react";
import { resolveEntry, EXCHANGES, type MIC } from "@/lib/exchange-registry";
import { formatMetrio } from "@/utils/formatMetrio";
import Footer from "@/components/Footer";

// ─── TYPES ─────────────────────────────────────────────────────
interface StockData {
  quote:   { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number };
  profile: { name: string; currency: string; exchange: string; finnhubIndustry?: string; logo?: string; country?: string; marketCapitalization?: number };
  metrics: Record<string, number | undefined>;
  rec:     { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number } | null;
  target:  { targetMean?: number; targetHigh?: number; targetLow?: number } | null;
  tvSymbol: string;
  displaySymbol: string;
  exchange: string;
  currency: string;
  region?: string;
  sector?: string;
  dataSource: string;
}

interface ChatMsg { role: "user" | "ai"; text: string }

const fmt = (v: number | undefined, d = 2) => (typeof v === "number" && !isNaN(v)) ? v.toFixed(d) : "—";

const formatPrice = (v: number | undefined, cur: string) => {
  if (v === undefined || isNaN(v)) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(v);
};

// ═══════════════════════════════════════════════════════════════════
// SCORING ENGINE — 8-Factor Quant Model (Goldman Sachs categories)
// ═══════════════════════════════════════════════════════════════════

interface FactorResult {
  key: string;
  label: string;
  labelEn: string;
  score: number;
  icon: string;
  summary: string;
  bullish: string[];
  bearish: string[];
}

interface ScoreResult {
  total: number;
  label: string;
  summary: string;
  factors: FactorResult[];
  bullSignals: string[];
  bearSignals: string[];
}

function computeAlphaScore(m: Record<string, number | undefined>, rec: StockData["rec"], target: StockData["target"], quote: StockData["quote"]): ScoreResult {
  const bullSignals: string[] = [];
  const bearSignals: string[] = [];

  // ── 1. Valuation Multiples
  const pe = m.peBasicExclExtraTTM;
  let valScore = 50;
  const valBull: string[] = [];
  const valBear: string[] = [];
  if (pe && pe > 0) {
    valScore = pe < 10 ? 92 : pe < 14 ? 78 : pe < 18 ? 62 : pe < 25 ? 44 : pe < 35 ? 28 : 12;
    if (pe < 14) valBull.push(`KGV ${pe.toFixed(1)}x unter Branchenmedian`);
    if (pe > 30) valBear.push(`KGV ${pe.toFixed(1)}x signalisiert hohe Erwartungen`);
  }
  const pb = m.pbAnnual;
  if (pb && pb > 0) {
    const pbScore = pb < 1.0 ? 88 : pb < 2.0 ? 72 : pb < 3.5 ? 52 : pb < 6 ? 32 : 15;
    valScore = Math.round(valScore * 0.6 + pbScore * 0.4);
    if (pb < 1.5) valBull.push(`KBV ${pb.toFixed(2)}x — unter Buchwert`);
    if (pb > 5) valBear.push(`KBV ${pb.toFixed(2)}x — hohe Prämie`);
  }
  const evEbitda = m.evEbitdaTTM;
  if (evEbitda && evEbitda > 0) {
    const evScore = evEbitda < 8 ? 85 : evEbitda < 12 ? 68 : evEbitda < 18 ? 48 : evEbitda < 25 ? 30 : 14;
    valScore = Math.round(valScore * 0.65 + evScore * 0.35);
  }
  const valSummary = valScore >= 70 ? "Attraktive Bewertungsmultiples relativ zum Sektor." : valScore >= 45 ? "Fair bewertet — keine klare Unter- oder Überbewertung." : "Premium-Bewertung — aggressive Wachstumserwartungen eingepreist.";

  // ── 2. Earnings Quality
  const roe = m.roeTTM ? m.roeTTM * 100 : undefined;
  let eqScore = 48;
  const eqBull: string[] = [];
  const eqBear: string[] = [];
  if (roe) {
    eqScore = roe > 30 ? 93 : roe > 20 ? 76 : roe > 12 ? 58 : roe > 5 ? 38 : 18;
    if (roe > 20) { eqBull.push(`ROE ${roe.toFixed(1)}% — überlegene Kapitalrendite`); bullSignals.push(`ROE ${roe.toFixed(1)}% überdurchschnittlich`); }
    if (roe < 8) eqBear.push(`ROE nur ${roe.toFixed(1)}% — schwache Ertragskraft`);
  }
  const epsGr = m.epsGrowth3Y ? m.epsGrowth3Y * 100 : undefined;
  if (epsGr) {
    const epsScore = epsGr > 25 ? 88 : epsGr > 12 ? 70 : epsGr > 0 ? 50 : epsGr > -10 ? 30 : 12;
    eqScore = Math.round(eqScore * 0.55 + epsScore * 0.45);
    if (epsGr > 15) eqBull.push(`EPS-Wachstum ${epsGr.toFixed(1)}% p.a.`);
    if (epsGr < 0) eqBear.push(`EPS rückläufig: ${epsGr.toFixed(1)}% p.a.`);
  }
  const eqSummary = eqScore >= 70 ? "Hohe Ertragsqualität — stabiles, wachsendes Ergebnis." : eqScore >= 45 ? "Solide Ertragslage im Rahmen des Sektordurchschnitts." : "Schwächere Ertragsqualität — Gewinnstabilität hinterfragen.";

  // ── 3. Price Momentum
  const w52h = m["52WeekHigh"];
  const w52l = m["52WeekLow"];
  let momScore = 50;
  const momBull: string[] = [];
  const momBear: string[] = [];
  if (w52h && w52l && quote.c) {
    const range = w52h - w52l || 1;
    const pos = (quote.c - w52l) / range;
    momScore = pos > 0.9 ? 88 : pos > 0.75 ? 74 : pos > 0.5 ? 55 : pos > 0.3 ? 38 : 18;
    if (pos > 0.8) { momBull.push(`Nahe 52-Wochen-Hoch (${(pos * 100).toFixed(0)}%)`); bullSignals.push("Kurs nahe 52W-Hoch"); }
    if (pos < 0.25) { momBear.push(`Nahe 52-Wochen-Tief (${(pos * 100).toFixed(0)}%)`); bearSignals.push("Kurs nahe 52W-Tief"); }
  }
  if (quote.dp) {
    const dayScore = quote.dp > 3 ? 82 : quote.dp > 1 ? 68 : quote.dp > 0 ? 55 : quote.dp > -1 ? 42 : quote.dp > -3 ? 28 : 15;
    momScore = Math.round(momScore * 0.7 + dayScore * 0.3);
  }
  const momSummary = momScore >= 70 ? "Starkes Kursmomentum — Aufwärtstrend intakt." : momScore >= 45 ? "Neutrales Momentum — Seitwärtsbewegung." : "Schwaches Momentum — Abwärtsdruck beobachten.";

  // ── 4. Profitability & Margins
  const netMargin = m.netProfitMarginTTM ? m.netProfitMarginTTM * 100 : undefined;
  const grossMargin = m.grossMarginTTM ? m.grossMarginTTM * 100 : undefined;
  let profScore = 50;
  const profBull: string[] = [];
  const profBear: string[] = [];
  if (grossMargin) {
    profScore = grossMargin > 70 ? 91 : grossMargin > 50 ? 75 : grossMargin > 35 ? 58 : grossMargin > 20 ? 40 : 22;
    if (grossMargin > 60) profBull.push(`Bruttomarge ${grossMargin.toFixed(1)}% — starke Preissetzungsmacht`);
    if (grossMargin < 25) profBear.push(`Bruttomarge nur ${grossMargin.toFixed(1)}%`);
  }
  if (netMargin) {
    const nmScore = netMargin > 25 ? 90 : netMargin > 15 ? 73 : netMargin > 8 ? 55 : netMargin > 3 ? 35 : 15;
    profScore = Math.round(profScore * 0.5 + nmScore * 0.5);
    if (netMargin > 15) { profBull.push(`Nettomarge ${netMargin.toFixed(1)}% — effiziente Wertschöpfung`); bullSignals.push(`Nettomarge ${netMargin.toFixed(1)}%`); }
    if (netMargin < 5) bearSignals.push(`Niedrige Nettomarge ${netMargin.toFixed(1)}%`);
  }
  const profSummary = profScore >= 70 ? "Exzellente Profitabilität — starke Margen über dem Sektor." : profScore >= 45 ? "Akzeptable Margenniveaus im Branchenkontext." : "Margendruck — operative Effizienz verbessern.";

  // ── 5. Balance Sheet Health
  const de = m.totalDebt_totalEquityAnnual ? m.totalDebt_totalEquityAnnual / 100 : undefined;
  let bsScore = 55;
  const bsBull: string[] = [];
  const bsBear: string[] = [];
  if (de !== undefined) {
    bsScore = de < 0.2 ? 92 : de < 0.5 ? 78 : de < 0.8 ? 62 : de < 1.3 ? 44 : de < 2.0 ? 28 : 12;
    if (de < 0.4) bsBull.push(`D/E ${de.toFixed(2)} — konservative Bilanz`);
    if (de > 1.5) { bsBear.push(`D/E ${de.toFixed(2)} — hohe Verschuldung`); bearSignals.push("Hohe Fremdfinanzierung"); }
  }
  const cr = m.currentRatioAnnual;
  if (cr) {
    const crScore = cr > 2.5 ? 85 : cr > 1.8 ? 72 : cr > 1.2 ? 55 : cr > 0.8 ? 35 : 15;
    bsScore = Math.round(bsScore * 0.6 + crScore * 0.4);
    if (cr > 2) bsBull.push(`Current Ratio ${cr.toFixed(2)} — hohe Liquidität`);
    if (cr < 1) bsBear.push(`Current Ratio ${cr.toFixed(2)} — Liquiditätsrisiko`);
  }
  const bsSummary = bsScore >= 70 ? "Gesunde Bilanz — niedrige Verschuldung, gute Liquidität." : bsScore >= 45 ? "Akzeptable Bilanzstruktur — Verschuldung im Normalbereich." : "Angespannte Bilanz — Zinsrisiko bei steigenden Zinsen.";

  // ── 6. Capital Allocation
  const divY = m.dividendYieldIndicatedAnnual;
  let capScore = 50;
  const capBull: string[] = [];
  const capBear: string[] = [];
  if (divY && divY > 0) {
    capScore = divY > 4 ? 60 : divY > 2.5 ? 72 : divY > 1.5 ? 65 : 50;
    const payout = m.payoutRatioTTM ? m.payoutRatioTTM * 100 : undefined;
    if (payout) {
      const payScore = payout < 40 ? 88 : payout < 60 ? 72 : payout < 80 ? 50 : payout < 100 ? 28 : 10;
      capScore = Math.round(capScore * 0.5 + payScore * 0.5);
      if (payout < 50) capBull.push(`Ausschüttungsquote ${payout.toFixed(0)}% — nachhaltig`);
      if (payout > 90) { capBear.push(`Ausschüttungsquote ${payout.toFixed(0)}% — kaum Spielraum`); bearSignals.push("Hohe Ausschüttungsquote"); }
    }
    if (divY > 2) { capBull.push(`Dividendenrendite ${divY.toFixed(2)}%`); bullSignals.push(`${divY.toFixed(2)}% Dividendenrendite`); }
  } else {
    capScore = 40;
    capBear.push("Keine Dividende — reines Wachstumsunternehmen");
  }
  const revGr = m.revenueGrowth3Y ? m.revenueGrowth3Y * 100 : undefined;
  if (revGr) {
    const reinvScore = revGr > 20 ? 85 : revGr > 10 ? 70 : revGr > 5 ? 55 : revGr > 0 ? 40 : 25;
    capScore = Math.round(capScore * 0.6 + reinvScore * 0.4);
    if (revGr > 12) capBull.push(`Umsatzwachstum ${revGr.toFixed(1)}% — effektive Reinvestition`);
  }
  const capSummary = capScore >= 70 ? "Effiziente Kapitalallokation — Balance aus Wachstum und Ausschüttung." : capScore >= 45 ? "Durchschnittliche Kapitalallokation — Potenzial zur Optimierung." : "Suboptimale Kapitalverwendung — Strategie hinterfragen.";

  // ── 7. Macro Sensitivity
  const beta = m.beta;
  let macroScore = 55;
  const macroBull: string[] = [];
  const macroBear: string[] = [];
  if (beta) {
    macroScore = beta < 0.6 ? 85 : beta < 0.9 ? 72 : beta < 1.1 ? 58 : beta < 1.4 ? 42 : beta < 1.8 ? 28 : 15;
    if (beta < 0.8) macroBull.push(`Beta ${beta.toFixed(2)} — defensiv, geringe Marktkorrelation`);
    if (beta > 1.3) { macroBear.push(`Beta ${beta.toFixed(2)} — erhöhte Zyklik`); bearSignals.push(`Hohes Beta ${beta.toFixed(2)}`); }
  }
  // Market cap as stability proxy
  const mcap = m.marketCapitalization;
  if (mcap) {
    const mcapScore = mcap > 200 ? 80 : mcap > 50 ? 68 : mcap > 10 ? 52 : mcap > 2 ? 38 : 22;
    macroScore = Math.round(macroScore * 0.65 + mcapScore * 0.35);
    if (mcap > 100) macroBull.push("Large-Cap — geringeres Makrorisiko");
  }
  const macroSummary = macroScore >= 70 ? "Geringe Makrosensitivität — defensives Risikoprofil." : macroScore >= 45 ? "Moderate Makroexposition — typisch für den Sektor." : "Hohe Makrosensitivität — stark zyklisch.";

  // ── 8. Downside Risk
  let dsScore = 55;
  const dsBull: string[] = [];
  const dsBear: string[] = [];
  // Analyst sentiment
  const total = (rec?.strongBuy ?? 0) + (rec?.buy ?? 0) + (rec?.hold ?? 0) + (rec?.sell ?? 0) + (rec?.strongSell ?? 0);
  if (total > 0) {
    const bullPct = ((rec?.strongBuy ?? 0) + (rec?.buy ?? 0)) / total * 100;
    const bearPct = ((rec?.sell ?? 0) + (rec?.strongSell ?? 0)) / total * 100;
    dsScore = bullPct > 75 ? 82 : bullPct > 55 ? 68 : bearPct > 30 ? 28 : 50;
    if (bullPct > 60) { dsBull.push(`${bullPct.toFixed(0)}% Kaufempfehlungen`); bullSignals.push(`Analystenurteil: ${bullPct.toFixed(0)}% positiv`); }
    if (bearPct > 25) { dsBear.push(`${bearPct.toFixed(0)}% Verkaufsempfehlungen`); bearSignals.push(`${bearPct.toFixed(0)}% der Analysten negativ`); }
  }
  // Upside to target
  if (target?.targetMean && quote.c) {
    const upside = (target.targetMean / quote.c - 1) * 100;
    const tgtScore = upside > 25 ? 85 : upside > 15 ? 72 : upside > 5 ? 58 : upside > -5 ? 42 : upside > -15 ? 28 : 12;
    dsScore = Math.round(dsScore * 0.5 + tgtScore * 0.5);
    if (upside > 10) { dsBull.push(`+${upside.toFixed(1)}% Upside zum Konsens-Kursziel`); bullSignals.push(`+${upside.toFixed(1)}% zum Kursziel`); }
    if (upside < -5) { dsBear.push(`${upside.toFixed(1)}% Downside zum Kursziel`); bearSignals.push(`Kurs über Kursziel`); }
  }
  const dsSummary = dsScore >= 70 ? "Geringes Abwärtsrisiko — Analysten mehrheitlich positiv." : dsScore >= 45 ? "Moderates Risikoprofil — gemischte Signale." : "Erhöhtes Abwärtsrisiko — Vorsicht geboten.";

  const factors: FactorResult[] = [
    { key: "valuation",     label: "Valuation Multiples",   labelEn: "Valuation",           score: valScore,   icon: "target",    summary: valSummary,   bullish: valBull,   bearish: valBear },
    { key: "earnings",      label: "Earnings Quality",      labelEn: "Earnings",            score: eqScore,    icon: "bar",       summary: eqSummary,    bullish: eqBull,    bearish: eqBear },
    { key: "momentum",      label: "Price Momentum",        labelEn: "Momentum",            score: momScore,   icon: "zap",       summary: momSummary,   bullish: momBull,   bearish: momBear },
    { key: "profitability", label: "Profitability & Margins",labelEn: "Profitability",       score: profScore,  icon: "pie",       summary: profSummary,  bullish: profBull,  bearish: profBear },
    { key: "balance",       label: "Balance Sheet Health",  labelEn: "Balance Sheet",       score: bsScore,    icon: "shield",    summary: bsSummary,    bullish: bsBull,    bearish: bsBear },
    { key: "capital",       label: "Capital Allocation",    labelEn: "Cap. Allocation",     score: capScore,   icon: "dollar",    summary: capSummary,   bullish: capBull,   bearish: capBear },
    { key: "macro",         label: "Macro Sensitivity",     labelEn: "Macro Exposure",      score: macroScore, icon: "activity",  summary: macroSummary, bullish: macroBull, bearish: macroBear },
    { key: "downside",      label: "Downside Risk",         labelEn: "Risk Assessment",     score: dsScore,    icon: "alert",     summary: dsSummary,    bullish: dsBull,    bearish: dsBear },
  ];

  // ── Generate comprehensive bull/bear signals from ALL factors ──
  // Each factor with score >= 58 contributes a bull signal, <= 42 a bear signal
  for (const f of [
    { score: valScore, bull: valBull, bear: valBear, name: "Bewertung" },
    { score: eqScore, bull: eqBull, bear: eqBear, name: "Ertragsqualität" },
    { score: momScore, bull: momBull, bear: momBear, name: "Momentum" },
    { score: profScore, bull: profBull, bear: profBear, name: "Profitabilität" },
    { score: bsScore, bull: bsBull, bear: bsBear, name: "Bilanzstärke" },
    { score: capScore, bull: capBull, bear: capBear, name: "Kapitalallokation" },
    { score: macroScore, bull: macroBull, bear: macroBear, name: "Makro" },
    { score: dsScore, bull: dsBull, bear: dsBear, name: "Risiko" },
  ]) {
    if (f.score >= 58 && f.bull.length > 0 && !bullSignals.includes(f.bull[0])) {
      bullSignals.push(f.bull[0]);
    } else if (f.score >= 58) {
      bullSignals.push(`${f.name}: Score ${f.score}/100 — positiv`);
    }
    if (f.score <= 42 && f.bear.length > 0 && !bearSignals.includes(f.bear[0])) {
      bearSignals.push(f.bear[0]);
    } else if (f.score <= 42) {
      bearSignals.push(`${f.name}: Score ${f.score}/100 — Schwäche`);
    }
  }
  // Ensure at least 1 signal each even for perfectly neutral stocks
  if (bullSignals.length === 0) {
    const best = [valScore, eqScore, momScore, profScore, bsScore, capScore, macroScore, dsScore];
    const bestIdx = best.indexOf(Math.max(...best));
    const names = ["Bewertung", "Ertragsqualität", "Momentum", "Profitabilität", "Bilanzstärke", "Kapitalallokation", "Makrostabilität", "Risikoprofil"];
    bullSignals.push(`${names[bestIdx]} relativ am stärksten (${best[bestIdx]}/100)`);
  }
  if (bearSignals.length === 0) {
    const all = [valScore, eqScore, momScore, profScore, bsScore, capScore, macroScore, dsScore];
    const worstIdx = all.indexOf(Math.min(...all));
    const names = ["Bewertung", "Ertragsqualität", "Momentum", "Profitabilität", "Bilanzstärke", "Kapitalallokation", "Makrostabilität", "Risikoprofil"];
    bearSignals.push(`${names[worstIdx]} relativ am schwächsten (${all[worstIdx]}/100)`);
  }

  const scores = factors.map(f => f.score);
  // Weighted average: valuation and profitability weighted higher
  const weights = [1.2, 1.1, 0.9, 1.15, 1.0, 0.95, 0.85, 1.0];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const totalScore = Math.round(scores.reduce((sum, s, i) => sum + s * weights[i], 0) / totalWeight);
  const label = totalScore >= 80 ? "Sehr Stark" : totalScore >= 65 ? "Stark" : totalScore >= 50 ? "Neutral" : totalScore >= 35 ? "Schwach" : "Sehr Schwach";

  // Deduplicate signals
  const uniqueBull = [...new Set(bullSignals)].slice(0, 5);
  const uniqueBear = [...new Set(bearSignals)].slice(0, 5);

  // Build human-readable summary explaining WHY this score
  const strongFactors = factors.filter(f => f.score >= 65).map(f => f.label);
  const weakFactors = factors.filter(f => f.score <= 35).map(f => f.label);
  const neutralFactors = factors.filter(f => f.score > 35 && f.score < 65);
  let summary = "";
  if (totalScore >= 75) {
    summary = `Starkes Gesamtbild: ${strongFactors.slice(0, 3).join(", ")} punkten deutlich. ${weakFactors.length > 0 ? `Lediglich ${weakFactors[0]} zeigt Schwächen.` : "Keine signifikanten Schwachstellen."}`;
  } else if (totalScore >= 55) {
    summary = `Gemischtes Bild. ${strongFactors.length > 0 ? `Stärken bei ${strongFactors.slice(0, 2).join(" und ")}.` : ""} ${weakFactors.length > 0 ? `${weakFactors.slice(0, 2).join(" und ")} unter Druck.` : ""} ${neutralFactors.length >= 4 ? "Die meisten Faktoren liegen im neutralen Bereich — keine klare Richtung." : ""}`.trim();
  } else if (totalScore >= 40) {
    summary = `Unterdurchschnittlich. ${weakFactors.length > 0 ? `${weakFactors.slice(0, 2).join(", ")} belasten den Score.` : "Mehrere Faktoren im unteren Mittelfeld."} ${strongFactors.length > 0 ? `Positiv: ${strongFactors[0]}.` : "Keine herausragenden Stärken."}`;
  } else {
    summary = `Deutliche Schwächen in ${weakFactors.slice(0, 3).join(", ")}. ${strongFactors.length > 0 ? `Einziger Lichtblick: ${strongFactors[0]}.` : "Kaum positive Signale."} Vorsicht geboten.`;
  }

  return { total: totalScore, label, summary, factors, bullSignals: uniqueBull, bearSignals: uniqueBear };
}

function scoreColor(score: number): string {
  if (score >= 75) return "#10b981";
  if (score >= 60) return "#22c55e";
  if (score >= 45) return "#f59e0b";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

function ScoreIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const props = { size, strokeWidth: 2 };
  switch (icon) {
    case "target":   return <Target {...props} />;
    case "bar":      return <BarChart2 {...props} />;
    case "zap":      return <Zap {...props} />;
    case "pie":      return <PieChart {...props} />;
    case "shield":   return <Shield {...props} />;
    case "dollar":   return <DollarSign {...props} />;
    case "activity": return <Activity {...props} />;
    case "alert":    return <AlertTriangle {...props} />;
    default:         return <BarChart2 {...props} />;
  }
}

// ═══════════════════════════════════════════════════════════════════
// "FRAG METRIO" BUTTON — calls Groq via /api/metrio
// ═══════════════════════════════════════════════════════════════════

function FragMetrioButton({
  label, contextType, question, stockData, compact = false,
}: {
  label?: string;
  contextType: "metric_explanation" | "factor_explanation";
  question: string;
  stockData: StockData;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (loading) return;
    if (answer) { setOpen(v => !v); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch("/api/metrio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: question,
          contextType,
          stockData: {
            symbol: stockData.displaySymbol,
            name: stockData.profile.name,
            exchange: stockData.exchange,
            currency: stockData.currency,
            quote: stockData.quote,
            profile: stockData.profile,
            metrics: stockData.metrics,
            rec: stockData.rec,
            target: stockData.target,
          },
        }),
      });
      const json = await res.json();
      setAnswer(json.response || json.error || "Keine Antwort.");
    } catch {
      setAnswer("Verbindungsfehler — bitte erneut versuchen.");
    }
    setLoading(false);
  };

  return (
    <div>
      <button onClick={ask} style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: compact ? "4px 10px" : "6px 12px",
        borderRadius: 8, border: "1px solid #e0e7ff",
        background: open ? "#eef2ff" : "#f8faff",
        cursor: "pointer", fontFamily: "inherit",
        fontSize: compact ? 10 : 11, fontWeight: 700,
        color: "#4338ca", transition: "all 0.15s",
      }}>
        <Brain size={compact ? 10 : 12} />
        {label || "Frag Metrio"}
        {loading && <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>}
      </button>
      {open && answer && (
        <div style={{
          marginTop: 8, padding: "12px 14px",
          background: "var(--am-card-soft)", border: "1px solid var(--am-border)",
          borderRadius: 10, fontSize: 12, lineHeight: 1.7,
          color: "var(--am-text-secondary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <Brain size={11} color="var(--am-accent)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--am-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Metrio AI</span>
          </div>
          <span dangerouslySetInnerHTML={{ __html: formatMetrio(answer) }} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRADINGVIEW WIDGET
// ═══════════════════════════════════════════════════════════════════

function TradingViewChart({ tvSymbol }: { tvSymbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Viele europäische / regulierte Venues erlauben in TradingView nur D/W/M.
  // Für diese Exchanges Intraday ausblenden und D als Default nutzen.
  const INTRADAY_BLOCKED = /^(XETR|FWB|SWB|TRADEGATE|GETTEX|DUS|BER|HAM|MUN|STU|SIX|EBR|LSE|LSIN|AMS|MIL|WSE|OMX|BIST|BMV|TADAWUL|BVMF|JSE|BSE|NSE|KRX|TSE|HKEX|SSE|SZSE)[:-]/i;
  const isIntradayBlocked = INTRADAY_BLOCKED.test(tvSymbol);
  const [tf, setTf] = useState<string>(isIntradayBlocked ? "D" : "15");

  // Falls das Symbol wechselt (z.B. User öffnet andere Aktie), Intervall neu setzen
  useEffect(() => {
    if (isIntradayBlocked && ["1", "5", "15", "60", "240"].includes(tf)) {
      setTf("D");
    }
  }, [tvSymbol, isIntradayBlocked, tf]);

  // Observe theme changes — rebuild widget when user toggles Light/Dark
  useEffect(() => {
    if (typeof document === "undefined") return;
    const read = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current || !tvSymbol) return;
    const container = ref.current;
    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tf,
      timezone: "Europe/Berlin",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: "de_DE",
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      backgroundColor: isDark ? "rgba(10, 11, 16, 0)" : "rgba(255, 255, 255, 0)",
      gridColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
      toolbar_bg: isDark ? "#0a0b10" : "#ffffff",
      withdateranges: true,
      details: false,
      hotlist: false,
      studies_overrides: {},
    });
    container.appendChild(script);
    return () => { container.innerHTML = ""; };
  }, [tvSymbol, tf, isDark]);

  const INTERVALS_FULL = [
    { k: "1",   l: "1m"  },
    { k: "5",   l: "5m"  },
    { k: "15",  l: "15m" },
    { k: "60",  l: "1h"  },
    { k: "240", l: "4h"  },
    { k: "D",   l: "1D"  },
    { k: "W",   l: "1W"  },
    { k: "M",   l: "1M"  },
  ];
  const INTERVALS_EOD_ONLY = [
    { k: "D", l: "1D" },
    { k: "W", l: "1W" },
    { k: "M", l: "1M" },
  ];
  const INTERVALS = isIntradayBlocked ? INTERVALS_EOD_ONLY : INTERVALS_FULL;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, flexWrap: "wrap",
      }}>
        <div style={{
          display: "inline-flex", gap: 2, padding: 3,
          background: "var(--am-card-soft)",
          border: "1px solid var(--am-border)",
          borderRadius: 10,
        }}>
          {INTERVALS.map((iv) => {
            const active = tf === iv.k;
            return (
              <button
                key={iv.k}
                onClick={() => setTf(iv.k)}
                style={{
                  padding: "5px 11px", borderRadius: 7, border: "none",
                  background: active ? "var(--am-card)" : "transparent",
                  color: active ? "var(--am-text)" : "var(--am-text-muted)",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: "-0.01em",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                  transition: "all 0.14s",
                }}
              >
                {iv.l}
              </button>
            );
          })}
        </div>
        <span style={{
          fontSize: 10.5, color: "var(--am-text-faint)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
          letterSpacing: "-0.005em",
        }}>
          TradingView · Live · {isDark ? "Dark" : "Light"}
        </span>
      </div>
      <div
        ref={ref}
        style={{
          height: 460, width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--am-card)",
          border: "1px solid var(--am-border)",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ALPHA SCORE SEMI-CIRCLE GAUGE (SVG)
// ═══════════════════════════════════════════════════════════════════

function AlphaGauge({ score }: { score: number }) {
  const r = 80;
  const cx = 100;
  const cy = 95;
  const circumference = Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - pct);
  const gaugeColor = score >= 71 ? "#10b981" : score >= 41 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="200" height="120" viewBox="0 0 200 120">
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round"
      />
      {/* Red zone */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#fef2f2" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${circumference * 0.4} ${circumference * 0.6}`}
      />
      {/* Yellow zone */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#fffbeb" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${circumference * 0.7} ${circumference * 0.3}`}
        strokeDashoffset={`-${circumference * 0.4}`}
      />
      {/* Score arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={gaugeColor} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
      />
      {/* Labels */}
      <text x={cx - r - 4} y={cy + 16} fontSize="10" fill="#9ca3af" textAnchor="middle">0</text>
      <text x={cx} y={cy - r + 4} fontSize="10" fill="#9ca3af" textAnchor="middle">50</text>
      <text x={cx + r + 4} y={cy + 16} fontSize="10" fill="#9ca3af" textAnchor="middle">100</text>
      {/* Score */}
      <text x={cx} y={cy - 10} fontSize="36" fontWeight="900" fill={gaugeColor} textAnchor="middle" dominantBaseline="middle">
        {score}
      </text>
      <text x={cx} y={cy + 14} fontSize="11" fontWeight="600" fill="#9ca3af" textAnchor="middle">
        / 100
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOMENTUM MINI — Short summary inside price header card
// ═══════════════════════════════════════════════════════════════════

function MomentumMini({ data, symbol }: { data: StockData; symbol: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    const q = data.quote;
    const dp = q.dp ?? 0;
    const direction = dp >= 0 ? "gestiegen" : "gefallen";
    const prompt = `Die Aktie ${data.profile.name} (${symbol}) ist heute ${direction} um ${Math.abs(dp).toFixed(2)}%. Kurs: ${q.c} ${data.currency}. Vortag: ${q.pc}.

Gib eine EINZIGE Zeile (max 25 Wörter): Was ist heute mit der Aktie passiert und warum? Kurz und knapp, wie eine Bloomberg-Schlagzeile. Kein Disclaimer.`;

    fetch("/api/metrio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: prompt, contextType: "general_chat", stockData: { symbol, name: data.profile.name, exchange: data.exchange, currency: data.currency, quote: data.quote, profile: data.profile } }),
    })
      .then(r => r.json())
      .then(j => setSummary(j.response || null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && !summary) return null;

  const dp = data.quote.dp ?? 0;
  const isUp = dp >= 0;

  const accentColor = isUp ? "var(--am-green-text)" : "var(--am-red-text)";
  const accentBg = isUp ? "var(--am-green-bg)" : "var(--am-red-bg)";
  const accentBorder = isUp ? "rgba(34,197,94,0.25)" : "rgba(248,113,113,0.25)";

  return (
    <div style={{
      marginTop: 16, padding: "14px 16px",
      background: "var(--am-card-soft)",
      border: `1px solid var(--am-border)`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 12,
      display: "flex", alignItems: "flex-start", gap: 12,
      maxWidth: 560,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isUp ? <TrendingUp size={16} color={accentColor} /> : <TrendingDown size={16} color={accentColor} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--am-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Metrio AI · Tageseinordnung
          </span>
          <span style={{ fontSize: 9, color: accentColor, background: accentBg, padding: "2px 7px", borderRadius: 4, fontWeight: 800, border: `1px solid ${accentBorder}` }}>
            {isUp ? "+" : ""}{dp.toFixed(2)}%
          </span>
          <span style={{ fontSize: 9, color: "var(--am-text-faint)", marginLeft: "auto" }}>
            {new Date().toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, border: "2px solid var(--am-border)", borderTopColor: accentColor, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 12, color: "var(--am-text-muted)" }}>Metrio analysiert die Tagesdynamik...</span>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--am-text-secondary)", lineHeight: 1.6 }}>
            <span dangerouslySetInnerHTML={{ __html: formatMetrio(summary || "") }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOMENTUM-ANALYSE — Tagesaktuelle Einordnung via Metrio AI
// ═══════════════════════════════════════════════════════════════════

function MomentumAnalyse({ data, symbol }: { data: StockData; symbol: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const loadedSummary = useRef(false);

  // KURZ — 2-3 Sätze, nur das Wichtigste
  const loadSummary = async () => {
    if (loadedSummary.current) return;
    loadedSummary.current = true;
    setLoadingSummary(true);
    try {
      const q = data.quote;
      const dp = q.dp ?? 0;
      const direction = dp >= 0 ? "gestiegen" : "gefallen";
      const prompt = `Die Aktie ${data.profile.name} (${symbol}) ist heute ${direction} um ${Math.abs(dp).toFixed(2)}%. Kurs: ${q.c} ${data.currency}. Sektor: ${data.profile.finnhubIndustry || "n/a"}.

Schreibe GENAU 2-3 knackige Sätze auf Deutsch, die den heutigen Tag einordnen:
- Satz 1: Der Kerngrund der Bewegung (Mikro ODER Makro, was relevanter ist)
- Satz 2-3: Gesamtkontext (Sektor, Index, Makro-Faktor)

KEINE Markdown-Headings. KEINE Listen. **fett** nur für 1-2 Kernzahlen. Maximum 50 Wörter gesamt.`;

      const res = await fetch("/api/metrio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: prompt,
          contextType: "general_chat",
          stockData: {
            symbol, name: data.profile.name, exchange: data.exchange,
            currency: data.currency, quote: data.quote, profile: data.profile,
          },
        }),
      });
      const j = await res.json();
      setSummary(j.response || "Analyse nicht verfügbar.");
    } catch {
      setSummary("Kurzanalyse konnte nicht geladen werden.");
    }
    setLoadingSummary(false);
  };

  // DETAIL — volle Tageseinordnung mit Makro, nur on-demand
  const loadDetail = async () => {
    if (detail || loadingDetail) return;
    setLoadingDetail(true);
    try {
      const q = data.quote;
      const dp = q.dp ?? 0;
      const direction = dp >= 0 ? "gestiegen" : "gefallen";
      const prompt = `Die Aktie ${data.profile.name} (${symbol}) ist heute ${direction} um ${Math.abs(dp).toFixed(2)}%. Aktueller Kurs: ${q.c} ${data.currency}. Vortag: ${q.pc}. Tageshoch: ${q.h}, Tagestief: ${q.l}. Sektor: ${data.profile.finnhubIndustry || "n/a"}.

Erstelle eine ganzheitliche Tageseinordnung (7–9 Sätze), die MIKRO + MAKRO + UNTERNEHMEN gleichberechtigt verbindet:

**1. Unternehmens-Mikro:** Was ist heute mit der Aktie konkret passiert? Gab es News, Earnings, Analystenaktionen, Insider-Transaktionen, Produktmeldungen, M&A, Guidance-Anpassungen?

**2. Sektor & Peers:** Wie bewegen sich Konkurrenten und die Branche (${data.profile.finnhubIndustry}) heute? Ist die Bewegung idiosynkratisch oder sektorweit?

**3. Makro-Kontext — ZWINGEND einbeziehen:**
   - Aktuelle Zins- und Inflationslage (Fed, EZB, BoE)
   - Devisenbewegungen (EUR/USD) und deren Einfluss
   - Rohstoffpreise (Öl, Gas, Gold) soweit relevant
   - Geopolitik (Konflikte, Sanktionen, Wahlen)
   - Indexbewegung am Heimatmarkt (DAX, S&P 500)
   - Risk-On / Risk-Off Stimmung

**4. Synthese:** Ist die heutige Bewegung signifikant, technisch oder fundamental getrieben?

Schreibe in Klartext-Deutsch, kurze Absätze, **fett** für Zahlen. Keine Floskeln.`;

      const res = await fetch("/api/metrio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: prompt,
          contextType: "general_chat",
          stockData: {
            symbol, name: data.profile.name, exchange: data.exchange,
            currency: data.currency, quote: data.quote, profile: data.profile,
            metrics: data.metrics,
          },
        }),
      });
      const j = await res.json();
      setDetail(j.response || "Detailanalyse nicht verfügbar.");
    } catch {
      setDetail("Detailanalyse konnte nicht geladen werden.");
    }
    setLoadingDetail(false);
  };

  useEffect(() => { loadSummary(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dp = data.quote.dp ?? 0;
  const isUp = dp >= 0;

  const toggleDetail = () => {
    if (!expanded) loadDetail();
    setExpanded((v) => !v);
  };

  return (
    <div style={{
      background: "var(--am-card)",
      border: "1px solid var(--am-border)",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "var(--am-shadow)",
      marginBottom: 20,
    }}>
      {/* Header — subtiler, weniger plakativ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid var(--am-border)",
        background: "var(--am-card-soft)",
      }}>
        <div className="am-metal" style={{
          width: 30, height: 30, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Activity size={14} color="#0a0b0e" strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
            fontSize: 13, fontWeight: 600, letterSpacing: "-0.015em",
            color: "var(--am-text)", margin: 0,
          }}>
            Momentum-Analyse
          </p>
          <p style={{
            fontSize: 10.5, color: "var(--am-text-muted)", margin: 0,
            letterSpacing: "-0.005em",
          }}>
            Metrio · {new Date().toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
          </p>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "4px 9px", borderRadius: 7,
          background: isUp ? "rgba(16, 185, 129, 0.10)" : "rgba(239, 68, 68, 0.10)",
          border: `1px solid ${isUp ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
          color: isUp ? "#059669" : "#dc2626",
        }}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'SF Mono', ui-monospace, monospace" }}>
            {isUp ? "+" : ""}{dp.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Kurzfassung */}
      <div style={{ padding: "14px 16px" }}>
        {loadingSummary ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12.5, color: "var(--am-text-muted)",
          }}>
            <div style={{
              width: 14, height: 14,
              border: "2px solid var(--am-border)",
              borderTopColor: "var(--am-text-muted)",
              borderRadius: "50%", animation: "spin 1s linear infinite",
            }} />
            Metrio analysiert...
          </div>
        ) : summary ? (
          <div style={{
            fontSize: 13.5, lineHeight: 1.6,
            color: "var(--am-text-secondary)",
            letterSpacing: "-0.005em",
          }}>
            <span dangerouslySetInnerHTML={{ __html: formatMetrio(summary) }} />
          </div>
        ) : null}

        {/* Expand-Button */}
        <button
          onClick={toggleDetail}
          style={{
            marginTop: 12,
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--am-border)",
            color: "var(--am-text-secondary)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
            fontSize: 11.5, fontWeight: 500, letterSpacing: "-0.005em",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--am-card-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Weniger anzeigen" : "Detaillierte Makro-Analyse anzeigen"}
        </button>

        {/* Detail-Block (kollabierbar) */}
        <div style={{
          maxHeight: expanded ? 4000 : 0,
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
          marginTop: expanded ? 14 : 0,
        }}>
          <div style={{
            padding: "14px 16px",
            background: "var(--am-card-soft)",
            border: "1px solid var(--am-border)",
            borderRadius: 12,
          }}>
            {loadingDetail ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12.5, color: "var(--am-text-muted)",
                padding: "20px 0", justifyContent: "center",
              }}>
                <div style={{
                  width: 14, height: 14,
                  border: "2px solid var(--am-border)",
                  borderTopColor: "var(--am-text-muted)",
                  borderRadius: "50%", animation: "spin 1s linear infinite",
                }} />
                Metrio erstellt detaillierte Analyse (Makro + Mikro + Synthese)...
              </div>
            ) : detail ? (
              <div style={{
                fontSize: 13, lineHeight: 1.75,
                color: "var(--am-text-secondary)",
              }}>
                <span dangerouslySetInnerHTML={{ __html: formatMetrio(detail) }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STOCK NEWS — Finnhub company news via /api/news
// ═══════════════════════════════════════════════════════════════════

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  time: string;
  image: string;
}

function StockNews({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(d => setNews((d.news ?? []).slice(0, 6)))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (!loading && news.length === 0) return null;

  return (
    <div style={{
      background: "var(--am-card)", border: "1px solid var(--am-border)", borderRadius: 16,
      overflow: "hidden", boxShadow: "var(--am-shadow)", marginBottom: 20,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "14px 18px",
        borderBottom: "1px solid var(--am-border-light)",
      }}>
        <div style={{
          width: 30, height: 30, background: "#eff6ff", borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Zap size={14} color="#2563eb" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0 }}>Aktuelle News</p>
          <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>Letzte 7 Tage · {symbol}</p>
        </div>
      </div>

      <div style={{ padding: "12px 18px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0", justifyContent: "center" }}>
            <div style={{ width: 16, height: 16, border: "2px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Lade News...</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {news.map((n, i) => {
              const ago = n.time ? formatTimeAgo(n.time) : "";
              return (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", gap: 12, padding: "10px 12px", borderRadius: 10,
                  background: "#f9fafb", textDecoration: "none", transition: "background 0.15s",
                }} onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                   onMouseLeave={e => (e.currentTarget.style.background = "#f9fafb")}>
                  {n.image && (
                    <img src={n.image} alt="" style={{
                      width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0,
                    }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.4, margin: 0,
                      overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                    }}>{n.title}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{n.source}</span>
                      {ago && <span style={{ fontSize: 10, color: "#9ca3af" }}>{ago}</span>}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Gerade eben";
  if (h < 24) return `vor ${h}h`;
  const d = Math.floor(h / 24);
  return `vor ${d}T`;
}

// ═══════════════════════════════════════════════════════════════════
// METRIO CHAT — Groq-powered via /api/metrio
// ═══════════════════════════════════════════════════════════════════

function MetrioChat({ data, symbol }: { data: StockData; symbol: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    role: "ai",
    text: `Ich bin Metrio, dein KI-Analyst. Du siehst gerade **${data.profile.name}** (${data.displaySymbol} · ${data.exchange}). Kurs: ${formatPrice(data.quote.c, data.currency)}. Frag mich zu Bewertung, Risiko, Dividende oder Analystenurteil.`
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll only within the chat container, not the whole page
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  const send = async (txt?: string) => {
    const q = txt || input.trim();
    if (!q || loading) return;
    setInput(""); setMsgs(m => [...m, { role: "user", text: q }]); setLoading(true);
    try {
      const res = await fetch("/api/metrio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: q,
          contextType: "general_chat",
          stockData: {
            symbol: data.displaySymbol,
            name: data.profile.name,
            exchange: data.exchange,
            currency: data.currency,
            quote: data.quote,
            profile: data.profile,
            metrics: data.metrics,
            rec: data.rec,
            target: data.target,
          },
        }),
      });
      const j = await res.json();
      setMsgs(m => [...m, { role: "ai", text: j.response || j.error || "Keine Antwort." }]);
    } catch {
      setMsgs(m => [...m, { role: "ai", text: "Verbindungsfehler. Bitte erneut versuchen." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "var(--am-card)", border: "1px solid var(--am-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--am-shadow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#0f172a" }}>
        <div style={{ width: 34, height: 34, background: "rgba(255,255,255,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Brain size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Metrio AI</p>
          <p style={{ fontSize: 10, color: "#64748b" }}>Powered by Groq · Qwen3 · {data.displaySymbol}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%" }} />
          <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* Quick action button */}
      <div style={{ padding: "12px 14px", background: "var(--am-card-soft)", borderBottom: "1px solid var(--am-border-light)" }}>
        <button onClick={() => send(`Analysiere ${data.profile.name} (${data.displaySymbol}) vollständig: Bewertung, Qualität, Risiko und Ausblick.`)}
          disabled={loading}
          style={{
            width: "100%", padding: "10px 16px", borderRadius: 10,
            background: "#0f172a", color: "#fff", border: "none",
            fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer",
            fontFamily: "inherit", opacity: loading ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          <Zap size={14} />
          {data.displaySymbol} jetzt analysieren
        </button>
      </div>

      {/* Pre-made quick questions */}
      {msgs.length <= 1 && (
        <div style={{ display: "flex", gap: 6, padding: "8px 14px", flexWrap: "wrap", background: "var(--am-card-soft)", borderBottom: "1px solid var(--am-border-light)" }}>
          {[
            `Ist ${data.displaySymbol} unterbewertet?`,
            `Dividenden-Analyse`,
            `Risiken & Chancen`,
            `Technische Analyse`,
            `Vergleich mit Konkurrenz`,
          ].map(q => (
            <button key={q} onClick={() => send(q)} disabled={loading}
              style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                background: "var(--am-card)", border: "1px solid var(--am-border)", color: "var(--am-text-secondary)",
                cursor: loading ? "default" : "pointer", fontFamily: "inherit",
                transition: "all 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--am-card-hover)"; e.currentTarget.style.borderColor = "var(--am-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--am-card)"; e.currentTarget.style.borderColor = "var(--am-border)"; }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div ref={chatContainerRef} style={{ background: "var(--am-card-soft)", minHeight: 160, maxHeight: 320, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
            {m.role === "ai" && <div style={{ width: 22, height: 22, background: "var(--am-accent)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Brain size={10} color="var(--am-accent-text)" /></div>}
            <div style={{
              maxWidth: "80%", padding: "10px 14px",
              borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
              background: m.role === "user" ? "var(--am-accent)" : "var(--am-card)",
              color: m.role === "user" ? "var(--am-accent-text)" : "var(--am-text-secondary)",
              fontSize: 13, lineHeight: 1.7, border: m.role === "ai" ? "1px solid var(--am-border)" : "none",
            }}>{m.role === "ai" ? <span dangerouslySetInnerHTML={{ __html: formatMetrio(m.text) }} /> : m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            <div style={{ width: 22, height: 22, background: "var(--am-accent)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}><Brain size={10} color="var(--am-accent-text)" /></div>
            <div style={{ padding: "10px 14px", background: "var(--am-card)", border: "1px solid var(--am-border)", borderRadius: "12px 12px 12px 3px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, background: "var(--am-text-faint)", borderRadius: "50%", animation: `mBounce 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 7, padding: "12px 14px", background: "var(--am-card)", borderTop: "1px solid var(--am-border-light)" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Frag Metrio..."
          autoFocus={false}
          style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: "10px 13px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0f172a" }} />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{ background: "#0f172a", border: "none", borderRadius: 9, padding: "10px 15px", cursor: "pointer", opacity: !input.trim() ? 0.4 : 1, display: "flex", alignItems: "center" }}>
          <Send size={13} color="#fff" />
        </button>
      </div>
      <p style={{ fontSize: 10, color: "#d1d5db", textAlign: "center", padding: "6px 14px 10px" }}>
        Metrio gibt keine Anlageberatung. § 85 WpHG.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WATCHLIST DROPDOWN
// ═══════════════════════════════════════════════════════════════════

function WatchlistDropdown({ symbol, exchange, name, onClose }: {
  symbol: string; exchange: string; name: string; onClose: () => void;
}) {
  const [lists, setLists] = useState<{ name: string; items: string[] }[]>([]);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("am_watchlists");
    if (stored) {
      try { setLists(JSON.parse(stored)); } catch { /* ignore */ }
    } else {
      const defaults = [
        { name: "Main", items: [] },
        { name: "US Tech", items: [] },
        { name: "Dividenden", items: [] },
      ];
      setLists(defaults);
      localStorage.setItem("am_watchlists", JSON.stringify(defaults));
    }
  }, []);

  const addToList = (listName: string) => {
    const key = `${symbol}:${exchange}`;
    const updated = lists.map(l => {
      if (l.name === listName && !l.items.includes(key)) {
        return { ...l, items: [...l.items, key] };
      }
      return l;
    });
    setLists(updated);
    localStorage.setItem("am_watchlists", JSON.stringify(updated));
    setAdded(listName);
    setTimeout(onClose, 800);
  };

  return (
    <div className="am-glass" style={{
      position: "absolute", top: "calc(100% + 6px)", right: 0,
      borderRadius: 12,
      minWidth: 220, zIndex: 100, overflow: "hidden",
    }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Zur Watchlist hinzufügen</p>
        <p style={{ fontSize: 11, color: "#9ca3af" }}>{name} ({symbol})</p>
      </div>
      {lists.map(l => {
        const key = `${symbol}:${exchange}`;
        const alreadyIn = l.items.includes(key);
        return (
          <button key={l.name} onClick={() => !alreadyIn && addToList(l.name)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "10px 14px", border: "none",
              borderBottom: "1px solid #f3f4f6", background: added === l.name ? "#f0fdf4" : "transparent",
              cursor: alreadyIn ? "default" : "pointer", fontFamily: "inherit", textAlign: "left",
            }}>
            <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{l.name}</span>
            {alreadyIn ? (
              <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>Bereits drin</span>
            ) : added === l.name ? (
              <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>Hinzugefügt!</span>
            ) : (
              <Plus size={14} color="#9ca3af" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN STOCK PAGE
// ═══════════════════════════════════════════════════════════════════

function StockPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawSymbol = (params.symbol as string) ?? "";
  const exchangeParam = searchParams.get("exchange") as MIC | null;

  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  const entry = resolveEntry(rawSymbol.replace(/\.DE$/i, ""), exchangeParam ?? undefined);

  // ── SCROLL TO TOP on mount and on symbol change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    // Also fire after a short delay to counteract TradingView widget scroll
    const t1 = setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }), 300);
    const t2 = setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [entry.fetchSymbol]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/quote?symbol=${encodeURIComponent(entry.fetchSymbol)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Nicht gefunden");
        if (!cancelled) setData(json);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    const iv = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [entry.fetchSymbol]);

  // Close watchlist dropdown on outside click
  useEffect(() => {
    if (!watchlistOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-watchlist-dd]")) setWatchlistOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [watchlistOpen]);

  if (loading && !data) {
    return (
      <div style={{ fontFamily: "'Inter',sans-serif", maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ padding: 24, background: "var(--am-card)", borderRadius: 14, border: "1px solid var(--am-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f3f4f6", animation: "shimmer 1.5s infinite" }} />
            <div>
              <div style={{ width: 120, height: 18, borderRadius: 6, background: "#f3f4f6", marginBottom: 6 }} />
              <div style={{ width: 80, height: 12, borderRadius: 6, background: "#f3f4f6" }} />
            </div>
          </div>
          <div style={{ width: 200, height: 32, borderRadius: 8, background: "#f3f4f6" }} />
        </div>
        <style>{`@keyframes shimmer{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ fontFamily: "'Inter',sans-serif", maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ padding: 24, background: "#fef2f2", borderRadius: 14, border: "1px solid #fecaca" }}>
          <p style={{ fontSize: 14, color: "#dc2626", fontWeight: 600 }}>Fehler: {error}</p>
          <a href="/" style={{ fontSize: 13, color: "#3b82f6", marginTop: 8, display: "inline-block" }}>Zur Startseite</a>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { quote, profile, metrics } = data;
  const isUp = quote.d >= 0;
  const tvSymbol = data.tvSymbol || entry.tvSymbol;
  const currency = data.currency || EXCHANGES[entry.exchange].currency;

  const alphaScore = computeAlphaScore(metrics, data.rec, data.target, quote);

  // Build metrics array for the core metrics panel
  const metricItems = [
    { label: "KGV (TTM)", raw: metrics.peBasicExclExtraTTM, value: metrics.peBasicExclExtraTTM?.toFixed(1), suffix: "x" },
    { label: "KBV", raw: metrics.pbAnnual, value: metrics.pbAnnual?.toFixed(2), suffix: "x" },
    { label: "EV/EBITDA", raw: metrics.evEbitdaTTM, value: metrics.evEbitdaTTM?.toFixed(1), suffix: "x" },
    { label: "ROE", raw: metrics.roeTTM, value: metrics.roeTTM ? (metrics.roeTTM * 100).toFixed(1) : undefined, suffix: "%" },
    { label: "Nettomarge", raw: metrics.netProfitMarginTTM, value: metrics.netProfitMarginTTM ? (metrics.netProfitMarginTTM * 100).toFixed(1) : undefined, suffix: "%" },
    { label: "Bruttomarge", raw: metrics.grossMarginTTM, value: metrics.grossMarginTTM ? (metrics.grossMarginTTM * 100).toFixed(1) : undefined, suffix: "%" },
    { label: "Beta", raw: metrics.beta, value: metrics.beta?.toFixed(2), suffix: "" },
    { label: "Dividende", raw: metrics.dividendYieldIndicatedAnnual, value: metrics.dividendYieldIndicatedAnnual?.toFixed(2), suffix: "%" },
    { label: "D/E Ratio", raw: metrics.totalDebt_totalEquityAnnual, value: metrics.totalDebt_totalEquityAnnual ? (metrics.totalDebt_totalEquityAnnual / 100).toFixed(2) : undefined, suffix: "" },
  ].filter(m => m.value !== undefined);

  const METRIC_QUESTIONS: Record<string, string> = {
    "KGV (TTM)": `Erkläre das KGV von ${data.displaySymbol} im Kontext der Branche ${profile.finnhubIndustry || ""}. Ist es günstig oder teuer?`,
    "KBV": `Was bedeutet das Kurs-Buchwert-Verhältnis für ${data.displaySymbol}? Vergleiche mit dem Sektor.`,
    "EV/EBITDA": `Erkläre den EV/EBITDA-Multiplikator von ${data.displaySymbol}. Warum ist dieser Multiplikator oft aussagekräftiger als das KGV?`,
    "ROE": `Analysiere die Eigenkapitalrendite (ROE) von ${data.displaySymbol}. Was sagt sie über die Kapitaleffizienz?`,
    "Nettomarge": `Was bedeutet die Nettomarge von ${data.displaySymbol} für die operative Stärke?`,
    "Bruttomarge": `Erkläre die Bruttomarge von ${data.displaySymbol} und was sie über die Preissetzungsmacht aussagt.`,
    "Beta": `Was bedeutet das Beta von ${data.displaySymbol} für das Risikoprofil im Portfolio?`,
    "Dividende": `Analysiere die Dividendenrendite von ${data.displaySymbol}. Ist sie nachhaltig?`,
    "D/E Ratio": `Erkläre den Verschuldungsgrad (D/E Ratio) von ${data.displaySymbol}. Wie steht das Unternehmen bilanziell da?`,
  };

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", background: "var(--am-bg, #f8fafc)", minHeight: "100vh" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes shimmer{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes mBounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
        @media (max-width: 900px) {
          .stock-chart-metrics { flex-direction: column !important; }
          .ai-boxes-grid { grid-template-columns: 1fr 1fr !important; }
          .metric-sidebar { min-width: unset !important; max-width: unset !important; }
          .action-btns { flex-direction: column !important; }
          .bull-bear-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .ai-boxes-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
        {/* Back link */}
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--am-text-muted)", textDecoration: "none", marginBottom: 16 }}>
          <ChevronLeft size={14} /> Zurück
        </a>

        {/* ═══ PRICE HEADER + ACTION BUTTONS ═══ */}
        <div style={{ background: "var(--am-card)", borderRadius: 16, border: "1px solid var(--am-border)", boxShadow: "var(--am-shadow)", marginBottom: 20, padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" }}>
            {/* LEFT COLUMN: ticker + MomentumMini stacked */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {profile.logo && (
                  <img src={profile.logo} alt="" style={{ width: 48, height: 48, borderRadius: 12, border: "1px solid var(--am-border-light)", objectFit: "contain", background: "#fff", padding: 4 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--am-text)", letterSpacing: "-0.03em" }}>{data.displaySymbol}</h1>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--am-text-muted)", background: "var(--am-card-hover)", padding: "2px 7px", borderRadius: 5, textTransform: "uppercase" }}>{data.exchange}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: currency === "EUR" ? "var(--am-blue-text)" : "var(--am-green-text)", background: currency === "EUR" ? "var(--am-blue-bg)" : "var(--am-green-bg)", padding: "2px 7px", borderRadius: 5 }}>{currency}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--am-text-muted)", marginTop: 2 }}>
                    {profile.name}{profile.finnhubIndustry ? ` · ${profile.finnhubIndustry}` : ""}
                  </p>
                </div>
              </div>

              {/* Momentum Mini — sits left, under ticker, does NOT extend under price column */}
              <MomentumMini data={data} symbol={data.displaySymbol} />
            </div>

            {/* RIGHT COLUMN: price + actions */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <p style={{ fontSize: 30, fontWeight: 900, color: "var(--am-text)", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {formatPrice(quote.c, currency)}
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 7, background: isUp ? "var(--am-green-bg)" : "var(--am-red-bg)", border: `1px solid ${isUp ? "rgba(34,197,94,0.3)" : "rgba(248,113,113,0.3)"}` }}>
                {isUp ? <TrendingUp size={13} color="var(--am-green-text)" /> : <TrendingDown size={13} color="var(--am-red-text)" />}
                <span style={{ fontSize: 13, fontWeight: 700, color: isUp ? "var(--am-green-text)" : "var(--am-red-text)", fontVariantNumeric: "tabular-nums" }}>
                  {isUp ? "+" : ""}{formatPrice(quote.d, currency)} ({isUp ? "+" : ""}{quote.dp.toFixed(2)}%)
                </span>
              </div>

              <div className="action-btns" style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                <a href={`/portfolio?trade=${data.displaySymbol}&exchange=${data.exchange}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "8px 16px", borderRadius: 9,
                    background: "linear-gradient(180deg, var(--am-accent) 0%, var(--am-accent-hover) 100%)",
                    color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none",
                    boxShadow: "0 8px 24px -8px var(--am-accent-glow)",
                  }}>
                  <Plus size={14} /> Trade
                </a>
                <div data-watchlist-dd="" style={{ position: "relative" }}>
                  <button onClick={() => setWatchlistOpen(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "8px 16px", borderRadius: 9, background: "var(--am-card-soft)",
                      border: "1px solid var(--am-border)", fontSize: 12, fontWeight: 700,
                      color: "var(--am-text-secondary)", cursor: "pointer", fontFamily: "inherit",
                    }}>
                    <BookmarkPlus size={14} /> Watchlist
                  </button>
                  {watchlistOpen && (
                    <WatchlistDropdown
                      symbol={data.displaySymbol}
                      exchange={data.exchange}
                      name={profile.name}
                      onClose={() => setWatchlistOpen(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Day stats */}
          <div style={{ display: "flex", gap: 24, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--am-border-light)", flexWrap: "wrap" }}>
            {[
              { label: "Eröffnung", value: formatPrice(quote.o, currency) },
              { label: "Tageshoch", value: formatPrice(quote.h, currency) },
              { label: "Tagestief", value: formatPrice(quote.l, currency) },
              { label: "Vortag",    value: formatPrice(quote.pc, currency) },
              { label: "MarketCap", value: profile.marketCapitalization ? `${(profile.marketCapitalization / 1000).toFixed(1)}B` : "—" },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: 10, color: "var(--am-text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--am-text-secondary)", fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CHART + CORE METRICS (side by side) ═══ */}
        <div className="stock-chart-metrics" style={{ display: "flex", gap: 16, marginBottom: 8, alignItems: "stretch" }}>
          {/* TradingView Chart */}
          <div style={{ flex: 1, minWidth: 0, background: "var(--am-card)", border: "1px solid var(--am-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--am-shadow)", display: "flex", flexDirection: "column" }}>
            <TradingViewChart tvSymbol={tvSymbol} />
            <p style={{
              margin: 0, padding: "10px 16px",
              fontSize: 11, color: "var(--am-text-muted)",
              background: "var(--am-card-soft)",
              borderTop: "1px solid var(--am-border-light, var(--am-border))",
              lineHeight: 1.5,
            }}>
              <b style={{ color: "var(--am-text-secondary)" }}>Preis-Quelle:</b> Der oben angezeigte Kurs stammt von {data.dataSource === "yahoo" ? "Yahoo Finance" : "Finnhub"} (bis zu 15 Min. Verzögerung). Der Chart zeigt Live-Daten von <b style={{ color: "var(--am-text-secondary)" }}>{tvSymbol}</b>. Bei deutschen Aktien nach 17:30 Uhr ist der Xetra-Schlusskurs maßgeblich — in der Nachbörse handeln einige Venues (z.&nbsp;B. Tradegate) noch weiter und können kleine Differenzen erzeugen.
            </p>
          </div>

          {/* Core Metrics Panel — RIGHT of chart */}
          {metricItems.length > 0 && (
            <div className="metric-sidebar" style={{
              minWidth: 280, maxWidth: 320, background: "var(--am-card)", border: "1px solid var(--am-border)",
              borderRadius: 16, padding: "16px", boxShadow: "var(--am-shadow)",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--am-border-light, var(--am-border))" }}>
                <BarChart2 size={14} color="var(--am-text)" />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--am-text)", letterSpacing: "-0.02em" }}>Kernkennzahlen</h3>
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {metricItems.map(m => (
                  <div key={m.label} style={{
                    padding: "10px 12px",
                    background: "var(--am-card-soft)",
                    border: "1px solid var(--am-border-light, var(--am-border))",
                    borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 10, color: "var(--am-text-muted)",
                        textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2,
                      }}>{m.label}</p>
                      <p style={{
                        fontSize: 16, fontWeight: 900, color: "var(--am-text)",
                        fontVariantNumeric: "tabular-nums",
                      }}>{m.value}{m.suffix}</p>
                    </div>
                    <FragMetrioButton
                      compact
                      contextType="metric_explanation"
                      question={METRIC_QUESTIONS[m.label] || `Erkläre ${m.label} von ${data.displaySymbol}.`}
                      stockData={data}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ ALPHA METRIC SCORE — Semi-circle gauge + Bull/Bear ═══ */}
        <div style={{
          background: "var(--am-card)", border: "1px solid var(--am-border)", borderRadius: 16, padding: 24,
          marginBottom: 24, boxShadow: "var(--am-shadow)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Star size={18} color={scoreColor(alphaScore.total)} fill={scoreColor(alphaScore.total)} />
                <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--am-text)", letterSpacing: "-0.02em" }}>
                  AlphaMetric Score
                </h2>
                <button
                  onClick={() => setShowScoreInfo(true)}
                  aria-label="Methodologie anzeigen"
                  title="Wie wird der Score berechnet?"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 22, height: 22, borderRadius: "50%",
                    background: "var(--am-card-soft)",
                    border: "1px solid var(--am-border)",
                    color: "var(--am-text-muted)",
                    cursor: "pointer", padding: 0,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--am-card-hover)";
                    e.currentTarget.style.color = "var(--am-text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--am-card-soft)";
                    e.currentTarget.style.color = "var(--am-text-muted)";
                  }}
                >
                  <Info size={12} />
                </button>
              </div>
              <p style={{ fontSize: 13, color: "var(--am-text-muted)", lineHeight: 1.6, marginBottom: 10 }}>
                Gewichtete Fundamentalanalyse aus 8 institutionellen Faktoren — hergeleitet aus Live-Quote, Peer-Multiples, Analysten-Konsens und Makro-Proxies.
              </p>
              {/* Score Explanation */}
              <div style={{
                background: "var(--am-card-soft)", border: "1px solid var(--am-border)", borderRadius: 10,
                padding: "12px 14px", marginBottom: 16,
                borderLeft: `3px solid ${scoreColor(alphaScore.total)}`,
                backdropFilter: "blur(14px) saturate(160%)",
                WebkitBackdropFilter: "blur(14px) saturate(160%)",
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--am-text)", marginBottom: 4 }}>
                  Warum {alphaScore.total}/100?
                </p>
                <p style={{ fontSize: 12, color: "var(--am-text-secondary)", lineHeight: 1.6 }}>
                  {alphaScore.summary}
                </p>
              </div>

              {/* Bull / Bear Signals */}
              <div className="bull-bear-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{
                  background: "var(--am-green-bg)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "12px 14px",
                  backdropFilter: "blur(14px) saturate(160%)", WebkitBackdropFilter: "blur(14px) saturate(160%)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                    <TrendingUp size={13} color="#10b981" />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--am-green-text, #10b981)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bullish</span>
                  </div>
                  {alphaScore.bullSignals.length > 0 ? alphaScore.bullSignals.map((s, i) => (
                    <p key={i} style={{ fontSize: 12, color: "var(--am-green-text, #166534)", lineHeight: 1.6, paddingLeft: 10, borderLeft: "2px solid #10b981", marginBottom: 4 }}>{s}</p>
                  )) : (
                    <p style={{ fontSize: 12, color: "var(--am-text-muted)", fontStyle: "italic" }}>Keine starken bullischen Signale</p>
                  )}
                </div>
                <div style={{
                  background: "var(--am-red-bg)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "12px 14px",
                  backdropFilter: "blur(14px) saturate(160%)", WebkitBackdropFilter: "blur(14px) saturate(160%)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                    <TrendingDown size={13} color="#dc2626" />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--am-red-text, #dc2626)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bearish</span>
                  </div>
                  {alphaScore.bearSignals.length > 0 ? alphaScore.bearSignals.map((s, i) => (
                    <p key={i} style={{ fontSize: 12, color: "var(--am-red-text, #991b1b)", lineHeight: 1.6, paddingLeft: 10, borderLeft: "2px solid #dc2626", marginBottom: 4 }}>{s}</p>
                  )) : (
                    <p style={{ fontSize: 12, color: "var(--am-text-muted)", fontStyle: "italic" }}>Keine starken bärischen Signale</p>
                  )}
                </div>
              </div>
            </div>

            {/* Gauge */}
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <AlphaGauge score={alphaScore.total} />
              <p style={{ fontSize: 10, color: "var(--am-text-faint)", marginTop: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
                /100 · Ø gewichtet
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: scoreColor(alphaScore.total), marginTop: 4 }}>
                {alphaScore.label}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                  <p style={{ fontSize: 9, color: "var(--am-text-faint)", marginTop: 2 }}>0-40</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                  <p style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>41-70</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                  <p style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>71-100</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ALPHA METRIC SCORE — METHODOLOGY POPOVER ═══ */}
        {showScoreInfo && (
          <div
            onClick={() => setShowScoreInfo(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(10,10,14,0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 9999,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20,
              animation: "amFadeIn 0.18s ease-out",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--am-card)",
                border: "1px solid var(--am-border)",
                borderRadius: 20,
                maxWidth: 680, width: "100%", maxHeight: "88vh",
                overflow: "auto",
                boxShadow: "var(--am-shadow-lg)",
                animation: "amSlideUp 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid var(--am-border-light)",
                background: "var(--am-card-soft)",
                borderTopLeftRadius: 20, borderTopRightRadius: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: `${scoreColor(alphaScore.total)}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Info size={16} color={scoreColor(alphaScore.total)} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--am-text)", letterSpacing: "-0.02em" }}>
                      AlphaMetric Score · Methodologie
                    </h3>
                    <p style={{ fontSize: 11, color: "var(--am-text-faint)", marginTop: 2 }}>
                      Wie die Gesamtnote zustande kommt
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScoreInfo(false)}
                  aria-label="Schließen"
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    width: 32, height: 32, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--am-text-muted)",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "20px 24px" }}>
                {/* Summary */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
                  padding: "14px 16px",
                  background: `${scoreColor(alphaScore.total)}0c`,
                  border: `1px solid ${scoreColor(alphaScore.total)}24`,
                  borderRadius: 12,
                }}>
                  <div style={{
                    fontSize: 28, fontWeight: 900, color: scoreColor(alphaScore.total),
                    letterSpacing: "-0.03em", lineHeight: 1,
                  }}>
                    {alphaScore.total}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--am-text)" }}>
                      {alphaScore.label} · {data.displaySymbol}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--am-text-muted)", lineHeight: 1.5, marginTop: 2 }}>
                      {alphaScore.summary}
                    </p>
                  </div>
                </div>

                {/* Philosophy */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--am-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Philosophie
                  </h4>
                  <p style={{ fontSize: 13, color: "var(--am-text-muted)", lineHeight: 1.7 }}>
                    Der AlphaMetric Score ist eine <b style={{ color: "var(--am-text)" }}>gewichtete Fundamentalanalyse</b> auf institutionellem Niveau.
                    Er kombiniert 8 unabhängige Faktoren — jeder nach Goldman Sachs / McKinsey Methodik quantifiziert — und aggregiert sie zu einer Gesamtnote von 0–100.
                    Die Skala ist <b style={{ color: "var(--am-text)" }}>relativ, nicht absolut</b>: 70+ signalisiert Stärke im Peer-Vergleich, unter 40 deutet auf strukturelle Schwächen.
                  </p>
                </div>

                {/* Factor breakdown */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--am-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                    8 Faktoren · Gewichtung
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(() => {
                      const weights = [1.2, 1.1, 0.9, 1.15, 1.0, 0.95, 0.85, 1.0];
                      const total = weights.reduce((a, b) => a + b, 0);
                      return alphaScore.factors.map((f, i) => {
                        const pct = (weights[i] / total * 100);
                        const col = scoreColor(f.score);
                        return (
                          <div key={f.key} style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto 60px 50px",
                            alignItems: "center", gap: 12,
                            padding: "8px 12px",
                            background: "var(--am-card-soft)",
                            border: "1px solid var(--am-border-light)",
                            borderRadius: 10,
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--am-text)" }}>
                              {f.label}
                            </div>
                            <div style={{
                              fontSize: 10, fontWeight: 700, color: "var(--am-text-muted)",
                              background: "var(--am-card)",
                              padding: "3px 8px", borderRadius: 5,
                              border: "1px solid var(--am-border-light)",
                            }}>
                              {pct.toFixed(1)}%
                            </div>
                            <div style={{
                              height: 5, borderRadius: 3,
                              background: "var(--am-border-light)",
                              overflow: "hidden",
                            }}>
                              <div style={{
                                width: `${f.score}%`, height: "100%",
                                background: col, transition: "width 0.4s ease",
                              }} />
                            </div>
                            <div style={{
                              fontSize: 13, fontWeight: 800, color: col,
                              textAlign: "right",
                            }}>
                              {f.score}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Data Sources */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--am-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Datenquellen
                  </h4>
                  <ul style={{ fontSize: 12, color: "var(--am-text-muted)", lineHeight: 1.8, paddingLeft: 18 }}>
                    <li><b style={{ color: "var(--am-text)" }}>Live-Quote & Kursdaten:</b> Finnhub (Echtzeit Bid/Ask, OHLC, 52W-Range)</li>
                    <li><b style={{ color: "var(--am-text)" }}>Fundamentals:</b> P/E, P/B, P/S, EV/EBITDA, Margins, ROE/ROA, D/E</li>
                    <li><b style={{ color: "var(--am-text)" }}>Wachstum:</b> 3J-Umsatz-CAGR, EPS-TTM vs. Peer-Sektor</li>
                    <li><b style={{ color: "var(--am-text)" }}>Analysten-Konsens:</b> Strong Buy/Buy/Hold/Sell-Verteilung, Ø Kursziel</li>
                    <li><b style={{ color: "var(--am-text)" }}>Makro-Proxy:</b> Beta (Marktkorrelation), Market Cap (Stabilität)</li>
                    <li><b style={{ color: "var(--am-text)" }}>Momentum:</b> 52W-Position, Volatilität, relative Stärke</li>
                  </ul>
                </div>

                {/* Methodology */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--am-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Berechnung
                  </h4>
                  <div style={{
                    fontSize: 12, color: "var(--am-text-muted)", lineHeight: 1.7,
                    background: "var(--am-card-soft)", borderRadius: 10,
                    padding: "12px 14px", border: "1px solid var(--am-border-light)",
                    fontFamily: "'SF Mono','Menlo',monospace",
                  }}>
                    Score = Σ (Faktor<sub>i</sub> × Gewicht<sub>i</sub>) / Σ Gewichte
                    <br />
                    <span style={{ fontFamily: "inherit", fontSize: 11 }}>
                      Jeder Sub-Faktor wird auf 0–100 normalisiert (Peer-Vergleich / Sektor-Benchmark / historische Bandbreite).
                      Gewichtung priorisiert fundamentale Qualität (Bewertung, Profitabilität) über Timing-Signale.
                    </span>
                  </div>
                </div>

                {/* Score bands */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: "var(--am-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                    Interpretation
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                    {[
                      { range: "80–100", label: "Sehr Stark", color: "#059669" },
                      { range: "65–79", label: "Stark", color: "#10b981" },
                      { range: "50–64", label: "Neutral", color: "#f59e0b" },
                      { range: "35–49", label: "Schwach", color: "#f97316" },
                      { range: "0–34", label: "Sehr Schwach", color: "#ef4444" },
                    ].map((b) => (
                      <div key={b.range} style={{
                        textAlign: "center",
                        padding: "8px 4px",
                        background: `${b.color}10`,
                        border: `1px solid ${b.color}30`,
                        borderRadius: 8,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: b.color, letterSpacing: "0.02em" }}>
                          {b.range}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--am-text-muted)", marginTop: 2, fontWeight: 600 }}>
                          {b.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div style={{
                  background: "var(--am-card-soft)",
                  border: "1px solid var(--am-border-light)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 11, color: "var(--am-text-faint)", lineHeight: 1.6,
                }}>
                  <b style={{ color: "var(--am-text-muted)" }}>Hinweis:</b> Der AlphaMetric Score ist ein analytisches Werkzeug zur Finanzbildung — <b>keine Anlageberatung i.S.d. § 85 WpHG</b>.
                  Kein Score kann alle Marktrisiken vollständig abbilden. Treffen Sie Investitionsentscheidungen stets eigenverantwortlich.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 8-FACTOR QUANT MODEL ═══ */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              8-Faktor Quant-Analyse
            </h2>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", padding: "3px 8px", borderRadius: 5 }}>
              {data.displaySymbol}
            </span>
          </div>
          <div className="ai-boxes-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
          }}>
            {alphaScore.factors.map(factor => {
              const color = scoreColor(factor.score);
              const isExpanded = expandedFactor === factor.key;
              return (
                <div key={factor.key} style={{
                  background: "var(--am-card)", border: `1px solid ${isExpanded ? color + "40" : "var(--am-border)"}`, borderRadius: 14, padding: "18px 16px",
                  boxShadow: isExpanded ? `0 4px 20px ${color}15` : "var(--am-shadow)",
                  display: "flex", flexDirection: "column",
                  transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{ color }}>
                        <ScoreIcon icon={factor.icon} size={18} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: 22, fontWeight: 900, color,
                      fontVariantNumeric: "tabular-nums", lineHeight: 1,
                    }}>
                      {factor.score}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 2, letterSpacing: "-0.01em" }}>
                    {factor.label}
                  </p>
                  <p style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {factor.labelEn}
                  </p>

                  {/* Score bar */}
                  <div style={{ width: "100%", height: 4, background: "#f3f4f6", borderRadius: 2, marginBottom: 10 }}>
                    <div style={{ width: `${factor.score}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
                  </div>

                  <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, flex: 1, marginBottom: 10 }}>
                    {factor.summary}
                  </p>

                  {/* Expandable deep-dive accordion */}
                  <button onClick={() => setExpandedFactor(isExpanded ? null : factor.key)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "6px 0", border: "none", background: "transparent",
                      cursor: "pointer", fontFamily: "inherit", borderTop: "1px solid #f3f4f6", marginBottom: 4,
                    }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Details</span>
                    {isExpanded ? <ChevronUp size={12} color="#9ca3af" /> : <ChevronDown size={12} color="#9ca3af" />}
                  </button>

                  {isExpanded && (
                    <div style={{ paddingTop: 6 }}>
                      {factor.bullish.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          {factor.bullish.map((b, i) => (
                            <p key={i} style={{ fontSize: 11, color: "#166534", lineHeight: 1.5, paddingLeft: 8, borderLeft: "2px solid #10b981", marginBottom: 3 }}>
                              {b}
                            </p>
                          ))}
                        </div>
                      )}
                      {factor.bearish.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          {factor.bearish.map((b, i) => (
                            <p key={i} style={{ fontSize: 11, color: "#991b1b", lineHeight: 1.5, paddingLeft: 8, borderLeft: "2px solid #ef4444", marginBottom: 3 }}>
                              {b}
                            </p>
                          ))}
                        </div>
                      )}
                      <FragMetrioButton
                        label="Frag Metrio"
                        contextType="factor_explanation"
                        question={`Erkläre den Faktor "${factor.label}" (Score: ${factor.score}/100) für ${data.displaySymbol} (${data.profile.name}). Was sind die Haupttreiber dieses Scores und was bedeutet er für die Investmentthese?`}
                        stockData={data}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ MOMENTUM-ANALYSE ═══ */}
        <MomentumAnalyse data={data} symbol={data.displaySymbol} />

        {/* ═══ AKTUELLE NEWS ═══ */}
        <StockNews symbol={data.displaySymbol} />

        {/* ═══ METRIO AI CHAT ═══ */}
        <MetrioChat data={data} symbol={data.displaySymbol} />

        {/* Source footer */}
        <p style={{ fontSize: 10, color: "#d1d5db", textAlign: "center", marginTop: 16, padding: "8px 0" }}>
          Quelle: {data.dataSource === "yahoo" ? "Yahoo Finance" : "Finnhub"} · TV: {tvSymbol} · Keine Anlageberatung (§ 85 WpHG)
        </p>
      </div>
      <Footer />
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Laden...</div>}>
      <StockPageInner />
    </Suspense>
  );
}
