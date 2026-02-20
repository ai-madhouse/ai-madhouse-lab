# Internal API Contracts

This project keeps internal endpoint contracts explicit and test-backed to catch frontend/backend drift during refactors.

## Contract source of truth

- `src/lib/schemas/internal-api.ts`

This schema module defines request/response contracts for:

- `GET /api/session/me`
- `GET /api/csrf`
- `GET|POST /api/notes-history`
- `GET /api/notes-stream` (SSE event payloads)
- `GET /api/csp-report` (E2E mode contract)

## Contract tests

- `tests/api/session-contract.test.ts`
- `tests/api/notes-contract.test.ts`
- `tests/api/csp-report-e2e-buffer.test.ts`
- `tests/api/csp-report-route.test.ts`

These tests cover both happy paths and error paths and should fail when endpoint contracts drift.
