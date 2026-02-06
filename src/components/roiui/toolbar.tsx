import * as React from "react";

import { cn } from "@/lib/utils";

export const Toolbar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="toolbar"
    className={cn("flex w-full items-center justify-between gap-4", className)}
    {...props}
  />
));

Toolbar.displayName = "Toolbar";

export const ToolbarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2", className)}
    {...props}
  />
));

ToolbarGroup.displayName = "ToolbarGroup";

export const ToolbarNav = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav">
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex min-w-0 items-center gap-2", className)}
    {...props}
  />
));

ToolbarNav.displayName = "ToolbarNav";
