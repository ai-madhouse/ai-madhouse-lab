"use client";

import { useState } from "react";
import { Button } from "@/components/roiui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog/alert-dialog";

export function SignOutEverywhereDialog({
  onConfirm,
  disabled,
  triggerLabel,
  title,
  description,
  cancelLabel,
  confirmLabel,
}: {
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  triggerLabel: string;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive" disabled={disabled}>
            {triggerLabel}
          </Button>
        }
      />

      <AlertDialogContent className="w-[min(96vw,36rem)]">
        <div className="space-y-5 p-6">
          <div className="space-y-1">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {cancelLabel}
            </Button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setOpen(false);
                void onConfirm();
              }}
            >
              <Button type="submit" variant="destructive">
                {confirmLabel}
              </Button>
            </form>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
