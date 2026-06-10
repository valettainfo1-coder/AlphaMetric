"use client";

/**
 * Analytics — the flagship tab.
 * 1 Strength Trajectory · 2 PR Share Card · 3 Weekly Report ·
 * 4 Volume Heatmap · 5 Body Composition · 6 Plateau Radar
 * Header: readiness ring.
 */
import { useMemo } from "react";
import { AppHeader } from "@/components/shell/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { ReadinessRing } from "@/components/metric/readiness-ring";
import { StrengthTrajectory } from "@/components/analytics/strength-trajectory";
import { VolumeHeatmap } from "@/components/analytics/volume-heatmap";
import { BodyCompChart } from "@/components/analytics/body-comp";
import { PrShareCard } from "@/components/workout/pr-card";
import { t, type MessageKey } from "@/lib/i18n";
import { useRepoData } from "@/lib/hooks/use-repo";

import { uuidv7 } from "@/lib/uuid";
import {
  bestE1rm,
  buildWeeklyReport,
  e1rmSeries,
  volumeHeatmap,
} from "@/lib/aggregate";
import { detectPlateau, forecast } from "@/lib/engine/forecast";
import { EXERCISE_BY_ID, MAIN_LIFT_EXERCISE } from "@/lib/data/exercises";
import { todayIso, weekStartIso, formatNumber } from "@/lib/format";
import type { WeeklyReportPayload } from "@/lib/data/types";

const HISTORY_DAYS = 84; // 12 weeks

function lastWeeks(n: number): string[] {
  const result: string[] = [];
  const monday = new Date(weekStartIso());
  for (let i = n - 1; i >= 0; i--) {
    result.push(new Date(monday.getTime() - i * 7 * 86_400_000).toISOString().slice(0, 10));
  }
  return result;
}

export default function AnalyticsPage() {
  const { data, loading } = useRepoData(async (repo) => {
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString();
    const sinceDate = since.slice(0, 10);
    const [sets, checkins, readinessRows, assessment, workouts] = await Promise.all([
      repo.getSetsSince(since),
      repo.getCheckins(sinceDate),
      repo.getReadinessHistory(sinceDate),
      repo.getLatestAssessment(),
      repo.getWorkouts(100),
    ]);

    // Weekly report: computed on read, cached in weekly_reports.
    const weekStart = weekStartIso();
    let report: WeeklyReportPayload | null = null;
    const cached = await repo.getWeeklyReport(weekStart);
    if (cached) {
      report = cached.payload;
    } else {
      const lastWeekStart = new Date(new Date(weekStart).getTime() - 7 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const thisWeekSets = sets.filter((s) => s.completed_at.slice(0, 10) >= weekStart);
      const lastWeekSets = sets.filter(
        (s) =>
          s.completed_at.slice(0, 10) >= lastWeekStart &&
          s.completed_at.slice(0, 10) < weekStart,
      );
      const planned = assessment?.raw_input.daysPerWeek ?? 0;
      const completedThisWeek = workouts.filter(
        (w) => w.completed_at && w.started_at.slice(0, 10) >= weekStart,
      ).length;
      const meals = await repo.getMeals(new Date(weekStart).toISOString());
      report = buildWeeklyReport({
        thisWeekSets,
        lastWeekSets,
        plannedWorkouts: planned,
        completedWorkouts: completedThisWeek,
        meals,
        kcalTarget: assessment?.computed_output.targets.trainingDay.kcal ?? null,
      });
      await repo.upsertWeeklyReport({
        id: uuidv7(),
        user_id: repo.userId,
        week_start: weekStart,
        payload: report,
        updated_at: new Date().toISOString(),
      });
    }

    return { sets, checkins, readinessRows, assessment, report };
  });

  const readinessToday = useMemo(() => {
    if (!data) return null;
    return data.readinessRows[data.readinessRows.length - 1] ?? null;
  }, [data]);

  const trajectories = useMemo(() => {
    if (!data) return [];
    // Max 2 series on mobile: the two main lifts with the most data.
    return Object.values(MAIN_LIFT_EXERCISE)
      .map((exerciseId) => ({
        exerciseId,
        series: e1rmSeries(data.sets, exerciseId),
      }))
      .filter((x) => x.series.length >= 3)
      .sort((a, b) => b.series.length - a.series.length)
      .slice(0, 2);
  }, [data]);

  const heatmapWeeks = useMemo(() => lastWeeks(10), []);
  const heatmap = useMemo(
    () => (data ? volumeHeatmap(data.sets, heatmapWeeks) : new Map()),
    [data, heatmapWeeks],
  );

  const plateaus = useMemo(() => {
    if (!data) return [];
    return Object.values(MAIN_LIFT_EXERCISE)
      .map((exerciseId) => {
        const series = e1rmSeries(data.sets, exerciseId);
        const fc = forecast(series);
        return {
          exerciseId,
          name: EXERCISE_BY_ID.get(exerciseId)?.nameDe ?? exerciseId,
          plateau: series.length >= 6 && (fc?.plateau ?? detectPlateau(series)),
        };
      })
      .filter((x) => x.plateau);
  }, [data]);

  const latestPr = useMemo(() => {
    if (!data || data.sets.length === 0) return null;
    let best: { name: string; e1rm: number; delta: number; date: Date } | null = null;
    for (const exerciseId of Object.values(MAIN_LIFT_EXERCISE)) {
      const series = e1rmSeries(data.sets, exerciseId);
      const last = series[series.length - 1];
      if (!last || series.length < 2) continue;
      const allTime = bestE1rm(data.sets, exerciseId);
      if (last.value >= allTime && allTime > 0) {
        const prevBest = Math.max(...series.slice(0, -1).map((p) => p.value));
        const delta = Math.round((last.value - prevBest) * 10) / 10;
        if (delta > 0 && (!best || delta > best.delta)) {
          best = {
            name: EXERCISE_BY_ID.get(exerciseId)?.nameDe ?? exerciseId,
            e1rm: last.value,
            delta,
            date: new Date(),
          };
        }
      }
    }
    return best;
  }, [data]);

  const goalCorridor = useMemo<[number, number] | null>(() => {
    const target = data?.assessment?.raw_input.targetWeightKg;
    if (!target) return null;
    return [target - 1, target + 1];
  }, [data]);

  const firstSetDate = useMemo(() => {
    if (!data || data.sets.length === 0) return new Date();
    const first = [...data.sets].sort((a, b) => a.completed_at.localeCompare(b.completed_at))[0];
    return new Date(first?.completed_at.slice(0, 10) ?? todayIso());
  }, [data]);

  return (
    <>
      <AppHeader title={t("analytics.title")} />
      <div className="space-y-4 py-4">
        {loading && (
          <>
            <Skeleton className="h-40" />
            <ChartSkeleton />
            <Skeleton className="h-40" />
          </>
        )}

        {!loading && data && (
          <>
            {/* Header: readiness ring */}
            <Card data-testid="module-readiness" className="flex items-center gap-5">
              {readinessToday ? (
                <>
                  <ReadinessRing
                    score={readinessToday.score}
                    tier={readinessToday.tier}
                    calibrating={readinessToday.calibrating}
                  />
                  <div>
                    <CardTitle className="mb-1">{t("readiness.title")}</CardTitle>
                    {readinessToday.calibrating && (
                      <p className="text-xs text-text-2">{t("readiness.calibratingHint")}</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-2">{t("errors.noData")}</p>
              )}
            </Card>

            {/* 1. Strength Trajectory */}
            <Card data-testid="module-trajectory">
              <CardTitle>{t("analytics.trajectoryTitle")}</CardTitle>
              {trajectories.length === 0 && (
                <p className="text-sm text-text-2">{t("analytics.trajectoryEmpty")}</p>
              )}
              <div className="space-y-6">
                {trajectories.map((traj) => (
                  <StrengthTrajectory
                    key={traj.exerciseId}
                    series={traj.series}
                    startDate={firstSetDate}
                    liftName={EXERCISE_BY_ID.get(traj.exerciseId)?.nameDe ?? traj.exerciseId}
                  />
                ))}
              </div>
            </Card>

            {/* 2. PR Share Card */}
            {latestPr && (
              <Card data-testid="module-pr">
                <CardTitle>{t("pr.cardTitle")}</CardTitle>
                <PrShareCard
                  data={{
                    exerciseName: latestPr.name,
                    e1rmKg: latestPr.e1rm,
                    deltaKg: latestPr.delta,
                    date: latestPr.date,
                  }}
                />
              </Card>
            )}

            {/* 3. Weekly Report */}
            <Card data-testid="module-report">
              <CardTitle>{t("analytics.reportTitle")}</CardTitle>
              {data.report && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-text-2">{t("analytics.reportAdherence")}</p>
                      <p className="metric text-2xl font-semibold text-text-1">
                        {data.report.adherencePct} %
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-2">{t("analytics.reportVolume")}</p>
                      <p className="metric text-2xl font-semibold text-text-1">
                        {formatNumber(data.report.volumeKg)} kg{" "}
                        <span
                          className={
                            data.report.volumeDeltaPct >= 0 ? "text-volt text-sm" : "text-danger text-sm"
                          }
                        >
                          {data.report.volumeDeltaPct >= 0 ? "+" : ""}
                          {data.report.volumeDeltaPct} %
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-2">{t("analytics.reportStrongest")}</p>
                      <p className="text-sm text-text-1">
                        {data.report.strongestLift
                          ? EXERCISE_BY_ID.get(data.report.strongestLift.exerciseId)?.nameDe ?? "—"
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-2">{t("analytics.reportWeakest")}</p>
                      <p className="text-sm text-text-1">
                        {data.report.weakestMuscle
                          ? t(`muscles.${data.report.weakestMuscle}` as MessageKey)
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="border-t border-border pt-3 text-sm text-text-2">
                    {data.report.narrative}
                  </p>
                </div>
              )}
            </Card>

            {/* 4. Volume Heatmap */}
            <Card data-testid="module-heatmap">
              <CardTitle>{t("analytics.heatmapTitle")}</CardTitle>
              <VolumeHeatmap data={heatmap} weeks={heatmapWeeks} />
            </Card>

            {/* 5. Body Composition */}
            <Card data-testid="module-bodycomp">
              <CardTitle>{t("analytics.bodyCompTitle")}</CardTitle>
              <BodyCompChart checkins={data.checkins} goalCorridor={goalCorridor} />
            </Card>

            {/* 6. Plateau Radar */}
            <Card data-testid="module-plateau">
              <CardTitle>{t("analytics.plateauTitle")}</CardTitle>
              {plateaus.length === 0 ? (
                <p className="text-sm text-text-2">{t("analytics.plateauNone")}</p>
              ) : (
                <ul className="space-y-3">
                  {plateaus.map((p) => (
                    <li key={p.exerciseId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-1">{p.name}</span>
                        <Badge variant="danger">{t("analytics.plateauDetected")}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="neutral">{t("analytics.plateauActionDeload")}</Badge>
                        <Badge variant="neutral">{t("analytics.plateauActionVariation")}</Badge>
                        <Badge variant="neutral">{t("analytics.plateauActionVolume")}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
