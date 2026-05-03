"use client";
// ═══════════════════════════════════════════════════════════════════
// PORTFOLIO ANALYZER — "Mein Portfolio"
// User enters real holdings → gets Metrio AI analysis with scores
// No paper trading. Pure portfolio analysis tool.
// ═══════════════════════════════════════════════════════════════════

import {
  useState, useEffect, useCallback, useMemo, useRef, Suspense,
} from "react";
import {
  Plus, X, RefreshCw, TrendingUp, BarChart2, Shield,
  Zap, Target, PieChart, Brain, AlertTriangle, Search,
  ChevronDown, ChevronUp, Trash2, Edit2, Check,
  Upload, Image as ImageIcon, Camera, Sparkles,
} from "lucide-react";
import SearchWithExchange, {
  SelectedStock, stockEntryToSelected,
} from "@/components/SearchWithExchange";
import PortfolioMetrio from "@/components/PortfolioMetrio";
import PortfolioRiskProfiler from "@/components/PortfolioRiskProfiler";
import Footer from "@/components/Footer";
import { resolveEntry, EXCHANGES, type MIC } from "@/lib/exchange-registry";
import { formatMetrio } from "@/utils/formatMetrio";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
export interface Position {
  key:          string;
  symbol:       string;
  name:         string;
  exchange:     MIC;
  fetchSymbol:  string;
  tvSymbol:     string;
  currency:     string;
  sector:       string;
  shares:       number;
  avgBuyPrice:  number;
  currentPrice: number;
  currentValue: number;
  pnlAbs:       number;
  pnlPct:       number;
  beta?:        number;
  dividendYield?: number;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "alphametric_portfolio_v2";

const fEur = (n: number, cur = "EUR") =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const f2 = (n: number, d = 2) => n.toFixed(d);

// ─────────────────────────────────────────────────────────────────
// PORTFOLIO SCORING ENGINE
// ─────────────────────────────────────────────────────────────────
interface PortfolioScores {
  total:          number;
  diversification: number;
  risk:           number;
  dividend:       number;
  future:         number;
  sectorBalance:  number;
  labels: {
    diversification: string;
    risk: string;
    dividend: string;
    future: string;
    sectorBalance: string;
  };
}

function computePortfolioScores(positions: Position[]): PortfolioScores {
  if (positions.length === 0) {
    return {
      total: 0, diversification: 0, risk: 0, dividend: 0, future: 0, sectorBalance: 0,
      labels: { diversification: "Keine Daten", risk: "Keine Daten", dividend: "Keine Daten", future: "Keine Daten", sectorBalance: "Keine Daten" },
    };
  }

  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);

  // 1. Diversification (0-100): more positions + more even distribution = better
  const posCount = positions.length;
  const posFactor = Math.min(posCount / 12, 1) * 60; // up to 60 pts for having 12+ positions
  const weights = positions.map(p => totalValue > 0 ? p.currentValue / totalValue : 0);
  const maxWeight = Math.max(...weights, 0);
  const concentrationPenalty = maxWeight > 0.4 ? 30 : maxWeight > 0.25 ? 15 : 0;
  const diversification = Math.round(Math.min(100, posFactor + 40 - concentrationPenalty));
  const divLabel = diversification >= 70 ? "Gut diversifiziert" : diversification >= 40 ? "Ausbaufähig" : "Stark konzentriert";

  // 2. Risk Profile (0-100): balanced beta ~0.8-1.2 is ideal
  const betas = positions.filter(p => p.beta).map(p => ({ beta: p.beta!, w: totalValue > 0 ? p.currentValue / totalValue : 0 }));
  let avgBeta = 1.0;
  if (betas.length > 0) avgBeta = betas.reduce((s, b) => s + b.beta * b.w, 0);
  const betaScore = avgBeta >= 0.7 && avgBeta <= 1.3 ? 80 : avgBeta >= 0.5 && avgBeta <= 1.6 ? 55 : 30;
  const risk = Math.round(betaScore + (posCount >= 5 ? 20 : posCount * 4));
  const riskLabel = avgBeta > 1.3 ? "Aggressiv" : avgBeta < 0.7 ? "Sehr defensiv" : "Ausgewogen";

  // 3. Dividend Strategy (0-100)
  const divYields = positions.filter(p => p.dividendYield).map(p => ({ y: p.dividendYield!, w: totalValue > 0 ? p.currentValue / totalValue : 0 }));
  const weightedYield = divYields.reduce((s, d) => s + d.y * d.w, 0);
  const divScore = Math.round(Math.min(100, weightedYield * 25)); // ~4% yield = 100
  const dividend = Math.max(10, divScore);
  const dividendLabel = weightedYield >= 3 ? "Starke Dividende" : weightedYield >= 1.5 ? "Moderate Dividende" : "Wachstumsorientiert";

  // 4. Future-Proofing (0-100): exposure to growth sectors
  const futureSectors = ["Technology", "Healthcare", "Communication"];
  const futureWeight = positions
    .filter(p => futureSectors.includes(p.sector))
    .reduce((s, p) => s + (totalValue > 0 ? p.currentValue / totalValue : 0), 0);
  const future = Math.round(Math.min(100, futureWeight * 130 + 15));
  const futureLabel = futureWeight > 0.5 ? "Sehr zukunftsorientiert" : futureWeight > 0.25 ? "Solide Aufstellung" : "Eher traditionell";

  // 5. Sector Balance (0-100): how evenly spread across sectors
  const sectorMap: Record<string, number> = {};
  for (const p of positions) {
    sectorMap[p.sector] = (sectorMap[p.sector] ?? 0) + (totalValue > 0 ? p.currentValue / totalValue : 0);
  }
  const sectorCount = Object.keys(sectorMap).length;
  const sectorWeights = Object.values(sectorMap);
  const idealWeight = 1 / Math.max(sectorCount, 1);
  const deviation = sectorWeights.reduce((s, w) => s + Math.abs(w - idealWeight), 0) / Math.max(sectorCount, 1);
  const balanceRaw = (1 - deviation) * 60 + Math.min(sectorCount / 8, 1) * 40;
  const sectorBalance = Math.round(Math.min(100, Math.max(10, balanceRaw)));
  const sectorBalanceLabel = sectorCount >= 5 ? "Breit aufgestellt" : sectorCount >= 3 ? "Moderat" : "Einseitig";

  // Total: weighted average
  const total = Math.round(
    diversification * 0.25 +
    Math.min(risk, 100) * 0.20 +
    dividend * 0.15 +
    future * 0.20 +
    sectorBalance * 0.20
  );

  return {
    total: Math.min(100, total),
    diversification, risk: Math.min(100, risk), dividend, future, sectorBalance,
    labels: { diversification: divLabel, risk: riskLabel, dividend: dividendLabel, future: futureLabel, sectorBalance: sectorBalanceLabel },
  };
}

// ─────────────────────────────────────────────────────────────────
// GAUGE SVG
// ─────────────────────────────────────────────────────────────────
function ScoreGauge({ score, size = 180 }: { score: number; size?: number }) {
  const r = 70;
  const cx = size / 2;
  const cy = r + 16;
  const strokeW = 14;
  const circumference = Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - pct);
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Exzellent" : score >= 65 ? "Gut" : score >= 45 ? "Ausbaufähig" : score >= 25 ? "Schwach" : "Kritisch";
  const svgH = cy + 24;

  return (
    <svg width={size} height={svgH} viewBox={`0 0 ${size} ${svgH}`}>
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#f1f5f9" strokeWidth={strokeW} strokeLinecap="round"
      />
      {/* Score arc */}
      {score > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      )}
      {/* Score number */}
      <text x={cx} y={cy - 16} fontSize="38" fontWeight="900" fill={color} textAnchor="middle" dominantBaseline="middle" fontFamily="'Space Grotesk',Inter,sans-serif">
        {score}
      </text>
      {/* Label */}
      <text x={cx} y={cy + 8} fontSize="12" fontWeight="600" fill="#9ca3af" textAnchor="middle" fontFamily="Inter,sans-serif">
        {label}
      </text>
      {/* Scale labels */}
      <text x={cx - r - 2} y={cy + 18} fontSize="9" fill="#d1d5db" textAnchor="middle">0</text>
      <text x={cx} y={cy - r - 6} fontSize="9" fill="#d1d5db" textAnchor="middle">50</text>
      <text x={cx + r + 2} y={cy + 18} fontSize="9" fill="#d1d5db" textAnchor="middle">100</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCORE CARD
// ─────────────────────────────────────────────────────────────────
function ScoreCard({ title, score, label, icon, description }: {
  title: string; score: number; label: string; icon: React.ReactNode; description: string;
}) {
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
      padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
            {icon}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{title}</p>
            <p style={{ fontSize: 11, color: "#9ca3af" }}>{label}</p>
          </div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
      </div>
      <div style={{ width: "100%", height: 4, background: "#f1f5f9", borderRadius: 2, marginBottom: 10 }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
      <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, flex: 1 }}>{description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 20000,
      background: ok ? "#0f172a" : "#ef4444", color: "#fff",
      padding: "12px 20px", borderRadius: 12, display: "flex",
      alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      animation: "slideUp 0.25s ease", maxWidth: 340,
    }}>
      {ok ? <Check size={16} /> : <AlertTriangle size={16} />}
      <span style={{ fontSize: 13, fontWeight: 600 }}>{msg}</span>
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADD HOLDING INLINE
// ─────────────────────────────────────────────────────────────────
function AddHoldingBar({ onAdd, loading }: {
  onAdd: (stock: SelectedStock, shares: number) => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<SelectedStock | null>(null);
  const [shares, setShares] = useState("");

  const handleSelect = (stock: SelectedStock) => {
    setSelected(stock);
    setShares("");
  };

  const handleSharesChange = (raw: string) => {
    // Allow digits, comma, dot — sanitize to valid number
    const cleaned = raw.replace(/[^0-9.,]/g, "").replace(",", ".");
    setShares(cleaned);
  };

  const handleAdd = () => {
    const qty = parseFloat(shares.replace(",", "."));
    if (!selected || !qty || qty <= 0) return;
    onAdd(selected, qty);
    setSelected(null);
    setShares("");
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
      padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Plus size={18} color="#3b82f6" />
        <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Position hinzufügen</p>
      </div>

      {!selected ? (
        <div>
          <SearchWithExchange onSelect={handleSelect} placeholder="Aktie suchen — Microsoft, BMW, Nvidia, Siemens..." />
          <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 8 }}>
            Alle Börsen: XETRA, NASDAQ, NYSE, LSE, Euronext, SIX
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9",
            borderRadius: 10, padding: "10px 14px", flex: "0 0 auto",
          }}>
            <span style={{ fontSize: 10, color: "#6b7280" }}>{EXCHANGES[selected.exchange]?.flag}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{selected.symbol}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{selected.name}</span>
            <button onClick={() => setSelected(null)} style={{
              background: "none", border: "none", cursor: "pointer", padding: 2,
            }}>
              <X size={14} color="#9ca3af" />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Anteile:</label>
            <input
              type="text" inputMode="decimal" value={shares}
              onChange={e => handleSharesChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              autoFocus
              placeholder="z.B. 8"
              style={{
                width: 100, padding: "10px 12px", border: "2px solid #e5e7eb",
                borderRadius: 10, fontSize: 15, fontWeight: 700, color: "#0f172a",
                outline: "none", fontFamily: "inherit", textAlign: "center",
              }}
            />
          </div>

          <button onClick={handleAdd} disabled={!shares || parseFloat(shares) <= 0 || loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: shares && parseFloat(shares) > 0 ? "#0f172a" : "#e5e7eb",
              color: shares && parseFloat(shares) > 0 ? "#fff" : "#9ca3af",
              fontSize: 13, fontWeight: 700, cursor: shares && parseFloat(shares) > 0 ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}>
            {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
            Hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREENSHOT IMPORT — Drag & Drop or file select
// ─────────────────────────────────────────────────────────────────
function ScreenshotImport({ onExtracted }: { onExtracted: (text: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ symbol: string; name: string; shares: number | null }[]>([]);
  const [rawResult, setRawResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setProcessing(true);
    setPreview(URL.createObjectURL(file));
    setParsed([]);
    setError(null);
    setRawResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch("/api/portfolio-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "screenshot_import",
            imageBase64: base64,
            mimeType: file.type,
            systemPrompt: `Du bist ein Portfolio-Daten-Extraktor. Analysiere den Screenshot eines Broker-Portfolios und extrahiere ALLE Aktien-Positionen.

Gib NUR ein JSON-Array zurück, jedes Element mit:
- "symbol": Ticker-Symbol (z.B. "AAPL", "MSFT", "SAP")
- "name": Firmenname
- "shares": Anzahl Anteile (Zahl, falls nicht erkennbar: 1)

Beispiel: [{"symbol":"AAPL","name":"Apple Inc.","shares":8},{"symbol":"MSFT","name":"Microsoft","shares":12}]

WICHTIG: Nur das JSON-Array, kein anderer Text. Wenn du keine Positionen erkennst, gib [] zurück. Shares MUSS eine Zahl sein, niemals null.`,
            messages: [{ role: "user", content: "Extrahiere alle Aktien-Positionen aus diesem Portfolio-Screenshot." }],
          }),
        });
        const data = await res.json();
        const text = data.content || data.response || "";
        setRawResult(text);

        // Parse JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const arr = JSON.parse(jsonMatch[0]);
          if (Array.isArray(arr) && arr.length > 0) {
            setParsed(arr.filter((p: { symbol?: string }) => p.symbol));
          } else {
            setError("Keine Positionen im Screenshot erkannt.");
          }
        } else {
          setError("Keine Positionen im Screenshot erkannt.");
        }
      } catch {
        setError("Fehler bei der Bilderkennung. Bitte versuche es erneut.");
      }
      setProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImport = () => {
    if (!rawResult) return;
    onExtracted(rawResult);
    setParsed([]);
    setPreview(null);
    setRawResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setParsed([]);
    setPreview(null);
    setRawResult(null);
    setError(null);
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
      padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Camera size={18} color="#8b5cf6" />
        <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Portfolio-Screenshot importieren</p>
        <span style={{ fontSize: 10, color: "#9ca3af", background: "#f3f4f6", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>BETA</span>
      </div>

      {/* Drop zone */}
      {!preview && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#8b5cf6" : "#e5e7eb"}`,
            borderRadius: 14,
            padding: "32px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "#f5f3ff" : "#fafafa",
            transition: "all 0.2s",
          }}
        >
          <Upload size={28} color="#9ca3af" style={{ margin: "0 auto 10px" }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
            Screenshot hierher ziehen
          </p>
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            oder klicken zum Hochladen — Metrio liest dein Broker-Portfolio automatisch aus
          </p>
        </div>
      )}

      {/* Processing state */}
      {processing && preview && (
        <div style={{
          border: "2px solid #8b5cf6", borderRadius: 14, padding: 20,
          background: "#f5f3ff", display: "flex", alignItems: "center", gap: 16,
        }}>
          <img src={preview} alt="Screenshot" style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RefreshCw size={18} color="#8b5cf6" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>Metrio analysiert deinen Screenshot...</span>
          </div>
        </div>
      )}

      {/* Results: parsed positions */}
      {!processing && preview && parsed.length > 0 && (
        <div style={{ border: "2px solid #10b981", borderRadius: 14, padding: 16, background: "#f0fdf4" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <img src={preview} alt="Screenshot" style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#065f46" }}>
                {parsed.length} Position{parsed.length > 1 ? "en" : ""} erkannt
              </p>
              <p style={{ fontSize: 11, color: "#6b7280" }}>Prüfe die erkannten Aktien und klicke auf Importieren</p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {parsed.map((p, i) => (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#fff", border: "1px solid #d1fae5", borderRadius: 8,
                padding: "6px 12px", fontSize: 13,
              }}>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{p.symbol}</span>
                <span style={{ color: "#6b7280" }}>{p.name}</span>
                {p.shares && p.shares > 0 && (
                  <span style={{ color: "#8b5cf6", fontWeight: 600, fontSize: 11 }}>{p.shares}x</span>
                )}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleImport}
              style={{
                flex: 1, padding: "12px 20px", borderRadius: 10,
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff", fontWeight: 800, fontSize: 14,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Check size={16} />
              {parsed.length} Position{parsed.length > 1 ? "en" : ""} jetzt importieren
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: "12px 16px", borderRadius: 10,
                background: "#fff", color: "#6b7280", fontWeight: 600, fontSize: 13,
                border: "1px solid #e5e7eb", cursor: "pointer",
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {!processing && preview && error && (
        <div style={{ border: "2px solid #fbbf24", borderRadius: 14, padding: 16, background: "#fffbeb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={preview} alt="Screenshot" style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>{error}</p>
              <button onClick={handleReset} style={{
                marginTop: 6, fontSize: 12, color: "#8b5cf6", fontWeight: 600,
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}>
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />

      <p style={{ fontSize: 10, color: "#d1d5db", marginTop: 8 }}>
        Unterstützt: Trade Republic, Scalable Capital, ING, Comdirect, Consorsbank u.v.m.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
function PortfolioPageInner() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [profilerOpen, setProfilerOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editShares, setEditShares] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.positions) setPositions(data.positions);
        if (data.lastUpdated) setLastUpdated(new Date(data.lastUpdated));
      }
    } catch { /* ignore */ }
  }, []);

  // ── Save to localStorage
  useEffect(() => {
    if (positions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ positions, lastUpdated: lastUpdated?.toISOString() }));
    }
  }, [positions, lastUpdated]);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Fetch price for a symbol
  const fetchPrice = useCallback(async (fetchSymbol: string) => {
    const res = await fetch(`/api/quote?symbol=${encodeURIComponent(fetchSymbol)}`);
    if (!res.ok) throw new Error("Kurs nicht verfügbar");
    const d = await res.json();
    return {
      price: d.quote?.c ?? 0,
      beta: d.metrics?.beta,
      dividendYield: d.metrics?.dividendYieldIndicatedAnnual,
      sector: d.profile?.finnhubIndustry ?? "Unknown",
    };
  }, []);

  // ── Add a holding
  const handleAdd = useCallback(async (stock: SelectedStock, shares: number) => {
    const key = `${stock.symbol}:${stock.exchange}`;
    setLoading(true);
    try {
      const { price, beta, dividendYield, sector } = await fetchPrice(stock.fetchSymbol);
      if (!price || price <= 0) throw new Error("Kurs = 0");

      setPositions(prev => {
        const existing = prev.find(p => p.key === key);
        if (existing) {
          // Add shares to existing position
          const newShares = existing.shares + shares;
          return prev.map(p => p.key === key ? {
            ...p,
            shares: newShares,
            currentPrice: price,
            currentValue: price * newShares,
            avgBuyPrice: price,
            pnlAbs: 0, pnlPct: 0,
            beta: beta ?? p.beta,
            dividendYield: dividendYield ?? p.dividendYield,
          } : p);
        }
        const newPos: Position = {
          key, symbol: stock.symbol, name: stock.name,
          exchange: stock.exchange, fetchSymbol: stock.fetchSymbol,
          tvSymbol: stock.tvSymbol, currency: stock.currency,
          sector: sector || stock.sector || "Unknown",
          shares, avgBuyPrice: price, currentPrice: price,
          currentValue: price * shares, pnlAbs: 0, pnlPct: 0,
          beta, dividendYield,
        };
        return [...prev, newPos];
      });
      setLastUpdated(new Date());
      showToast(`${stock.symbol} hinzugefügt (${shares} Anteile)`);
    } catch {
      showToast(`Kurs für ${stock.symbol} nicht abrufbar`, false);
    }
    setLoading(false);
  }, [fetchPrice, showToast]);

  // ── Refresh all prices
  const refreshPrices = useCallback(async () => {
    if (positions.length === 0) return;
    setRefreshing(true);
    const updated = await Promise.all(positions.map(async p => {
      try {
        const { price, beta, dividendYield } = await fetchPrice(p.fetchSymbol);
        if (!price || price <= 0) return p;
        return {
          ...p, currentPrice: price, currentValue: price * p.shares,
          beta: beta ?? p.beta, dividendYield: dividendYield ?? p.dividendYield,
        };
      } catch { return p; }
    }));
    setPositions(updated);
    setLastUpdated(new Date());
    setRefreshing(false);
    showToast("Kurse aktualisiert");
  }, [positions, fetchPrice, showToast]);

  // ── Auto-refresh on mount
  useEffect(() => {
    if (positions.length > 0) refreshPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Remove position
  const removePosition = useCallback((key: string) => {
    setPositions(p => p.filter(x => x.key !== key));
    showToast("Position entfernt");
  }, [showToast]);

  // ── Edit shares
  const saveShares = useCallback((key: string) => {
    const qty = parseFloat(editShares.replace(",", "."));
    if (!qty || qty <= 0) return;
    setPositions(prev => prev.map(p => p.key === key ? {
      ...p, shares: qty, currentValue: p.currentPrice * qty,
    } : p));
    setEditingKey(null);
    showToast("Anteile aktualisiert");
  }, [editShares, showToast]);

  // ── Request full AI analysis
  const requestAiAnalysis = useCallback(async () => {
    if (positions.length === 0) return;
    setAiLoading(true);
    setAiAnalysis(null);

    const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);
    const bySector: Record<string, number> = {};
    for (const p of positions) {
      bySector[p.sector] = (bySector[p.sector] ?? 0) + (totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0);
    }

    const systemPrompt = `Du bist Metrio — Chief Quantitative Portfolio Analyst, Goldman Sachs Level.
Portfolio: ${positions.length} Positionen, Gesamtwert €${totalValue.toFixed(0)}.
Sektoren: ${Object.entries(bySector).map(([s, w]) => `${s} ${w.toFixed(1)}%`).join(", ")}.
Positionen: ${positions.map(p => `${p.symbol} (${p.name}, ${p.sector}, ${p.shares} Anteile, €${p.currentValue.toFixed(0)}, ${((p.currentValue / totalValue) * 100).toFixed(1)}%, Beta: ${p.beta ?? "N/A"}, Div: ${p.dividendYield?.toFixed(2) ?? "N/A"}%)`).join("; ")}.

Analysiere das Portfolio KOMPLETT:
1. Diversifikation & Klumpenrisiko
2. Risikoprofil (Beta, Volatilität)
3. Dividendenstrategie
4. Zukunftssicherheit
5. Sektorbalance
6. Konkrete Verbesserungsvorschläge (welche Aktien hinzufügen/reduzieren)

Antworte auf Deutsch. Sei präzise, nenne konkrete Zahlen. Keine generischen Tipps.
⚠️ Keine Anlageberatung. § 85 WpHG.`;

    try {
      const res = await fetch("/api/portfolio-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: [{ role: "user", content: "Vollständige Portfolio-Analyse mit konkreten Verbesserungsvorschlägen." }],
          portfolioState: { positions: positions.length, totalValue, cashBalance: 0 },
        }),
      });
      const data = await res.json();
      setAiAnalysis(data.content ?? "Analyse nicht verfügbar.");
    } catch {
      setAiAnalysis("Verbindungsfehler. Bitte erneut versuchen.");
    }
    setAiLoading(false);
  }, [positions]);

  // ── Computed
  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);
  const scores = useMemo(() => computePortfolioScores(positions), [positions]);

  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of positions) {
      map[p.sector] = (map[p.sector] ?? 0) + p.currentValue;
    }
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [positions, totalValue]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

  // Handle screenshot import results
  const handleScreenshotExtracted = useCallback(async (text: string) => {
    try {
      // Try to parse JSON array from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { showToast("Keine Positionen im Screenshot erkannt", false); return; }
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) { showToast("Keine Positionen erkannt", false); return; }

      showToast(`${parsed.length} Positionen erkannt — importiere...`);

      for (const item of parsed) {
        if (!item.symbol) continue;
        const shares = Number(item.shares) || 1;
        const entry = resolveEntry(item.symbol);
        if (entry) {
          const stock: SelectedStock = stockEntryToSelected(entry);
          await handleAdd(stock, shares);
        }
      }
      showToast(`Import abgeschlossen`);
    } catch {
      showToast("Screenshot konnte nicht verarbeitet werden", false);
    }
  }, [handleAdd, showToast]);

  // ── Steps: 1=Risikoprofil, 2=Portfolio aufbauen, 3=Beratung ─
  const [hasProfile, setHasProfile] = useState(false);
  useEffect(() => {
    const read = () => {
      try { setHasProfile(!!localStorage.getItem("alphametric_risk_profile")); } catch { /* ignore */ }
    };
    read();
    const handler = () => read();
    window.addEventListener("storage", handler);
    window.addEventListener("alphametric:risk-profile-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("alphametric:risk-profile-updated", handler);
    };
  }, []);
  const step1Done = hasProfile;
  const step2Done = positions.length > 0;
  const step3Done = positions.length > 0 && hasProfile;

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", background: "var(--am-bg)", minHeight: "100vh", color: "var(--am-text)" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input,button{font-family:inherit}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pfFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pfShimmer{0%,100%{opacity:.6}50%{opacity:1}}@keyframes pfPulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.6);opacity:0}}`}</style>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 24px" }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, animation: "pfFadeUp 0.5s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "var(--am-metal-dark, linear-gradient(135deg,#1a1d22,#0a0b0e))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px -6px rgba(10,10,14,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}>
              <PieChart size={22} color="#e6e8ee" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "var(--am-text-faint)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 4 }}>
                Dein persönlicher Investment-Coach
              </p>
              <h1 style={{ fontSize: 30, fontWeight: 900, color: "var(--am-text)", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
                Portfolio bauen. Verstehen. Verbessern.
              </h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: "var(--am-text-muted)", alignSelf: "center" }}>
                Live · {lastUpdated.toLocaleTimeString("de-DE")}
              </span>
            )}
            {positions.length > 0 && (
              <button onClick={refreshPrices} disabled={refreshing}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 12, fontWeight: 600, color: "var(--am-text)",
                  background: "var(--am-card)", border: "1px solid var(--am-border)",
                  padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.18s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--am-card-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--am-card)")}
              >
                <RefreshCw size={12} style={refreshing ? { animation: "spin 1s linear infinite" } : {}} />
                Kurse aktualisieren
              </button>
            )}
          </div>
        </div>

        {/* ── 3-STEP PROGRESS / ZAHNRAD-FLOW ── */}
        <div className="pf-steps" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          marginBottom: 36,
          marginTop: 24,
          background: "var(--am-card-soft)",
          border: "1px solid var(--am-border)",
          borderRadius: 16,
          overflow: "hidden",
          animation: "pfFadeUp 0.55s 0.05s ease both",
        }}>
          {[
            { n: 1, label: "Profil schärfen",  sub: "6 Fragen · 90 Sek.",     done: step1Done, active: !step1Done },
            { n: 2, label: "Portfolio anbinden", sub: "Suche oder Import",    done: step2Done, active: step1Done && !step2Done },
            { n: 3, label: "Metrio fragen",    sub: "Live-Beratung",          done: step3Done, active: step2Done && step1Done },
          ].map((s, i) => (
            <div key={s.n} style={{
              padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 12,
              borderRight: i < 2 ? "1px solid var(--am-border)" : "none",
              background: s.active ? "var(--am-card)" : "transparent",
              position: "relative",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: s.done ? "var(--am-accent)" : s.active ? "var(--am-card)" : "var(--am-bg-tertiary)",
                color: s.done ? "var(--am-accent-text)" : "var(--am-text)",
                border: s.active && !s.done ? "1.5px solid var(--am-accent)" : "1px solid var(--am-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, flexShrink: 0,
                fontFamily: "'Space Grotesk',Inter,sans-serif",
              }}>
                {s.done ? <Check size={15} /> : s.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--am-text)", letterSpacing: "-0.01em" }}>{s.label}</p>
                <p style={{ fontSize: 11, color: "var(--am-text-muted)", marginTop: 1 }}>{s.sub}</p>
              </div>
              {s.active && !s.done && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "var(--am-accent)",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1 — RISIKOPROFIL HERO ── */}
        <div style={{
          position: "relative",
          marginBottom: 28,
          padding: "32px 36px",
          borderRadius: 22,
          background: step1Done
            ? "linear-gradient(135deg, var(--am-card) 0%, var(--am-card-soft) 100%)"
            : "linear-gradient(135deg, #111418 0%, #1a1d22 60%, #232830 100%)",
          color: step1Done ? "var(--am-text)" : "#e6e8ee",
          border: step1Done ? "1px solid var(--am-border)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: step1Done
            ? "var(--am-shadow)"
            : "0 24px 60px -22px rgba(10,10,14,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
          overflow: "hidden",
          animation: "pfFadeUp 0.6s 0.1s ease both",
        }}>
          {/* Decorative silver mesh */}
          {!step1Done && (
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(60% 80% at 90% 20%, rgba(220,225,235,0.12), transparent 60%), radial-gradient(50% 60% at 10% 80%, rgba(180,185,195,0.07), transparent 55%)",
              pointerEvents: "none",
            }} />
          )}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: step1Done
                ? "linear-gradient(135deg, var(--am-card-soft), var(--am-card))"
                : "linear-gradient(135deg, rgba(220,225,235,0.18), rgba(140,150,170,0.10))",
              border: step1Done ? "1px solid var(--am-border)" : "1px solid rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: step1Done ? "none" : "inset 0 1px 0 rgba(255,255,255,0.18)",
            }}>
              <Brain size={28} color={step1Done ? "var(--am-accent)" : "#e6e8ee"} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <p style={{
                fontSize: 11, fontWeight: 700,
                color: step1Done ? "var(--am-text-muted)" : "rgba(230,232,238,0.72)",
                textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8,
              }}>
                Schritt 1 · {step1Done ? "Erledigt" : "Empfohlener Start"}
              </p>
              <h2 style={{
                fontSize: 26, fontWeight: 900, letterSpacing: "-0.035em",
                lineHeight: 1.18, marginBottom: 8,
                color: step1Done ? "var(--am-text)" : "#f4f5f8",
              }}>
                {step1Done ? "Dein Risikoprofil ist hinterlegt." : "In 90 Sekunden zu deinem Risikoprofil."}
              </h2>
              <p style={{
                fontSize: 14, lineHeight: 1.6,
                color: step1Done ? "var(--am-text-muted)" : "rgba(230,232,238,0.78)",
                maxWidth: 620,
              }}>
                {step1Done
                  ? "Metrio kennt deine Risikotoleranz, deinen Horizont und deine Ziele — alle Empfehlungen sind ab jetzt darauf abgestimmt."
                  : "Sechs kurze Fragen zu Risiko, Horizont und Stil — und du siehst Aktien, die zu DEINEM Leben passen. Kein Trendgebrüll, keine Influencer-Tipps. Pflichtschritt für unerfahrene Anleger, optional für Profis."}
              </p>
            </div>
            <button
              onClick={() => setProfilerOpen(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "16px 28px", borderRadius: 14,
                background: step1Done
                  ? "var(--am-card)"
                  : "linear-gradient(180deg, #f4f5f8 0%, #c8cdd4 55%, #8a9099 100%)",
                color: step1Done ? "var(--am-text)" : "#0a0b0e",
                border: step1Done ? "1px solid var(--am-border)" : "1px solid rgba(255,255,255,0.18)",
                fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em",
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: step1Done
                  ? "var(--am-shadow)"
                  : "0 8px 24px -8px rgba(10,10,14,0.45), inset 0 1px 0 rgba(255,255,255,0.6)",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Sparkles size={16} />
              {step1Done ? "Profil neu erstellen" : "Risikoprofil starten"}
            </button>
          </div>
        </div>

        {/* ── STEP 2 — PORTFOLIO AUFBAUEN (Section title) ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 14, marginTop: 8,
          animation: "pfFadeUp 0.6s 0.15s ease both",
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: 8,
            background: "var(--am-bg-tertiary)", color: "var(--am-text)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, fontFamily: "'Space Grotesk',Inter,sans-serif",
          }}>2</span>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: "var(--am-text)", letterSpacing: "-0.02em" }}>
              Portfolio anbinden
            </p>
            <p style={{ fontSize: 12, color: "var(--am-text-muted)" }}>
              Aktien manuell suchen oder Broker-Screenshot hochladen — beides funktioniert.
            </p>
          </div>
        </div>

        {/* ── METRICS BAR ── */}
        {positions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Portfoliowert", value: fEur(totalValue), icon: <BarChart2 size={16} color="#3b82f6" /> },
              { label: "Positionen", value: `${positions.length} Titel`, icon: <PieChart size={16} color="#10b981" /> },
              { label: "Metrio Score", value: `${scores.total}/100`, icon: <Brain size={16} color={scores.total >= 70 ? "#10b981" : scores.total >= 45 ? "#f59e0b" : "#ef4444"} /> },
              { label: "Sektoren", value: `${sectorData.length} Branchen`, icon: <Target size={16} color="#8b5cf6" /> },
            ].map(m => (
              <div key={m.label} style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
                padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{m.label}</span>
                  {m.icon}
                </div>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em" }}>{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── ADD HOLDING ── */}
        <AddHoldingBar onAdd={handleAdd} loading={loading} />

        {/* ── SCREENSHOT IMPORT ── */}
        <ScreenshotImport onExtracted={handleScreenshotExtracted} />

        {positions.length === 0 ? (
          /* ── EMPTY STATE ── */
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20,
            padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <div style={{ width: 64, height: 64, background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <PieChart size={28} color="#94a3b8" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              So startest du
            </h2>
            <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "left" }}>
              {[
                { step: "1", text: "Suche oben nach einer Aktie (z.B. Microsoft, BMW, Nvidia)" },
                { step: "2", text: "Gib die Anzahl der Anteile ein, die du besitzt" },
                { step: "3", text: "Metrio bewertet dein Portfolio: Diversifikation, Risiko, Dividende & mehr" },
              ].map(s => (
                <div key={s.step} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#111", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                    {s.step}
                  </div>
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, paddingTop: 3 }}>{s.text}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
              Alternativ: Ziehe einen Screenshot deines Broker-Portfolios in das Feld oben
            </p>
          </div>
        ) : (
          <>
            {/* ── PORTFOLIO SCORE + ALLOCATION ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

              {/* Score Gauge */}
              <div style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20,
                padding: "28px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
                  <Brain size={20} color="#0f172a" />
                  <p style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em" }}>
                    Metrio Portfolio Score
                  </p>
                </div>
                <ScoreGauge score={scores.total} />
              </div>

              {/* Sector Donut */}
              <div style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20,
                padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
                  Sektorverteilung
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <svg width="130" height="130" viewBox="0 0 130 130">
                    {(() => {
                      const cx = 65, cy = 65, r = 50, strokeW = 20;
                      const items = sectorData.filter(d => d.value > 0);
                      const total = items.reduce((s, i) => s + i.value, 0);
                      let cumAngle = -90;
                      return items.map((item, idx) => {
                        const angle = total > 0 ? (item.value / total) * 360 : 0;
                        const startRad = (cumAngle * Math.PI) / 180;
                        const endRad = ((cumAngle + angle) * Math.PI) / 180;
                        cumAngle += angle;
                        const x1 = cx + r * Math.cos(startRad);
                        const y1 = cy + r * Math.sin(startRad);
                        const x2 = cx + r * Math.cos(endRad);
                        const y2 = cy + r * Math.sin(endRad);
                        const largeArc = angle > 180 ? 1 : 0;
                        const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
                        return <path key={idx} d={d} fill="none" stroke={COLORS[idx % COLORS.length]} strokeWidth={strokeW} strokeLinecap="butt" />;
                      });
                    })()}
                  </svg>
                  <div style={{ flex: 1 }}>
                    {sectorData.slice(0, 7).map((item, idx) => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{f2(item.pct, 1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5 SCORE CARDS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 24 }}>
              <ScoreCard title="Diversifikation" score={scores.diversification} label={scores.labels.diversification}
                icon={<PieChart size={18} />}
                description={`${positions.length} Positionen in ${sectorData.length} Sektoren. ${scores.diversification >= 70 ? "Gute Streuung über verschiedene Branchen und Regionen." : "Mehr Positionen aus unterschiedlichen Sektoren würden das Risiko reduzieren."}`} />
              <ScoreCard title="Risikoprofil" score={scores.risk} label={scores.labels.risk}
                icon={<Shield size={18} />}
                description={`Gewichtetes Beta: ${positions.some(p => p.beta) ? f2(positions.filter(p => p.beta).reduce((s, p) => s + (p.beta! * p.currentValue / totalValue), 0)) : "N/A"}. ${scores.labels.risk === "Aggressiv" ? "Hohe Volatilität — defensivere Titel erwägen." : scores.labels.risk === "Sehr defensiv" ? "Wenig Wachstumspotenzial — Growth-Titel beimischen." : "Gute Balance zwischen Risiko und Rendite."}`} />
              <ScoreCard title="Dividendenstrategie" score={scores.dividend} label={scores.labels.dividend}
                icon={<TrendingUp size={18} />}
                description={`Gewichtete Dividendenrendite: ${f2(positions.filter(p => p.dividendYield).reduce((s, p) => s + (p.dividendYield! * (p.currentValue / totalValue)), 0))}%. ${scores.dividend >= 60 ? "Solide passive Einnahmen." : "Dividenden-ETFs oder defensive Titel könnten die Ausschüttungen stärken."}`} />
              <ScoreCard title="Zukunftssicherheit" score={scores.future} label={scores.labels.future}
                icon={<Zap size={18} />}
                description={`${f2(positions.filter(p => ["Technology", "Healthcare", "Communication"].includes(p.sector)).reduce((s, p) => s + (totalValue > 0 ? p.currentValue / totalValue * 100 : 0), 0), 1)}% in Zukunftssektoren (Tech, Healthcare, Kommunikation). ${scores.future >= 60 ? "Gut positioniert für langfristiges Wachstum." : "Mehr Exposure in Wachstumssektoren empfohlen."}`} />
              <ScoreCard title="Sektorbalance" score={scores.sectorBalance} label={scores.labels.sectorBalance}
                icon={<Target size={18} />}
                description={`${sectorData.length} Sektoren vertreten. ${sectorData[0] ? `Größter Sektor: ${sectorData[0].label} (${f2(sectorData[0].pct, 1)}%).` : ""} ${scores.sectorBalance >= 60 ? "Ausgewogene Verteilung." : "Klumpenrisiko — breiter streuen."}`} />
            </div>

            {/* ── POSITIONS TABLE ── */}
            <div style={{
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20,
              overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 24,
            }}>
              <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Positionen ({positions.length})</p>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Gesamt: {fEur(totalValue)}</p>
              </div>

              {/* Header */}
              <div style={{
                display: "grid", gridTemplateColumns: "2fr 0.8fr 1fr 1fr 0.8fr 60px",
                padding: "10px 22px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb",
              }}>
                {["Aktie", "Anteile", "Kurs", "Wert", "Anteil", ""].map(h => (
                  <p key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</p>
                ))}
              </div>

              {/* Rows */}
              {[...positions].sort((a, b) => b.currentValue - a.currentValue).map((pos, i) => {
                const weight = totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0;
                const isEditing = editingKey === pos.key;
                return (
                  <div key={pos.key} style={{
                    display: "grid", gridTemplateColumns: "2fr 0.8fr 1fr 1fr 0.8fr 60px",
                    padding: "14px 22px", borderBottom: i < positions.length - 1 ? "1px solid #f3f4f6" : "none",
                    alignItems: "center", transition: "background 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    {/* Stock info */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{pos.symbol}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#6b7280",
                          background: "#f3f4f6", padding: "2px 6px", borderRadius: 4,
                        }}>
                          {EXCHANGES[pos.exchange]?.flag} {pos.exchange}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "#6b7280" }}>{pos.name}</p>
                    </div>

                    {/* Shares (editable) */}
                    <div>
                      {isEditing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input value={editShares} onChange={e => setEditShares(e.target.value.replace(/[^0-9.,]/g, ""))}
                            onKeyDown={e => e.key === "Enter" && saveShares(pos.key)}
                            autoFocus type="text" inputMode="decimal"
                            style={{ width: 60, padding: "4px 6px", border: "1px solid #3b82f6", borderRadius: 6, fontSize: 13, fontWeight: 700, textAlign: "center", outline: "none", fontFamily: "inherit" }} />
                          <button onClick={() => saveShares(pos.key)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                            <Check size={14} color="#10b981" />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{pos.shares}</span>
                          <button onClick={() => { setEditingKey(pos.key); setEditShares(String(pos.shares)); }}
                            style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.4, padding: 2 }}>
                            <Edit2 size={11} color="#6b7280" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {fEur(pos.currentPrice, pos.currency)}
                    </p>

                    {/* Value */}
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                      {fEur(pos.currentValue, pos.currency)}
                    </p>

                    {/* Weight */}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{f2(weight, 1)}%</p>
                      <div style={{ width: "100%", height: 3, background: "#f1f5f9", borderRadius: 2, marginTop: 4 }}>
                        <div style={{ width: `${Math.min(weight, 100)}%`, height: "100%", background: "#3b82f6", borderRadius: 2 }} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => removePosition(pos.key)}
                        style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "5px 7px", cursor: "pointer", display: "flex" }}>
                        <Trash2 size={13} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── STEP 3 — METRIO CHAT (Section title) ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              marginBottom: 14, marginTop: 32,
              animation: "pfFadeUp 0.6s 0.2s ease both",
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8,
                background: "var(--am-bg-tertiary)", color: "var(--am-text)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, fontFamily: "'Space Grotesk',Inter,sans-serif",
              }}>3</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--am-text)", letterSpacing: "-0.02em" }}>
                  Live-Beratung mit Metrio
                </p>
                <p style={{ fontSize: 12, color: "var(--am-text-muted)" }}>
                  Echtzeit-Antworten zu Klumpenrisiko, FX-Exposure, Rebalancing und mehr — auf institutionellem Niveau.
                </p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: "var(--am-text-muted)",
                background: "var(--am-card-soft)", border: "1px solid var(--am-border)",
                padding: "4px 10px", borderRadius: 999, letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}>
                Groq · Llama 3.3
              </span>
            </div>

            {/* ── METRIO CHAT ── */}
            <div style={{ marginBottom: 24 }}>
              <PortfolioMetrio
                positions={positions}
                cashBalance={0}
                initialCash={0}
              />
            </div>
          </>
        )}

        {/* ── DISCLAIMER ── */}
        <div style={{ padding: "14px 18px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
            Portfolio-Analyse — keine Anlageberatung (§ 85 WpHG). Kurse via Yahoo Finance + Finnhub.
            Metrio AI generiert keine rechtsverbindlichen Empfehlungen. © 2026 AlphaMetric.
          </p>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
      {profilerOpen && (
        <PortfolioRiskProfiler
          positions={positions.map(p => ({
            symbol: p.symbol, name: p.name, sector: p.sector,
            currency: p.currency, shares: p.shares, currentValue: p.currentValue,
          }))}
          onClose={() => setProfilerOpen(false)}
        />
      )}
      <Footer />
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>Lade Portfolio…</div>}>
      <PortfolioPageInner />
    </Suspense>
  );
}
