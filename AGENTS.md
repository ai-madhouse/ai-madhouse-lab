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
- Any follow-ups / risks

Do **not** include in PR/task updates:
- `Files changed` sections
- `Validation` sections
- raw command dumps

---

## When in doubt

Stop early and ask rather than guessing.
Bad guesses we explicitly avoid in this repo:
- vendoring libraries
- editing `main`
- silently skipping gates
- leaving tasks stuck in `inprogress` with no active work

---

## Full Production Checklist (authoritative, merged verbatim)

# Production‑Grade TypeScript + React + Next.js (React Compiler) — AI Coding Patterns & Migration Checklist

> Purpose: a pragmatic, enforceable checklist of patterns to generate **production‑grade** code, **avoid anti‑patterns**, and support **safe migrations** in a TypeScript + React + Next.js codebase that relies on **React Compiler** (so *avoid manual memoization hooks such as* `useMemo`/`useCallback` when they would only be used for render optimization).

---

## 0) Global Rules (hard constraints)

- [ ] **No code duplication**: do not create “helper” files that just re‑export, mirror, or restate existing logic. Prefer extracting shared logic into a single module and reusing it.
- [ ] **No long branching**: avoid `if/else` chains or `switch` with **> 3 outcomes**.
  - Use a **lookup map** (object/`Map`) for O(1) average lookup, or use **polymorphism/strategy** or **discriminated unions** with exhaustive handling.
- [ ] **React Compiler aware**:
  - Do **not** add `useMemo`, `useCallback`, or “memoize everything” patterns for render performance.
  - Use hooks only for *behavior*: state, effects, refs, context, external subscriptions—not for micro‑optimizing render.
- [ ] **No comment spam**: only add TSDoc where it helps people understand *intent, constraints, invariants, side effects, or tricky behavior*. (Guidelines below.)
- [ ] **Prefer correctness + clarity over cleverness**:
  - Small functions, clear names, explicit types at boundaries, predictable control flow, and great error messages.

---

## 1) Project Health Baseline (TypeScript/Quality)

**Pattern: type boundaries**
- ✅ Type/validate at module boundaries: network, storage, env, user input.
- ✅ Inside core logic: rely on typed values.

## 2) TypeScript Patterns (and anti‑patterns)

### 2.1 Discriminated unions + exhaustive handling (preferred)
Use for state machines, API result shapes, and UI states.

```ts
type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: string[] }
  | { kind: "error"; message: string };

function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function renderLabel(s: LoadState): string {
  switch (s.kind) {
    case "idle":
    case "loading":
      return "Loading…";
    case "success":
      return `${s.data.length} items`;
    case "error":
      return s.message;
    default:
      return assertNever(s);
  }
}
```

**Anti‑pattern:** boolean flags (`isLoading`, `hasError`, `isEmpty`) that can conflict.

---

### 2.2 Result pattern for domain operations (avoid throw‑as‑control‑flow)
```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function parseAge(input: string): Result<number> {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Invalid age" };
  return { ok: true, value: n };
}
```

**Use throws for programmer errors**, not expected user/input failures.

---

### 2.3 “Narrow at the edge”: `unknown` → validated types
**Anti‑pattern:** `JSON.parse()` as `any`.

```ts
function parseJson<T>(raw: string, validate: (x: unknown) => T): T {
  const value: unknown = JSON.parse(raw);
  return validate(value);
}
```

---

### 2.4 Avoid deep optional chaining soup
Prefer early returns and clear guard functions.

```ts
function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}
```

---

## 3) Control Flow Pattern: Avoid >3 branches (use lookup maps / strategies)

### 3.1 Lookup map (O(1) average) — preferred for “many outcomes”
**Instead of** long `switch`/`if`.

```ts
type Status = "draft" | "active" | "paused" | "archived";

const statusLabel: Record<Status, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

function labelForStatus(s: Status) {
  return statusLabel[s]; // O(1) average
}
```

### 3.2 Command handler map (business logic)
```ts
type Action =
  | { kind: "rename"; name: string }
  | { kind: "archive" }
  | { kind: "restore" }
  | { kind: "setOwner"; ownerId: string };

type ActionHandler = (a: any) => Promise<void>;

const handlers: Record<Action["kind"], ActionHandler> = {
  rename: async (a: Extract<Action, { kind: "rename" }>) => { /* ... */ },
  archive: async () => { /* ... */ },
  restore: async () => { /* ... */ },
  setOwner: async (a: Extract<Action, { kind: "setOwner" }>) => { /* ... */ },
};

async function runAction(action: Action) {
  // one dispatch, no long branching
  const handler = handlers[action.kind] as (a: Action) => Promise<void>;
  return handler(action);
}
```

### 3.3 Strategy objects (useful when behavior is complex)
```ts
interface PricingStrategy {
  computeTotal(cents: number): number;
}

class StandardPricing implements PricingStrategy {
  computeTotal(cents: number) { return cents; }
}

class DiscountPricing implements PricingStrategy {
  constructor(private readonly percent: number) {}
  computeTotal(cents: number) { return Math.round(cents * (1 - this.percent)); }
}
```

---

## 4) React Patterns (React Compiler friendly)

### 4.1 Components: keep them pure
- [ ] Prefer **pure rendering** from props/state.
- [ ] Use `useEffect` only for **imperative side effects** (subscriptions, timers, non-React APIs).
- [ ] Do **not** create derived state from props unless unavoidable.

**Anti‑pattern:** Derived state + effect sync
```tsx
// ❌ Avoid: duplicated source of truth
const [filtered, setFiltered] = useState(items);
useEffect(() => setFiltered(items.filter(...)), [items]);
```

**Pattern:** derive during render
```tsx
// ✅ Prefer: derive on the fly (React Compiler will optimize where appropriate)
const filtered = items.filter(/* ... */);
```

### 4.2 Don’t sprinkle useMemo/useCallback
- ✅ Only introduce memoization when a **measurable** issue exists AND React Compiler does not cover it for the scenario.
- ✅ If you must keep a stable function identity for an external API (rare), document why.

```tsx
// ✅ Example: stable callback only when required by an external imperative API
// (Not for render optimization)
```

### 4.3 Keep state minimal and local
- [ ] Prefer local component state.
- [ ] Lift state up only when it must be shared.
- [ ] Avoid “global state by default”. Use context for cross-cutting concerns (theme, auth), and a state library only when it truly simplifies.

### 4.4 Stable keys in lists
**Anti‑pattern:** index as key
```tsx
{items.map((x, i) => <Row key={i} item={x} />)} // ❌
```

**Pattern**
```tsx
{items.map((x) => <Row key={x.id} item={x} />)} // ✅
```

### 4.5 Error boundaries & empty states
- [ ] Add `error.tsx`/`not-found.tsx` in Next routes where useful.
- [ ] Prefer explicit “empty states” in UI logic.

---

## 5) Next.js Patterns (App Router oriented)

### 5.1 Server vs Client components (separation)
- [ ] Use `"use client"` only when needed (stateful UI, effects, browser-only APIs).
- [ ] Keep client boundaries small; pass serializable props.

### 5.2 Data fetching
- [ ] Fetch on the server whenever possible.
- [ ] Prefer route handlers for mutations.
- [ ] Use caching intentionally (revalidate, tags) and document behavior when surprising.

### 5.3 Validation: validate input using Zod on the client input and on the server api request

---

## 6) Migration Checklist

### 6.1 Planning & inventory
- [ ] Identify “entry points”: pages/routes, shared components, domain modules.
- [ ] Classify modules:
  - [ ] **Pure** (no side effects) → easiest to migrate first
  - [ ] **UI** (React) → needs component-by-component migration
  - [ ] **Edge** (API/IO) → validate + refactor carefully

### 6.2 Step-by-step migration loop (repeatable)
For each module/feature:
- [ ] Write/port tests for current behavior (or snapshot API responses)
- [ ] Convert types first (TS errors as guide)
- [ ] Replace long branching with lookup maps/strategies (see §3)
- [ ] Remove duplicated logic by extracting a single shared helper
- [ ] Align folder structure + naming conventions
- [ ] Ensure error handling and empty states exist
- [ ] Run lint + tests + typecheck before moving on

### 6.3 React/Next specific migration tasks
- [ ] Move data fetching to server
- [ ] Shrink client components to interactive islands
- [ ] Replace derived state + effects with pure derivations
- [ ] Avoid `useMemo`/`useCallback` additions (React Compiler)
- [ ] Introduce route-level `error.tsx` and `loading.tsx` where helpful

### 6.4 Verification gates (must pass)
- [ ] `bun test`
- [ ] `bun lint`
- [ ] E2E for top user journeys

---

## 7) Readability & Maintainability Rules (day-to-day)

### 7.1 File and module design
- [ ] One primary responsibility per module.
- [ ] Expose a small public surface (export fewer things).
- [ ] Prefer feature-based folders: `features/<feature>/...` over “types/utils/components” dumping grounds.

### 7.2 Naming
- [ ] Prefer **verbs** for functions (`getUser`, `calculateTotal`).
- [ ] Prefer **nouns** for values/types (`User`, `InvoiceTotal`).
- [ ] Avoid abbreviations unless widely understood.

### 7.3 Function shape
- [ ] Keep functions small; one level of abstraction per function.
- [ ] Early returns over nested conditionals.
- [ ] Avoid “boolean parameter” traps:
  - `doThing(true)` is unclear → use options object or separate functions.

```ts
// ✅ options object is self-documenting
function fetchUsers(opts: { includeDisabled: boolean }) { /* ... */ }
```

### 7.4 Error handling
- [ ] Prefer typed errors or `Result` for expected failures. Do not throw expected errors.
- [ ] Provide actionable messages (what failed, which id, which constraint).

---

## 8) Anti‑patterns to Eliminate (with fixes)

### 8.1 “God components”
**Problem:** huge components mixing data fetching, business rules, and UI.
- ✅ Fix: split into server wrapper + client interactive subcomponent + domain helpers.

### 8.2 “Effect-driven” UI
**Problem:** `useEffect` chains that set state that triggers more effects.
- ✅ Fix: derive in render; move side effects to the edge; use server fetch.

### 8.3 Hidden coupling via re-exports and duplicate modules
**Problem:** `index.ts` barrels that hide dependencies or duplicate APIs.
- ✅ Fix: explicit imports for important modules; avoid duplicating modules across features.

### 8.4 Switch/if explosion
**Problem:** `switch(action.type)` with many cases.
- ✅ Fix: handler map or strategy (§3).

### 8.5 Over-abstracted utilities
**Problem:** generic helpers that obscure intent (`applySomething<T>(...)`).
- ✅ Fix: create domain-specific functions with clear names.

---

## 9) Pragmatic TSDoc Guide (concise, useful, not spammy)

### 9.1 When to write TSDoc (✅ do)
Write TSDoc for:
- [ ] **Public APIs** used across modules (shared hooks, services, domain functions)
- [ ] **Non-obvious behavior** (invariants, edge cases, performance constraints, side effects)
- [ ] **Why** something exists (tradeoffs, constraints, external requirements)

### 9.2 When NOT to write TSDoc (❌ don’t)
Avoid TSDoc for:
- [ ] Obvious functions (`add`, `toString`, trivial getters)
- [ ] Restating types already clear from signatures
- [ ] Repeating what the code says line-by-line

### 9.3 TSDoc style rules (keep it short)
- [ ] First line: **one-sentence summary** (imperative voice).
- [ ] Add `@remarks` only if there’s non-obvious context.
- [ ] Add `@example` only when usage is not obvious.
- [ ] Document side effects and error cases (`@throws`) only when relevant.
- [ ] Prefer “what/why”, not “how”.

### 9.4 Templates

**Function (domain)**
```ts
/**
 * Compute the invoice total in cents.
 *
 * @remarks
 * Applies line-item taxes and rounds half-up per local regulation.
 *
 * @throws If any line item has a negative quantity.
 */
export function computeInvoiceTotal(input: Invoice): number {
  // ...
}
```

**React component**
```tsx
/**
 * Render a compact user card with name, avatar, and status.
 *
 * @remarks
 * This component is presentational; it performs no data fetching.
 */
export function UserCard(props: { user: User }) {
  // ...
}
```

**Custom hook**
```ts
/**
 * Subscribe to the current online/offline status.
 *
 * @remarks
 * Uses the browser `online`/`offline` events; returns `true` on the server.
 */
export function useOnlineStatus(): boolean {
  // ...
}
```

**Type / interface**
```ts
/** A stable identifier for a user in the primary datastore. */
export type UserId = string & { readonly __brand: "UserId" };
```

### 9.5 Comment hygiene checklist
- [ ] No “explain every line” comments.
- [ ] No stale comments: update docs when behavior changes.
- [ ] Prefer renaming code over commenting unclear names.

---

## 10) Quick Pre-flight Checklist (copy/paste)

- [ ] I validated all external inputs at the boundary (`unknown` → typed).
- [ ] I avoided `useMemo`/`useCallback` (React Compiler project).
- [ ] I avoided `if/else` or `switch` with >3 outcomes; used a map/strategy.
- [ ] I did not duplicate logic or create redundant files.
- [ ] I kept components pure; side effects only where necessary.
- [ ] I added TSDoc only for public/non-obvious APIs (no spam).
- [ ] I ran typecheck + lint + tests (or ensured these steps exist).
- [ ] I improved readability: small functions, clear naming, minimal state.

---

## 11) Appendix: Example refactor — from switch explosion to handler map

**Before (❌)**
```ts
switch (event.type) {
  case "a": return handleA(event);
  case "b": return handleB(event);
  case "c": return handleC(event);
  case "d": return handleD(event);
  case "e": return handleE(event);
  default: throw new Error("Unknown event");
}
```

**After (✅)**
```ts
type Event =
  | { type: "a"; payload: A }
  | { type: "b"; payload: B }
  | { type: "c"; payload: C }
  | { type: "d"; payload: D }
  | { type: "e"; payload: E };

const eventHandlers: Record<Event["type"], (e: any) => void> = {
  a: (e: Extract<Event, { type: "a" }>) => handleA(e),
  b: (e: Extract<Event, { type: "b" }>) => handleB(e),
  c: (e: Extract<Event, { type: "c" }>) => handleC(e),
  d: (e: Extract<Event, { type: "d" }>) => handleD(e),
  e: (e: Extract<Event, { type: "e" }>) => handleE(e),
};

export function dispatchEvent(e: Event) {
  return (eventHandlers[e.type] as (x: Event) => void)(e);
}
```

---

### Notes (interpretation of constraints)
- “Use functions map for O(1)”: interpret as **lookup maps** (object/`Map`) and **handler tables** for branching reduction and fast dispatch.
- “No duplicated code files”: avoid boilerplate “adapter” modules that mirror existing exports; centralize shared logic.
- React Compiler: treat memoization hooks as **opt-in exceptions**, not a default tool.
