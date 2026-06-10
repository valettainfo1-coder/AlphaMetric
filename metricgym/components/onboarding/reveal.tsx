"use client";

/**
 * Performance Profile reveal → signup wall → soft paywall stub.
 * Saving the plan is what's gated — the quiz result is always shown.
 */
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/metric/count-up";
import { t, type MessageKey } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { formatGrams, formatInt, formatKcal, formatWeight } from "@/lib/format";
import { getRepository, isDemoMode } from "@/lib/data";
import { uuidv7 } from "@/lib/uuid";
import { buildAssessmentInput } from "@/lib/assessment";
import { forecast } from "@/lib/engine/forecast";
import { ASSESSMENT_SCHEMA_VERSION, type ComputedProfile } from "@/lib/engine/profile";
import type { OnboardingAnswers } from "@/lib/stores/onboarding";
import type { MainLift, SplitType } from "@/lib/engine/types";

const SPLIT_LABEL: Record<SplitType, MessageKey> = {
  full_body: "onboarding.splitFullBody",
  ppl: "onboarding.splitPpl",
  upper_lower: "onboarding.splitUpperLower",
  ppl_ul: "onboarding.splitPplUl",
};

const LIFT_LABEL: Record<MainLift, MessageKey> = {
  squat: "onboarding.anchorSquat",
  bench: "onboarding.anchorBench",
  deadlift: "onboarding.anchorDeadlift",
  ohp: "onboarding.anchorOhp",
};

type Stage = "profile" | "signup" | "paywall";

export function RevealScreen({
  computing,
  profile,
  answers,
  onDone,
}: {
  computing: boolean;
  profile: ComputedProfile | null;
  answers: OnboardingAnswers;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("profile");
  const [saving, setSaving] = useState(false);

  // 12-week trajectory mini-chart from the strongest anchor (if any).
  const trajectory = useMemo(() => {
    if (!profile) return null;
    const entries = Object.entries(profile.e1rmBaseline) as Array<
      [MainLift, { value: number }]
    >;
    const first = entries[0];
    if (!first) return null;
    const [lift, baseline] = first;
    // Synthetic gentle history so the saturating model has a base.
    const series = [0, 7, 14].map((tDay, i) => ({
      t: tDay,
      value: baseline.value * (0.97 + i * 0.015),
    }));
    const fc = forecast(series);
    return { lift, baseline: baseline.value, fc };
  }, [profile]);

  if (computing || !profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-volt" />
        <p className="text-sm text-text-2">{t("onboarding.computing")}</p>
      </div>
    );
  }

  async function persistAndContinue(method: "demo" | "magic_link" | "google") {
    setSaving(true);
    try {
      const repo = await getRepository();
      const now = new Date().toISOString();
      const input = buildAssessmentInput(answers);
      await repo.saveAssessment({
        id: uuidv7(),
        user_id: repo.userId,
        schema_version: ASSESSMENT_SCHEMA_VERSION,
        raw_input: input,
        computed_output: profile!,
        created_at: now,
        updated_at: now,
      });
      await repo.savePlan({
        id: uuidv7(),
        user_id: repo.userId,
        mesocycle: profile!.plan,
        started_at: now,
        active: true,
        updated_at: now,
      });
      if (answers.medicalConsent) {
        await repo.upsertConsent({
          id: uuidv7(),
          user_id: repo.userId,
          kind: "medical_disclaimer",
          granted: true,
          granted_at: answers.medicalConsentAt ?? now,
          updated_at: now,
        });
      }
      track("signup_completed", { method });
      track("paywall_viewed", { source: "onboarding" });
      setStage("paywall");
    } finally {
      setSaving(false);
    }
  }

  if (stage === "signup") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">{t("onboarding.signupTitle")}</h1>
        <p className="text-sm text-text-2">{t("onboarding.signupBody")}</p>
        {!isDemoMode() && (
          <>
            <input
              type="email"
              placeholder={t("onboarding.signupEmail")}
              className="h-12 w-full rounded-card border border-border bg-surface-2 px-4 text-text-1 placeholder:text-text-3"
            />
            <Button variant="primary" size="lg">
              {t("onboarding.signupMagicLink")}
            </Button>
            <Button variant="secondary" size="lg">
              {t("onboarding.signupGoogle")}
            </Button>
          </>
        )}
        <Button
          variant={isDemoMode() ? "primary" : "ghost"}
          size="lg"
          data-testid="signup-demo"
          disabled={saving}
          onClick={() => void persistAndContinue("demo")}
        >
          {t("onboarding.signupDemo")}
        </Button>
      </div>
    );
  }

  if (stage === "paywall") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">{t("onboarding.paywallTitle")}</h1>
        <p className="text-sm text-text-2">{t("onboarding.paywallBody")}</p>
        {/* TODO [P1]: Stripe checkout */}
        <Button variant="primary" size="lg" data-testid="paywall-continue" onClick={onDone}>
          {t("onboarding.paywallCta")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-8">
      <h1 className="fade-in text-2xl font-semibold">{t("onboarding.revealTitle")}</h1>

      <Card data-testid="reveal-card" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-2">{t("onboarding.revealBmr")}</p>
            <p className="metric text-2xl font-semibold text-text-1">
              <CountUp value={profile.bmrKcal} format={(v) => formatInt(v)} /> kcal
            </p>
          </div>
          <div>
            <p className="text-xs text-text-2">{t("onboarding.revealTdee")}</p>
            <p className="metric text-2xl font-semibold text-text-1">
              <CountUp value={profile.tdee.weeklyAvg} format={(v) => formatInt(v)} /> kcal
            </p>
          </div>
          <div>
            <p className="text-xs text-text-2">
              {t("onboarding.revealTarget")} · {t("onboarding.revealTargetTraining")}
            </p>
            <p className="metric text-2xl font-semibold text-volt">
              {formatKcal(profile.targets.trainingDay.kcal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-2">
              {t("onboarding.revealTarget")} · {t("onboarding.revealTargetRest")}
            </p>
            <p className="metric text-2xl font-semibold text-text-1">
              {formatKcal(profile.targets.restDay.kcal)}
            </p>
          </div>
        </div>

        {profile.targets.warnings.length > 0 && (
          <p className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {t("onboarding.revealWarningFloor")}
          </p>
        )}

        <div>
          <p className="mb-2 text-xs text-text-2">{t("onboarding.revealMacros")}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["onboarding.revealProtein", profile.targets.trainingDay.proteinG],
                ["onboarding.revealCarbs", profile.targets.trainingDay.carbsG],
                ["onboarding.revealFat", profile.targets.trainingDay.fatG],
              ] as Array<[MessageKey, number]>
            ).map(([key, grams]) => (
              <div key={key} className="rounded-card bg-surface-2 p-2">
                <p className="metric text-lg font-semibold text-text-1">{formatGrams(grams)}</p>
                <p className="text-xs text-text-2">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-2">{t("onboarding.revealSplit")}</p>
            <p className="text-lg font-semibold text-text-1">
              {t(SPLIT_LABEL[profile.plan.splitType])}
            </p>
          </div>
          <p className="metric text-sm text-text-2">
            {profile.plan.daysPerWeek}× / {t("common.week")}
          </p>
        </div>

        {trajectory?.fc && (
          <div>
            <p className="mb-1 text-xs text-text-2">{t("onboarding.revealTrajectory")}</p>
            <TrajectoryMini baseline={trajectory.baseline} points={trajectory.fc.points.map((p) => p.value)} />
            <p className="metric mt-1 text-sm text-volt">
              {t(LIFT_LABEL[trajectory.lift])}: {formatWeight(trajectory.baseline)} →{" "}
              {formatWeight(trajectory.fc.points[2]?.value ?? trajectory.baseline)}
            </p>
          </div>
        )}

        {Object.keys(profile.e1rmBaseline).length > 0 && (
          <div>
            <p className="mb-1 text-xs text-text-2">{t("onboarding.revealE1rm")}</p>
            <ul className="space-y-1">
              {(Object.entries(profile.e1rmBaseline) as Array<[MainLift, { value: number }]>).map(
                ([lift, result]) => (
                  <li key={lift} className="flex justify-between text-sm">
                    <span className="text-text-1">{t(LIFT_LABEL[lift])}</span>
                    <span className="metric text-text-1">{formatWeight(result.value)}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        {profile.plan.medicalNote && (
          <p className="text-xs text-text-2">{t("onboarding.revealMedicalNote")}</p>
        )}
      </Card>

      <Button variant="primary" size="lg" data-testid="reveal-continue" onClick={() => setStage("signup")}>
        {t("onboarding.signupTitle")}
      </Button>
    </div>
  );
}

function TrajectoryMini({ baseline, points }: { baseline: number; points: number[] }) {
  const values = [baseline, ...points];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const coords = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${36 - ((v - min) / range) * 30}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" className="h-16 w-full" aria-hidden>
      <polyline points={coords} fill="none" stroke="var(--color-volt)" strokeWidth={2} strokeDasharray="4 3" />
    </svg>
  );
}
