# UI Design Notes (Practices + Checklist)

This project’s UI goals:

- **Clear, calm UI** with strong hierarchy.
- **Fast comprehension** (low cognitive load).
- **Accessible-by-default** (keyboard, contrast, semantics).
- **Honest security UX** (don’t leak sensitive info; don’t pretend to be secure).

## High-signal references

- Nielsen Norman Group — **10 Usability Heuristics for UI Design** (visibility of status, error prevention, consistency, etc.):
  - https://www.nngroup.com/articles/ten-usability-heuristics/
- W3C — **WCAG 2** overview (POUR: perceivable/operable/understandable/robust):
  - https://www.w3.org/WAI/standards-guidelines/wcag/
- GOV.UK Design System — practical, tested **components and patterns**:
  - https://design-system.service.gov.uk/

## Core principles (practical)

### 1) Hierarchy

- One obvious primary action per screen.
- Headings should “scan” correctly (H1 → H2 → H3, no jumps).
- Use size/weight/spacing before color.

### 2) Consistency

- Reuse patterns: cards, alerts, form layout.
- Keep button labels verb-first (“Create account”, “Save changes”).

### 3) Feedback & state

- Show loading states for network actions.
- Confirm destructive actions and provide undo where possible.

### 4) Error UX

- Errors should be:
  - **specific** (what happened),
  - **actionable** (how to fix),
  - **non-leaky** (no internal stack traces or paths).
- Use `role="alert"` on error blocks.

### 5) Forms

- Label every input (`<label for>`).
- Use `autocomplete` correctly (`username`, `current-password`, `new-password`).
- Inline requirements (especially passwords) + server-side enforcement.
- Prefer “show password” toggles when it helps (optional).

### 6) Accessibility (minimum bar)

- Keyboard reachable + visible focus rings.
- Adequate contrast in both light and dark themes.
- Don’t rely on color alone to communicate meaning.
- Icons should not be the only label; use text or accessible names.

## UI polish checklist (for PRs)

- [ ] No dead buttons (every CTA navigates or submits)
- [ ] Mobile layout: no horizontal scroll; buttons wrap gracefully
- [ ] Focus states visible on all interactive elements
- [ ] Empty states and errors look intentional
- [ ] Auth-gated nav doesn’t tease inaccessible pages
- [ ] Copy is consistent (tense, tone, capitalization)
