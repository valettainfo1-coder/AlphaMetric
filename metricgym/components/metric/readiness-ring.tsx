"use client";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import type { ReadinessTier } from "@/lib/engine/types";

const TIER_KEY: Record<ReadinessTier, "readiness.tierPrimed" | "readiness.tierReady" | "readiness.tierCaution" | "readiness.tierRecover"> = {
  primed: "readiness.tierPrimed",
  ready: "readiness.tierReady",
  caution: "readiness.tierCaution",
  recover: "readiness.tierRecover",
};

const TIER_COLOR: Record<ReadinessTier, string> = {
  primed: "var(--color-volt)",
  ready: "var(--color-volt)",
  caution: "var(--color-info)",
  recover: "var(--color-danger)",
};

/** Animated arc + mono number. Reduced-confidence styling while calibrating. */
export function ReadinessRing({
  score,
  tier,
  calibrating,
  size = 132,
}: {
  score: number;
  tier: ReadinessTier;
  calibrating: boolean;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference * 0.75; // 270° arc
  const arcLength = circumference * 0.75;
  const color = TIER_COLOR[tier];

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", calibrating && "opacity-70")}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label={t("readiness.title")}
    >
      <svg width={size} height={size} className="-rotate-[225deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="metric text-4xl font-semibold text-text-1">{score}</span>
        <span className={cn("text-xs font-medium uppercase tracking-widest", calibrating ? "text-text-2" : "text-text-2")}>
          {calibrating ? t("readiness.calibrating") : t(TIER_KEY[tier])}
        </span>
      </div>
    </div>
  );
}
