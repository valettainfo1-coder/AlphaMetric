"use client";

/**
 * Nutrition (lean): target rings with training/rest-day switch, quick-add,
 * 40-item quicklist, 7-day adherence bar. Barcode scanner is [P1].
 */
import { useMemo, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { AppHeader } from "@/components/shell/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useRepoData } from "@/lib/hooks/use-repo";
import { getRepository } from "@/lib/data";
import { uuidv7 } from "@/lib/uuid";
import { FOODS } from "@/lib/data/foods";
import { formatGrams, formatInt, todayIso } from "@/lib/format";
import type { MacroTargets } from "@/lib/engine/types";

function MacroRing({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: "kcal" | "g";
}) {
  const pct = Math.min(1, target > 0 ? value / target : 0);
  const size = 76;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-volt)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${pct * c} ${c}`}
            style={{ transition: "stroke-dasharray 400ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="metric text-sm text-text-1">{formatInt(value)}</span>
        </div>
      </div>
      <span className="text-xs text-text-2">{label}</span>
      <span className="metric text-[10px] text-text-2">
        / {formatInt(target)} {unit}
      </span>
    </div>
  );
}

export default function NutritionPage() {
  const [dayType, setDayType] = useState<"training" | "rest">("training");
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const { data, loading, reload } = useRepoData(async (repo) => {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [meals, assessment] = await Promise.all([
      repo.getMeals(since),
      repo.getLatestAssessment(),
    ]);
    return { meals, assessment };
  });

  const targets: MacroTargets | null = useMemo(() => {
    const computed = data?.assessment?.computed_output.targets;
    if (!computed) return null;
    return dayType === "training" ? computed.trainingDay : computed.restDay;
  }, [data, dayType]);

  const todayMeals = useMemo(
    () => (data?.meals ?? []).filter((m) => m.eaten_at.slice(0, 10) === todayIso()),
    [data],
  );

  const consumed = useMemo(
    () =>
      todayMeals.reduce(
        (sum, m) => ({
          kcal: sum.kcal + m.kcal,
          proteinG: sum.proteinG + m.protein_g,
          carbsG: sum.carbsG + m.carbs_g,
          fatG: sum.fatG + m.fat_g,
        }),
        { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      ),
    [todayMeals],
  );

  const adherence7d = useMemo(() => {
    if (!data || !targets) return [];
    const days: Array<{ date: string; pct: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      const dayKcal = data.meals
        .filter((m) => m.eaten_at.slice(0, 10) === date)
        .reduce((s, m) => s + m.kcal, 0);
      days.push({ date, pct: Math.min(1.2, dayKcal / Math.max(1, targets.kcal)) });
    }
    return days;
  }, [data, targets]);

  async function addMeal(mealName: string, k: number, p: number, c: number, f: number) {
    const repo = await getRepository();
    const now = new Date().toISOString();
    await repo.upsertMeal({
      id: uuidv7(),
      user_id: repo.userId,
      eaten_at: now,
      name: mealName,
      kcal: k,
      protein_g: p,
      carbs_g: c,
      fat_g: f,
      updated_at: now,
    });
    reload();
  }

  async function quickAdd() {
    const k = Number(kcal);
    if (!name || !Number.isFinite(k) || k <= 0) return;
    await addMeal(name, k, Number(protein) || 0, Number(carbs) || 0, Number(fat) || 0);
    setName("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
  }

  const inputClass =
    "h-11 w-full rounded-card border border-border bg-surface-2 px-3 text-sm text-text-1 placeholder:text-text-3";

  return (
    <>
      <AppHeader title={t("nutrition.title")} />
      <div className="space-y-4 py-4">
        {loading && (
          <>
            <Skeleton className="h-44" />
            <Skeleton className="h-40" />
          </>
        )}

        {!loading && data && (
          <>
            {/* Target rings + day-type switch */}
            <Card>
              <div className="mb-4 flex rounded-pill border border-border bg-surface-2 p-1">
                {(["training", "rest"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={dayType === type}
                    onClick={() => setDayType(type)}
                    className={cn(
                      "tap-target flex-1 rounded-pill text-sm font-medium transition-colors duration-150",
                      dayType === type ? "bg-volt text-bg" : "text-text-2",
                    )}
                  >
                    {type === "training" ? t("nutrition.trainingDay") : t("nutrition.restDay")}
                  </button>
                ))}
              </div>
              {targets ? (
                <div className="grid grid-cols-4 gap-2">
                  <MacroRing label={t("nutrition.kcal")} value={consumed.kcal} target={targets.kcal} unit="kcal" />
                  <MacroRing label={t("nutrition.protein")} value={consumed.proteinG} target={targets.proteinG} unit="g" />
                  <MacroRing label={t("nutrition.carbs")} value={consumed.carbsG} target={targets.carbsG} unit="g" />
                  <MacroRing label={t("nutrition.fat")} value={consumed.fatG} target={targets.fatG} unit="g" />
                </div>
              ) : (
                <p className="text-sm text-text-2">{t("today.noPlan")}</p>
              )}
            </Card>

            {/* 7-day adherence bar */}
            {adherence7d.length > 0 && (
              <Card>
                <CardTitle>{t("nutrition.adherence7d")}</CardTitle>
                <div className="flex items-end gap-1.5" style={{ height: 56 }}>
                  {adherence7d.map((day) => {
                    const within = day.pct >= 0.9 && day.pct <= 1.1;
                    return (
                      <div
                        key={day.date}
                        className={cn(
                          "flex-1 rounded-t-sm",
                          within ? "bg-volt/80" : day.pct > 0 ? "bg-text-3" : "bg-surface-2",
                        )}
                        style={{ height: `${Math.max(6, Math.min(100, day.pct * 80))}%` }}
                        aria-label={`${day.date}: ${Math.round(day.pct * 100)} %`}
                      />
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Quick add */}
            <Card>
              <CardTitle>{t("nutrition.quickAdd")}</CardTitle>
              <div className="space-y-2">
                <input
                  className={inputClass}
                  placeholder={t("nutrition.quickAddName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="grid grid-cols-4 gap-2">
                  <input className={cn(inputClass, "metric")} placeholder="kcal" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
                  <input className={cn(inputClass, "metric")} placeholder="P" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
                  <input className={cn(inputClass, "metric")} placeholder="C" inputMode="numeric" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
                  <input className={cn(inputClass, "metric")} placeholder="F" inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} />
                </div>
                <Button variant="primary" size="lg" onClick={quickAdd}>
                  {t("nutrition.addMeal")}
                </Button>
                {/* Barcode scanner [P1] */}
                <Button variant="secondary" size="lg" disabled>
                  <ScanBarcode size={18} /> {t("nutrition.scannerSoon")} · {t("common.comingSoon")}
                </Button>
              </div>
            </Card>

            {/* Quicklist */}
            <Card>
              <CardTitle>{t("nutrition.quicklist")}</CardTitle>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {FOODS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="tap-target flex w-full items-center justify-between rounded-card px-2 py-2 text-left hover:bg-surface-2"
                    onClick={() => void addMeal(f.nameDe, f.kcal, f.proteinG, f.carbsG, f.fatG)}
                  >
                    <span>
                      <span className="block text-sm text-text-1">{f.nameDe}</span>
                      <span className="block text-xs text-text-2">{f.portion}</span>
                    </span>
                    <span className="metric text-xs text-text-2">
                      {formatInt(f.kcal)} kcal · {formatGrams(f.proteinG)} P
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Today's log */}
            <Card>
              <CardTitle>{t("nutrition.todayLog")}</CardTitle>
              {todayMeals.length === 0 ? (
                <p className="text-sm text-text-2">{t("nutrition.empty")}</p>
              ) : (
                <ul className="space-y-1">
                  {todayMeals.map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-1">{m.name}</span>
                      <span className="flex items-center gap-3">
                        <span className="metric text-text-2">{formatInt(m.kcal)} kcal</span>
                        <button
                          type="button"
                          aria-label={t("common.delete")}
                          className="text-xs text-text-3 hover:text-danger"
                          onClick={async () => {
                            const repo = await getRepository();
                            await repo.deleteMeal(m.id);
                            reload();
                          }}
                        >
                          ✕
                        </button>
                      </span>
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
