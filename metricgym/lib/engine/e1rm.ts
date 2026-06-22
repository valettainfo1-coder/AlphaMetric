/**
 * Estimated 1-rep max.
 *
 * Formulas: Epley (default) and Brzycki. Both lose validity fast beyond
 * 10 reps, so reps > 10 returns lowConfidence: true (value still computed
 * from the formula, clamped at 10 effective reps would distort trends).
 *
 * RPE adjustment: a set of 8 reps @ RPE 8 had ~2 reps in reserve, so the
 * effective rep count for the formula is reps + (10 − RPE). Missing RPE
 * assumes 8 (typical hard working set).
 *
 * reps === 1 with RPE 10 ⇒ e1RM = weight exactly.
 */
import type { E1RMResult } from "./types";
import { EngineInputError } from "./bmr";

export type E1RMFormula = "epley" | "brzycki";

export function epley(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

export function brzycki(weightKg: number, reps: number): number {
  if (reps >= 37) throw new EngineInputError("brzycki undefined for reps >= 37");
  return (weightKg * 36) / (37 - reps);
}

export interface E1RMInput {
  weightKg: number;
  reps: number;
  /** 6-10; missing assumes 8 */
  rpe?: number;
  formula?: E1RMFormula;
}

export function e1rm(input: E1RMInput): E1RMResult {
  const { weightKg, reps } = input;
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new EngineInputError(`weightKg must be positive, got ${weightKg}`);
  }
  if (!Number.isInteger(reps) || reps <= 0) {
    throw new EngineInputError(`reps must be a positive integer, got ${reps}`);
  }
  const rpe = input.rpe ?? 8;
  if (rpe < 1 || rpe > 10) {
    throw new EngineInputError(`rpe must be within 1-10, got ${rpe}`);
  }

  // Spec invariant: a single counts as the 1RM itself, regardless of RPE.
  if (reps === 1) {
    return { value: round1(weightKg), lowConfidence: false };
  }

  const effectiveReps = reps + (10 - rpe);

  const formula = input.formula ?? "epley";
  const raw =
    formula === "epley" ? epley(weightKg, effectiveReps) : brzycki(weightKg, effectiveReps);

  return { value: round1(raw), lowConfidence: reps > 10 };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
