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
