import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 ease-out disabled:opacity-40 disabled:pointer-events-none tap-target select-none",
  {
    variants: {
      variant: {
        // Exactly one volt primary action per screen.
        primary: "bg-volt text-bg hover:bg-volt/90 active:bg-volt/80",
        secondary: "bg-surface-2 text-text-1 border border-border hover:bg-surface-2/70",
        ghost: "text-text-2 hover:text-text-1 hover:bg-surface-1",
        danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
      },
      size: {
        sm: "h-11 px-4 text-sm rounded-pill",
        md: "h-12 px-6 text-base rounded-pill",
        lg: "h-14 px-8 text-base rounded-pill w-full",
        icon: "h-11 w-11 rounded-pill",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
