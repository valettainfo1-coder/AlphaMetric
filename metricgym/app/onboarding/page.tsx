"use client";

/**
 * Performance Assessment — a quiz funnel, not a form.
 * Value before identity: no name/email/account until after the reveal.
 * One question per screen · teaser interstitials after phase 1 & 3 ·
 * medical gate before phase 3 · ≤ 90s target.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/metric/count-up";
import { t, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useOnboarding } from "@/lib/stores/onboarding";
import { track } from "@/lib/analytics";
import { formatKcal, formatNumber } from "@/lib/format";
import { ageFromBirthdate, bmr } from "@/lib/engine/bmr";
import { computeProfile, type ComputedProfile } from "@/lib/engine/profile";
import { buildAssessmentInput } from "@/lib/assessment";
import { EXERCISES } from "@/lib/data/exercises";
import type {
  ActivityLevel,
  AssessmentInput,
  Equipment,
  ExperienceLevel,
  Goal,
  InjuryFlag,
  MainLift,
  MovementPattern,
  Sex,
  SplitType,
} from "@/lib/engine/types";
import { RevealScreen } from "@/components/onboarding/reveal";

type StepId =
  | "sex"
  | "birthdate"
  | "height"
  | "weight"
  | "bodyfat"
  | "teaser_bmr"
  | "goal"
  | "target"
  | "motivation"
  | "medical"
  | "experience"
  | "days"
  | "session_length"
  | "environment"
  | "equipment"
  | "injuries"
  | "preferences"
  | "anchors"
  | "teaser_split"
  | "activity"
  | "sleep"
  | "stress"
  | "diet"
  | "meals"
  | "units"
  | "reveal";

const STEPS: StepId[] = [
  "sex",
  "birthdate",
  "height",
  "weight",
  "bodyfat",
  "teaser_bmr",
  "goal",
  "target",
  "motivation",
  "medical",
  "experience",
  "days",
  "session_length",
  "environment",
  "equipment",
  "injuries",
  "preferences",
  "anchors",
  "teaser_split",
  "activity",
  "sleep",
  "stress",
  "diet",
  "meals",
  "units",
  "reveal",
];

const QUESTION_STEPS = STEPS.filter((s) => !s.startsWith("teaser_") && s !== "reveal").length;

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "tap-target w-full rounded-card border px-4 py-4 text-left text-base font-medium transition-colors duration-150",
        selected
          ? "border-volt/60 bg-volt/10 text-volt"
          : "border-border bg-surface-1 text-text-1 hover:bg-surface-2",
      )}
    >
      {label}
    </button>
  );
}

function NumberDial({
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-center">
        <span className="metric text-5xl font-semibold text-text-1">{formatNumber(value)}</span>
        <span className="ml-2 text-text-2">{unit}</span>
      </p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-[var(--color-volt)]"
        aria-label={unit}
      />
    </div>
  );
}

const BODYFAT_RANGES: Record<Sex, Array<{ label: string; value: number }>> = {
  male: [
    { label: "6–10 %", value: 8 },
    { label: "10–13 %", value: 12 },
    { label: "13–16 %", value: 15 },
    { label: "16–20 %", value: 18 },
    { label: "20–24 %", value: 22 },
    { label: "24–28 %", value: 26 },
    { label: "28–33 %", value: 30 },
    { label: "33 %+", value: 36 },
  ],
  female: [
    { label: "14–18 %", value: 16 },
    { label: "18–21 %", value: 20 },
    { label: "21–24 %", value: 23 },
    { label: "24–28 %", value: 26 },
    { label: "28–32 %", value: 30 },
    { label: "32–36 %", value: 34 },
    { label: "36–40 %", value: 38 },
    { label: "40 %+", value: 43 },
  ],
};

const SPLIT_LABEL: Record<SplitType, MessageKey> = {
  full_body: "onboarding.splitFullBody",
  ppl: "onboarding.splitPpl",
  upper_lower: "onboarding.splitUpperLower",
  ppl_ul: "onboarding.splitPplUl",
};

function splitForDays(days: number): SplitType {
  if (days <= 3) return "full_body";
  if (days === 4) return "upper_lower";
  if (days === 5) return "ppl_ul";
  return "ppl";
}

export default function OnboardingPage() {
  const router = useRouter();
  const { stepIndex, answers, setStep, setAnswers, reset } = useOnboarding();
  const [computing, setComputing] = useState(false);
  const [profile, setProfile] = useState<ComputedProfile | null>(null);

  const step = STEPS[stepIndex] ?? "sex";
  const questionNumber = STEPS.slice(0, stepIndex + 1).filter(
    (s) => !s.startsWith("teaser_") && s !== "reveal",
  ).length;

  // Track abandonment once on mount of each step via beforeunload.
  useEffect(() => {
    const onUnload = () => {
      if (step !== "reveal") track("onboarding_abandoned", { step_id: step });
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [step]);

  const teaserBmr = useMemo(() => {
    if (!answers.sex || !answers.birthdate || !answers.heightCm || !answers.weightKg) return null;
    try {
      return bmr({
        sex: answers.sex,
        ageYears: ageFromBirthdate(answers.birthdate),
        heightCm: answers.heightCm,
        weightKg: answers.weightKg,
        bodyFatPct: answers.bodyFatPct,
      });
    } catch {
      return null;
    }
  }, [answers]);

  function next() {
    track("onboarding_step_completed", { step_id: step });
    const nextIndex = stepIndex + 1;
    if (STEPS[nextIndex] === "reveal") {
      // 1.5s "Engine berechnet…" over real computation.
      setComputing(true);
      setStep(nextIndex);
      const input = buildAssessmentInput(answers);
      const started = Date.now();
      try {
        const computed = computeProfile(input, EXERCISES);
        const wait = Math.max(0, 1500 - (Date.now() - started));
        setTimeout(() => {
          setProfile(computed);
          setComputing(false);
          track("profile_revealed", { bmr: computed.bmrKcal, goal: input.goal });
        }, wait);
      } catch {
        setComputing(false);
        setStep(0);
      }
      return;
    }
    setStep(nextIndex);
  }

  function back() {
    if (stepIndex > 0) setStep(stepIndex - 1);
    else router.push("/");
  }

  function skip() {
    track("onboarding_step_completed", { step_id: `${step}_skipped` });
    setStep(stepIndex + 1);
  }

  const single = (patch: Partial<AssessmentInput>) => {
    setAnswers(patch);
    // single-tap selections auto-advance — quiz feel, not form feel
    setTimeout(next, 120);
  };

  if (step === "reveal") {
    return (
      <RevealScreen
        computing={computing}
        profile={profile}
        answers={answers}
        onDone={() => {
          reset();
          router.push("/app/today");
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-4">
      {/* Progress + back */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label={t("common.back")}
          className="tap-target flex items-center justify-center rounded-pill text-text-2 hover:text-text-1"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-pill bg-surface-2">
          <div
            className="h-full bg-volt transition-[width] duration-300 ease-out"
            style={{ width: `${(questionNumber / QUESTION_STEPS) * 100}%` }}
          />
        </div>
        <span className="metric text-xs text-text-2">
          {t("onboarding.progress", { current: questionNumber, total: QUESTION_STEPS })}
        </span>
      </div>

      <div className="slide-up flex-1" key={step}>
        {step === "sex" && (
          <StepShell title={t("onboarding.sexQuestion")} hint={t("onboarding.sexHint")}>
            <OptionButton label={t("onboarding.sexMale")} selected={answers.sex === "male"} onClick={() => single({ sex: "male" satisfies Sex })} />
            <OptionButton label={t("onboarding.sexFemale")} selected={answers.sex === "female"} onClick={() => single({ sex: "female" satisfies Sex })} />
          </StepShell>
        )}

        {step === "birthdate" && (
          <StepShell title={t("onboarding.birthdateQuestion")}>
            <input
              type="date"
              className="h-14 w-full rounded-card border border-border bg-surface-2 px-4 text-lg text-text-1"
              value={answers.birthdate ?? "1995-01-01"}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setAnswers({ birthdate: e.target.value })}
            />
            <Button variant="primary" size="lg" onClick={next} disabled={!answers.birthdate}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "height" && (
          <StepShell title={t("onboarding.heightQuestion")}>
            <NumberDial value={answers.heightCm ?? 175} onChange={(v) => setAnswers({ heightCm: v })} min={130} max={220} step={1} unit="cm" />
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "weight" && (
          <StepShell title={t("onboarding.weightQuestion")}>
            <NumberDial value={answers.weightKg ?? 78} onChange={(v) => setAnswers({ weightKg: v })} min={35} max={220} step={0.5} unit="kg" />
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "bodyfat" && answers.sex && (
          <StepShell title={t("onboarding.bodyfatQuestion")} hint={t("onboarding.bodyfatHint")} onSkip={() => { setAnswers({ bodyFatPct: undefined }); skip(); }}>
            <div className="grid grid-cols-2 gap-2">
              {BODYFAT_RANGES[answers.sex].map((range) => (
                <button
                  key={range.value}
                  type="button"
                  aria-pressed={answers.bodyFatPct === range.value}
                  onClick={() => single({ bodyFatPct: range.value })}
                  className={cn(
                    "tap-target rounded-card border p-3 transition-colors duration-150",
                    answers.bodyFatPct === range.value
                      ? "border-volt/60 bg-volt/10"
                      : "border-border bg-surface-1 hover:bg-surface-2",
                  )}
                >
                  <Silhouette pct={range.value} sex={answers.sex ?? "male"} />
                  <span className="metric mt-1 block text-sm text-text-1">{range.label}</span>
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === "teaser_bmr" && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <p className="text-xs uppercase tracking-widest text-text-2">{t("onboarding.bmrTeaserTitle")}</p>
            <div>
              <p className="text-sm text-text-2">{t("onboarding.bmrTeaserLabel")}</p>
              <p className="metric text-6xl font-bold text-volt">
                {teaserBmr !== null ? <CountUp value={teaserBmr} format={(v) => formatKcal(v)} /> : "—"}
              </p>
            </div>
            <p className="max-w-xs text-sm text-text-2">{t("onboarding.bmrTeaserBody")}</p>
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </div>
        )}

        {step === "goal" && (
          <StepShell title={t("onboarding.goalQuestion")}>
            {(
              [
                ["muscle_gain", "onboarding.goalMuscle"],
                ["fat_loss", "onboarding.goalFatloss"],
                ["recomp", "onboarding.goalRecomp"],
                ["strength", "onboarding.goalStrength"],
                ["general_fitness", "onboarding.goalGeneral"],
              ] as Array<[Goal, MessageKey]>
            ).map(([goal, key]) => (
              <OptionButton key={goal} label={t(key)} selected={answers.goal === goal} onClick={() => single({ goal })} />
            ))}
          </StepShell>
        )}

        {step === "target" && (
          <StepShell title={t("onboarding.targetWeightQuestion")} onSkip={skip}>
            <label className="block text-sm text-text-2">
              {t("onboarding.targetWeightLabel")}
              <NumberDial value={answers.targetWeightKg ?? answers.weightKg ?? 78} onChange={(v) => setAnswers({ targetWeightKg: v })} min={35} max={220} step={0.5} unit="kg" />
            </label>
            <label className="block text-sm text-text-2">
              {t("onboarding.targetDateLabel")}
              <input
                type="date"
                className="mt-1 h-12 w-full rounded-card border border-border bg-surface-2 px-4 text-text-1"
                value={answers.targetDate ?? ""}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setAnswers({ targetDate: e.target.value })}
              />
            </label>
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "motivation" && (
          <StepShell title={t("onboarding.motivationQuestion")} hint={t("onboarding.motivationHint")} onSkip={skip}>
            <textarea
              className="min-h-28 w-full rounded-card border border-border bg-surface-2 p-4 text-text-1 placeholder:text-text-3"
              placeholder={t("onboarding.motivationPlaceholder")}
              value={answers.motivation ?? ""}
              onChange={(e) => setAnswers({ motivation: e.target.value })}
            />
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "medical" && (
          <StepShell title={t("onboarding.medicalTitle")}>
            <p className="text-sm leading-relaxed text-text-2">{t("onboarding.medicalBody")}</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface-1 p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-[var(--color-volt)]"
                checked={answers.medicalConsent ?? false}
                onChange={(e) =>
                  setAnswers({
                    medicalConsent: e.target.checked,
                    medicalConsentAt: e.target.checked ? new Date().toISOString() : undefined,
                  })
                }
              />
              <span className="text-sm text-text-1">{t("onboarding.medicalCheckbox")}</span>
            </label>
            <Button variant="primary" size="lg" onClick={next} disabled={!answers.medicalConsent}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "experience" && (
          <StepShell title={t("onboarding.experienceQuestion")}>
            {(
              [
                ["beginner", "onboarding.expBeginner"],
                ["novice", "onboarding.expNovice"],
                ["intermediate", "onboarding.expIntermediate"],
                ["advanced", "onboarding.expAdvanced"],
              ] as Array<[ExperienceLevel, MessageKey]>
            ).map(([level, key]) => (
              <OptionButton key={level} label={t(key)} selected={answers.experience === level} onClick={() => single({ experience: level })} />
            ))}
          </StepShell>
        )}

        {step === "days" && (
          <StepShell title={t("onboarding.daysQuestion")}>
            <div className="grid grid-cols-5 gap-2">
              {([2, 3, 4, 5, 6] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={answers.daysPerWeek === d}
                  onClick={() => single({ daysPerWeek: d })}
                  className={cn(
                    "tap-target rounded-card border py-4 text-center transition-colors duration-150",
                    answers.daysPerWeek === d ? "border-volt/60 bg-volt/10 text-volt" : "border-border bg-surface-1 text-text-1",
                  )}
                >
                  <span className="metric text-2xl font-semibold">{d}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-text-2">{t("onboarding.daysUnit")}</p>
          </StepShell>
        )}

        {step === "session_length" && (
          <StepShell title={t("onboarding.sessionLengthQuestion")}>
            <div className="grid grid-cols-5 gap-2">
              {([30, 45, 60, 75, 90] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  aria-pressed={answers.sessionLengthMin === len}
                  onClick={() => single({ sessionLengthMin: len })}
                  className={cn(
                    "tap-target rounded-card border py-4 text-center transition-colors duration-150",
                    answers.sessionLengthMin === len ? "border-volt/60 bg-volt/10 text-volt" : "border-border bg-surface-1 text-text-1",
                  )}
                >
                  <span className="metric text-xl font-semibold">{len}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-text-2">{t("onboarding.sessionLengthUnit")}</p>
          </StepShell>
        )}

        {step === "environment" && (
          <StepShell title={t("onboarding.environmentQuestion")}>
            {(
              [
                ["gym", "onboarding.envGym", ["barbell", "dumbbell", "machine", "cable", "bench", "pullup_bar", "kettlebell"]],
                ["homegym", "onboarding.envHomegym", ["barbell", "dumbbell", "bench", "pullup_bar"]],
                ["bodyweight", "onboarding.envBodyweight", ["bodyweight", "pullup_bar", "bands"]],
              ] as Array<[AssessmentInput["environment"], MessageKey, Equipment[]]>
            ).map(([env, key, defaults]) => (
              <OptionButton
                key={env}
                label={t(key)}
                selected={answers.environment === env}
                onClick={() => single({ environment: env, equipment: answers.equipment ?? defaults })}
              />
            ))}
          </StepShell>
        )}

        {step === "equipment" && (
          <StepShell title={t("onboarding.equipmentQuestion")}>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["barbell", "onboarding.equipBarbell"],
                  ["dumbbell", "onboarding.equipDumbbell"],
                  ["machine", "onboarding.equipMachine"],
                  ["cable", "onboarding.equipCable"],
                  ["kettlebell", "onboarding.equipKettlebell"],
                  ["bands", "onboarding.equipBands"],
                  ["pullup_bar", "onboarding.equipPullupBar"],
                  ["bench", "onboarding.equipBench"],
                ] as Array<[Equipment, MessageKey]>
              ).map(([equip, key]) => {
                const selected = (answers.equipment ?? []).includes(equip);
                return (
                  <button
                    key={equip}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const current = answers.equipment ?? [];
                      setAnswers({
                        equipment: selected ? current.filter((e) => e !== equip) : [...current, equip],
                      });
                    }}
                    className={cn(
                      "tap-target rounded-card border px-3 py-3 text-sm font-medium transition-colors duration-150",
                      selected ? "border-volt/60 bg-volt/10 text-volt" : "border-border bg-surface-1 text-text-1",
                    )}
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
            <Button variant="primary" size="lg" onClick={next} disabled={(answers.equipment ?? []).length === 0 && answers.environment !== "bodyweight"}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "injuries" && (
          <StepShell title={t("onboarding.injuriesQuestion")} hint={t("onboarding.injuriesHint")}>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["lower_back", "onboarding.injuryLowerBack"],
                  ["knees", "onboarding.injuryKnees"],
                  ["shoulders", "onboarding.injuryShoulders"],
                  ["wrists", "onboarding.injuryWrists"],
                ] as Array<[InjuryFlag, MessageKey]>
              ).map(([injury, key]) => {
                const selected = (answers.injuries ?? []).includes(injury);
                return (
                  <button
                    key={injury}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const current = answers.injuries ?? [];
                      setAnswers({
                        injuries: selected ? current.filter((i) => i !== injury) : [...current, injury],
                      });
                    }}
                    className={cn(
                      "tap-target rounded-card border px-3 py-3 text-sm font-medium transition-colors duration-150",
                      selected ? "border-danger/60 bg-danger/10 text-danger" : "border-border bg-surface-1 text-text-1",
                    )}
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setAnswers({ injuries: [] });
                next();
              }}
            >
              {t("onboarding.injuryNone")}
            </Button>
            {(answers.injuries ?? []).length > 0 && (
              <Button variant="primary" size="lg" onClick={next}>
                {t("common.continue")}
              </Button>
            )}
          </StepShell>
        )}

        {step === "preferences" && (
          <StepShell title={t("onboarding.preferencesQuestion")} onSkip={skip}>
            <PreferencePicker
              loved={answers.lovedPatterns ?? []}
              avoided={answers.avoidedPatterns ?? []}
              onChange={(loved, avoided) => setAnswers({ lovedPatterns: loved, avoidedPatterns: avoided })}
            />
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "anchors" && (
          <StepShell title={t("onboarding.anchorsQuestion")} hint={t("onboarding.anchorsHint")} onSkip={() => { setAnswers({ anchors: [] }); skip(); }}>
            <AnchorInputs
              anchors={answers.anchors ?? []}
              onChange={(anchors) => setAnswers({ anchors })}
            />
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "teaser_split" && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <p className="text-xs uppercase tracking-widest text-text-2">{t("onboarding.splitTeaserTitle")}</p>
            <p className="max-w-xs text-sm text-text-2">
              {t("onboarding.splitTeaserBody", {
                days: answers.daysPerWeek ?? 4,
                minutes: answers.sessionLengthMin ?? 60,
              })}
            </p>
            <p className="metric text-4xl font-bold text-volt">
              {t(SPLIT_LABEL[splitForDays(answers.daysPerWeek ?? 4)])}
            </p>
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </div>
        )}

        {step === "activity" && (
          <StepShell title={t("onboarding.activityQuestion")}>
            {(
              [
                ["sedentary", "onboarding.activitySedentary"],
                ["light", "onboarding.activityLight"],
                ["moderate", "onboarding.activityModerate"],
                ["active", "onboarding.activityActive"],
                ["very_active", "onboarding.activityVeryActive"],
              ] as Array<[ActivityLevel, MessageKey]>
            ).map(([level, key]) => (
              <OptionButton key={level} label={t(key)} selected={answers.activityLevel === level} onClick={() => single({ activityLevel: level })} />
            ))}
          </StepShell>
        )}

        {step === "sleep" && (
          <StepShell title={t("onboarding.sleepQuestion")}>
            <NumberDial value={answers.avgSleepH ?? 7} onChange={(v) => setAnswers({ avgSleepH: v })} min={4} max={11} step={0.5} unit={t("onboarding.sleepUnit")} />
            <Button variant="primary" size="lg" onClick={next}>
              {t("common.continue")}
            </Button>
          </StepShell>
        )}

        {step === "stress" && (
          <StepShell title={t("onboarding.stressQuestion")}>
            <div className="grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={answers.stress === level}
                  onClick={() => single({ stress: level })}
                  className={cn(
                    "tap-target rounded-card border py-4 transition-colors duration-150",
                    answers.stress === level ? "border-volt/60 bg-volt/10 text-volt" : "border-border bg-surface-1 text-text-1",
                  )}
                >
                  <span className="metric text-xl font-semibold">{level}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-text-2">
              <span>{t("onboarding.stressLow")}</span>
              <span>{t("onboarding.stressHigh")}</span>
            </div>
          </StepShell>
        )}

        {step === "diet" && (
          <StepShell title={t("onboarding.dietQuestion")}>
            {(
              [
                ["omnivore", "onboarding.dietOmnivore"],
                ["vegetarian", "onboarding.dietVegetarian"],
                ["vegan", "onboarding.dietVegan"],
                ["pescetarian", "onboarding.dietPescetarian"],
              ] as Array<[AssessmentInput["dietStyle"], MessageKey]>
            ).map(([diet, key]) => (
              <OptionButton key={diet} label={t(key)} selected={answers.dietStyle === diet} onClick={() => single({ dietStyle: diet })} />
            ))}
          </StepShell>
        )}

        {step === "meals" && (
          <StepShell title={t("onboarding.mealsQuestion")}>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((meals) => (
                <button
                  key={meals}
                  type="button"
                  aria-pressed={answers.mealsPerDay === meals}
                  onClick={() => single({ mealsPerDay: meals })}
                  className={cn(
                    "tap-target rounded-card border py-4 transition-colors duration-150",
                    answers.mealsPerDay === meals ? "border-volt/60 bg-volt/10 text-volt" : "border-border bg-surface-1 text-text-1",
                  )}
                >
                  <span className="metric text-xl font-semibold">{meals}</span>
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === "units" && (
          <StepShell title={t("onboarding.unitsQuestion")}>
            <OptionButton label={t("common.kg")} selected={answers.units === "kg"} onClick={() => single({ units: "kg" })} />
            <OptionButton label={t("common.lbs")} selected={answers.units === "lbs"} onClick={() => single({ units: "lbs" })} />
          </StepShell>
        )}
      </div>
    </div>
  );
}

function StepShell({
  title,
  hint,
  onSkip,
  children,
}: {
  title: string;
  hint?: string;
  onSkip?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold leading-snug">{title}</h1>
        {hint && <p className="mt-1 text-sm text-text-2">{hint}</p>}
      </div>
      <div className="space-y-2">{children}</div>
      {onSkip && (
        <button type="button" onClick={onSkip} className="tap-target w-full text-center text-sm text-text-2 hover:text-text-1">
          {t("common.skip")}
        </button>
      )}
    </div>
  );
}

/** Stylized body-fat silhouette: abstract bars, not anatomical art. */
function Silhouette({ pct, sex }: { pct: number; sex: Sex }) {
  const width = 16 + (pct / (sex === "male" ? 40 : 48)) * 22;
  return (
    <svg viewBox="0 0 48 40" className="mx-auto h-10 w-12" aria-hidden>
      <circle cx="24" cy="8" r="5" fill="var(--color-text-3)" />
      <rect x={24 - width / 2} y="16" width={width} height="22" rx={width / 2.5} fill="var(--color-text-3)" />
    </svg>
  );
}

function PreferencePicker({
  loved,
  avoided,
  onChange,
}: {
  loved: MovementPattern[];
  avoided: MovementPattern[];
  onChange: (loved: MovementPattern[], avoided: MovementPattern[]) => void;
}) {
  const patterns: Array<[MovementPattern, string]> = [
    ["squat", "Squats"],
    ["hinge", "Hinge / Kreuzheben"],
    ["horizontal_push", "Drücken (horizontal)"],
    ["vertical_push", "Drücken (über Kopf)"],
    ["horizontal_pull", "Rudern"],
    ["vertical_pull", "Klimmzüge / Latzug"],
    ["lunge", "Ausfallschritte"],
    ["core", "Core-Arbeit"],
  ];
  function cycle(pattern: MovementPattern) {
    if (loved.includes(pattern)) {
      onChange(loved.filter((p) => p !== pattern), [...avoided, pattern]);
    } else if (avoided.includes(pattern)) {
      onChange(loved, avoided.filter((p) => p !== pattern));
    } else {
      onChange([...loved, pattern], avoided);
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-text-2">
        <span className="text-volt">{t("onboarding.preferencesLove")}</span>
        <span className="text-danger">{t("onboarding.preferencesAvoid")}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {patterns.map(([pattern, label]) => {
          const isLoved = loved.includes(pattern);
          const isAvoided = avoided.includes(pattern);
          return (
            <button
              key={pattern}
              type="button"
              onClick={() => cycle(pattern)}
              className={cn(
                "tap-target rounded-card border px-3 py-3 text-sm font-medium transition-colors duration-150",
                isLoved && "border-volt/60 bg-volt/10 text-volt",
                isAvoided && "border-danger/60 bg-danger/10 text-danger",
                !isLoved && !isAvoided && "border-border bg-surface-1 text-text-1",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AnchorInputs({
  anchors,
  onChange,
}: {
  anchors: Array<{ lift: MainLift; weightKg: number; reps: number }>;
  onChange: (anchors: Array<{ lift: MainLift; weightKg: number; reps: number }>) => void;
}) {
  const lifts: Array<[MainLift, MessageKey]> = [
    ["squat", "onboarding.anchorSquat"],
    ["bench", "onboarding.anchorBench"],
    ["deadlift", "onboarding.anchorDeadlift"],
    ["ohp", "onboarding.anchorOhp"],
  ];
  function update(lift: MainLift, field: "weightKg" | "reps", value: number) {
    const existing = anchors.find((a) => a.lift === lift);
    const updated = existing
      ? anchors.map((a) => (a.lift === lift ? { ...a, [field]: value } : a))
      : [...anchors, { lift, weightKg: field === "weightKg" ? value : 0, reps: field === "reps" ? value : 5 }];
    onChange(updated.filter((a) => a.weightKg > 0));
  }
  return (
    <div className="space-y-2">
      {lifts.map(([lift, key]) => {
        const anchor = anchors.find((a) => a.lift === lift);
        return (
          <div key={lift} className="flex items-center gap-2">
            <span className="w-32 text-sm text-text-1">{t(key)}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="kg"
              className="metric h-12 w-20 rounded-card border border-border bg-surface-2 px-2 text-center text-text-1"
              value={anchor?.weightKg || ""}
              onChange={(e) => update(lift, "weightKg", Number(e.target.value))}
            />
            <span className="text-text-2">×</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Reps"
              className="metric h-12 w-16 rounded-card border border-border bg-surface-2 px-2 text-center text-text-1"
              value={anchor?.reps || ""}
              onChange={(e) => update(lift, "reps", Number(e.target.value))}
            />
          </div>
        );
      })}
    </div>
  );
}
