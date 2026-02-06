import { describe, expect, test } from "bun:test";

import { navLinkButtonClassName } from "@/components/roiui/nav-link-button.styles";

describe("navLinkButtonClassName", () => {
  test("uses primary button styling when active", () => {
    const className = navLinkButtonClassName({ active: true });

    expect(className).toContain("bg-primary");
    expect(className).toContain("text-primary-foreground");
    expect(className).toContain("focus-visible:ring-primary/50");
  });

  test("uses muted hover + focus styling when inactive", () => {
    const className = navLinkButtonClassName({ active: false });

    expect(className).toContain("text-muted-foreground");
    expect(className).toContain("hover:bg-accent");
    expect(className).toContain("focus-visible:bg-accent");
  });

  test("merges custom classes", () => {
    const className = navLinkButtonClassName({
      active: false,
      className: "custom-class",
    });

    expect(className).toContain("custom-class");
  });
});
