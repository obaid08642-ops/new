# F68 acceptance tests (reviewer-written, tests first)

Owner change 2026-10-05: hash-based CSP on public pages; nonce CSP and `Cache-Control: no-store`
on signed-in, checkout, payment, account and admin pages; no cached HTML when a session cookie is
present; HSTS and `frame-ancestors 'none'` kept. OpenCode implements it as its own PR to `main`;
the implementer may not edit these tests.

Run:
- patient-web: `cd patient-web && npx vitest run --config vitest.acceptance.config.ts acceptance/f68`
- admin: `cd admin && node_modules/.bin/jiti acceptance/f68/admin-csp.acceptance.ts`

On `main` (b5524a8f): patient-web 37 failed / 1 passed (HSTS guard), admin 6 failed / 1 passed (HSTS guard).

## Revision (reviewer, 2026-10-06, owner: "choose the best decision and do it")

A hash-based policy cannot work with the App Router. Measured on a production build, every page carries about 9
inline scripts: the RSC payload, `self.__next_f.push(…)`. Their content changes with every page and every
revalidation, so their hashes cannot be known when the header is written. SRI covers external chunks only (6 of 18).

**Implemented instead:**
- **Public pages without a session cookie:** rendered without a nonce, so Next can cache them as static/ISR.
  `patient-web/server/nonce-server.mjs`, the production entry point, then stamps a fresh nonce on every response, both
  in the header and on every `<script>`/`<style>` tag. The browser sees the same strict policy as on private pages:
  per-response nonce, `'strict-dynamic'`, no `'unsafe-inline'`/`'unsafe-eval'`. The HTML goes out as
  `private, no-cache`, so no shared cache keeps a nonce. The render itself is cached inside Next.
- **Private pages, and any request with a session cookie:** unchanged. A per-request nonce from the proxy, and `no-store`.
- **Admin:** every page, including sign-in, has a per-request nonce, `'strict-dynamic'` and `no-store`. Every page renders
  per request so `_document` can stamp the nonce. Styles keep `'unsafe-inline'`, because inline style attributes are
  still used across the admin screens.

The public-pages block of `patient-web/acceptance/f68` was rewritten for this design. The private, session-cookie and
HSTS blocks and the admin tests are unchanged.

**Results:**
- patient-web: 41/41.
- admin: 7/7.
- Browser check on production builds: 0 refused scripts on public and private pages, and pages hydrate. The 297
  inline-style refusals on `/ar/c` are the same with and without this change; they come from the old markup's
  `style=` attributes.
