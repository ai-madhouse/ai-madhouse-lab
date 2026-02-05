"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { ModalDialog } from "@/components/ui/modal-dialog";

export function SignOutEverywhereDialog({
  action,
  disabled,
  triggerLabel,
  title,
  description,
  cancelLabel,
  confirmLabel,
}: {
  action: (formData: FormData) => void;
  disabled?: boolean;
  triggerLabel: string;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      <ModalDialog
        open={open}
        onOpenChange={setOpen}
        labelledBy={titleId}
        describedBy={descriptionId}
        className="w-[min(96vw,36rem)]"
      >
        <div className="space-y-5 p-6">
          <div className="space-y-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {cancelLabel}
            </Button>
            <form action={action}>
              <Button type="submit" variant="destructive">
                {confirmLabel}
              </Button>
            </form>
          </div>
        </div>
      </ModalDialog>
    </>
  );
}
