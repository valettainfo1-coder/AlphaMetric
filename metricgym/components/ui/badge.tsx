import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "volt" | "info" | "danger" | "neutral";

const styles: Record<BadgeVariant, string> = {
  volt: "bg-volt/15 text-volt border-volt/30",
  info: "bg-info/15 text-info border-info/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  neutral: "bg-surface-2 text-text-2 border-border",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
