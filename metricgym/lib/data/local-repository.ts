/**
 * IndexedDB implementation of DataRepository (via `idb`).
 *
 * NOT localStorage: synchronous, ~5 MB cap, no indexes — wrong tool.
 * This is both the demo-mode store and the offline cache/outbox home
 * when running against Supabase.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { DataRepository } from "./repository";
import type {
  AssessmentRow,
  CheckinRow,
  ConsentKind,
  ConsentRow,
  FullExport,
  MealRow,
  OutboxEntry,
  PlanRow,
  ProfileRow,
  ReadinessScoreRow,
  WeeklyReportRow,
  WorkoutRow,
  WorkoutSetRow,
} from "./types";

export const DB_NAME = "metricgym";
const DB_VERSION = 1;

interface MetricGymDB extends DBSchema {
  profiles: { key: string; value: ProfileRow };
  assessments: { key: string; value: AssessmentRow; indexes: { by_created: string } };
  plans: { key: string; value: PlanRow; indexes: { by_started: string } };
  workouts: { key: string; value: WorkoutRow; indexes: { by_started: string } };
  workout_sets: {
    key: string;
    value: WorkoutSetRow;
    indexes: { by_workout: string; by_exercise: string; by_completed: string };
  };
  checkins: { key: string; value: CheckinRow; indexes: { by_date: string } };
  meals: { key: string; value: MealRow; indexes: { by_eaten: string } };
  readiness_scores: { key: string; value: ReadinessScoreRow; indexes: { by_date: string } };
  weekly_reports: { key: string; value: WeeklyReportRow; indexes: { by_week: string } };
  consents: { key: string; value: ConsentRow; indexes: { by_kind: string } };
  outbox: { key: string; value: OutboxEntry; indexes: { by_queued: string } };
  meta: { key: string; value: { key: string; value: string } };
}

export function openMetricGymDB(): Promise<IDBPDatabase<MetricGymDB>> {
  return openDB<MetricGymDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("profiles", { keyPath: "id" });
      db.createObjectStore("assessments", { keyPath: "id" }).createIndex("by_created", "created_at");
      db.createObjectStore("plans", { keyPath: "id" }).createIndex("by_started", "started_at");
      db.createObjectStore("workouts", { keyPath: "id" }).createIndex("by_started", "started_at");
      const sets = db.createObjectStore("workout_sets", { keyPath: "id" });
      sets.createIndex("by_workout", "workout_id");
      sets.createIndex("by_exercise", "exercise_id");
      sets.createIndex("by_completed", "completed_at");
      db.createObjectStore("checkins", { keyPath: "id" }).createIndex("by_date", "date");
      db.createObjectStore("meals", { keyPath: "id" }).createIndex("by_eaten", "eaten_at");
      db.createObjectStore("readiness_scores", { keyPath: "id" }).createIndex("by_date", "date");
      db.createObjectStore("weekly_reports", { keyPath: "id" }).createIndex("by_week", "week_start");
      db.createObjectStore("consents", { keyPath: "id" }).createIndex("by_kind", "kind");
      db.createObjectStore("outbox", { keyPath: "id" }).createIndex("by_queued", "queued_at");
      db.createObjectStore("meta", { keyPath: "key" });
    },
  });
}

/** Last-write-wins: only apply if incoming updated_at ≥ stored updated_at. */
function newer(incoming: { updated_at: string }, stored?: { updated_at: string }): boolean {
  return !stored || incoming.updated_at >= stored.updated_at;
}

export class LocalRepository implements DataRepository {
  readonly userId: string;
  private dbPromise: Promise<IDBPDatabase<MetricGymDB>>;

  constructor(userId: string) {
    this.userId = userId;
    this.dbPromise = openMetricGymDB();
  }

  private db(): Promise<IDBPDatabase<MetricGymDB>> {
    return this.dbPromise;
  }

  // -- profile ---------------------------------------------------------
  async getProfile(): Promise<ProfileRow | null> {
    return (await (await this.db()).get("profiles", this.userId)) ?? null;
  }

  async upsertProfile(row: ProfileRow): Promise<void> {
    const db = await this.db();
    if (newer(row, await db.get("profiles", row.id))) await db.put("profiles", row);
  }

  // -- assessments -----------------------------------------------------
  async saveAssessment(row: AssessmentRow): Promise<void> {
    await (await this.db()).put("assessments", row);
  }

  async getLatestAssessment(): Promise<AssessmentRow | null> {
    const all = await (await this.db()).getAllFromIndex("assessments", "by_created");
    return all[all.length - 1] ?? null;
  }

  // -- plans -----------------------------------------------------------
  async savePlan(row: PlanRow): Promise<void> {
    await (await this.db()).put("plans", row);
  }

  async getActivePlan(): Promise<PlanRow | null> {
    const all = await (await this.db()).getAllFromIndex("plans", "by_started");
    for (let i = all.length - 1; i >= 0; i--) {
      const plan = all[i];
      if (plan?.active) return plan;
    }
    return null;
  }

  // -- workouts --------------------------------------------------------
  async upsertWorkout(row: WorkoutRow): Promise<void> {
    const db = await this.db();
    if (newer(row, await db.get("workouts", row.id))) await db.put("workouts", row);
  }

  async getWorkout(id: string): Promise<WorkoutRow | null> {
    return (await (await this.db()).get("workouts", id)) ?? null;
  }

  async getWorkouts(limit = 50): Promise<WorkoutRow[]> {
    const all = await (await this.db()).getAllFromIndex("workouts", "by_started");
    return all.reverse().slice(0, limit);
  }

  // -- sets ------------------------------------------------------------
  async upsertSet(row: WorkoutSetRow): Promise<void> {
    const db = await this.db();
    if (newer(row, await db.get("workout_sets", row.id))) await db.put("workout_sets", row);
  }

  async getSetsForWorkout(workoutId: string): Promise<WorkoutSetRow[]> {
    const rows = await (await this.db()).getAllFromIndex("workout_sets", "by_workout", workoutId);
    return rows.sort((a, b) => a.set_index - b.set_index);
  }

  async getRecentSets(exerciseId: string, limit = 50): Promise<WorkoutSetRow[]> {
    const rows = await (await this.db()).getAllFromIndex("workout_sets", "by_exercise", exerciseId);
    return rows
      .filter((r) => !r.is_warmup)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
      .slice(0, limit);
  }

  async getSetsSince(sinceIso: string): Promise<WorkoutSetRow[]> {
    const db = await this.db();
    const range = IDBKeyRange.lowerBound(sinceIso);
    return db.getAllFromIndex("workout_sets", "by_completed", range);
  }

  // -- check-ins -------------------------------------------------------
  async upsertCheckin(row: CheckinRow): Promise<void> {
    const db = await this.db();
    // date is unique per user: replace an existing row for the same date.
    const existing = await db.getAllFromIndex("checkins", "by_date", row.date);
    const sameDay = existing.find((r) => r.user_id === row.user_id);
    if (sameDay && sameDay.id !== row.id) await db.delete("checkins", sameDay.id);
    if (newer(row, sameDay)) await db.put("checkins", row);
  }

  async getCheckin(date: string): Promise<CheckinRow | null> {
    const rows = await (await this.db()).getAllFromIndex("checkins", "by_date", date);
    return rows.find((r) => r.user_id === this.userId) ?? null;
  }

  async getCheckins(sinceDate: string): Promise<CheckinRow[]> {
    const db = await this.db();
    return db.getAllFromIndex("checkins", "by_date", IDBKeyRange.lowerBound(sinceDate));
  }

  // -- meals -----------------------------------------------------------
  async upsertMeal(row: MealRow): Promise<void> {
    await (await this.db()).put("meals", row);
  }

  async deleteMeal(id: string): Promise<void> {
    await (await this.db()).delete("meals", id);
  }

  async getMeals(sinceIso: string): Promise<MealRow[]> {
    const db = await this.db();
    return db.getAllFromIndex("meals", "by_eaten", IDBKeyRange.lowerBound(sinceIso));
  }

  // -- readiness -------------------------------------------------------
  async upsertReadiness(row: ReadinessScoreRow): Promise<void> {
    const db = await this.db();
    const existing = await db.getAllFromIndex("readiness_scores", "by_date", row.date);
    const sameDay = existing.find((r) => r.user_id === row.user_id);
    if (sameDay && sameDay.id !== row.id) await db.delete("readiness_scores", sameDay.id);
    await db.put("readiness_scores", row);
  }

  async getReadinessHistory(sinceDate: string): Promise<ReadinessScoreRow[]> {
    const db = await this.db();
    return db.getAllFromIndex("readiness_scores", "by_date", IDBKeyRange.lowerBound(sinceDate));
  }

  // -- weekly reports --------------------------------------------------
  async upsertWeeklyReport(row: WeeklyReportRow): Promise<void> {
    const db = await this.db();
    const existing = await db.getAllFromIndex("weekly_reports", "by_week", row.week_start);
    const same = existing.find((r) => r.user_id === row.user_id);
    if (same && same.id !== row.id) await db.delete("weekly_reports", same.id);
    await db.put("weekly_reports", row);
  }

  async getWeeklyReport(weekStart: string): Promise<WeeklyReportRow | null> {
    const rows = await (await this.db()).getAllFromIndex("weekly_reports", "by_week", weekStart);
    return rows.find((r) => r.user_id === this.userId) ?? null;
  }

  // -- consents --------------------------------------------------------
  async upsertConsent(row: ConsentRow): Promise<void> {
    const db = await this.db();
    const existing = await db.getAllFromIndex("consents", "by_kind", row.kind);
    const same = existing.find((r) => r.user_id === row.user_id);
    if (same && same.id !== row.id) await db.delete("consents", same.id);
    await db.put("consents", row);
  }

  async getConsent(kind: ConsentKind): Promise<ConsentRow | null> {
    const rows = await (await this.db()).getAllFromIndex("consents", "by_kind", kind);
    return rows.find((r) => r.user_id === this.userId) ?? null;
  }

  // -- GDPR ------------------------------------------------------------
  async exportAll(): Promise<FullExport> {
    const db = await this.db();
    return {
      exported_at: new Date().toISOString(),
      profile: (await db.get("profiles", this.userId)) ?? null,
      assessments: await db.getAll("assessments"),
      plans: await db.getAll("plans"),
      workouts: await db.getAll("workouts"),
      workout_sets: await db.getAll("workout_sets"),
      checkins: await db.getAll("checkins"),
      meals: await db.getAll("meals"),
      readiness_scores: await db.getAll("readiness_scores"),
      weekly_reports: await db.getAll("weekly_reports"),
      consents: await db.getAll("consents"),
    };
  }

  async deleteAllData(): Promise<void> {
    const db = await this.db();
    const stores = [
      "profiles",
      "assessments",
      "plans",
      "workouts",
      "workout_sets",
      "checkins",
      "meals",
      "readiness_scores",
      "weekly_reports",
      "consents",
      "outbox",
      "meta",
    ] as const;
    const tx = db.transaction(stores, "readwrite");
    await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }

  // -- meta (seed bookkeeping) -----------------------------------------
  async getMeta(key: string): Promise<string | null> {
    return (await (await this.db()).get("meta", key))?.value ?? null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    await (await this.db()).put("meta", { key, value });
  }
}
