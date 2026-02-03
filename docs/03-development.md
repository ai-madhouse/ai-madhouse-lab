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

- `DEMO_USER`: login username (default: `operator`)
- `DEMO_PASS`: login password (default: `madhouse`)

## Notes

- Routes `/dashboard`, `/settings`, and `/live` require authentication.
- Locale routing is enforced by `src/middleware.ts`.
