import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "surface"
  | "ghost"
  | "outline"
  | "destructive";

type ButtonSize = "sm" | "md" | "lg" | "unset";

type ButtonRadius = "full" | "2xl";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  surface:
    "border border-border/60 bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const sizeClasses: Record<Exclude<ButtonSize, "unset">, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const radiusClasses: Record<ButtonRadius, string> = {
  full: "rounded-full",
  "2xl": "rounded-2xl",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

export function buttonClassName({
  variant = "primary",
  size = "md",
  radius = "full",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  className?: string;
}) {
  return cn(
    baseClasses,
    variantClasses[variant],
    radiusClasses[radius],
    size === "unset" ? null : sizeClasses[size],
    className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", radius = "full", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={buttonClassName({ variant, size, radius, className })}
      {...props}
    />
  ),
);

Button.displayName = "Button";
