"use client";

/**
 * Workout Player: one exercise per view, engine-prefilled set rows,
 * warm-up ramp above working sets, timestamp rest timer, wake lock,
 * explicit prev/next navigation (edge-swipe collides with iOS back),
 * PR detection → share card in the summary.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/shell/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/ui/stepper";
import { RestTimer, unlockAudio } from "@/components/workout/rest-timer";
import { PrShareCard, type PrCardData } from "@/components/workout/pr-card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { formatNumber, formatShortDate, formatWeight } from "@/lib/format";
import { getRepository } from "@/lib/data";
import { EXERCISE_BY_ID, substitutesFor } from "@/lib/data/exercises";
import { uuidv7 } from "@/lib/uuid";
import { track } from "@/lib/analytics";
import { bestE1rm } from "@/lib/aggregate";
import { e1rm } from "@/lib/engine/e1rm";
import { progressExercise } from "@/lib/engine/progression";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { useWorkoutSession, type LoggedSet } from "@/lib/stores/workout-session";
import { useRepoData } from "@/lib/hooks/use-repo";
import type { WorkoutSetRow } from "@/lib/data/types";

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / range) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24" aria-hidden>
      <polyline points={points} fill="none" stroke="var(--color-volt)" strokeWidth={2} />
    </svg>
  );
}

export default function PlayerPage() {
  const router = useRouter();
  const {
    session,
    exerciseIndex,
    loggedSets,
    restEndsAt,
    logSet,
    goToExercise,
    swapExercise,
    startRest,
    clearRest,
    finish,
  } = useWorkoutSession();

  useWakeLock(Boolean(session));

  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(8);
  const [rpe, setRpe] = useState(8);
  const [showSwap, setShowSwap] = useState(false);
  const [summary, setSummary] = useState<{
    volumeKg: number;
    deltas: Array<{ name: string; delta: number }>;
    pr: PrCardData | null;
  } | null>(null);

  const exercise = session?.exercises[exerciseIndex] ?? null;
  const def = exercise ? EXERCISE_BY_ID.get(exercise.exerciseId) : undefined;

  // History for recommendation + sparkline + PR baseline.
  const { data: history } = useRepoData(
    async (repo) => (exercise ? repo.getRecentSets(exercise.exerciseId, 60) : []),
    [exercise?.exerciseId],
  );

  const recommendation = useMemo(() => {
    if (!exercise) return null;
    const sets = history ?? [];
    if (sets.length === 0) {
      const fromWarmup = exercise.warmup[exercise.warmup.length - 1];
      const base = fromWarmup && fromWarmup.weightKg > 0 ? Math.round((fromWarmup.weightKg / 0.85) / 2.5) * 2.5 : 20;
      return { weightKg: base, reps: exercise.repMin };
    }
    const lastDay = sets[0]?.completed_at.slice(0, 10);
    const lastSession = sets
      .filter((s) => s.completed_at.slice(0, 10) === lastDay)
      .map((s) => ({ weightKg: s.weight_kg, reps: s.reps, rpe: s.rpe ?? undefined }));
    const def2 = EXERCISE_BY_ID.get(exercise.exerciseId);
    const result = progressExercise({
      incrementClass: def2?.incrementClass ?? "machine",
      repMin: exercise.repMin,
      repMax: exercise.repMax,
      lastSession,
      consecutiveMisses: 0,
      inScheduledDeload: session?.isDeload ?? false,
    });
    const deloadFactor = session?.isDeload ? 0.9 : 1;
    return {
      weightKg: Math.round((result.nextWeightKg * deloadFactor) / 2.5) * 2.5,
      reps: result.nextRepTarget,
    };
  }, [exercise, history, session?.isDeload]);

  useEffect(() => {
    if (recommendation) {
      setWeight(recommendation.weightKg);
      setReps(recommendation.reps);
      setRpe(8);
    }
  }, [recommendation]);

  const sparkValues = useMemo(() => {
    const sets = history ?? [];
    const byDay = new Map<string, number>();
    for (const s of sets) {
      const day = s.completed_at.slice(0, 10);
      const v = e1rm({ weightKg: s.weight_kg, reps: s.reps, rpe: s.rpe ?? undefined }).value;
      const prev = byDay.get(day);
      if (prev === undefined || v > prev) byDay.set(day, v);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
      .slice(-10);
  }, [history]);

  const setsForCurrent = loggedSets.filter(
    (s) => exercise && s.exerciseId === exercise.exerciseId && !s.isWarmup,
  );
  const warmupsForCurrent = loggedSets.filter(
    (s) => exercise && s.exerciseId === exercise.exerciseId && s.isWarmup,
  );

  const persistSet = useCallback(
    async (logged: LoggedSet) => {
      if (!session) return;
      const repo = await getRepository();
      const row: WorkoutSetRow = {
        id: logged.id,
        user_id: repo.userId,
        workout_id: session.workoutId,
        exercise_id: logged.exerciseId,
        set_index: logged.setIndex,
        weight_kg: logged.weightKg,
        reps: logged.reps,
        rpe: logged.rpe,
        is_warmup: logged.isWarmup,
        completed_at: logged.completedAt,
        updated_at: logged.completedAt,
      };
      // Workout row exists from the first set on (idempotent upsert).
      await repo.upsertWorkout({
        id: session.workoutId,
        user_id: repo.userId,
        plan_id: session.planId,
        week_index: session.weekIndex,
        day_index: session.dayIndex,
        label: session.label,
        started_at: session.startedAt,
        completed_at: null,
        updated_at: new Date().toISOString(),
      });
      await repo.upsertSet(row);
    },
    [session],
  );

  function handleLogSet(isWarmup: boolean, w: number, r: number, rpeValue: number | null) {
    if (!session || !exercise) return;
    unlockAudio();
    const logged: LoggedSet = {
      id: uuidv7(),
      exerciseId: exercise.exerciseId,
      setIndex: loggedSets.length,
      weightKg: w,
      reps: r,
      rpe: rpeValue,
      isWarmup,
      completedAt: new Date().toISOString(),
    };
    logSet(logged);
    void persistSet(logged);
    if (!isWarmup) {
      track("set_logged", { exercise_id: exercise.exerciseId, weight_kg: w, reps: r });
      startRest(exercise.restSeconds);
    }
  }

  async function handleFinish() {
    if (!session) return;
    const repo = await getRepository();
    const volumeKg = Math.round(
      loggedSets.reduce((sum, s) => (s.isWarmup ? sum : sum + s.weightKg * s.reps), 0),
    );

    // e1RM deltas + PR detection against history BEFORE this session.
    const exerciseIds = [...new Set(loggedSets.filter((s) => !s.isWarmup).map((s) => s.exerciseId))];
    const deltas: Array<{ name: string; delta: number }> = [];
    let pr: PrCardData | null = null;
    for (const id of exerciseIds) {
      const previous = await repo.getRecentSets(id, 200);
      const sessionStart = session.startedAt;
      const before = previous.filter((s) => s.completed_at < sessionStart);
      const prevBest = bestE1rm(before, id);
      const todayBest = loggedSets
        .filter((s) => s.exerciseId === id && !s.isWarmup)
        .reduce((best, s) => {
          const v = e1rm({ weightKg: s.weightKg, reps: s.reps, rpe: s.rpe ?? undefined }).value;
          return Math.max(best, v);
        }, 0);
      const name = EXERCISE_BY_ID.get(id)?.nameDe ?? id;
      if (prevBest > 0) deltas.push({ name, delta: Math.round((todayBest - prevBest) * 10) / 10 });
      if (todayBest > prevBest && prevBest > 0) {
        if (!pr || todayBest - prevBest > pr.deltaKg) {
          pr = { exerciseName: name, e1rmKg: todayBest, deltaKg: Math.round((todayBest - prevBest) * 10) / 10, date: new Date() };
        }
      }
    }
    if (pr) track("pr_achieved", { exercise_id: pr.exerciseName, e1rm: pr.e1rmKg });

    await repo.upsertWorkout({
      id: session.workoutId,
      user_id: repo.userId,
      plan_id: session.planId,
      week_index: session.weekIndex,
      day_index: session.dayIndex,
      label: session.label,
      started_at: session.startedAt,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    track("workout_completed", { label: session.label, total_volume_kg: volumeKg });
    setSummary({ volumeKg, deltas, pr });
    finish();
  }

  // ---- summary screen ----
  if (summary) {
    return (
      <>
        <AppHeader title={t("player.summaryTitle")} />
        <div className="space-y-4 py-4">
          <Card>
            <CardTitle>{t("player.summaryVolume")}</CardTitle>
            <p className="metric text-4xl font-semibold text-volt">
              {formatNumber(summary.volumeKg)} kg
            </p>
          </Card>
          {summary.deltas.length > 0 && (
            <Card>
              <CardTitle>{t("player.summaryE1rmDeltas")}</CardTitle>
              <ul className="space-y-1">
                {summary.deltas.map((d) => (
                  <li key={d.name} className="flex justify-between text-sm">
                    <span>{d.name}</span>
                    <span className={cn("metric", d.delta > 0 ? "text-volt" : d.delta < 0 ? "text-danger" : "text-text-2")}>
                      {d.delta > 0 ? "+" : ""}
                      {formatNumber(d.delta)} kg
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {summary.pr ? (
            <Card data-testid="pr-card">
              <CardTitle>{t("player.summaryPr")}</CardTitle>
              <PrShareCard data={summary.pr} />
            </Card>
          ) : (
            <p className="text-sm text-text-2">{t("player.summaryNoPr")}</p>
          )}
          <Button variant="secondary" size="lg" onClick={() => router.push("/app/train")}>
            {t("player.backToPlan")}
          </Button>
        </div>
      </>
    );
  }

  if (!session || !exercise) {
    return (
      <>
        <AppHeader title={t("train.title")} />
        <div className="py-8">
          <p className="text-sm text-text-2 mb-4">{t("train.noPlan")}</p>
          <Button variant="secondary" onClick={() => router.push("/app/train")}>
            {t("player.backToPlan")}
          </Button>
        </div>
      </>
    );
  }

  const substitutes = substitutesFor(exercise.exerciseId, def?.equipment ?? [], []);

  return (
    <>
      <AppHeader title={session.label} />
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-text-2">
            {t("player.exerciseOf", { current: exerciseIndex + 1, total: session.exercises.length })}
          </p>
          {session.isDeload && <Badge variant="info">{t("train.deloadBadge")}</Badge>}
        </div>

        <Card>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">{def?.nameDe ?? exercise.exerciseId}</h2>
              {recommendation && (
                <p className="mt-1 text-sm text-volt metric">
                  {t("player.engineRecommends", {
                    weight: formatWeight(recommendation.weightKg),
                    reps: recommendation.reps,
                  })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Sparkline values={sparkValues} />
              <button
                type="button"
                onClick={() => setShowSwap((v) => !v)}
                className="tap-target flex items-center gap-1 text-xs text-text-2 hover:text-text-1"
              >
                <ArrowLeftRight size={14} /> {t("player.swap")}
              </button>
            </div>
          </div>

          {showSwap && substitutes.length > 0 && (
            <div className="mt-3 space-y-1 rounded-card border border-border bg-surface-2 p-2">
              <p className="px-2 py-1 text-xs text-text-2">{t("player.swapTitle")}</p>
              {substitutes.slice(0, 4).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  className="tap-target w-full rounded-card px-2 py-2 text-left text-sm hover:bg-surface-1"
                  onClick={() => {
                    swapExercise(exerciseIndex, {
                      ...exercise,
                      exerciseId: sub.id,
                      repMin: sub.repRange.min,
                      repMax: sub.repRange.max,
                    });
                    setShowSwap(false);
                  }}
                >
                  {sub.nameDe}
                </button>
              ))}
            </div>
          )}

          {/* Warm-up ramp */}
          {exercise.warmup.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest text-text-2">{t("player.warmupSets")}</p>
              <ul className="mt-2 space-y-1">
                {exercise.warmup.map((w, i) => {
                  const done = warmupsForCurrent.length > i;
                  return (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className={cn("metric", done ? "text-text-3 line-through" : "text-text-2")}>
                        {w.weightKg > 0 ? formatWeight(w.weightKg) : `${Math.round(w.pctOfWorking * 100)} %`} × {w.reps}
                      </span>
                      {!done && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLogSet(true, w.weightKg, w.reps, null)}
                        >
                          {t("player.logSet")}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Working sets */}
          <div className="mt-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-text-2">
              {t("player.workingSets")} · {setsForCurrent.length}/{exercise.sets}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-2">{t("player.weight")}</span>
              <Stepper
                label={t("player.weight")}
                value={weight}
                step={2.5}
                min={0}
                max={500}
                format={(v) => `${formatNumber(v)} kg`}
                onChange={setWeight}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-2">{t("player.reps")}</span>
              <Stepper label={t("player.reps")} value={reps} min={1} max={50} onChange={setReps} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-text-2">{t("player.rpe")}</span>
              <div className="flex flex-wrap justify-end gap-1">
                {RPE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={rpe === option}
                    onClick={() => setRpe(option)}
                    className={cn(
                      "tap-target rounded-pill border px-2 text-xs metric transition-colors duration-150",
                      rpe === option
                        ? "border-volt/60 bg-volt/15 text-volt"
                        : "border-border bg-surface-2 text-text-2",
                    )}
                  >
                    {formatNumber(option)}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              data-testid="log-set"
              onClick={() => handleLogSet(false, weight, reps, rpe)}
            >
              {t("player.logSet")}
            </Button>
          </div>

          {setsForCurrent.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-border pt-3">
              {setsForCurrent.map((s) => (
                <li key={s.id} className="flex justify-between text-sm text-text-2">
                  <span className="metric">
                    {formatWeight(s.weightKg)} × {s.reps}
                  </span>
                  <span className="metric">RPE {s.rpe !== null ? formatNumber(s.rpe) : "–"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {restEndsAt !== null && (
          <RestTimer endsAt={restEndsAt} onDone={() => undefined} onSkip={clearRest} />
        )}

        {/* Explicit navigation — no edge swipe */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={exerciseIndex === 0}
            onClick={() => goToExercise(exerciseIndex - 1)}
          >
            <ChevronLeft size={18} /> {t("player.prevExercise")}
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={exerciseIndex >= session.exercises.length - 1}
            onClick={() => goToExercise(exerciseIndex + 1)}
          >
            {t("player.nextExercise")} <ChevronRight size={18} />
          </Button>
        </div>

        <Button variant="secondary" size="lg" data-testid="finish-workout" onClick={handleFinish}>
          {t("player.finish")}
        </Button>

        {history && history.length > 0 && (
          <p className="text-xs text-text-2">
            {t("player.history")}: {formatShortDate(history[0]?.completed_at ?? "")} ·{" "}
            <span className="metric">{formatWeight(history[0]?.weight_kg ?? 0)} × {history[0]?.reps}</span>
          </p>
        )}
      </div>
    </>
  );
}
