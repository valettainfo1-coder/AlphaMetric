/**
 * Double progression with per-exercise increment table.
 *
 * Rules:
 * - Hit the top of the rep range on all sets at RPE ≤ 8 → increment load.
 * - Missed the bottom of the rep range 2 consecutive sessions → reactive
 *   deload: −10% load, reset the miss counter.
 * - Reactive deload is SUPPRESSED during a scheduled deload week and the
 *   trigger counter resets (no double deload).
 * - Isolation movements progress reps first, load second.
 */
import type { IncrementClass } from "./types";

/** Load jump in kg per increment class. */
export const INCREMENT_KG: Record<IncrementClass, number> = {
  barbell_lower: 2.5, // conservative default of the 2.5-5 kg window
  barbell_upper: 2.5,
  dumbbell: 2, // per hand
  machine: 5, // default stack step
  isolation: 2.5, // only after rep progression is exhausted
  bodyweight: 0, // rep progression only
};

export interface SetPerformance {
  weightKg: number;
  reps: number;
  rpe?: number;
}

export interface ProgressionInput {
  incrementClass: IncrementClass;
  repMin: number;
  repMax: number;
  /** All working sets of the last session for this exercise. */
  lastSession: SetPerformance[];
  /** Consecutive prior sessions (incl. last) where bottom of range was missed. */
  consecutiveMisses: number;
  /** True while inside a scheduled deload week. */
  inScheduledDeload: boolean;
}

export type ProgressionAction = "increment" | "hold" | "add_rep" | "reactive_deload";

export interface ProgressionResult {
  action: ProgressionAction;
  nextWeightKg: number;
  nextRepTarget: number;
  /** Carry-over miss counter for the caller to persist. */
  consecutiveMisses: number;
}

export function progressExercise(input: ProgressionInput): ProgressionResult {
  const { repMin, repMax, lastSession, incrementClass } = input;
  const first = lastSession[0];
  if (!first) {
    return { action: "hold", nextWeightKg: 0, nextRepTarget: repMin, consecutiveMisses: 0 };
  }
  const weight = first.weightKg;

  const allTopAtRpeCap = lastSession.every(
    (s) => s.reps >= repMax && (s.rpe ?? 8) <= 8,
  );
  const missedBottom = lastSession.some((s) => s.reps < repMin);

  // Scheduled deload week: never trigger a reactive deload on top of it,
  // and reset the miss counter so week 1 starts clean.
  if (input.inScheduledDeload) {
    return {
      action: "hold",
      nextWeightKg: weight,
      nextRepTarget: repMin,
      consecutiveMisses: 0,
    };
  }

  if (missedBottom) {
    const misses = input.consecutiveMisses + 1;
    if (misses >= 2) {
      return {
        action: "reactive_deload",
        nextWeightKg: round2p5friendly(weight * 0.9),
        nextRepTarget: repMin,
        consecutiveMisses: 0,
      };
    }
    return { action: "hold", nextWeightKg: weight, nextRepTarget: repMin, consecutiveMisses: misses };
  }

  if (allTopAtRpeCap) {
    // Isolation: exhaust rep progression before touching load.
    if (incrementClass === "isolation" || incrementClass === "bodyweight") {
      const maxReps = Math.max(...lastSession.map((s) => s.reps));
      if (maxReps < repMax + 2 && incrementClass === "isolation") {
        return {
          action: "add_rep",
          nextWeightKg: weight,
          nextRepTarget: maxReps + 1,
          consecutiveMisses: 0,
        };
      }
      if (incrementClass === "bodyweight") {
        return {
          action: "add_rep",
          nextWeightKg: weight,
          nextRepTarget: maxReps + 1,
          consecutiveMisses: 0,
        };
      }
    }
    return {
      action: "increment",
      nextWeightKg: weight + INCREMENT_KG[incrementClass],
      nextRepTarget: repMin,
      consecutiveMisses: 0,
    };
  }

  // Inside the range: keep the weight, chase reps.
  return { action: "add_rep", nextWeightKg: weight, nextRepTarget: repMax, consecutiveMisses: 0 };
}

/** Rest recommendations in seconds. */
export function restSeconds(isCompound: boolean): number {
  return isCompound ? 165 : 75; // compounds 150-180s, isolation 60-90s
}

function round2p5friendly(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}
