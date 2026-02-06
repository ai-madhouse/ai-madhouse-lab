"use client";

import type React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog/dialog";

// Compatibility wrapper: keep the existing ModalDialog API used across the app,
// but implement it using the newer Dialog primitives.
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={className}
        labelledBy={labelledBy}
        describedBy={describedBy}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
