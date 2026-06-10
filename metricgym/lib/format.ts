/**
 * de-DE formatting helpers — every number in the UI goes through these.
 * "82,5 kg", "1.847 kcal", dates "12.04." / "12. April".
 */

const numberFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const shortDateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" });
const longDateFmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long" });

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

export function formatInt(value: number): string {
  return intFmt.format(value);
}

export function formatWeight(kg: number, unit: "kg" | "lbs" = "kg"): string {
  return `${numberFmt.format(kg)} ${unit}`;
}

export function formatKcal(kcal: number): string {
  return `${intFmt.format(kcal)} kcal`;
}

export function formatGrams(g: number): string {
  return `${intFmt.format(g)} g`;
}

/** "12.04." */
export function formatShortDate(date: Date | string): string {
  return `${shortDateFmt.format(typeof date === "string" ? new Date(date) : date)}.`;
}

/** "12. April" */
export function formatLongDate(date: Date | string): string {
  return longDateFmt.format(typeof date === "string" ? new Date(date) : date);
}

/** mm:ss for the rest timer. */
export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Signed delta: "+2,5" / "−1,0". Uses a real minus sign. */
export function formatDelta(value: number): string {
  const formatted = numberFmt.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return `±0`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function weekStartIso(date: Date = new Date()): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
