/**
 * Unit conversion with round-trip stability and plate rounding.
 *
 * Round-trip contract: converting kg → lbs → kg (or lbs → kg → lbs)
 * never drifts more than 0.1. To guarantee that, kg (the canonical
 * storage unit) keeps 2 decimals while display-lbs keeps 1 — rounding
 * both directions to 1 decimal can drift up to 0.11 lbs.
 */

const LBS_PER_KG = 2.2046226218;

/** Display conversion: 1 decimal. */
export function kgToLbs(kg: number): number {
  return Math.round(kg * LBS_PER_KG * 10) / 10;
}

/** Storage conversion: 2 decimals (kg is the canonical unit). */
export function lbsToKg(lbs: number): number {
  return Math.round((lbs / LBS_PER_KG) * 100) / 100;
}

/** Smallest loadable jump: 2×1.25 kg plates = 2.5 kg, or 2×2.5 lbs = 5 lbs. */
export function roundToPlate(weight: number, unit: "kg" | "lbs"): number {
  const step = unit === "kg" ? 2.5 : 5;
  return Math.round(weight / step) * step;
}
