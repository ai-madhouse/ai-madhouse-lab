# CSP reporting via Sentry (Security)

This project can route browser CSP violation reports to **Sentry Security**.

## Why
CSP without telemetry is hard to enforce safely:
- If you enforce too early, you can break prod.
- If you keep it permissive forever, it’s mostly placebo.

CSP reports give you the feedback loop:
1) Start strict (or Report-Only).
2) Watch violations.
3) Fix code / allowlist intentionally.
4) Tighten further.

## What we implemented
### Headers
In production, `src/proxy.ts` emits:
- `Content-Security-Policy` (nonce + strict-dynamic)
- `Reporting-Endpoints` mapping endpoint names to URLs

If `SENTRY_DSN` is set, we additionally:
- Add Sentry ingest origin to `connect-src`
- Set `Reporting-Endpoints` to include `csp-endpoint` → Sentry Security endpoint
- Add Sentry Security endpoint to `report-uri` (fallback)

### Endpoints
- `/api/csp-report` exists as a same-origin fallback endpoint.
  - It normalizes and redacts payloads (drops URL query + fragment).
  - By default it does **not** persist.
  - In `E2E_TEST=1` mode it keeps a small in-memory buffer to make e2e tests deterministic.

## Configuration
### 1) Set the DSN
Set `SENTRY_DSN` in production environment (example is in `.env.example`).

Notes:
- DSN contains a public key (not a secret), but treat it as config you don’t want to leak unnecessarily.
- Do **not** set `E2E_TEST=1` in production.

### 2) Deploy
After deploy, verify the response headers include:
- `Content-Security-Policy: ... report-to ...; report-uri ...`
- `Reporting-Endpoints: csp="/api/csp-report", csp-endpoint="https://<ingest>/api/<project>/security/?sentry_key=<key>"`

## How to view CSP violations in Sentry
1) Open Sentry
2) Select project: **ai-madhouse-lab**
3) Go to **Security** → **CSP** (wording varies by Sentry UI)
4) You should see grouped violations by:
   - violated directive
   - blocked-uri
   - document-uri

## How to respond to violations (practical playbook)
### A) It’s a legitimate dependency (you intended it)
- Add the specific origin to the narrowest directive possible.
  - Example: if websockets are blocked, update `connect-src`.
  - Avoid widening `default-src`.

### B) It’s an unintended third-party
- Treat as a signal:
  - check if it’s a new script, injected content, or a compromised dependency
  - do **not** blindly allowlist

### C) It’s noisy
- You can reduce noise by:
  - rate limiting at the report endpoint (already present for `/api/csp-report`)
  - sampling / aggregating if you later persist reports

## Recommended alerting
In Sentry, consider an alert on:
- sudden spike in CSP events after a deploy
- appearance of a new blocked origin

## Local testing
- CSP is only enforced when `NODE_ENV=production`.
- For local testing you can run `bun run e2e` (Playwright) which asserts:
  - CSP headers present
  - CSP reporting pipeline endpoint works

