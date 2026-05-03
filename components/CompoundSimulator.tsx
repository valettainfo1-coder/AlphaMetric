"use client";
// ═══════════════════════════════════════════════════════════════════
// COMPOUND INTEREST SIMULATOR — Epic 4
// Interactive sliders + Recharts 4-line chart:
//   S&P 500 (10%), MSCI World (7.5%), Tagesgeld (2.5%), Inflation (-2%)
// ═══════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── TYPES ───────────────────────────────────────────────────────
interface DataPoint {
  year:        number;
  sp500:       number;
  msciWorld:   number;
  tagesgeld:   number;
  inflation:   number;
}

// ─── FORMAT HELPERS ──────────────────────────────────────────────
const fEur = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

const fEurShort = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
};

// ─── COMPOUND CALCULATION ────────────────────────────────────────
function calcTimeline(initial: number, monthly: number, years: number, annualRate: number): number[] {
  const result: number[] = [initial];
  const mr = annualRate / 100 / 12;
  let balance = initial;
  for (let m = 1; m <= years * 12; m++) {
    balance = balance * (1 + mr) + monthly;
    if (m % 12 === 0) result.push(balance);
  }
  return result;
}

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: "var(--am-card)", border: "1px solid var(--am-border)", borderRadius: 12,
      padding: "14px 18px", boxShadow: "var(--am-shadow-lg)",
      fontFamily: "'Inter',sans-serif",
    }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: "var(--am-text)", marginBottom: 10 }}>
        Jahr {label}
      </p>
      {payload.map(entry => (
        <div key={entry.name} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 20, marginBottom: 5,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color }} />
            <span style={{ fontSize: 12, color: "var(--am-text-muted)" }}>{entry.name}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--am-text)", fontVariantNumeric: "tabular-nums" }}>
            {fEur(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function CompoundSimulator() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears]     = useState(20);

  // Build data for 4 strategies
  const chartData = useMemo<DataPoint[]>(() => {
    const sp  = calcTimeline(initial, monthly, years, 10.0);
    const msc = calcTimeline(initial, monthly, years, 7.5);
    const tg  = calcTimeline(initial, monthly, years, 2.5);
    const inf = calcTimeline(initial, monthly, years, -2.0);
    return sp.map((_, i) => ({
      year:      i,
      sp500:     Math.round(sp[i]),
      msciWorld: Math.round(msc[i]),
      tagesgeld: Math.round(tg[i]),
      inflation: Math.round(inf[i]),
    }));
  }, [initial, monthly, years]);

  const totalDeposits = initial + monthly * years * 12;
  const sp500Final    = chartData[chartData.length - 1]?.sp500 ?? 0;
  const msciWorldFinal = chartData[chartData.length - 1]?.msciWorld ?? 0;

  const sliders = [
    { label: "Startkapital",          value: initial, set: setInitial, min: 0,  max: 100000, step: 1000, fmt: fEur },
    { label: "Monatliche Sparrate",   value: monthly, set: setMonthly, min: 0,  max: 5000,   step: 50,   fmt: fEur },
    { label: "Anlagehorizont (Jahre)", value: years,   set: setYears,   min: 5,  max: 50,     step: 1,    fmt: (v: number) => `${v} Jahre` },
  ];

  return (
    <section style={{ maxWidth: 880, margin: "0 auto", padding: "80px 24px" }}>
      <style>{`
        @media (max-width: 640px) {
          .cs-slider-grid { grid-template-columns: 1fr !important; }
          .cs-result-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--am-accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
          Zinseszins-Simulator
        </p>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: "var(--am-text)", letterSpacing: "-0.04em", lineHeight: 1.2 }}>
          Zeit ist dein wichtigstes Asset
        </h2>
        <p style={{ fontSize: 15, color: "var(--am-text-muted)", marginTop: 10, maxWidth: 520, margin: "10px auto 0" }}>
          Vergleiche vier Strategien: S&P 500, MSCI World, Tagesgeld und Kaufkraftverlust durch Inflation.
        </p>
      </div>

      <div style={{ background: "var(--am-card)", border: "1px solid var(--am-border)", borderRadius: 20, padding: 28, boxShadow: "var(--am-shadow)" }}>
        {/* ── SLIDERS ── */}
        <div className="cs-slider-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 28 }}>
          {sliders.map(s => (
            <div key={s.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: "var(--am-text-muted)", fontWeight: 600 }}>{s.label}</label>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--am-text)" }}>{s.fmt(s.value)}</span>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                onChange={e => s.set(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--am-accent)", cursor: "pointer" }} />
            </div>
          ))}
        </div>

        {/* ── CHART ── */}
        <div style={{
          background: "var(--am-card-soft)", borderRadius: 14, padding: "20px 8px 8px 0",
          border: "1px solid var(--am-border-light)", marginBottom: 24,
        }}>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v: number) => `${v}J`}
                stroke="#d1d5db"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v: number) => `€${fEurShort(v)}`}
                stroke="#d1d5db"
                width={65}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 12 }}
              />
              <Line type="monotone" dataKey="sp500"     name="S&P 500 (10%)"   stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="msciWorld"  name="MSCI World (7.5%)" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="tagesgeld"  name="Tagesgeld (2.5%)" stroke="#9ca3af" strokeWidth={2}   dot={false} activeDot={{ r: 4 }} strokeDasharray="6 3" />
              <Line type="monotone" dataKey="inflation"  name="Inflation (-2%)"  stroke="#ef4444" strokeWidth={2}   dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── RESULT CARDS ── */}
        <div className="cs-result-grid" style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12,
          padding: "20px 0 0", borderTop: "1px solid var(--am-border-light)",
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--am-text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Eingezahlt</p>
            <p style={{ fontSize: 17, fontWeight: 900, color: "var(--am-text)" }}>{fEur(totalDeposits)}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--am-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>S&P 500</p>
            <p style={{ fontSize: 17, fontWeight: 900, color: "var(--am-text)" }}>{fEur(sp500Final)}</p>
            <p style={{ fontSize: 10, color: "var(--am-text-muted)", marginTop: 2 }}>+{fEur(sp500Final - totalDeposits)} Gewinn</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--am-accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>MSCI World</p>
            <p style={{ fontSize: 17, fontWeight: 900, color: "var(--am-accent)" }}>{fEur(msciWorldFinal)}</p>
            <p style={{ fontSize: 10, color: "var(--am-text-muted)", marginTop: 2 }}>+{fEur(msciWorldFinal - totalDeposits)} Gewinn</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--am-red-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Kaufkraftverlust</p>
            <p style={{ fontSize: 17, fontWeight: 900, color: "var(--am-red-text)" }}>{fEur(chartData[chartData.length - 1]?.inflation ?? 0)}</p>
            <p style={{ fontSize: 10, color: "var(--am-text-muted)", marginTop: 2 }}>
              {fEur((chartData[chartData.length - 1]?.inflation ?? 0) - totalDeposits)} real
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
