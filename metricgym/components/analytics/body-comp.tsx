"use client";

/**
 * Body composition: 7-day rolling average line over raw weigh-in scatter,
 * plus a goal corridor band.
 */
import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { t } from "@/lib/i18n";
import { formatShortDate, formatWeight } from "@/lib/format";
import type { CheckinRow } from "@/lib/data/types";

export function BodyCompChart({
  checkins,
  goalCorridor,
}: {
  checkins: CheckinRow[];
  goalCorridor: [number, number] | null;
}) {
  const data = useMemo(() => {
    const weighIns = checkins
      .filter((c) => c.weight_kg !== null)
      .map((c) => ({ ts: new Date(c.date).getTime(), weight: c.weight_kg as number }))
      .sort((a, b) => a.ts - b.ts);
    return weighIns.map((point, i) => {
      const windowStart = point.ts - 6.5 * 86_400_000;
      const window = weighIns.slice(0, i + 1).filter((p) => p.ts >= windowStart);
      const rolling = window.reduce((s, p) => s + p.weight, 0) / Math.max(1, window.length);
      return {
        ts: point.ts,
        raw: point.weight,
        rolling: Math.round(rolling * 100) / 100,
        corridor: goalCorridor,
      };
    });
  }, [checkins, goalCorridor]);

  if (data.length < 2) {
    return <p className="text-sm text-text-2">{t("analytics.bodyCompEmpty")}</p>;
  }

  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts: number) => formatShortDate(new Date(ts))}
            tickCount={5}
            stroke="var(--color-text-3)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="var(--color-text-3)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            trigger="click"
            contentStyle={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelFormatter={(ts) => formatShortDate(new Date(Number(ts)))}
            formatter={(value) => [typeof value === "number" ? formatWeight(value) : "", ""]}
          />
          {goalCorridor && (
            <Area
              dataKey="corridor"
              stroke="none"
              fill="var(--color-info)"
              fillOpacity={0.08}
              isAnimationActive={false}
            />
          )}
          <Scatter dataKey="raw" fill="var(--color-text-3)" isAnimationActive={false} />
          <Line
            dataKey="rolling"
            stroke="var(--color-volt)"
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={600}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
