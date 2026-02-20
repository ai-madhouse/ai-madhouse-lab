# Development

## Table of contents

- [Requirements](#requirements)
- [Setup](#setup)
- [Commands](#commands)
- [Environment variables](#environment-variables)
- [Notes](#notes)
- [UI contracts](#ui-contracts)

## Requirements

- Bun (package manager + runtime)

## Setup

1. Install dependencies: `bun install`
2. Create a local env file (optional but recommended): `.env.local` (see `.env.example`)
3. Run the web app and realtime server (two terminals)

### Example `.env.local`

```bash
# Dev-only secrets
AUTH_SECRET=dev-secret-change-me-please-123456
REALTIME_SECRET=dev-realtime-secret-change-me-please-123456

# Optional
DB_PATH=data/app.db
PORT=3000
REALTIME_PORT=8787
```

### Run web + realtime

Terminal A (Next.js):

```bash
bun dev
# or: PORT=3000 bun dev
```

Terminal B (realtime websockets):

```bash
bun run realtime
# honors REALTIME_PORT, REALTIME_SECRET, DB_PATH
```

## Commands

- Install: `bun install`
- Dev: `bun dev`
- Build: `bun run build`
- Lint (Biome): `bun run lint`
- Format (Biome): `bun run format`
- Tests: `bun test`
- Repo preflight: `bun run preflight`

## Environment variables

- `AUTH_SECRET`: required in production (>= 16 chars). Used for signing session cookies.
- `DB_PATH`: optional, defaults to `data/app.db`.
- `REALTIME_*`: see `realtime/server.ts` for WebSocket settings.

## Notes

- Users can register at `/{locale}/register`.
- Auth is session-based (sqlite `sessions` table) and checked on every request.
- Repo hygiene is enforced by `scripts/repo-preflight.ts`:
  - blocks tracked artifact paths (`test-results/`, `playwright-report/`, `blob-report/`, etc.)
  - blocks root-owned tracked files
  - on managed VPS paths, enforces worktree-only changes and task branch naming (`vk/<task-id>-<slug>`)
  - on managed VPS paths, checks shared roots use mode `2775`

## UI contracts

- Shared header controls (top nav active state, locale switcher, theme toggle) are defined in `docs/05-header-ui-contracts.md`.
- Keep E2E assertions aligned with that contract and avoid internal-style assumptions.
