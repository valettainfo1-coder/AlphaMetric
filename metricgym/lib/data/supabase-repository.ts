/**
 * Supabase implementation of DataRepository.
 *
 * Offline-first write path: every write is (1) mirrored into IndexedDB,
 * (2) attempted against Postgres as an idempotent upsert on the PK,
 * (3) queued in the IndexedDB outbox when the network call fails.
 * flushOutbox() replays the queue (called on app start and on `online`);
 * a Background-Sync trigger is [P1] — see TODO at the bottom.
 *
 * Reads come from Postgres and fall back to the local mirror offline.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { uuidv7 } from "@/lib/uuid";
import { LocalRepository } from "./local-repository";
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

type TableName =
  | "profiles"
  | "assessments"
  | "plans"
  | "workouts"
  | "workout_sets"
  | "checkins"
  | "meals"
  | "readiness_scores"
  | "weekly_reports"
  | "consents";

export class SupabaseRepository implements DataRepository {
  readonly userId: string;
  private supabase: SupabaseClient;
  private local: LocalRepository;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.local = new LocalRepository(userId);
  }

  // -- write plumbing ----------------------------------------------------
  private async upsertRemote(table: TableName, row: object): Promise<void> {
    const { error } = await this.supabase.from(table).upsert(row, { onConflict: "id" });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }

  private async write(
    table: TableName,
    row: { id: string },
    mirror: () => Promise<void>,
  ): Promise<void> {
    await mirror();
    try {
      await this.upsertRemote(table, row);
    } catch {
      await this.enqueue({ table, op: "upsert", payload: row as unknown as Record<string, unknown> });
    }
  }

  private async enqueue(entry: Pick<OutboxEntry, "table" | "op" | "payload">): Promise<void> {
    const db = await (await import("./local-repository")).openMetricGymDB();
    await db.put("outbox", {
      id: uuidv7(),
      queued_at: new Date().toISOString(),
      attempts: 0,
      ...entry,
    });
  }

  /** Replays queued writes; safe to call repeatedly (upserts are idempotent). */
  async flushOutbox(): Promise<void> {
    const db = await (await import("./local-repository")).openMetricGymDB();
    const entries = await db.getAllFromIndex("outbox", "by_queued");
    for (const entry of entries) {
      try {
        if (entry.op === "upsert") {
          await this.upsertRemote(entry.table as TableName, entry.payload);
        } else {
          const id = entry.payload.id as string;
          const { error } = await this.supabase.from(entry.table).delete().eq("id", id);
          if (error) throw new Error(error.message);
        }
        await db.delete("outbox", entry.id);
      } catch {
        entry.attempts += 1;
        await db.put("outbox", entry);
        break; // keep ordering; retry the whole tail next flush
      }
    }
  }

  // -- profile ---------------------------------------------------------
  async getProfile(): Promise<ProfileRow | null> {
    try {
      const { data, error } = await this.supabase
        .from("profiles")
        .select("*")
        .eq("id", this.userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as ProfileRow | null) ?? null;
    } catch {
      return this.local.getProfile();
    }
  }

  async upsertProfile(row: ProfileRow): Promise<void> {
    await this.write("profiles", row, () => this.local.upsertProfile(row));
  }

  // -- assessments -----------------------------------------------------
  async saveAssessment(row: AssessmentRow): Promise<void> {
    await this.write("assessments", row, () => this.local.saveAssessment(row));
  }

  async getLatestAssessment(): Promise<AssessmentRow | null> {
    try {
      const { data, error } = await this.supabase
        .from("assessments")
        .select("*")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as AssessmentRow | null) ?? null;
    } catch {
      return this.local.getLatestAssessment();
    }
  }

  // -- plans -----------------------------------------------------------
  async savePlan(row: PlanRow): Promise<void> {
    await this.write("plans", row, () => this.local.savePlan(row));
  }

  async getActivePlan(): Promise<PlanRow | null> {
    try {
      const { data, error } = await this.supabase
        .from("plans")
        .select("*")
        .eq("user_id", this.userId)
        .eq("active", true)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as PlanRow | null) ?? null;
    } catch {
      return this.local.getActivePlan();
    }
  }

  // -- workouts --------------------------------------------------------
  async upsertWorkout(row: WorkoutRow): Promise<void> {
    await this.write("workouts", row, () => this.local.upsertWorkout(row));
  }

  async getWorkout(id: string): Promise<WorkoutRow | null> {
    try {
      const { data, error } = await this.supabase
        .from("workouts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as WorkoutRow | null) ?? null;
    } catch {
      return this.local.getWorkout(id);
    }
  }

  async getWorkouts(limit = 50): Promise<WorkoutRow[]> {
    try {
      const { data, error } = await this.supabase
        .from("workouts")
        .select("*")
        .eq("user_id", this.userId)
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data as WorkoutRow[]) ?? [];
    } catch {
      return this.local.getWorkouts(limit);
    }
  }

  // -- sets ------------------------------------------------------------
  async upsertSet(row: WorkoutSetRow): Promise<void> {
    await this.write("workout_sets", row, () => this.local.upsertSet(row));
  }

  async getSetsForWorkout(workoutId: string): Promise<WorkoutSetRow[]> {
    try {
      const { data, error } = await this.supabase
        .from("workout_sets")
        .select("*")
        .eq("workout_id", workoutId)
        .order("set_index");
      if (error) throw new Error(error.message);
      return (data as WorkoutSetRow[]) ?? [];
    } catch {
      return this.local.getSetsForWorkout(workoutId);
    }
  }

  async getRecentSets(exerciseId: string, limit = 50): Promise<WorkoutSetRow[]> {
    try {
      const { data, error } = await this.supabase
        .from("workout_sets")
        .select("*")
        .eq("user_id", this.userId)
        .eq("exercise_id", exerciseId)
        .eq("is_warmup", false)
        .order("completed_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data as WorkoutSetRow[]) ?? [];
    } catch {
      return this.local.getRecentSets(exerciseId, limit);
    }
  }

  async getSetsSince(sinceIso: string): Promise<WorkoutSetRow[]> {
    try {
      const { data, error } = await this.supabase
        .from("workout_sets")
        .select("*")
        .eq("user_id", this.userId)
        .gte("completed_at", sinceIso);
      if (error) throw new Error(error.message);
      return (data as WorkoutSetRow[]) ?? [];
    } catch {
      return this.local.getSetsSince(sinceIso);
    }
  }

  // -- check-ins -------------------------------------------------------
  async upsertCheckin(row: CheckinRow): Promise<void> {
    await this.write("checkins", row, () => this.local.upsertCheckin(row));
  }

  async getCheckin(date: string): Promise<CheckinRow | null> {
    try {
      const { data, error } = await this.supabase
        .from("checkins")
        .select("*")
        .eq("user_id", this.userId)
        .eq("date", date)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as CheckinRow | null) ?? null;
    } catch {
      return this.local.getCheckin(date);
    }
  }

  async getCheckins(sinceDate: string): Promise<CheckinRow[]> {
    try {
      const { data, error } = await this.supabase
        .from("checkins")
        .select("*")
        .eq("user_id", this.userId)
        .gte("date", sinceDate)
        .order("date");
      if (error) throw new Error(error.message);
      return (data as CheckinRow[]) ?? [];
    } catch {
      return this.local.getCheckins(sinceDate);
    }
  }

  // -- meals -----------------------------------------------------------
  async upsertMeal(row: MealRow): Promise<void> {
    await this.write("meals", row, () => this.local.upsertMeal(row));
  }

  async deleteMeal(id: string): Promise<void> {
    await this.local.deleteMeal(id);
    try {
      const { error } = await this.supabase.from("meals").delete().eq("id", id);
      if (error) throw new Error(error.message);
    } catch {
      await this.enqueue({ table: "meals", op: "delete", payload: { id } });
    }
  }

  async getMeals(sinceIso: string): Promise<MealRow[]> {
    try {
      const { data, error } = await this.supabase
        .from("meals")
        .select("*")
        .eq("user_id", this.userId)
        .gte("eaten_at", sinceIso)
        .order("eaten_at");
      if (error) throw new Error(error.message);
      return (data as MealRow[]) ?? [];
    } catch {
      return this.local.getMeals(sinceIso);
    }
  }

  // -- readiness -------------------------------------------------------
  async upsertReadiness(row: ReadinessScoreRow): Promise<void> {
    await this.write("readiness_scores", row, () => this.local.upsertReadiness(row));
  }

  async getReadinessHistory(sinceDate: string): Promise<ReadinessScoreRow[]> {
    try {
      const { data, error } = await this.supabase
        .from("readiness_scores")
        .select("*")
        .eq("user_id", this.userId)
        .gte("date", sinceDate)
        .order("date");
      if (error) throw new Error(error.message);
      return (data as ReadinessScoreRow[]) ?? [];
    } catch {
      return this.local.getReadinessHistory(sinceDate);
    }
  }

  // -- weekly reports --------------------------------------------------
  async upsertWeeklyReport(row: WeeklyReportRow): Promise<void> {
    await this.write("weekly_reports", row, () => this.local.upsertWeeklyReport(row));
  }

  async getWeeklyReport(weekStart: string): Promise<WeeklyReportRow | null> {
    try {
      const { data, error } = await this.supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", this.userId)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as WeeklyReportRow | null) ?? null;
    } catch {
      return this.local.getWeeklyReport(weekStart);
    }
  }

  // -- consents --------------------------------------------------------
  async upsertConsent(row: ConsentRow): Promise<void> {
    await this.write("consents", row, () => this.local.upsertConsent(row));
  }

  async getConsent(kind: ConsentKind): Promise<ConsentRow | null> {
    try {
      const { data, error } = await this.supabase
        .from("consents")
        .select("*")
        .eq("user_id", this.userId)
        .eq("kind", kind)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as ConsentRow | null) ?? null;
    } catch {
      return this.local.getConsent(kind);
    }
  }

  // -- GDPR ------------------------------------------------------------
  async exportAll(): Promise<FullExport> {
    // Local mirror carries everything written through this repository.
    return this.local.exportAll();
  }

  async deleteAllData(): Promise<void> {
    const tables: TableName[] = [
      "workout_sets",
      "workouts",
      "meals",
      "checkins",
      "readiness_scores",
      "weekly_reports",
      "consents",
      "plans",
      "assessments",
      "profiles",
    ];
    for (const table of tables) {
      const column = table === "profiles" ? "id" : "user_id";
      const { error } = await this.supabase.from(table).delete().eq(column, this.userId);
      if (error) throw new Error(`delete ${table} failed: ${error.message}`);
    }
    await this.local.deleteAllData();
  }
}

// TODO [P1]: register a Background Sync ("sync" event in the service
// worker) to call flushOutbox() when connectivity returns while the app
// is closed. The outbox itself is fully implemented above.
