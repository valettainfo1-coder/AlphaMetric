import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-surface-1 border border-border rounded-card p-4", className)}
      {...props}
    />
  );
}

export function CardElevated({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-surface-2 border border-border rounded-card p-4", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-xs font-medium uppercase tracking-widest text-text-2 mb-3",
        className,
      )}
      {...props}
    />
  );
}
