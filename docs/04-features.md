# Features

## Table of contents

- [Pages](#pages)
- [Global UX](#global-ux)
- [Engineering](#engineering)

## Pages

- **Landing**: high-touch hero, stats, and system narrative.
- **Dashboard**: operational metrics, activity feed, and next-step focus.
- **Settings**: profile inputs, theme controls, and locale switcher.
- **Live**: telemetry board for demos and walkthroughs (client fallback + optional SSE stream).
- **Login**: credentials gate with server-side validation and feedback.

## Global UX

- Locale-aware navigation with `en`, `ru`, and `lt` translations.
- Light/dark/system themes with persistent preferences.
- Responsive layout tuned for desktop and mobile.

## Engineering

- Bun-first workflow for install, dev, and tests.
- Biome linting/formatting baked into scripts.
- Proxy-driven locale and auth gating (`src/proxy.ts`, Next.js 16 Proxy).
- Production nonce-based CSP (set in `src/proxy.ts`).
- Optional server-sent events endpoint at `GET /api/pulse` (used by the Live page).
