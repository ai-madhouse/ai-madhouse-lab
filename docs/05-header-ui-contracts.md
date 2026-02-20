# Header UI Contracts

## Purpose

This contract defines stable behavior for shared header controls used across locale-prefixed routes (`/[locale]/*`).

Tests should assert these contracts and avoid styling internals (for example, specific Tailwind utility classes).

## Top Nav Contract

- Header nav links are rendered with stable keys:
  - `data-layout-key="nav-home"`
  - `data-layout-key="nav-dashboard"`
  - `data-layout-key="nav-settings"`
  - `data-layout-key="nav-live"`
  - `data-layout-key="nav-notes"`
  - `data-layout-key="nav-about"`
- Active route link contract:
  - active link has `aria-current="page"`
  - active link has `data-active="true"`
  - inactive links have `data-active="false"` and no `aria-current="page"`
- Keyboard contract:
  - nav links remain reachable by `Tab` navigation.

## Locale Switcher Contract

- Trigger is a button with `data-layout-key="locale-switcher"` and menu semantics:
  - `aria-haspopup="menu"`
  - `aria-expanded` toggles `false -> true -> false` with open/close
- Menu contract:
  - opened content exposes `role="menu"`
  - options expose `role="menuitem"`
- Stable option selectors:
  - `data-testid="locale-option-en"`
  - `data-testid="locale-option-ru"`
  - `data-testid="locale-option-lt"`
- Navigation contract on select:
  - keeps current route segment after locale swap (`/en/about` -> `/ru/about`)
  - preserves query string
  - preserves hash fragment

## Theme Toggle Contract

- Toggle control is a button with `data-layout-key="theme-toggle"`.
- Interaction contract:
  - clicking toggle flips the resolved theme state (dark class on `<html>` toggles)
- Layout stability contract:
  - header action controls keep their positions; toggling theme must not shift logout/auth button width or x-position beyond sub-pixel tolerance.

## Testing Guidance

- Prefer `role` + accessible name when names are locale-stable in the test context.
- Use `data-layout-key` for shared header controls.
- Use the locale option `data-testid` selectors for cross-locale resilience.
- Avoid asserting Tailwind class names for behavior checks.
