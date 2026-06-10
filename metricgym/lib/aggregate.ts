/**
 * Client-side aggregation over repository rows. Bridges raw sets/workouts
 * into engine inputs (e1RM series, ACWR, weekly volume) and the weekly
 * report payload. Pure functions — easy to test, easy to move server-side.
 */
import { e1rm } from "@/lib/engine/e1rm";
import type { E1RMPoint, MuscleGroup } from "@/lib/engine/types";
import { EXERCISE_BY_ID } from "@/lib/data/exercises";
import type { MealRow, WorkoutRow, WorkoutSetRow, WeeklyReportPayload } from "@/lib/data/types";

/** Best e1RM per calendar day for one exercise, as engine forecast input. */
export function e1rmSeries(sets: WorkoutSetRow[], exerciseId: string): E1RMPoint[] {
  const byDay = new Map<string, number>();
  for (const s of sets) {
    if (s.exercise_id !== exerciseId || s.is_warmup || s.reps <= 0) continue;
    const day = s.completed_at.slice(0, 10);
    const value = e1rm({ weightKg: s.weight_kg, reps: s.reps, rpe: s.rpe ?? undefined }).value;
    const prev = byDay.get(day);
    if (prev === undefined || value > prev) byDay.set(day, value);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  const first = days[0];
  if (!first) return [];
  const t0 = new Date(first[0]).getTime();
  return days.map(([day, value]) => ({
    t: Math.round((new Date(day).getTime() - t0) / 86_400_000),
    value,
  }));
}

/** Current best e1RM (all time) for PR detection. */
export function bestE1rm(sets: WorkoutSetRow[], exerciseId: string): number {
  let best = 0;
  for (const s of sets) {
    if (s.exercise_id !== exerciseId || s.is_warmup || s.reps <= 0) continue;
    const value = e1rm({ weightKg: s.weight_kg, reps: s.reps, rpe: s.rpe ?? undefined }).value;
    if (value > best) best = value;
  }
  return best;
}

export function totalVolumeKg(sets: WorkoutSetRow[]): number {
  return sets.reduce((sum, s) => (s.is_warmup ? sum : sum + s.weight_kg * s.reps), 0);
}

/** Hard sets per muscle (primary movers) per ISO week start. */
export function volumeHeatmap(
  sets: WorkoutSetRow[],
  weeks: string[], // week-start dates (YYYY-MM-DD), ascending
): Map<MuscleGroup, number[]> {
  const result = new Map<MuscleGroup, number[]>();
  const weekIndex = (iso: string): number => {
    for (let i = weeks.length - 1; i >= 0; i--) {
      const w = weeks[i];
      if (w !== undefined && iso >= w) return i;
    }
    return -1;
  };
  for (const s of sets) {
    if (s.is_warmup) continue;
    const def = EXERCISE_BY_ID.get(s.exercise_id);
    if (!def) continue;
    const idx = weekIndex(s.completed_at.slice(0, 10));
    if (idx < 0) continue;
    for (const muscle of def.primaryMuscles) {
      const row = result.get(muscle) ?? weeks.map(() => 0);
      row[idx] = (row[idx] ?? 0) + 1;
      result.set(muscle, row);
    }
  }
  return result;
}

/** Acute (7d) : chronic (28d avg/wk) workload ratio from set volume. */
export function computeAcwr(sets: WorkoutSetRow[], now: Date = new Date()): number | undefined {
  const dayMs = 86_400_000;
  const t = now.getTime();
  const within = (s: WorkoutSetRow, days: number) =>
    t - new Date(s.completed_at).getTime() <= days * dayMs;
  const oldest = sets.reduce<number>(
    (min, s) => Math.min(min, new Date(s.completed_at).getTime()),
    Number.POSITIVE_INFINITY,
  );
  // Cold start: < 14 days of history → no meaningful chronic load.
  if (!Number.isFinite(oldest) || t - oldest < 14 * dayMs) return undefined;
  const acute = totalVolumeKg(sets.filter((s) => within(s, 7)));
  const chronic = totalVolumeKg(sets.filter((s) => within(s, 28))) / 4;
  if (chronic <= 0) return undefined;
  return acute / chronic;
}

/** Consecutive weeks (incl. current) with ≥ 1 completed workout. */
export function weeklyStreak(workouts: WorkoutRow[], now: Date = new Date()): number {
  const weekMs = 7 * 86_400_000;
  const done = workouts.filter((w) => w.completed_at);
  let streak = 0;
  for (let i = 0; ; i++) {
    const windowEnd = now.getTime() - i * weekMs;
    const windowStart = windowEnd - weekMs;
    const hit = done.some((w) => {
      const ts = new Date(w.started_at).getTime();
      return ts > windowStart && ts <= windowEnd;
    });
    if (hit) streak += 1;
    else if (i > 0) break;
    else break;
  }
  return streak;
}

const NARRATIVE_TEMPLATES = [
  "Adhärenz {adherence} %, Volumen {volumeDelta} % zur Vorwoche. Stärkster Lift: {strongest}. {weakest} braucht mehr Aufmerksamkeit — die Engine hat die Abdeckung markiert.",
  "Solide Woche: {adherence} % der geplanten Sessions, Volumen {volumeDelta} %. {strongest} entwickelt sich am stärksten. Schwächste Abdeckung: {weakest}.",
];

export function buildWeeklyReport(args: {
  thisWeekSets: WorkoutSetRow[];
  lastWeekSets: WorkoutSetRow[];
  plannedWorkouts: number;
  completedWorkouts: number;
  meals: MealRow[];
  kcalTarget: number | null;
}): WeeklyReportPayload {
  const volume = totalVolumeKg(args.thisWeekSets);
  const lastVolume = totalVolumeKg(args.lastWeekSets);
  const volumeDeltaPct =
    lastVolume > 0 ? Math.round(((volume - lastVolume) / lastVolume) * 100) : 0;
  const adherencePct =
    args.plannedWorkouts > 0
      ? Math.round((args.completedWorkouts / args.plannedWorkouts) * 100)
      : 0;

  // Strongest lift: biggest e1RM gain this week vs last.
  let strongest: WeeklyReportPayload["strongestLift"] = null;
  const exerciseIds = new Set(args.thisWeekSets.map((s) => s.exercise_id));
  for (const id of exerciseIds) {
    const current = bestE1rm(args.thisWeekSets, id);
    const previous = bestE1rm(args.lastWeekSets, id);
    if (previous <= 0 || current <= 0) continue;
    const delta = Math.round((current - previous) * 10) / 10;
    if (!strongest || delta > strongest.deltaKg) {
      strongest = { exerciseId: id, e1rm: current, deltaKg: delta };
    }
  }

  // Weakest coverage: trained muscle with the fewest weekly hard sets.
  const muscleSets = new Map<MuscleGroup, number>();
  for (const s of args.thisWeekSets) {
    if (s.is_warmup) continue;
    const def = EXERCISE_BY_ID.get(s.exercise_id);
    if (!def) continue;
    for (const m of def.primaryMuscles) muscleSets.set(m, (muscleSets.get(m) ?? 0) + 1);
  }
  let weakestMuscle: string | null = null;
  let weakestCount = Number.POSITIVE_INFINITY;
  for (const [muscle, count] of muscleSets) {
    if (count < weakestCount) {
      weakestCount = count;
      weakestMuscle = muscle;
    }
  }

  // Nutrition adherence: days within ±10% of the kcal target.
  let nutritionAdherencePct: number | null = null;
  if (args.kcalTarget && args.meals.length > 0) {
    const byDay = new Map<string, number>();
    for (const m of args.meals) {
      const day = m.eaten_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + m.kcal);
    }
    const days = [...byDay.values()];
    const within = days.filter((kcal) => Math.abs(kcal - args.kcalTarget!) / args.kcalTarget! <= 0.1);
    nutritionAdherencePct = Math.round((within.length / days.length) * 100);
  }

  const template =
    NARRATIVE_TEMPLATES[(volume + args.completedWorkouts) % NARRATIVE_TEMPLATES.length] ??
    NARRATIVE_TEMPLATES[0] ??
    "";
  const strongestName = strongest
    ? (EXERCISE_BY_ID.get(strongest.exerciseId)?.nameDe ?? strongest.exerciseId)
    : "—";
  const narrative = template
    .replaceAll("{adherence}", String(adherencePct))
    .replaceAll("{volumeDelta}", `${volumeDeltaPct >= 0 ? "+" : ""}${volumeDeltaPct}`)
    .replaceAll("{strongest}", strongestName)
    .replaceAll("{weakest}", weakestMuscle ?? "—");

  return {
    adherencePct,
    plannedWorkouts: args.plannedWorkouts,
    completedWorkouts: args.completedWorkouts,
    volumeKg: Math.round(volume),
    volumeDeltaPct,
    strongestLift: strongest,
    weakestMuscle,
    nutritionAdherencePct,
    narrative,
  };
}
