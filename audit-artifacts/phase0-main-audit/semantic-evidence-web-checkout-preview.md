# Semantic evidence — Patient Web Cart Checkout Preview

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd-patient-web/app/[locale]/cart/checkout/page.tsx:14–25` is an async server page that requires patient access, calls `callPatientApi("/cart/checkout", {}, token)`, redirects 401 to login, maps 403/404 to not-found, and renders an unavailable state for other failures. It parses the response through `extractCartSummary` and rejects missing/invalid summary data.

The page renders only a checkout preview with subtotal, home-visit fee and total plus a back link (`:26–33`). There is no client/server mutation, payment intent, order creation, address selection, delivery mode, cash/card/wallet/insurance choice, prescription upload, coupon, consent, confirmation, or post-payment return state. It therefore cannot complete the patient purchase journey and is not parity with the Mobile checkout/payment screens.

The route path `/cart/checkout` is treated as a backend preview call but this source does not prove the upstream HTTP method, ownership response, server quote freshness, or whether the endpoint is a real contract or an unsupported route. No Phase 0 remediation was made.
