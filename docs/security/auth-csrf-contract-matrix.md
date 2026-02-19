# Auth + CSRF Contract Matrix

This matrix defines the expected behavior for authentication and CSRF checks on the core auth/session flow.

## Routes in scope

- `/{locale}/register` (server action)
- `/{locale}/login` (server action)
- `/{locale}/logout` (route handler)
- `/api/session/me`

## Contract Matrix

| Route | Scenario | Expected result | Coverage |
| --- | --- | --- | --- |
| `/{locale}/register` | Valid credentials + valid CSRF token | Redirect to `/{locale}/dashboard`; authenticated session is created | `e2e/auth.spec.ts` test: `can register, see settings, and sign out` |
| `/{locale}/register` | Missing CSRF token | Redirect to `/{locale}/register?error=csrf` | `e2e/auth.spec.ts` test: `register rejects missing csrf token` |
| `/{locale}/register` | Tampered CSRF token | Redirect to `/{locale}/register?error=csrf` | `e2e/auth.spec.ts` test: `register rejects tampered csrf token` |
| `/{locale}/login` | Valid credentials + valid CSRF token | Redirect to `/{locale}/dashboard`; authenticated session is created | `e2e/auth.spec.ts` test: `login rejects tampered csrf token then succeeds with fresh token` |
| `/{locale}/login` | Missing CSRF token | Redirect to `/{locale}/login?error=csrf` | `e2e/auth.spec.ts` test: `login rejects missing csrf token` |
| `/{locale}/login` | Stale CSRF token (token does not match current CSRF cookie) | Redirect to `/{locale}/login?error=csrf` | `e2e/auth.spec.ts` test: `login rejects stale csrf token` |
| `/{locale}/login` | Tampered CSRF token | Redirect to `/{locale}/login?error=csrf` | `e2e/auth.spec.ts` test: `login rejects tampered csrf token then succeeds with fresh token` |
| `/{locale}/logout` | Authenticated user performs GET logout | Redirect to `/{locale}/login`; auth cookie cleared | `e2e/auth.spec.ts` test: `logout clears auth cookie and session endpoint returns unauthorized` |
| `/{locale}/logout` | Repeated/logout without valid auth session | Redirect to `/{locale}/login` (idempotent) | `e2e/auth.spec.ts` test: `logout clears auth cookie and session endpoint returns unauthorized` |
| `/api/session/me` | Valid signed auth cookie | `200` + `{ ok: true, sessionId, ip }` | `e2e/auth.spec.ts` test: `can register, see settings, and sign out` |
| `/api/session/me` | Missing auth cookie | `401` + `{ ok: false, error: "unauthorized" }` | `e2e/auth.spec.ts` test: `session endpoint rejects missing and tampered auth cookies` |
| `/api/session/me` | Tampered auth cookie | `401` + `{ ok: false, error: "unauthorized" }` | `e2e/auth.spec.ts` test: `session endpoint rejects missing and tampered auth cookies` |
