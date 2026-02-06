"use client";

import type React from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  confirmDisabled,
  cancelDisabled,
  onConfirm,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  confirmVariant?: NonNullable<ButtonProps["variant"]>;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  onConfirm: () => void;
  className?: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("w-[min(96vw,34rem)]", className)}>
        <div className="divide-y divide-border/70">
          <div className="space-y-2 p-6">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={cancelDisabled}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
