/**
 * Total daily energy expenditure — WITHOUT double counting training.
 *
 * The classic "activity multiplier" tables (1.2 sedentary … 1.9 athlete)
 * bake training into the multiplier. We separate the two:
 *
 *   TDEE_rest     = BMR × NEAT multiplier   (non-exercise activity ONLY, 1.2-1.55)
 *   TDEE_training = TDEE_rest + kcal_session
 *   kcal_session  = MET (5.0 for strength training) × bodyweight_kg × duration_h
 *
 * This way a desk worker who lifts 4×/week is not treated like a roofer,
 * and adding a training day changes exactly one term.
 */
import type { ActivityLevel } from "./types";
import { EngineInputError } from "./bmr";

/** NEAT multipliers: non-exercise activity only. */
export const NEAT_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.3,
  moderate: 1.4,
  active: 1.475,
  very_active: 1.55,
};

const STRENGTH_TRAINING_MET = 5.0;

/** Energy cost of one strength session: MET × kg × hours. */
export function sessionKcal(bodyweightKg: number, durationMin: number): number {
  if (bodyweightKg <= 0 || durationMin <= 0) {
    throw new EngineInputError("bodyweightKg and durationMin must be positive");
  }
  return Math.round(STRENGTH_TRAINING_MET * bodyweightKg * (durationMin / 60));
}

export interface TdeeResult {
  restDay: number;
  trainingDay: number;
  /** Weekly average given daysPerWeek training days. */
  weeklyAvg: number;
}

export function tdee(
  bmrKcal: number,
  activityLevel: ActivityLevel,
  bodyweightKg: number,
  sessionLengthMin: number,
  daysPerWeek: number,
): TdeeResult {
  if (bmrKcal <= 0) throw new EngineInputError("bmrKcal must be positive");
  if (daysPerWeek < 0 || daysPerWeek > 7) {
    throw new EngineInputError("daysPerWeek must be within 0-7");
  }
  const restDay = Math.round(bmrKcal * NEAT_MULTIPLIERS[activityLevel]);
  const trainingDay = restDay + sessionKcal(bodyweightKg, sessionLengthMin);
  const weeklyAvg = Math.round(
    (trainingDay * daysPerWeek + restDay * (7 - daysPerWeek)) / 7,
  );
  return { restDay, trainingDay, weeklyAvg };
}
