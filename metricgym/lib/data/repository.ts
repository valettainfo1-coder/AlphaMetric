/**
 * THE data-layer contract. App code imports this interface only — never a
 * concrete implementation. The active implementation is selected by env
 * detection in lib/data/index.ts:
 *
 *   - Supabase env vars present → SupabaseRepository (Postgres + RLS)
 *   - otherwise → LocalRepository (IndexedDB) + deterministic demo seed
 *
 * Write contract (offline-first): all ids are client-generated UUIDv7,
 * all writes are idempotent upserts keyed on the PK, conflicts resolve
 * last-write-wins via updated_at.
 */
import type {
  AssessmentRow,
  CheckinRow,
  ConsentKind,
  ConsentRow,
  FullExport,
  MealRow,
  PlanRow,
  ProfileRow,
  ReadinessScoreRow,
  WeeklyReportRow,
  WorkoutRow,
  WorkoutSetRow,
} from "./types";

export interface DataRepository {
  /** Stable id of the current user ("demo-user" in demo mode). */
  readonly userId: string;

  // -- profile ---------------------------------------------------------
  getProfile(): Promise<ProfileRow | null>;
  upsertProfile(row: ProfileRow): Promise<void>;

  // -- assessments -----------------------------------------------------
  saveAssessment(row: AssessmentRow): Promise<void>;
  getLatestAssessment(): Promise<AssessmentRow | null>;

  // -- plans -----------------------------------------------------------
  savePlan(row: PlanRow): Promise<void>;
  getActivePlan(): Promise<PlanRow | null>;

  // -- workouts --------------------------------------------------------
  upsertWorkout(row: WorkoutRow): Promise<void>;
  getWorkout(id: string): Promise<WorkoutRow | null>;
  /** Most recent first. */
  getWorkouts(limit?: number): Promise<WorkoutRow[]>;

  // -- sets ------------------------------------------------------------
  upsertSet(row: WorkoutSetRow): Promise<void>;
  getSetsForWorkout(workoutId: string): Promise<WorkoutSetRow[]>;
  /** Working sets for one exercise, most recent first. */
  getRecentSets(exerciseId: string, limit?: number): Promise<WorkoutSetRow[]>;
  /** All sets since the given ISO timestamp (for analytics aggregation). */
  getSetsSince(sinceIso: string): Promise<WorkoutSetRow[]>;

  // -- check-ins -------------------------------------------------------
  upsertCheckin(row: CheckinRow): Promise<void>;
  getCheckin(date: string): Promise<CheckinRow | null>;
  /** Ascending by date. */
  getCheckins(sinceDate: string): Promise<CheckinRow[]>;

  // -- meals -----------------------------------------------------------
  upsertMeal(row: MealRow): Promise<void>;
  deleteMeal(id: string): Promise<void>;
  getMeals(sinceIso: string): Promise<MealRow[]>;

  // -- readiness -------------------------------------------------------
  upsertReadiness(row: ReadinessScoreRow): Promise<void>;
  getReadinessHistory(sinceDate: string): Promise<ReadinessScoreRow[]>;

  // -- weekly reports (computed on read, cached here) --------------------
  upsertWeeklyReport(row: WeeklyReportRow): Promise<void>;
  getWeeklyReport(weekStart: string): Promise<WeeklyReportRow | null>;

  // -- consents (GDPR) -------------------------------------------------
  upsertConsent(row: ConsentRow): Promise<void>;
  getConsent(kind: ConsentKind): Promise<ConsentRow | null>;

  // -- GDPR Art. 17 / 20 -----------------------------------------------
  exportAll(): Promise<FullExport>;
  deleteAllData(): Promise<void>;
}
