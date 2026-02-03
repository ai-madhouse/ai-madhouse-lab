import type * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  children,
  htmlFor,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { htmlFor: string }) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground", className)}
      htmlFor={htmlFor}
      {...props}
    >
      {children}
    </label>
  );
}
