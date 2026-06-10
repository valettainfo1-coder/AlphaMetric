"use client";

/**
 * e1RM line + dashed saturating forecast + confidence band.
 * Mobile chart rules: max 2 series, ≤ 5 x-ticks, abbreviated German
 * dates, animation on mount only, tap-triggered tooltips.
 */
import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { t } from "@/lib/i18n";
import { formatShortDate, formatWeight } from "@/lib/format";
import { forecast } from "@/lib/engine/forecast";
import type { E1RMPoint } from "@/lib/engine/types";

interface ChartDatum {
  ts: number;
  actual: number | null;
  projected: number | null;
  band: [number, number] | null;
}

export function StrengthTrajectory({
  series,
  startDate,
  liftName,
}: {
  series: E1RMPoint[];
  startDate: Date;
  liftName: string;
}) {
  const { data, callout } = useMemo(() => {
    const base = startDate.getTime();
    const points: ChartDatum[] = series.map((p) => ({
      ts: base + p.t * 86_400_000,
      actual: p.value,
      projected: null,
      band: null,
    }));
    const fc = forecast(series);
    let calloutText: string | null = null;
    const last = series[series.length - 1];
    if (fc && last) {
      // Connect the dashed projection to the last actual point.
      points.push({
        ts: base + last.t * 86_400_000,
        actual: null,
        projected: last.value,
        band: [last.value, last.value],
      });
      for (const p of fc.points) {
        points.push({
          ts: base + (last.t + p.weeksAhead * 7) * 86_400_000,
          actual: null,
          projected: p.value,
          band: [p.low, p.high],
        });
      }
      const p12 = fc.points.find((p) => p.weeksAhead === 12);
      if (p12) {
        calloutText = t("analytics.trajectoryForecast", {
          weight: formatWeight(p12.value),
          date: formatShortDate(new Date(base + (last.t + 84) * 86_400_000)),
        });
      }
    }
    return { data: points, callout: calloutText };
  }, [series, startDate]);

  if (series.length < 2) {
    return <p className="text-sm text-text-2">{t("analytics.trajectoryEmpty")}</p>;
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-1">{liftName}</p>
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
              formatter={(value) => [
                typeof value === "number" ? formatWeight(value) : "",
                "e1RM",
              ]}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill="var(--color-volt)"
              fillOpacity={0.08}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              dataKey="actual"
              stroke="var(--color-volt)"
              strokeWidth={2}
              dot={false}
              isAnimationActive
              animationDuration={600}
              connectNulls={false}
            />
            <Line
              dataKey="projected"
              stroke="var(--color-volt)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {callout && <p className="mt-2 text-sm text-volt metric">{callout}</p>}
    </div>
  );
}
