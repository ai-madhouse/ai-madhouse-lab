# Architecture

## Table of contents

- [Overview](#overview)
- [Routing](#routing)
- [Internationalization](#internationalization)
- [Theming](#theming)
- [Authentication](#authentication)
- [UI System](#ui-system)
- [Testing](#testing)

## Overview

The app uses the Next.js App Router with locale-prefixed routes. Server components load locale data and translations, while client components handle theme toggling, locale switching, and live updates. The structure keeps UI composition on the server and interactivity on the client.

## Routing

- `src/app/[locale]/page.tsx`: landing page
- `src/app/[locale]/dashboard/page.tsx`: dashboard overview
- `src/app/[locale]/settings/page.tsx`: theme + language controls
- `src/app/[locale]/live/page.tsx`: live telemetry simulation
- `src/app/[locale]/login/page.tsx`: basic auth login
- `src/app/[locale]/logout/route.ts`: clears auth cookie

The locale prefix is enforced in `src/middleware.ts` and defaults to `/en` when missing.

## Internationalization

- Locale data lives in `src/messages/*.json`.
- `src/lib/i18n.ts` provides locale helpers and message loading.
- Server pages use `createTranslator` from `src/lib/translator.ts`.
- Client components use `NextIntlClientProvider` plus `useTranslations` from the local shim.

## Theming

- `ThemeProvider` wraps the app in `src/app/layout.tsx`.
- `ThemeToggle` and `ThemeSwitcher` are client components that set the theme.
- Theme variables are defined in `src/app/globals.css` with light and dark palettes.

## Authentication

- Credentials are checked in `src/lib/auth.ts`.
- A signed cookie gates access to protected routes (`/dashboard`, `/settings`, `/live`).
- `src/middleware.ts` enforces auth and redirects to `/login` when needed.

## UI System

- Tailwind v4 provides utility styling.
- shadcn/ui-inspired primitives live in `src/components/ui`.
- Icons use the local `lucide-react` shim for consistency.

## Testing

- Bun runs unit tests in `src/lib/*.test.ts`.
- Biome handles formatting and linting.
