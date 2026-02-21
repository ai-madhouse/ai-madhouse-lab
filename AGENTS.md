# AGENTS.md — ai-madhouse-lab (Codex/automation rules)

This repo is operated by humans + automated coding agents (Codex). The goal is **collision-free**, **reviewable**, **shippable** changes.

If you are an agent: follow this file *exactly*.

---

## Repo quick facts (so you don’t guess)

- Stack: **Next.js (App Router)** + **TypeScript**
- Styling: **Tailwind v4 tokens in `src/app/globals.css`**
- Lint/format: **Biome** (`bun run lint` → `biome check`)
- Unit tests: **bun test** (scoped to `tests/` via `bunfig.toml` / `package.json`)
- E2E tests: **Playwright** (config reads `PW_PORT`; default port is `3005`)
- Build: `next build --webpack` (see `package.json`)

---

## Next.js + TypeScript “skills” (how to be effective in this repo)

### App Router + i18n (project-specific)
- UI routes live under `src/app/[locale]/...` (locale is required for pages).
- When adding user-visible copy, update **all locales** in `src/messages/*.json` (don’t leave only `en`).
- Prefer **not** adding new nav links unless the task explicitly asks (avoids translation churn).

### Runtime architecture rule (current migration baseline)
- **App data/actions must be API/WS-driven** across the product (dashboard/settings/live/notes/auth).
- Do **not** implement app-logic data flows via Server Components.
- Use SSR/SSG where applicable for shell/static/initial render, then hydrate runtime data from API and live updates from WS.
- For runtime routes, enforce this exact flow:
  1) initial data fetch via API
  2) normalize/store it in Jotai atoms
  3) WS messages update those same atoms
  4) UI subscribes to atom state and re-renders from atom updates (single source of truth)

### TypeScript rules (keep it strict)
- Avoid `any`.
- Avoid `as` casts unless you also add a runtime check/type guard.
- Validate untrusted inputs (forms, route handlers) with `zod` (already a dependency).
- Prefer discriminated unions + exhaustive handling for UI/API state.
- Prefer `Result`-style expected-failure handling over throw-as-control-flow.

### Production checklist integration (authoritative)
The migration checklist file is authoritative reference:
`/home/openclaw/.openclaw/media/inbound/file_4---77b8d30a-ef3f-4ffa-a0d0-110254b7f2dd.md`

Enforced coding constraints:
- **No duplicated logic/files** (no mirror/re-export helper clutter).
- **No long branching**: avoid if/switch chains with >3 outcomes; use lookup maps / strategy / discriminated unions.
- **React Compiler aware**: do not add `useMemo`/`useCallback` for render micro-optimization by default.
- **Boundary validation**: validate at API/network/storage/env input boundaries.
- **TSDoc discipline**: only for public/non-obvious intent and constraints; avoid comment spam.

### Follow existing house patterns
- Styling: Tailwind v4 tokens live in `src/app/globals.css` (`@theme inline`). Prefer tokens over magic numbers.
- UI primitives: add/adjust components under `src/components/ui/`.
  - accept `className`
  - use `cn()` from `src/lib/utils`
  - use `forwardRef` when wrapping native elements

### Testing/build gotchas
- Keep Playwright specs as `e2e/*.spec.ts`. **Do not rename/move** them into `tests/`.
  - `bun test` is intentionally scoped to `tests/` (via `bunfig.toml` / `package.json`) to avoid executing Playwright specs.
- Running tests/build may dirty `data/app.db` (tracked). **Do not commit it**:
  - before committing: `git restore data/app.db`

---

## Hard guardrails (non‑negotiable)

### 1) Worktree-only (no collisions)
- **Never** do work directly in the main checkout: `/srv/projects/ai-madhouse-lab`.
- Always work in a dedicated worktree under:
  - `/srv/projects/worktrees/ai-madhouse-lab/<task-id>/`
- Always use a dedicated branch:
  - `vk/<task-id>-<slug>`

If you realize you’re in `/srv/projects/ai-madhouse-lab` or on branch `main`: **stop**.

### 2) No vendoring dependencies
Vendoring caused repeated bad/stalled attempts.

- Do **not** create a repo-root `vendor/` directory.
- Do **not** add `file:./vendor/...` dependencies in `package.json`.

This is enforced by unit test:
- `tests/lib/no-vendor.test.ts`

If dependency install is difficult: **report and stop** (don’t vendor as a workaround).

### 3) Status discipline (vibe-kanban)
Statuses are treated as truth, not aspiration.

- When you start work: set task → `inprogress`
- When you have a shippable change (and gates pass): set task → `inreview`
- Only the maintainer merges + sets → `done` (or `cancelled`)

### 4) PR/merge ownership
- Agents **do not push** unless explicitly instructed.
- Agents **do not create PRs** unless explicitly instructed.
- Maintainer uses `gh` to label + create PRs + merge.

### 5) Reviewer context handling
- `.pr-addendum.md` is forbidden in repo history and commits.
- Do not create it.
- Reviewer context must be appended to VK task `## Notes` (append-only), and PR body must be synthesized from task context + actual code changes.

---

## Network rule (project-specific)
Outbound internet from this VPS is sometimes blocked/flagged.

- For outbound installs/fetches use:
  - `/usr/local/sbin/vpnexec <command>`
  - Example: `/usr/local/sbin/vpnexec bun install --frozen-lockfile`
- For local services on the VPS (127.0.0.1 ports), **do not** use `vpnexec`.

---

## Required gates (run in your worktree)

Unless the task explicitly says otherwise, you must run:

```sh
bun run lint
bun test
bun run build
```

Convenience:
- `bun run check` runs lint + unit tests + build.

E2E is normally run by the maintainer on host. If you are asked to run it, see the collision-safe section below.

---

## Collision-safe e2e (host verification pattern)

If you run Playwright:

- Never assume port `3005` is free.
- Use a unique port per run:

```sh
PW_PORT=<free-port> bun run e2e
```

- Use a unique output directory per run:

```sh
PW_PORT=<free-port> bunx playwright test --output test-results/<attempt-id>
```

- Do not leave stray `next start` processes running.

---

## Dependency changes (how to do it safely)

- Prefer normal deps (e.g. `@radix-ui/react-*`) via bun.
- If network is needed:

```sh
/usr/local/sbin/vpnexec bun add <package>@<version>
/usr/local/sbin/vpnexec bun install --frozen-lockfile
```

- Never hand-edit `bun.lock`.

---

## Translation/navigation hygiene

- Adding a nav link or route that changes UI copy often requires updating **all locales** under `src/messages/*`.
- If a task says “nav link optional”, default to **not adding it** to avoid translation churn.

---

## Commit policy (important for Codex sandbox)

Preferred: **one shippable commit** per task.

However, some Codex sandboxes cannot write the linked worktree gitdir (symptom: `index.lock permission denied`).

Also: running tests/build may modify `data/app.db` (tracked). Make sure it is not part of your commit (`git restore data/app.db`).

If `git commit` fails due to sandbox filesystem restrictions:
- **Do not** hack around it.
- Leave changes on disk.
- Report:
  - worktree path
  - `git status --porcelain`
  - commands run + results
  - next commands to commit on host

The maintainer will commit/push.

---

## What a good “task update” message looks like

When moving to `inreview`, include:
- Summary of changes (bullet list)
- Files changed (short list)
- Commands run + results (lint/test/build)
- Any follow-ups / risks

---

## When in doubt

Stop early and ask rather than guessing.
Bad guesses we explicitly avoid in this repo:
- vendoring libraries
- editing `main`
- silently skipping gates
- leaving tasks stuck in `inprogress` with no active work
