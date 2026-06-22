/**
 * Composition root of the engine: AssessmentInput → Performance Profile.
 * This is what the onboarding reveal renders and what gets persisted as
 * assessments.computed_output (versioned via ASSESSMENT_SCHEMA_VERSION).
 */
import type { AssessmentInput, CalorieTargetResult, E1RMResult, ExerciseDef, MainLift } from "./types";
import { ageFromBirthdate, bmr } from "./bmr";
import { tdee, type TdeeResult } from "./tdee";
import { calorieTarget } from "./calorieTarget";
import { e1rm } from "./e1rm";
import { generatePlan, type GeneratedPlan } from "./planGenerator";

export const ASSESSMENT_SCHEMA_VERSION = 1;

export interface ComputedProfile {
  schemaVersion: number;
  bmrKcal: number;
  tdee: TdeeResult;
  targets: CalorieTargetResult;
  plan: GeneratedPlan;
  e1rmBaseline: Partial<Record<MainLift, E1RMResult>>;
}

export function computeProfile(
  input: AssessmentInput,
  library: ExerciseDef[],
  now: Date = new Date(),
): ComputedProfile {
  const bmrKcal = bmr({
    sex: input.sex,
    ageYears: ageFromBirthdate(input.birthdate, now),
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    bodyFatPct: input.bodyFatPct,
  });

  const tdeeResult = tdee(
    bmrKcal,
    input.activityLevel,
    input.weightKg,
    input.sessionLengthMin,
    input.daysPerWeek,
  );

  const targets = calorieTarget({
    sex: input.sex,
    goal: input.goal,
    bmrKcal,
    tdee: tdeeResult,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    bodyFatPct: input.bodyFatPct,
  });

  const plan = generatePlan(
    {
      experience: input.experience,
      daysPerWeek: input.daysPerWeek,
      sessionLengthMin: input.sessionLengthMin,
      equipment: input.equipment,
      injuries: input.injuries,
      lovedPatterns: input.lovedPatterns,
      avoidedPatterns: input.avoidedPatterns,
      anchors: input.anchors,
    },
    library,
  );

  const e1rmBaseline: Partial<Record<MainLift, E1RMResult>> = {};
  for (const anchor of input.anchors) {
    e1rmBaseline[anchor.lift] = e1rm({ weightKg: anchor.weightKg, reps: anchor.reps });
  }

  return {
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    bmrKcal,
    tdee: tdeeResult,
    targets,
    plan,
    e1rmBaseline,
  };
}
