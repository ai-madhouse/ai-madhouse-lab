# CLAUDE.md — ai-madhouse-lab (Claude Code / automation rules)

This repo is operated by humans + automated coding agents. The goal is **collision-free**, **reviewable**, **shippable** changes.

If you are Claude Code: follow this file exactly.

---

## Repo quick facts

- Stack: **Next.js (App Router)** + **TypeScript**
- Styling: **Tailwind v4 tokens in `src/app/globals.css`**
- Lint/format: **Biome** (`bun run lint`)
- Unit tests: **bun test** (scoped to `tests/`)
- E2E tests: **Playwright** (`PW_PORT`, default `3005`)
- Build: `next build --webpack`

---

## Core rules

### 1) Worktree-only
- Never work in `/srv/projects/ai-madhouse-lab` directly.
- Use dedicated worktree: `/srv/projects/worktrees/ai-madhouse-lab/<task-id>/`
- Use dedicated branch: `vk/<task-id>-<slug>`

### 2) No vendoring
- Do not create repo-root `vendor/`.
- Do not add `file:./vendor/...` deps.

### 3) Task/checklist discipline
- Keep task status and checklist accurate.
- Mark `Acceptance`, `Gates`, `Progress` checkboxes in real time.
- Never revert `[x]` back to `[ ]`.

### 4) PR ownership
- Do not manually create/edit PR unless explicitly instructed by maintainer.
- Automation handles PR creation/labels/merge flow.

### 5) Notes handling
- Never create/use `.pr-addendum.md`.
- Append reviewer context directly in VK task `## Notes`.
- Preserve scoped source quote in `## Notes`.

---

## Next.js + TypeScript practices

- Server components by default; use `'use client'` only when needed.
- Avoid `any`; avoid unsafe casts.
- Validate untrusted inputs with `zod`.
- Follow existing component/util patterns (`cn`, `src/components/ui`, etc).

---

## Required gates (unless task says otherwise)

```sh
bun run lint
bun test
bun run build
```

If task requires targeted tests (API/E2E), run those too and report results.

---

## E2E safety

Use unique port/output per run:

```sh
PW_PORT=<free-port> bunx playwright test --output test-results/<attempt-id>
```

Do not leave stray `next start` processes running.

---

## Commit policy

- Preferred: one shippable commit.
- Never commit `data/app.db` (restore it if changed).
- If commit fails due sandbox/permissions, report exact blockers and leave clean diff.

---

## Quality bar for updates

When work is ready, task updates should include:
- concise behavior-focused summary
- follow-ups/risks (if any)

Do not include:
- `Files changed` section
- `Validation` section
- raw command dumps

---

When in doubt: stop and ask rather than guessing.
