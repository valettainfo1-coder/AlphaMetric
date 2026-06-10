"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/shell/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReadinessRing } from "@/components/metric/readiness-ring";
import { Stepper } from "@/components/ui/stepper";
import { t, type MessageKey } from "@/lib/i18n";
import { useRepoData } from "@/lib/hooks/use-repo";
import { getRepository } from "@/lib/data";
import { uuidv7 } from "@/lib/uuid";
import { todayIso, formatNumber } from "@/lib/format";
import { computeAcwr, weeklyStreak } from "@/lib/aggregate";
import { readiness } from "@/lib/engine/readiness";
import { useWorkoutSession } from "@/lib/stores/workout-session";

function ScalePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-text-2 w-24">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n}`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={`tap-target rounded-pill border text-sm metric transition-colors duration-150 ${
              value === n
                ? "border-volt/60 bg-volt/15 text-volt"
                : "border-border bg-surface-2 text-text-2"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TodayPage() {
  const session = useWorkoutSession((s) => s.session);
  const [sleep, setSleep] = useState(3);
  const [soreness, setSoreness] = useState(2);
  const [stress, setStress] = useState(2);
  const [weight, setWeight] = useState(80);
  const [saving, setSaving] = useState(false);

  const { data, loading, reload } = useRepoData(async (repo) => {
    const today = todayIso();
    const since = new Date(Date.now() - 35 * 86_400_000).toISOString();
    const [checkin, plan, workouts, sets, readinessRows] = await Promise.all([
      repo.getCheckin(today),
      repo.getActivePlan(),
      repo.getWorkouts(60),
      repo.getSetsSince(since),
      repo.getReadinessHistory(today),
    ]);
    return { checkin, plan, workouts, sets, readinessToday: readinessRows[readinessRows.length - 1] ?? null };
  });

  const streak = useMemo(() => (data ? weeklyStreak(data.workouts) : 0), [data]);

  const nextDay = useMemo(() => {
    if (!data?.plan) return null;
    const meso = data.plan.mesocycle;
    const completed = data.workouts.filter((w) => w.completed_at).length;
    const weekIndex = Math.min(3, Math.floor(completed / meso.daysPerWeek) % 4);
    const week = meso.weeks[weekIndex];
    if (!week) return null;
    const dayIndex = completed % meso.daysPerWeek;
    const day = week.days[dayIndex];
    if (!day) return null;
    return { week, day, weekIndex };
  }, [data]);

  async function submitCheckin() {
    if (!data) return;
    setSaving(true);
    try {
      const repo = await getRepository();
      const now = new Date().toISOString();
      await repo.upsertCheckin({
        id: uuidv7(),
        user_id: repo.userId,
        date: todayIso(),
        weight_kg: weight,
        sleep_quality: sleep,
        soreness,
        stress,
        updated_at: now,
      });
      const acwr = computeAcwr(data.sets);
      const lastWorkout = data.workouts.find((w) => w.completed_at);
      const daysSinceRest = lastWorkout
        ? Math.floor((Date.now() - new Date(lastWorkout.started_at).getTime()) / 86_400_000)
        : 3;
      const result = readiness({
        sleepQuality: sleep,
        soreness,
        stress,
        acwr,
        daysSinceRest,
      });
      await repo.upsertReadiness({
        id: uuidv7(),
        user_id: repo.userId,
        date: todayIso(),
        score: result.score,
        tier: result.tier,
        calibrating: result.calibrating,
        updated_at: now,
      });
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppHeader title={t("today.title")} />
      <div className="space-y-4 py-4">
        {loading && (
          <>
            <Skeleton className="h-44" />
            <Skeleton className="h-40" />
          </>
        )}

        {!loading && data && (
          <>
            {/* Readiness check-in / result */}
            <Card>
              <CardTitle>{t("today.checkinTitle")}</CardTitle>
              {data.readinessToday ? (
                <div className="flex items-center gap-5">
                  <ReadinessRing
                    score={data.readinessToday.score}
                    tier={data.readinessToday.tier}
                    calibrating={data.readinessToday.calibrating}
                  />
                  <div className="space-y-1">
                    <p className="text-sm text-text-2">{t("today.checkinDone")}</p>
                    {data.readinessToday.calibrating && (
                      <p className="text-xs text-text-2">{t("readiness.calibratingHint")}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <ScalePicker label={t("today.checkinSleep")} value={sleep} onChange={setSleep} />
                  <ScalePicker label={t("today.checkinSoreness")} value={soreness} onChange={setSoreness} />
                  <ScalePicker label={t("today.checkinStress")} value={stress} onChange={setStress} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-text-2 w-24">{t("today.checkinWeight")}</span>
                    <Stepper
                      label={t("today.checkinWeight")}
                      value={weight}
                      step={0.1}
                      min={30}
                      max={250}
                      format={(v) => `${formatNumber(v)} kg`}
                      onChange={setWeight}
                    />
                  </div>
                  <Button variant="primary" size="lg" onClick={submitCheckin} disabled={saving}>
                    {t("today.checkinSubmit")}
                  </Button>
                </div>
              )}
            </Card>

            {/* Today's session */}
            <Card>
              <CardTitle>{t("today.sessionTitle")}</CardTitle>
              {!data.plan && (
                <div className="space-y-3">
                  <p className="text-sm text-text-2">{t("today.noPlan")}</p>
                  <Link href="/onboarding">
                    <Button variant="secondary">{t("today.noPlanCta")}</Button>
                  </Link>
                </div>
              )}
              {data.plan && nextDay && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-text-1">{nextDay.day.label}</p>
                      <p className="text-sm text-text-2">
                        {t("train.weekLabel", { week: nextDay.weekIndex + 1 })} ·{" "}
                        {t("train.estimated", { minutes: nextDay.day.estimatedMinutes })}
                      </p>
                    </div>
                    {nextDay.week.isDeload && <Badge variant="info">{t("train.deloadBadge")}</Badge>}
                  </div>
                  <Link href="/app/train">
                    <Button variant={data.readinessToday ? "primary" : "secondary"} size="lg">
                      {session ? t("today.sessionResume") : t("today.sessionStart")}
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* Streak */}
            <Card>
              <CardTitle>{t("today.streak")}</CardTitle>
              <p>
                <span className="metric text-3xl font-semibold text-volt">{streak}</span>{" "}
                <span className="text-sm text-text-2">{t("today.streakUnit")}</span>
              </p>
            </Card>

            {/* One concrete adjustment from the engine */}
            {data.readinessToday && (
              <Card>
                <p className="text-sm text-text-1">
                  {t(adjustmentKeyFor(data.readinessToday.score) as MessageKey)}
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

function adjustmentKeyFor(score: number): string {
  if (score < 40) return "readiness.adjust.recover";
  if (score < 60) return "readiness.adjust.keepRpeLow";
  if (score >= 80) return "readiness.adjust.push";
  return "readiness.adjust.asPlanned";
}
