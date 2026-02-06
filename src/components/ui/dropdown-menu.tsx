"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type DropdownMenuSide = "top" | "bottom";
type DropdownMenuAlign = "start" | "center" | "end";

const sideClasses: Record<DropdownMenuSide, string> = {
  top: "bottom-full mb-2",
  bottom: "top-full mt-2",
};

const alignClasses: Record<DropdownMenuAlign, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

type DropdownMenuContextValue = {
  close: () => void;
};

const DropdownMenuContext =
  React.createContext<DropdownMenuContextValue | null>(null);

function getMenuItems(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-dropdown-menu-item]"),
  );
}

function focusItem(root: HTMLElement, index: number) {
  const items = getMenuItems(root);
  if (items.length === 0) return;
  const next = items[((index % items.length) + items.length) % items.length];
  next?.focus();
}

export function DropdownMenu({
  open: openProp,
  onOpenChange,
  side = "bottom",
  align = "end",
  className,
  contentClassName,
  trigger,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: DropdownMenuSide;
  align?: DropdownMenuAlign;
  className?: string;
  contentClassName?: string;
  trigger: (props: {
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls"?: string;
    onClick: React.MouseEventHandler<HTMLElement>;
    onKeyDown: React.KeyboardEventHandler<HTMLElement>;
  }) => React.ReactElement;
  children: React.ReactNode;
}) {
  const menuId = React.useId();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const open = openProp ?? uncontrolledOpen;
  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  const rootRef = React.useRef<HTMLSpanElement | null>(null);
  const triggerWrapRef = React.useRef<HTMLSpanElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  function focusTrigger() {
    const wrap = triggerWrapRef.current;
    if (!wrap) return;
    const el = wrap.querySelector<HTMLElement>(
      "button,[href],[tabindex]:not([tabindex='-1'])",
    );
    el?.focus();
  }

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.contains(target)) return;
      if (openProp === undefined) setUncontrolledOpen(false);
      onOpenChange?.(false);
    }

    function onFocusIn(event: FocusEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.contains(target)) return;
      if (openProp === undefined) setUncontrolledOpen(false);
      onOpenChange?.(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [open, onOpenChange, openProp]);

  React.useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    if (!content) return;
    const items = getMenuItems(content);
    items[0]?.focus();
  }, [open]);

  const ctx: DropdownMenuContextValue = {
    close: () => setOpen(false),
  };

  const triggerNode = trigger({
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onClick: (event) => {
      if (event.defaultPrevented) return;
      setOpen(!open);
    },
    onKeyDown: (event) => {
      if (event.defaultPrevented) return;

      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    },
  });

  return (
    <DropdownMenuContext.Provider value={ctx}>
      <span ref={rootRef} className={cn("relative inline-flex", className)}>
        <span ref={triggerWrapRef} className="inline-flex">
          {triggerNode}
        </span>
        {open ? (
          <div
            ref={contentRef}
            id={menuId}
            role="menu"
            className={cn(
              "absolute z-50 min-w-[12rem] rounded-2xl border border-border/60 bg-popover p-1 text-popover-foreground shadow-xl outline-none",
              sideClasses[side],
              alignClasses[align],
              contentClassName,
            )}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                focusTrigger();
                return;
              }

              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              const content = contentRef.current;
              if (!content) return;

              const items = getMenuItems(content);
              if (items.length === 0) return;

              const active = document.activeElement;
              const index =
                active instanceof HTMLElement ? items.indexOf(active) : -1;
              const delta = event.key === "ArrowDown" ? 1 : -1;

              event.preventDefault();
              if (index === -1) {
                focusItem(content, delta === 1 ? 0 : items.length - 1);
                return;
              }

              focusItem(content, index + delta);
            }}
          >
            {children}
          </div>
        ) : null}
      </span>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    inset?: boolean;
    onSelect?: () => void;
  }
>(({ className, inset, onSelect, onClick, ...props }, ref) => {
  const ctx = React.useContext(DropdownMenuContext);

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      tabIndex={-1}
      data-dropdown-menu-item
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        inset ? "pl-8" : "",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        onSelect?.();
        ctx?.close();
      }}
      {...props}
    />
  );
});

DropdownMenuItem.displayName = "DropdownMenuItem";

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <hr className={cn("my-1 border-0 border-t border-border/70", className)} />
  );
}
