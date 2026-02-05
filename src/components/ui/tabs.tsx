"use client";

import type * as React from "react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type TabsOrientation = "horizontal" | "vertical";

export type TabsItem = {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
};

export function Tabs({
  items,
  defaultValue,
  labelledBy,
  orientation = "horizontal",
  className,
  listClassName,
  tabClassName,
  panelClassName,
}: {
  items: TabsItem[];
  defaultValue?: string;
  labelledBy?: string;
  orientation?: TabsOrientation;
  className?: string;
  listClassName?: string;
  tabClassName?: string;
  panelClassName?: string;
}) {
  const firstEnabled = items.find((item) => !item.disabled)?.value ?? "";
  const [value, setValue] = useState(defaultValue ?? firstEnabled);
  const baseId = useId();

  const isHorizontal = orientation === "horizontal";
  const forwardKey = isHorizontal ? "ArrowRight" : "ArrowDown";
  const backwardKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

  return (
    <div className={cn("space-y-4", className)}>
      <div
        role="tablist"
        aria-labelledby={labelledBy}
        aria-orientation={orientation}
        className={cn(
          "flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-card/40 p-2",
          orientation === "vertical" ? "flex-col" : null,
          listClassName,
        )}
        onKeyDown={(event) => {
          const key = event.key;
          if (
            key !== forwardKey &&
            key !== backwardKey &&
            key !== "Home" &&
            key !== "End"
          ) {
            return;
          }

          const tabs = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="tab"]:not([disabled])',
            ),
          );
          if (tabs.length === 0) return;

          const activeEl = document.activeElement;
          const focusedIndex =
            activeEl instanceof HTMLButtonElement ? tabs.indexOf(activeEl) : -1;
          const selectedIndex = tabs.findIndex(
            (tab) => tab.dataset.value === value,
          );

          const baseIndex =
            focusedIndex !== -1
              ? focusedIndex
              : selectedIndex !== -1
                ? selectedIndex
                : 0;

          let nextIndex = baseIndex;
          if (key === "Home") nextIndex = 0;
          if (key === "End") nextIndex = tabs.length - 1;
          if (key === forwardKey) nextIndex = (baseIndex + 1) % tabs.length;
          if (key === backwardKey)
            nextIndex = (baseIndex - 1 + tabs.length) % tabs.length;

          const nextTab = tabs[nextIndex];
          if (!nextTab) return;

          event.preventDefault();

          const nextValue = nextTab.dataset.value;
          if (nextValue) setValue(nextValue);
          nextTab.focus();
        }}
      >
        {items.map((item) => {
          const selected = item.value === value;
          const tabId = `${baseId}-tab-${item.value}`;
          const panelId = `${baseId}-panel-${item.value}`;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={tabId}
              data-value={item.value}
              aria-controls={panelId}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                selected
                  ? "border border-border/60 bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                tabClassName,
              )}
              onClick={() => setValue(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => {
        const selected = item.value === value;
        const tabId = `${baseId}-tab-${item.value}`;
        const panelId = `${baseId}-panel-${item.value}`;

        return (
          <div
            key={item.value}
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            hidden={!selected}
            className={panelClassName}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
