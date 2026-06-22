/**
 * Row types — mirror supabase/schema.sql. All PKs are client-generated
 * UUIDv7; every row carries updated_at for last-write-wins sync.
 * user_id is denormalized onto workout_sets/meals/checkins so RLS stays
 * a single-column check.
 */
import type { AssessmentInput, Mesocycle, ReadinessTier } from "@/lib/engine/types";
import type { ComputedProfile } from "@/lib/engine/profile";

export interface BaseRow {
  id: string;
  updated_at: string; // ISO timestamp
}

export interface ProfileRow extends BaseRow {
  display_name: string;
  units: "kg" | "lbs";
  locale: "de";
  created_at: string;
}

export interface AssessmentRow extends BaseRow {
  user_id: string;
  schema_version: number;
  raw_input: AssessmentInput;
  computed_output: ComputedProfile;
  created_at: string;
}

export interface PlanRow extends BaseRow {
  user_id: string;
  mesocycle: Mesocycle;
  started_at: string;
  active: boolean;
}

export interface WorkoutRow extends BaseRow {
  user_id: string;
  plan_id: string | null;
  week_index: number;
  day_index: number;
  label: string;
  started_at: string;
  completed_at: string | null;
}

export interface WorkoutSetRow extends BaseRow {
  user_id: string; // denormalized for RLS
  workout_id: string;
  exercise_id: string; // stable string id into lib/data/exercises.ts
  set_index: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
  completed_at: string;
}

export interface CheckinRow extends BaseRow {
  user_id: string; // denormalized for RLS
  date: string; // YYYY-MM-DD, unique per user
  weight_kg: number | null;
  sleep_quality: number | null; // 1-5
  soreness: number | null; // 1-5
  stress: number | null; // 1-5
}

export interface MealRow extends BaseRow {
  user_id: string; // denormalized for RLS
  eaten_at: string;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface ReadinessScoreRow extends BaseRow {
  user_id: string;
  date: string; // YYYY-MM-DD
  score: number;
  tier: ReadinessTier;
  calibrating: boolean;
}

export interface WeeklyReportRow extends BaseRow {
  user_id: string;
  week_start: string; // YYYY-MM-DD (Monday)
  payload: WeeklyReportPayload;
}

export interface WeeklyReportPayload {
  adherencePct: number;
  plannedWorkouts: number;
  completedWorkouts: number;
  volumeKg: number;
  volumeDeltaPct: number;
  strongestLift: { exerciseId: string; e1rm: number; deltaKg: number } | null;
  weakestMuscle: string | null;
  nutritionAdherencePct: number | null;
  narrative: string;
}

export type ConsentKind = "medical_disclaimer" | "ai_coach_gdpr";

export interface ConsentRow extends BaseRow {
  user_id: string;
  kind: ConsentKind;
  granted: boolean;
  granted_at: string;
}

/** GDPR Art. 20 export payload. */
export interface FullExport {
  exported_at: string;
  profile: ProfileRow | null;
  assessments: AssessmentRow[];
  plans: PlanRow[];
  workouts: WorkoutRow[];
  workout_sets: WorkoutSetRow[];
  checkins: CheckinRow[];
  meals: MealRow[];
  readiness_scores: ReadinessScoreRow[];
  weekly_reports: WeeklyReportRow[];
  consents: ConsentRow[];
}

/** Offline outbox entry: replayed as idempotent upsert on sync. */
export interface OutboxEntry {
  id: string;
  table: string;
  op: "upsert" | "delete";
  payload: Record<string, unknown>;
  queued_at: string;
  attempts: number;
}
