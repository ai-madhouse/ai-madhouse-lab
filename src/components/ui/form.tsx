import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function FormError({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactElement;
  className?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const child = React.Children.only(
    children,
  ) as React.ReactElement<FieldControlProps>;

  const describedBy = [child.props["aria-describedby"], hintId, errorId]
    .filter(Boolean)
    .join(" ");

  const control = React.cloneElement(child, {
    id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : child.props["aria-invalid"],
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {hint ? (
        <div id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </div>
      ) : null}
      {error ? (
        <div id={errorId} className="text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
