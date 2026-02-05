"use client";

import type React from "react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export function ModalDialog({
  open,
  onOpenChange,
  labelledBy,
  describedBy,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      if (dialog.open) return;
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    function onClose() {
      onOpenChange(false);
    }

    function onCancel(event: Event) {
      event.preventDefault();
      onOpenChange(false);
    }

    dialog.addEventListener("close", onClose);
    dialog.addEventListener("cancel", onCancel);

    return () => {
      dialog.removeEventListener("close", onClose);
      dialog.removeEventListener("cancel", onCancel);
    };
  }, [onOpenChange]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={cn(
        // Native <dialog> centering is inconsistent once you start styling width/etc.
        // Force true center positioning.
        "madhouse-modal-dialog fixed left-1/2 top-1/2 m-0 w-[min(96vw,48rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border/60 bg-card p-0 text-card-foreground shadow-xl focus:outline-none",
        className,
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onOpenChange(false);
        }
      }}
    >
      {children}
    </dialog>
  );
}
