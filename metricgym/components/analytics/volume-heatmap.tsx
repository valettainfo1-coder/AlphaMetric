"use client";

/**
 * Volume heatmap — CSS grid (muscles × weeks), 5-step volt opacity scale.
 * Recharts has no heatmap primitive; this is intentionally not a chart lib.
 */
import { useState } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { formatShortDate } from "@/lib/format";
import type { MuscleGroup } from "@/lib/engine/types";

const OPACITY_STEPS = [0, 0.15, 0.3, 0.55, 0.8, 1] as const;

function cellOpacity(sets: number, max: number): number {
  if (sets <= 0 || max <= 0) return OPACITY_STEPS[0];
  const step = Math.min(5, Math.ceil((sets / max) * 5));
  return OPACITY_STEPS[step] ?? 1;
}

export function VolumeHeatmap({
  data,
  weeks,
}: {
  data: Map<MuscleGroup, number[]>;
  weeks: string[];
}) {
  const [selected, setSelected] = useState<{ muscle: MuscleGroup; week: number } | null>(null);
  const muscles = [...data.keys()];
  const max = Math.max(1, ...[...data.values()].flat());

  if (muscles.length === 0) {
    return <p className="text-sm text-text-2">{t("errors.noData")}</p>;
  }

  return (
    <div className="space-y-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `5.5rem repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {muscles.map((muscle) => {
          const row = data.get(muscle) ?? [];
          return (
            <div key={muscle} className="contents">
              <span className="truncate pr-1 text-xs leading-6 text-text-2">
                {t(`muscles.${muscle}` as MessageKey)}
              </span>
              {weeks.map((week, wi) => {
                const sets = row[wi] ?? 0;
                const isSelected = selected?.muscle === muscle && selected.week === wi;
                return (
                  <button
                    key={week}
                    type="button"
                    aria-label={`${t(`muscles.${muscle}` as MessageKey)} ${formatShortDate(week)}: ${sets} ${t("analytics.heatmapUnit")}`}
                    onClick={() => setSelected(isSelected ? null : { muscle, week: wi })}
                    className="h-6 rounded-[4px] border border-border/50 transition-transform duration-150 active:scale-95"
                    style={{
                      background: `color-mix(in srgb, var(--color-volt) ${cellOpacity(sets, max) * 100}%, var(--color-surface-2))`,
                      outline: isSelected ? "2px solid var(--color-volt)" : undefined,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      {selected && (
        <p className="text-sm text-text-1">
          {t(`muscles.${selected.muscle}` as MessageKey)} · {formatShortDate(weeks[selected.week] ?? "")}{" "}
          <span className="metric text-volt">
            {(data.get(selected.muscle) ?? [])[selected.week] ?? 0} {t("analytics.heatmapUnit")}
          </span>
        </p>
      )}
    </div>
  );
}
