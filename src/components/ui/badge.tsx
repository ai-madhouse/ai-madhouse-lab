import type * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "primary" | "secondary" | "outline";

export function Badge({
  className,
  variant = "primary",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const variantClass =
    variant === "secondary"
      ? "bg-secondary text-secondary-foreground"
      : variant === "outline"
        ? "border border-border/70 text-foreground"
        : "bg-primary text-primary-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
        variantClass,
        className,
      )}
      {...props}
    />
  );
}
