import { buttonClassName } from "@/components/roiui/button";
import { cn } from "@/lib/utils";

export function navLinkButtonClassName({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return buttonClassName({
    variant: active ? "primary" : "ghost",
    size: "sm",
    className: cn(
      "h-10 px-4 text-sm font-semibold tracking-[0.01em]",
      active
        ? "shadow-sm hover:bg-primary/90 focus-visible:ring-primary/50"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
      className,
    ),
  });
}
