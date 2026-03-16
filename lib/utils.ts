// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS — AlphaMetric
// ═══════════════════════════════════════════════════════════════════

export function f(n: number | undefined, d = 2): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toFixed(d);
}

export function fLarge(n: number | undefined): string {
  if (!n || isNaN(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString("de-DE");
}

export function fCur(val: number | undefined, currency = "USD"): string {
  if (val === undefined || val === null || isNaN(val)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function fPct(val: number | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return "—";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

export const TIME_RANGES = [
  { label: "1T", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "1J", value: "1Y" },
  { label: "5J", value: "5Y" },
];
