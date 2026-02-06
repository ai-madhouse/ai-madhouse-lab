"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string | null;
  setTitleId: (id: string | null) => void;
  descriptionId: string | null;
  setDescriptionId: (id: string | null) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(componentName: string) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error(`${componentName} must be used within <Dialog>.`);
  }
  return ctx;
}

type InteractiveRenderProps = React.HTMLAttributes<HTMLElement> & {
  disabled?: boolean;
  "aria-disabled"?: boolean;
};

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [titleId, setTitleId] = useState<string | null>(null);
  const [descriptionId, setDescriptionId] = useState<string | null>(null);

  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <DialogContext.Provider
      value={{
        open,
        setOpen,
        titleId,
        setTitleId,
        descriptionId,
        setDescriptionId,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  render,
}: {
  render: React.ReactElement<InteractiveRenderProps>;
}) {
  const { open, setOpen } = useDialogContext("DialogTrigger");

  return React.cloneElement(render, {
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      render.props.onClick?.(event);
      if (event.defaultPrevented) return;
      if (render.props.disabled) return;
      if (render.props["aria-disabled"]) return;
      setOpen(true);
    },
  });
}

export function DialogClose({
  render,
}: {
  render: React.ReactElement<InteractiveRenderProps>;
}) {
  const { setOpen } = useDialogContext("DialogClose");

  return React.cloneElement(render, {
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      render.props.onClick?.(event);
      if (event.defaultPrevented) return;
      if (render.props.disabled) return;
      if (render.props["aria-disabled"]) return;
      setOpen(false);
    },
  });
}

export function DialogPortal({ children }: { children: React.ReactNode }) {
  return children;
}

export function DialogOverlay() {
  return null;
}

export const DialogPopup = React.forwardRef<
  HTMLDialogElement,
  React.ComponentPropsWithoutRef<"dialog">
>(function DialogPopup({ className, children, ...props }, ref) {
  return (
    <dialog
      {...props}
      ref={ref}
      className={cn(
        "madhouse-dialog w-[min(96vw,48rem)] overflow-hidden rounded-2xl border border-border/60 bg-card p-0 text-card-foreground shadow-xl focus:outline-none",
        className,
      )}
    >
      {children}
    </dialog>
  );
});

export function DialogContent({
  className,
  children,
  labelledBy,
  describedBy,
}: {
  className?: string;
  children: React.ReactNode;
  labelledBy?: string;
  describedBy?: string;
}) {
  const { open, setOpen, titleId, descriptionId } =
    useDialogContext("DialogContent");

  const ref = useRef<HTMLDialogElement | null>(null);
  const setOpenRef = useRef(setOpen);

  useEffect(() => {
    setOpenRef.current = setOpen;
  }, [setOpen]);

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

    if (dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    function onClose() {
      setOpenRef.current(false);
    }

    function onCancel(event: Event) {
      event.preventDefault();
      setOpenRef.current(false);
    }

    dialog.addEventListener("close", onClose);
    dialog.addEventListener("cancel", onCancel);

    return () => {
      dialog.removeEventListener("close", onClose);
      dialog.removeEventListener("cancel", onCancel);
    };
  }, []);

  return (
    <DialogPortal>
      <DialogPopup
        ref={ref}
        aria-labelledby={labelledBy ?? titleId ?? undefined}
        aria-describedby={describedBy ?? descriptionId ?? undefined}
        className={className}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          setOpen(false);
        }}
      >
        {children}
      </DialogPopup>
    </DialogPortal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={cn("space-y-2", className)} />;
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={cn("flex flex-wrap justify-end gap-2", className)}
    />
  );
}

export function DialogTitle({
  className,
  id: idProp,
  ...props
}: React.ComponentPropsWithoutRef<"h2">) {
  const { setTitleId } = useDialogContext("DialogTitle");
  const reactId = React.useId();
  const id = idProp ?? reactId;

  useEffect(() => {
    setTitleId(id);
    return () => setTitleId(null);
  }, [id, setTitleId]);

  return (
    <h2 {...props} id={id} className={cn("text-lg font-semibold", className)} />
  );
}

export function DialogDescription({
  className,
  id: idProp,
  ...props
}: React.ComponentPropsWithoutRef<"p">) {
  const { setDescriptionId } = useDialogContext("DialogDescription");
  const reactId = React.useId();
  const id = idProp ?? reactId;

  useEffect(() => {
    setDescriptionId(id);
    return () => setDescriptionId(null);
  }, [id, setDescriptionId]);

  return (
    <p
      {...props}
      id={id}
      className={cn("text-sm text-muted-foreground", className)}
    />
  );
}
