# Purpose

## Table of contents

- [Overview](#overview)
- [Goals](#goals)
- [Non-goals](#non-goals)

## Overview

Madhouse Lab is a Bun-first Next.js prototype that showcases a polished, multi-page UI with internationalization, theme switching, and an opinionated engineering workflow. It is designed to feel like a real product surface while remaining lightweight enough for iteration.

## Goals

- Demonstrate cohesive UI/UX across a landing page, dashboard, settings, and live telemetry surface.
- Prove end-to-end internationalization with `en`, `ru`, and `lt` locale support.
- Ship with basic authentication, guarded routes, and pragmatic defaults for demos.
- Keep development workflow crisp: TypeScript everywhere, Biome formatting, and Bun tests.

## Non-goals

- Production-grade security, persistence, or role-based access.
- Full real-time infrastructure (the live view is a lightweight simulation).
- A back-end database or multi-tenant architecture.
