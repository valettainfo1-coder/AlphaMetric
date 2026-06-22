"use client";

/**
 * Count-up via requestAnimationFrame writing textContent only —
 * never animates layout properties.
 */
import { useEffect, useRef } from "react";

export function CountUp({
  value,
  format,
  durationMs = 800,
  className,
}: {
  value: number;
  format: (v: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      el.textContent = format(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, format]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(0)}
    </span>
  );
}
