# Semantic evidence — Patient Web login and cart checkout

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Login

Source: `nabd-patient-web/app/[locale]/login/page.tsx`.

The page is server-rendered and delegates form behavior to `LoginForm` at line 10. Metadata marks the login page `robots: { index: false, follow: false }` at line 9, which is appropriate for a private auth page and must not be generalized to public service pages. The visible page includes Lucide lock/shield icons and translated content. The actual POST/session/cookie behavior is in the form and API route, which remain to be read and matched.

## Cart checkout preview

Source: `nabd-patient-web/app/[locale]/cart/checkout/page.tsx`.

The page requires patient access at line 19, calls `callPatientApi("/cart/checkout", {}, token)` at line 20, and renders a server-side cart total preview only. It redirects 401 to login and treats 403/404 as not-found at lines 21–22. Non-OK responses and invalid cart summaries render a truthful unavailable/retry state at lines 23–25. Amounts are derived from the server response through `extractCartSummary`, with an em dash for undefined values at line 28.

This file does not create an order, payment intent, or checkout mutation. The presence of a `/cart/checkout` GET call must not be interpreted as a functioning payment journey. The actual mutation route, idempotency, quote expiry, payment provider, failure/retry and order confirmation remain unverified and are blocked by the current read-only BFF allowlist until separately evidenced.

No Phase 0 remediation was made.
