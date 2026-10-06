# F68 acceptance tests (reviewer-written, tests first)

Owner change 2026-10-05: hash-based CSP on public pages; nonce CSP and `Cache-Control: no-store`
on signed-in, checkout, payment, account and admin pages; no cached HTML when a session cookie is
present; HSTS and `frame-ancestors 'none'` kept. OpenCode implements it as its own PR to `main`;
the implementer may not edit these tests.

Run:
- patient-web: `cd patient-web && npx vitest run --config vitest.acceptance.config.ts acceptance/f68`
- admin: `cd admin && node_modules/.bin/jiti acceptance/f68/admin-csp.acceptance.ts`

On `main` (b5524a8f): patient-web 37 failed / 1 passed (HSTS guard), admin 6 failed / 1 passed (HSTS guard).
