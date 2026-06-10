"use client";

/**
 * Plan view: mesocycle weeks, deload visually distinct, day cards with
 * muscle-coverage micro-bars. Starting a day seeds the player session.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shell/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { useRepoData } from "@/lib/hooks/use-repo";
import { EXERCISE_BY_ID } from "@/lib/data/exercises";
import type { PlanDay, MuscleGroup } from "@/lib/engine/types";
import { useWorkoutSession } from "@/lib/stores/workout-session";
import { uuidv7 } from "@/lib/uuid";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

function muscleCoverage(day: PlanDay): Map<MuscleGroup, number> {
  const result = new Map<MuscleGroup, number>();
  for (const pe of day.exercises) {
    const def = EXERCISE_BY_ID.get(pe.exerciseId);
    if (!def) continue;
    for (const m of def.primaryMuscles) result.set(m, (result.get(m) ?? 0) + pe.sets);
  }
  return result;
}

function MuscleBars({ day }: { day: PlanDay }) {
  const coverage = muscleCoverage(day);
  const max = Math.max(1, ...coverage.values());
  return (
    <div className="flex items-end gap-1" aria-hidden>
      {[...coverage.entries()].slice(0, 6).map(([muscle, sets]) => (
        <div key={muscle} className="flex flex-col items-center gap-0.5">
          <div
            className="w-1.5 rounded-sm bg-volt/70"
            style={{ height: `${6 + (sets / max) * 18}px` }}
          />
        </div>
      ))}
    </div>
  );
}

export default function TrainPage() {
  const router = useRouter();
  const start = useWorkoutSession((s) => s.start);
  const activeSession = useWorkoutSession((s) => s.session);
  const [weekIndex, setWeekIndex] = useState(0);

  const { data, loading } = useRepoData(async (repo) => {
    const [plan, workouts] = await Promise.all([repo.getActivePlan(), repo.getWorkouts(60)]);
    return { plan, workouts };
  });

  const currentWeek = useMemo(() => {
    if (!data?.plan) return 0;
    const completed = data.workouts.filter((w) => w.completed_at).length;
    return Math.min(3, Math.floor(completed / data.plan.mesocycle.daysPerWeek) % 4);
  }, [data]);

  const shownWeekIndex = data?.plan ? weekIndex : 0;
  const week = data?.plan?.mesocycle.weeks[shownWeekIndex];

  function startDay(day: PlanDay, isDeload: boolean) {
    if (!data?.plan) return;
    const workoutId = uuidv7();
    start({
      workoutId,
      planId: data.plan.id,
      weekIndex: shownWeekIndex,
      dayIndex: day.dayIndex,
      label: day.label,
      isDeload,
      startedAt: new Date().toISOString(),
      exercises: day.exercises,
    });
    track("workout_started", { label: day.label, week_index: shownWeekIndex });
    router.push("/app/train/player");
  }

  return (
    <>
      <AppHeader title={t("train.title")} />
      <div className="space-y-4 py-4">
        {activeSession && (
          <Link href="/app/train/player">
            <Button variant="primary" size="lg">
              {t("today.sessionResume")}
            </Button>
          </Link>
        )}

        {loading && (
          <>
            <Skeleton className="h-10" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        )}

        {!loading && !data?.plan && (
          <Card>
            <p className="text-sm text-text-2 mb-3">{t("train.noPlan")}</p>
            <Link href="/onboarding">
              <Button variant="primary">{t("today.noPlanCta")}</Button>
            </Link>
          </Card>
        )}

        {!loading && data?.plan && week && (
          <>
            {/* Week selector */}
            <div className="grid grid-cols-4 gap-2">
              {data.plan.mesocycle.weeks.map((w) => (
                <button
                  key={w.weekIndex}
                  type="button"
                  onClick={() => setWeekIndex(w.weekIndex)}
                  aria-pressed={shownWeekIndex === w.weekIndex}
                  className={cn(
                    "tap-target rounded-card border px-2 py-2 text-sm transition-colors duration-150",
                    shownWeekIndex === w.weekIndex
                      ? "border-volt/60 bg-volt/10 text-volt"
                      : "border-border bg-surface-1 text-text-2",
                    w.isDeload && "border-dashed",
                  )}
                >
                  <span className="metric">{w.weekIndex + 1}</span>
                  {w.weekIndex === currentWeek && (
                    <span className="block text-[10px] text-text-2">{t("common.today")}</span>
                  )}
                  {w.isDeload && (
                    <span className="block text-[10px] text-info">{t("train.deloadBadge")}</span>
                  )}
                </button>
              ))}
            </div>

            {week.isDeload && (
              <p className="text-xs text-text-2">{t("train.deloadHint")}</p>
            )}

            {week.days.map((day) => (
              <Card key={day.dayIndex} className={cn(week.isDeload && "border-dashed")}>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="mb-1">{day.label}</CardTitle>
                    <p className="text-sm text-text-2">
                      {t("train.exercises", { count: day.exercises.length })} ·{" "}
                      {t("train.estimated", { minutes: day.estimatedMinutes })}
                    </p>
                  </div>
                  <MuscleBars day={day} />
                </div>
                <ul className="mt-3 space-y-1">
                  {day.exercises.map((pe, i) => {
                    const def = EXERCISE_BY_ID.get(pe.exerciseId);
                    return (
                      <li key={`${pe.exerciseId}-${i}`} className="flex justify-between text-sm">
                        <span className="text-text-1">{def?.nameDe ?? pe.exerciseId}</span>
                        <span className="metric text-text-2">
                          {pe.sets} × {pe.repMin}–{pe.repMax}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => startDay(day, week.isDeload)}
                >
                  {t("train.startDay")}
                </Button>
              </Card>
            ))}
          </>
        )}
      </div>
    </>
  );
}
