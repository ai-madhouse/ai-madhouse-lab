import * as React from "react";

import { cn } from "@/lib/utils";

type TooltipSide = "top" | "bottom";
type TooltipAlign = "start" | "center" | "end";

const sideClasses: Record<TooltipSide, string> = {
  top: "bottom-full mb-2",
  bottom: "top-full mt-2",
};

const alignClasses: Record<TooltipAlign, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

const motionClasses: Record<TooltipSide, string> = {
  top: "translate-y-1 group-hover/tooltip:translate-y-0 group-focus-within/tooltip:translate-y-0",
  bottom:
    "-translate-y-1 group-hover/tooltip:translate-y-0 group-focus-within/tooltip:translate-y-0",
};

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  className,
  contentClassName,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: TooltipSide;
  align?: TooltipAlign;
  className?: string;
  contentClassName?: string;
}) {
  const tooltipId = React.useId();

  const child = React.Children.only(children) as React.ReactElement<{
    "aria-describedby"?: string;
  }>;

  const describedBy = [child.props["aria-describedby"], tooltipId]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {React.cloneElement(child, { "aria-describedby": describedBy })}
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 max-w-[min(24rem,80vw)] rounded-md border border-border/60 bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md opacity-0 transition group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          sideClasses[side],
          alignClasses[align],
          motionClasses[side],
          contentClassName,
        )}
      >
        {content}
      </span>
    </span>
  );
}
