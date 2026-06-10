/**
 * Coach context — AGGREGATED, never raw. Builds a compact summary
 * (≤ ~900 tokens) from repository data: profile, goal, plan position,
 * per-lift e1RM trend deltas, 14-day adherence, latest readiness.
 * No raw set logs ever reach the prompt.
 *
 * Built client-side because demo mode has no server-side data store;
 * TODO [P1]: move construction into the route handler for Supabase mode.
 */
import type { DataRepository } from "@/lib/data/repository";
import { e1rmSeries } from "@/lib/aggregate";
import { EXERCISE_BY_ID, MAIN_LIFT_EXERCISE } from "@/lib/data/exercises";

export interface CoachContext {
  goal: string;
  experience: string;
  daysPerWeek: number;
  weekInMeso: number | null;
  calorieTargetTraining: number | null;
  proteinTargetG: number | null;
  lifts: Array<{ name: string; e1rm: number; delta4w: number }>;
  adherence14d: { planned: number; completed: number };
  readiness: { score: number; tier: string; calibrating: boolean } | null;
  warnings: string[];
}

export async function buildCoachContext(repo: DataRepository): Promise<CoachContext> {
  const since = new Date(Date.now() - 56 * 86_400_000).toISOString();
  const [assessment, sets, workouts, readinessRows] = await Promise.all([
    repo.getLatestAssessment(),
    repo.getSetsSince(since),
    repo.getWorkouts(40),
    repo.getReadinessHistory(new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)),
  ]);

  const lifts: CoachContext["lifts"] = [];
  for (const exerciseId of Object.values(MAIN_LIFT_EXERCISE)) {
    const series = e1rmSeries(sets, exerciseId);
    const last = series[series.length - 1];
    if (!last) continue;
    const fourWeeksAgo = last.t - 28;
    const reference = [...series].reverse().find((p) => p.t <= fourWeeksAgo) ?? series[0];
    lifts.push({
      name: EXERCISE_BY_ID.get(exerciseId)?.nameEn ?? exerciseId,
      e1rm: last.value,
      delta4w: reference ? Math.round((last.value - reference.value) * 10) / 10 : 0,
    });
  }

  const twoWeeksAgo = Date.now() - 14 * 86_400_000;
  const recent = workouts.filter((w) => new Date(w.started_at).getTime() >= twoWeeksAgo);
  const completed = recent.filter((w) => w.completed_at).length;
  const planned = (assessment?.raw_input.daysPerWeek ?? 0) * 2;

  const latestReadiness = readinessRows[readinessRows.length - 1] ?? null;
  const completedTotal = workouts.filter((w) => w.completed_at).length;
  const daysPerWeek = assessment?.raw_input.daysPerWeek ?? 0;

  return {
    goal: assessment?.raw_input.goal ?? "unknown",
    experience: assessment?.raw_input.experience ?? "unknown",
    daysPerWeek,
    weekInMeso: daysPerWeek > 0 ? (Math.floor(completedTotal / daysPerWeek) % 4) + 1 : null,
    calorieTargetTraining: assessment?.computed_output.targets.trainingDay.kcal ?? null,
    proteinTargetG: assessment?.computed_output.targets.trainingDay.proteinG ?? null,
    lifts,
    adherence14d: { planned, completed },
    readiness: latestReadiness
      ? {
          score: latestReadiness.score,
          tier: latestReadiness.tier,
          calibrating: latestReadiness.calibrating,
        }
      : null,
    warnings: assessment?.computed_output.targets.warnings ?? [],
  };
}
