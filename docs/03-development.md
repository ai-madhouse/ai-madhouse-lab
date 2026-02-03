# Development

## Table of contents

- [Requirements](#requirements)
- [Setup](#setup)
- [Commands](#commands)
- [Environment variables](#environment-variables)
- [Notes](#notes)

## Requirements

- Bun (package manager + runtime)

## Setup

1. Install dependencies: `bun install`
2. Run the dev server: `bun dev`

## Commands

- Install: `bun install`
- Dev: `bun dev`
- Build: `bun run build`
- Lint (Biome): `bun run lint`
- Format (Biome): `bun run format`
- Tests: `bun test`

## Environment variables

- `AUTH_SECRET`: required in production (>= 16 chars). Used for signing session cookies.
- `DB_PATH`: optional, defaults to `data/app.db`.
- `REALTIME_*`: see `realtime/server.ts` for WebSocket settings.

## Notes

- Users can register at `/{locale}/register`.
- Auth is session-based (sqlite `sessions` table) and checked on every request.
