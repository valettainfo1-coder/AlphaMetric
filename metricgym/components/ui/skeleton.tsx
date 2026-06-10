import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-card bg-surface-2", className)}
      {...props}
    />
  );
}

/** Chart skeleton with identical dimensions to the chart frame (zero CLS). */
export function ChartSkeleton() {
  return <Skeleton className="chart-frame" />;
}
