/**
 * Calorie + macro targets per goal, with hard safety floors.
 *
 * - gain: +5-15% over maintenance (scaled by experience-free heuristic: we use +10%)
 * - loss: −15-25% (we use −20%)
 * - recomp: maintenance with ±10% training/rest-day cycling
 * - strength / general fitness: maintenance +5% / ±0%
 *
 * Safety floors (clamped, with a warning flag the UI must render):
 *   never below BMR × 1.0; hard floor 1,400 kcal (f) / 1,600 kcal (m).
 *
 * Protein on lean mass: 2.2 g/kg FFM when body fat is known; otherwise
 * 1.8 g/kg on ADJUSTED weight — reference weight capped at the BMI-25
 * equivalent so high-BMI users are not prescribed absurd protein numbers.
 * Fat 0.9 g/kg, remainder carbs.
 */
import type {
  CalorieTargetResult,
  CalorieWarning,
  Goal,
  MacroTargets,
  Sex,
} from "./types";
import { EngineInputError } from "./bmr";
import type { TdeeResult } from "./tdee";

const HARD_FLOOR: Record<Sex, number> = { female: 1400, male: 1600 };

const GOAL_DELTA: Record<Goal, { training: number; rest: number }> = {
  muscle_gain: { training: 0.1, rest: 0.1 },
  fat_loss: { training: -0.2, rest: -0.2 },
  recomp: { training: 0.1, rest: -0.1 },
  strength: { training: 0.05, rest: 0.05 },
  general_fitness: { training: 0, rest: 0 },
};

export interface CalorieTargetInput {
  sex: Sex;
  goal: Goal;
  bmrKcal: number;
  tdee: TdeeResult;
  weightKg: number;
  heightCm: number;
  bodyFatPct?: number;
}

function proteinGrams(input: CalorieTargetInput): number {
  if (input.bodyFatPct !== undefined) {
    const ffm = input.weightKg * (1 - input.bodyFatPct / 100);
    return Math.round(2.2 * ffm);
  }
  // Cap reference weight at the BMI-25 equivalent for high-BMI users.
  const heightM = input.heightCm / 100;
  const bmi25Weight = 25 * heightM * heightM;
  const referenceWeight = Math.min(input.weightKg, bmi25Weight);
  return Math.round(1.8 * referenceWeight);
}

function clampKcal(
  kcal: number,
  bmrKcal: number,
  sex: Sex,
  warnings: Set<CalorieWarning>,
): number {
  let result = kcal;
  if (result < bmrKcal) {
    result = bmrKcal;
    warnings.add("clamped_to_bmr");
  }
  const hardFloor = HARD_FLOOR[sex];
  if (result < hardFloor) {
    result = hardFloor;
    warnings.add("clamped_to_hard_floor");
  }
  return Math.round(result);
}

function macros(kcal: number, proteinG: number, weightKg: number): MacroTargets {
  const fatG = Math.round(0.9 * weightKg);
  const remainder = kcal - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remainder / 4));
  return { kcal, proteinG, fatG, carbsG };
}

export function calorieTarget(input: CalorieTargetInput): CalorieTargetResult {
  if (input.bmrKcal <= 0 || input.weightKg <= 0 || input.heightCm <= 0) {
    throw new EngineInputError("bmrKcal, weightKg and heightCm must be positive");
  }
  const delta = GOAL_DELTA[input.goal];
  const warnings = new Set<CalorieWarning>();

  const trainingKcal = clampKcal(
    input.tdee.trainingDay * (1 + delta.training),
    input.bmrKcal,
    input.sex,
    warnings,
  );
  const restKcal = clampKcal(
    input.tdee.restDay * (1 + delta.rest),
    input.bmrKcal,
    input.sex,
    warnings,
  );

  const proteinG = proteinGrams(input);
  return {
    trainingDay: macros(trainingKcal, proteinG, input.weightKg),
    restDay: macros(restKcal, proteinG, input.weightKg),
    maintenanceKcal: input.tdee.weeklyAvg,
    warnings: [...warnings],
  };
}
