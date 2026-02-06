"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TabsOrientation = "horizontal" | "vertical";

type TabsContextValue = {
  baseId: string;
  value: string;
  setValue: (value: string) => void;
  orientation: TabsOrientation;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>.");
  return ctx;
}

function valueToIdSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
};

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  className,
  children,
  ...props
}: TabsProps) {
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? "",
  );

  const value = isControlled ? controlledValue : uncontrolledValue;

  function setValue(nextValue: string) {
    if (!isControlled) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  const baseId = React.useId();
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (isControlled) return;
    const tabs = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not([disabled])',
      ) ?? [],
    );
    if (tabs.length === 0) return;

    if (
      uncontrolledValue &&
      tabs.some((tab) => tab.dataset.value === uncontrolledValue)
    ) {
      return;
    }

    const next = tabs[0]?.dataset.value;
    if (next && next !== uncontrolledValue) setUncontrolledValue(next);
  }, [isControlled, uncontrolledValue]);

  return (
    <TabsContext.Provider value={{ baseId, value, setValue, orientation }}>
      <div ref={rootRef} className={cn("space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement> & {
  activateOnFocus?: boolean;
};

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  (
    { className, activateOnFocus = true, onKeyDown, ...props },
    forwardedRef,
  ) => {
    const { value, setValue, orientation } = useTabsContext();

    const isHorizontal = orientation === "horizontal";
    const forwardKey = isHorizontal ? "ArrowRight" : "ArrowDown";
    const backwardKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

    return (
      <div
        ref={forwardedRef}
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          "flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-card/40 p-2",
          orientation === "vertical" ? "flex-col" : null,
          className,
        )}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;

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
          if (activateOnFocus && nextValue) setValue(nextValue);
          nextTab.focus();
        }}
        {...props}
      />
    );
  },
);

TabsList.displayName = "TabsList";

export type TabsTriggerProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value"
> & {
  value: string;
};

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ value, className, onClick, ...props }, forwardedRef) => {
  const { baseId, value: selectedValue, setValue } = useTabsContext();
  const active = selectedValue === value;
  const idSegment = valueToIdSegment(value);
  const tabId = `${baseId}-tab-${idSegment}`;
  const panelId = `${baseId}-panel-${idSegment}`;

  return (
    <button
      ref={forwardedRef}
      type="button"
      role="tab"
      id={tabId}
      data-value={value}
      aria-controls={panelId}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border border-border/60 bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        setValue(value);
      }}
      {...props}
    />
  );
});

TabsTrigger.displayName = "TabsTrigger";

export type TabsContentProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "value"
> & {
  value: string;
};

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, ...props }, forwardedRef) => {
    const { baseId, value: selectedValue } = useTabsContext();
    const active = selectedValue === value;
    const idSegment = valueToIdSegment(value);
    const tabId = `${baseId}-tab-${idSegment}`;
    const panelId = `${baseId}-panel-${idSegment}`;

    return (
      <div
        ref={forwardedRef}
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId}
        hidden={!active}
        className={cn(className)}
        {...props}
      />
    );
  },
);

TabsContent.displayName = "TabsContent";
