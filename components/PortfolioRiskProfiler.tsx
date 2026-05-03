"use client";
// ═══════════════════════════════════════════════════════════════════
// PORTFOLIO RISK PROFILER
// A multi-step questionnaire that captures the user's risk tolerance,
// investment horizon, goals, and style — then asks Metrio for a
// personalized list of stock suggestions that complement the portfolio.
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Brain, ChevronRight, ChevronLeft, X, Sparkles, Loader2 } from "lucide-react";

interface Position {
  symbol: string;
  name: string;
  sector: string;
  currency: string;
  shares: number;
  currentValue: number;
}

interface Props {
  positions: Position[];
  onClose: () => void;
}

interface Profile {
  risk:     "defensive" | "balanced" | "offensive" | "speculative" | "";
  horizon:  "short" | "medium" | "long" | "";
  goal:     "income" | "growth" | "balanced" | "preservation" | "";
  style:    "value" | "growth" | "quality" | "momentum" | "mixed" | "";
  regions:  string[];
  exclude:  string[]; // sectors to avoid
}

const RISK_OPTIONS = [
  { key: "defensive",   label: "Defensiv",    desc: "Kapitalerhalt, max. 10% Drawdown tolerierbar" },
  { key: "balanced",    label: "Ausgewogen",  desc: "Wachstum + Stabilität, 15–25% Drawdown ok" },
  { key: "offensive",   label: "Offensiv",    desc: "Wachstum priorisiert, 30–40% Drawdown ok" },
  { key: "speculative", label: "Spekulativ",  desc: "Max. Rendite, Totalverlust einzelner Titel ok" },
] as const;

const HORIZON_OPTIONS = [
  { key: "short",  label: "1–3 Jahre",  desc: "Kurzfristig — Liquidität wichtig" },
  { key: "medium", label: "3–10 Jahre", desc: "Mittelfristig — Marktzyklen aussitzen" },
  { key: "long",   label: "10+ Jahre",  desc: "Langfristig — Zinseszins maximieren" },
] as const;

const GOAL_OPTIONS = [
  { key: "income",       label: "Einkommen",      desc: "Dividenden, stetige Cashflows" },
  { key: "growth",       label: "Wachstum",       desc: "Kapitalzuwachs, Compounding" },
  { key: "balanced",     label: "Ausgewogen",     desc: "Wachstum + moderates Einkommen" },
  { key: "preservation", label: "Erhaltung",      desc: "Inflation schlagen, nicht mehr" },
] as const;

const STYLE_OPTIONS = [
  { key: "value",    label: "Value",    desc: "Günstig bewertete Substanzwerte" },
  { key: "growth",   label: "Growth",   desc: "Hoher Umsatz-/EPS-Wachstum" },
  { key: "quality",  label: "Quality",  desc: "Hohe ROE, stabile Margen, Burggraben" },
  { key: "momentum", label: "Momentum", desc: "Relative Stärke, Trendfolger" },
  { key: "mixed",    label: "Mixed",    desc: "Über alle Faktoren diversifiziert" },
] as const;

const REGIONS = ["USA", "Europa", "Deutschland", "Asien", "Emerging Markets"];
const EXCLUDE_OPTS = ["Tabak", "Waffen", "Öl & Gas", "Glücksspiel", "Kohle"];

export default function PortfolioRiskProfiler({ positions, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({
    risk: "", horizon: "", goal: "", style: "",
    regions: [], exclude: [],
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<string>("");
  const [error, setError]     = useState<string>("");

  const canNext = (() => {
    if (step === 0) return profile.risk !== "";
    if (step === 1) return profile.horizon !== "";
    if (step === 2) return profile.goal !== "";
    if (step === 3) return profile.style !== "";
    if (step === 4) return profile.regions.length > 0;
    return true;
  })();

  const totalSteps = 6;
  const progress = ((step + 1) / totalSteps) * 100;

  const submit = async () => {
    setLoading(true);
    setError("");

    const sectorMap: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;
    for (const p of positions) {
      totalValue += p.currentValue;
      const s = p.sector || "Sonstiges";
      if (!sectorMap[s]) sectorMap[s] = { count: 0, value: 0 };
      sectorMap[s].count += 1;
      sectorMap[s].value += p.currentValue;
    }
    const sectorLines = Object.entries(sectorMap)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([sec, { count, value }]) => `  - ${sec}: ${count} Titel, ${totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : "0"}% Gewichtung`)
      .join("\n");

    const holdingsLines = positions.length > 0
      ? positions.map(p => `  - ${p.symbol} (${p.name}) · ${p.sector} · ${p.currency}`).join("\n")
      : "  (leeres Portfolio)";

    const systemPrompt = `Du bist Metrio — Ex-Goldman MD, Ex-McKinsey Senior Partner, Harvard Professor für Kapitalmärkte, ehemaliger $14B Hedge-Fund-Manager (23% CAGR über 9 Jahre). Du bist einer der brilliantesten Köpfe im Investment-Research weltweit.

AUFGABE: Erstelle eine personalisierte Stock-Empfehlungsliste (5–8 Titel), die zum Risikoprofil und den Zielen des Users passt UND Diversifikationslücken im bestehenden Portfolio schließt.

VORGEHEN:
1. Kurze Profil-Analyse (2–3 Sätze): Was sagt das Profil über den User aus?
2. Portfolio-Gap-Analyse: Welche Sektoren/Regionen/Faktoren fehlen?
3. **5–8 konkrete Ticker-Empfehlungen** — je mit:
   - **Ticker & Name · Börse**
   - 1 Satz: Warum genau dieser Titel zum Profil passt
   - 1 Satz: Welche Lücke im Portfolio er schließt
   - Risiko-Einschätzung (niedrig / mittel / hoch)
4. Allokations-Vorschlag in Prozent (z.B. 15% Position X, 10% Y …)
5. Ein kurzer Risiko-Hinweis-Satz spezifisch für dieses Profil

FORMAT: Markdown. **Fett** für Ticker und Zahlen. Keine generischen Floskeln — jede Zeile muss substanzielle Information enthalten.

PFLICHT AM ENDE: "Keine Anlageberatung. Finanzbildung gemäß § 85 WpHG."`;

    const userMessage = `Mein Risikoprofil:
• Risikobereitschaft: ${profile.risk}
• Horizont: ${profile.horizon}
• Ziel: ${profile.goal}
• Stil: ${profile.style}
• Bevorzugte Regionen: ${profile.regions.join(", ") || "keine Präferenz"}
• Ausschluss-Sektoren: ${profile.exclude.join(", ") || "keine"}

Aktuelles Portfolio (${positions.length} Positionen, Gesamtwert €${totalValue.toFixed(2)}):
${holdingsLines}

Sektor-Verteilung:
${sectorLines || "  (keine)"}

Gib mir jetzt deine 5–8 personalisierten Kauf-Kandidaten mit Begründung und Allokationsvorschlag.`;

    try {
      const res = await fetch("/api/portfolio-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          portfolioState: { positions: positions.length, totalValue, cashBalance: 0 },
        }),
      });
      const data = await res.json();
      if (data.content) {
        setResult(data.content);
        setStep(totalSteps);
        // Persist the profile so the Portfolio page can mark step 1 as done
        try {
          localStorage.setItem("alphametric_risk_profile", JSON.stringify({
            ...profile,
            createdAt: new Date().toISOString(),
          }));
          // Notify same-tab listeners
          window.dispatchEvent(new CustomEvent("alphametric:risk-profile-updated"));
        } catch { /* ignore quota */ }
      } else {
        setError(data.error || "Metrio konnte keine Analyse erstellen.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindungsfehler");
    }
    setLoading(false);
  };

  const toggleRegion = (r: string) => {
    setProfile(p => ({
      ...p,
      regions: p.regions.includes(r) ? p.regions.filter(x => x !== r) : [...p.regions, r],
    }));
  };

  const toggleExclude = (r: string) => {
    setProfile(p => ({
      ...p,
      exclude: p.exclude.includes(r) ? p.exclude.filter(x => x !== r) : [...p.exclude, r],
    }));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="am-glass"
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 620, maxHeight: "90vh",
          background: "var(--am-card)",
          border: "1px solid var(--am-border)",
          borderRadius: 20,
          boxShadow: "var(--am-shadow-lg)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          fontFamily: "'Inter','Helvetica Neue',sans-serif",
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--am-border-light)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--am-accent), var(--am-accent-hover))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={18} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--am-text)" }}>
                Metrio Risiko-Profiler
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--am-text-muted)" }}>
                Personalisierte Empfehlungen — auf dein Profil zugeschnitten
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, border: "none", borderRadius: 8,
              background: "var(--am-card-hover)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} color="var(--am-text-muted)" />
          </button>
        </div>

        {/* ── PROGRESS BAR ── */}
        {step < totalSteps && (
          <div style={{ height: 3, background: "var(--am-border-light)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: "linear-gradient(90deg, var(--am-accent), var(--am-accent-hover))",
              transition: "width 0.3s ease",
            }} />
          </div>
        )}

        {/* ── BODY ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 22px" }}>
          {step === 0 && (
            <QuestionBlock
              title="Wie viel Risiko bist du bereit zu tragen?"
              subtitle="Drawdown = temporärer Kursrückgang vom letzten Hoch."
              options={RISK_OPTIONS}
              value={profile.risk}
              onSelect={v => setProfile(p => ({ ...p, risk: v as Profile["risk"] }))}
            />
          )}
          {step === 1 && (
            <QuestionBlock
              title="Wie lang ist dein Anlagehorizont?"
              subtitle="Kürzer = weniger Risiko. Länger = mehr Kompounding."
              options={HORIZON_OPTIONS}
              value={profile.horizon}
              onSelect={v => setProfile(p => ({ ...p, horizon: v as Profile["horizon"] }))}
            />
          )}
          {step === 2 && (
            <QuestionBlock
              title="Was ist dein primäres Ziel?"
              subtitle="Bestimmt Dividenden- vs. Growth-Gewichtung."
              options={GOAL_OPTIONS}
              value={profile.goal}
              onSelect={v => setProfile(p => ({ ...p, goal: v as Profile["goal"] }))}
            />
          )}
          {step === 3 && (
            <QuestionBlock
              title="Welcher Investment-Stil passt zu dir?"
              subtitle="Orientiert an Fama–French-Faktoren."
              options={STYLE_OPTIONS}
              value={profile.style}
              onSelect={v => setProfile(p => ({ ...p, style: v as Profile["style"] }))}
            />
          )}
          {step === 4 && (
            <ChipBlock
              title="Welche Regionen bevorzugst du?"
              subtitle="Mehrfachauswahl möglich."
              options={REGIONS}
              selected={profile.regions}
              onToggle={toggleRegion}
            />
          )}
          {step === 5 && (
            <ChipBlock
              title="Welche Sektoren möchtest du AUSSCHLIESSEN?"
              subtitle="Optional — ESG-Filter."
              options={EXCLUDE_OPTS}
              selected={profile.exclude}
              onToggle={toggleExclude}
            />
          )}

          {step === totalSteps && (
            <div>
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", padding: "40px 0", color: "var(--am-text-muted)" }}>
                  <Loader2 size={20} className="spin" /> Metrio analysiert dein Portfolio…
                </div>
              )}
              {error && (
                <div style={{
                  padding: "14px 18px", borderRadius: 10,
                  background: "var(--am-red-bg)", color: "var(--am-red-text)",
                  border: "1px solid var(--am-red-text)",
                  fontSize: 13, fontWeight: 600,
                }}>
                  {error}
                </div>
              )}
              {result && (
                <div style={{
                  fontSize: 14, lineHeight: 1.7, color: "var(--am-text-secondary)",
                  whiteSpace: "pre-wrap",
                }}>
                  {result.split("\n").map((line, i) => {
                    // Naive bold rendering: **text**
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={i} style={{ margin: "0 0 10px 0" }}>
                        {parts.map((p, j) => p.startsWith("**") && p.endsWith("**")
                          ? <strong key={j} style={{ color: "var(--am-text)" }}>{p.slice(2, -2)}</strong>
                          : <span key={j}>{p}</span>
                        )}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER (nav buttons) ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", gap: 10,
          padding: "16px 22px", borderTop: "1px solid var(--am-border-light)",
          background: "var(--am-card-soft)",
        }}>
          {step === totalSteps ? (
            <button
              onClick={onClose}
              style={{
                marginLeft: "auto",
                padding: "10px 22px", borderRadius: 10,
                background: "var(--am-accent)", color: "var(--am-accent-text)",
                border: "none", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Schließen
            </button>
          ) : (
            <>
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "10px 16px", borderRadius: 10,
                  background: "transparent", color: "var(--am-text-muted)",
                  border: "1px solid var(--am-border)",
                  fontSize: 13, fontWeight: 600,
                  cursor: step === 0 ? "not-allowed" : "pointer",
                  opacity: step === 0 ? 0.4 : 1,
                  fontFamily: "inherit",
                }}
              >
                <ChevronLeft size={14} /> Zurück
              </button>
              <button
                onClick={() => {
                  if (step === 5) submit();
                  else setStep(s => s + 1);
                }}
                disabled={!canNext || loading}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 22px", borderRadius: 10,
                  background: "var(--am-accent)", color: "var(--am-accent-text)",
                  border: "none", fontSize: 13, fontWeight: 700,
                  cursor: !canNext || loading ? "not-allowed" : "pointer",
                  opacity: !canNext || loading ? 0.4 : 1,
                  fontFamily: "inherit",
                }}
              >
                {step === 5 ? (<><Sparkles size={14} /> Empfehlungen generieren</>) : (<>Weiter <ChevronRight size={14} /></>)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QUESTION BLOCK ──────────────────────────────────────────────
function QuestionBlock({ title, subtitle, options, value, onSelect }: {
  title: string; subtitle?: string;
  options: readonly { key: string; label: string; desc: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--am-text)", letterSpacing: "-0.02em" }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ margin: "4px 0 18px 0", fontSize: 13, color: "var(--am-text-muted)" }}>
          {subtitle}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map(o => {
          const selected = value === o.key;
          return (
            <button
              key={o.key}
              onClick={() => onSelect(o.key)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                gap: 3, textAlign: "left",
                padding: "14px 18px",
                background: selected ? "var(--am-blue-bg)" : "var(--am-card-soft)",
                border: selected ? "1.5px solid var(--am-accent)" : "1px solid var(--am-border)",
                borderRadius: 12,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--am-text)" }}>{o.label}</span>
              <span style={{ fontSize: 12, color: "var(--am-text-muted)" }}>{o.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CHIP BLOCK ──────────────────────────────────────────────────
function ChipBlock({ title, subtitle, options, selected, onToggle }: {
  title: string; subtitle?: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--am-text)", letterSpacing: "-0.02em" }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ margin: "4px 0 18px 0", fontSize: 13, color: "var(--am-text-muted)" }}>
          {subtitle}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(o => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              onClick={() => onToggle(o)}
              style={{
                padding: "10px 16px", borderRadius: 999,
                background: active ? "var(--am-accent)" : "var(--am-card-soft)",
                color:      active ? "var(--am-accent-text)" : "var(--am-text-secondary)",
                border:     active ? "1.5px solid var(--am-accent)" : "1px solid var(--am-border)",
                fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
