import Link from "next/link";
import * as React from "react";

import { navLinkButtonClassName } from "@/components/roiui/nav-link-button.styles";

type NavLinkButtonProps = React.ComponentPropsWithoutRef<typeof Link> & {
  active?: boolean;
};

export const NavLinkButton = React.forwardRef<
  HTMLAnchorElement,
  NavLinkButtonProps
>(({ active = false, className, ...props }, ref) => (
  <Link
    ref={ref}
    aria-current={active ? "page" : undefined}
    data-active={active ? "true" : "false"}
    className={navLinkButtonClassName({ active, className })}
    {...props}
  />
));

NavLinkButton.displayName = "NavLinkButton";
