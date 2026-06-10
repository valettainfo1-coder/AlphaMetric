"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/** ≥44px touch stepper for weight/reps — the core logging control. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format,
  label,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  label: string;
  className?: string;
}) {
  const display = format ? format(value) : String(value);
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label={`${label} verringern`}
        className="tap-target rounded-pill border border-border bg-surface-2 text-text-1 flex items-center justify-center active:bg-surface-1 transition-colors duration-150"
        onClick={() => onChange(round(Math.max(min, value - step)))}
      >
        <Minus size={18} />
      </button>
      <div className="metric min-w-20 text-center text-lg text-text-1" aria-live="polite">
        {display}
      </div>
      <button
        type="button"
        aria-label={`${label} erhöhen`}
        className="tap-target rounded-pill border border-border bg-surface-2 text-text-1 flex items-center justify-center active:bg-surface-1 transition-colors duration-150"
        onClick={() => onChange(round(Math.min(max, value + step)))}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
