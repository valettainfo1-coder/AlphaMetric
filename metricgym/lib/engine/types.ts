/**
 * Shared domain types for the METRICGYM engine.
 *
 * This module (and everything under lib/engine/) is pure TypeScript:
 * no React, no DOM, no Next.js. It gets lifted into React Native later.
 */

export type Sex = "male" | "female";

export type Goal =
  | "muscle_gain"
  | "fat_loss"
  | "recomp"
  | "strength"
  | "general_fitness";

export type ExperienceLevel =
  | "beginner" // < 1 year of consistent training
  | "novice" // 1-2 years
  | "intermediate" // 2-4 years
  | "advanced"; // 4+ years

export type Environment = "gym" | "homegym" | "bodyweight";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "kettlebell"
  | "bands"
  | "pullup_bar"
  | "bench"
  | "bodyweight";

export type InjuryFlag = "lower_back" | "knees" | "shoulders" | "wrists";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "lunge"
  | "carry"
  | "core"
  | "isolation";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "forearms";

/** Determines load increments for double progression (see progression.ts). */
export type IncrementClass =
  | "barbell_lower" // 2.5-5 kg
  | "barbell_upper" // 2.5 kg
  | "dumbbell" // 2 kg per hand
  | "machine" // stack step, default 5 kg
  | "isolation" // rep progression first
  | "bodyweight"; // rep progression only

export interface ExerciseDef {
  /** Stable string id — referenced from DB rows without an FK (code-defined library). */
  id: string;
  nameDe: string;
  nameEn: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  pattern: MovementPattern;
  /** Injuries for which this exercise is contraindicated and must be excluded. */
  contraindications: InjuryFlag[];
  repRange: { min: number; max: number };
  incrementClass: IncrementClass;
  isCompound: boolean;
}

export type ActivityLevel =
  | "sedentary" // desk job, little movement
  | "light" // some walking
  | "moderate" // on feet part of the day
  | "active" // physically active job
  | "very_active"; // hard physical labor

export type MainLift = "squat" | "bench" | "deadlift" | "ohp";

export interface StrengthAnchor {
  lift: MainLift;
  weightKg: number;
  reps: number;
}

/** Raw quiz output (assessments.raw_input). Versioned via schema_version. */
export interface AssessmentInput {
  sex: Sex;
  birthdate: string; // ISO date
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  goal: Goal;
  targetWeightKg?: number;
  targetDate?: string;
  motivation?: string;
  experience: ExperienceLevel;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionLengthMin: 30 | 45 | 60 | 75 | 90;
  environment: Environment;
  equipment: Equipment[];
  injuries: InjuryFlag[];
  lovedPatterns: MovementPattern[];
  avoidedPatterns: MovementPattern[];
  anchors: StrengthAnchor[];
  activityLevel: ActivityLevel;
  avgSleepH: number;
  stress: 1 | 2 | 3 | 4 | 5;
  dietStyle: "omnivore" | "vegetarian" | "vegan" | "pescetarian";
  mealsPerDay: number;
  units: "kg" | "lbs";
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface CalorieTargetResult {
  trainingDay: MacroTargets;
  restDay: MacroTargets;
  maintenanceKcal: number;
  /** Set when a safety floor clamped the target — the UI MUST render this. */
  warnings: CalorieWarning[];
}

export type CalorieWarning = "clamped_to_bmr" | "clamped_to_hard_floor";

export interface E1RMResult {
  value: number;
  /** true when reps > 10 — formula validity degrades sharply beyond 10 reps. */
  lowConfidence: boolean;
}

export type SplitType = "full_body" | "ppl" | "upper_lower" | "ppl_ul";

export interface WarmupSet {
  pctOfWorking: number;
  reps: number;
  weightKg: number;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  /** Ramp sets for the first compound of the session. */
  warmup: WarmupSet[];
}

export interface PlanDay {
  dayIndex: number; // 0-based within the week
  label: string; // e.g. "Push", "Full Body A"
  exercises: PlannedExercise[];
  estimatedMinutes: number;
}

export interface PlanWeek {
  weekIndex: number; // 0-3
  isDeload: boolean;
  days: PlanDay[];
}

export interface Mesocycle {
  splitType: SplitType;
  daysPerWeek: number;
  weeks: PlanWeek[];
  /** Set when injuries were declared — UI appends "consult a professional". */
  medicalNote: boolean;
}

export type ReadinessTier = "primed" | "ready" | "caution" | "recover";

export interface ReadinessInput {
  /** 1-5 self report */
  sleepQuality: number;
  /** 1-5, 5 = very sore */
  soreness: number;
  /** 1-5, 5 = max stress */
  stress: number;
  /** acute:chronic workload ratio; undefined when < 14 days of data */
  acwr?: number;
  daysSinceRest: number;
}

export interface ReadinessResult {
  score: number; // 0-100
  tier: ReadinessTier;
  /** True while < 14 days of data — render with reduced-confidence styling. */
  calibrating: boolean;
  /** One concrete adjustment, as an i18n key into messages/de.json. */
  adjustmentKey: string;
}

export interface E1RMPoint {
  /** days since first data point */
  t: number;
  value: number;
}

export interface ForecastPoint {
  weeksAhead: 4 | 8 | 12;
  value: number;
  low: number;
  high: number;
}

export interface ForecastResult {
  points: ForecastPoint[];
  model: "saturating" | "damped_linear";
  plateau: boolean;
}
