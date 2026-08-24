# Semantic evidence — Patient Web Cart

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd-patient-web/app/[locale]/cart/page.tsx:14–25` requires patient access and calls `callPatientApi("/cart", {}, token)`, with 401 login redirect, 403/404 not-found, generic unavailable state, and `extractCartSummary` parsing. The source does not expose a mutation or prove the upstream method beyond the wrapper call.

The rendered cart shows grouped items, item count, name/service ID, quantity, price, payment method, subtotal, home-visit fee and total (`:26–32`). There are no controls to increase/decrease quantity, remove a line, clear the cart, apply coupon/loyalty, select address/delivery, choose cash/card/wallet/insurance, upload prescription, create an order, or initiate payment. Even with items present there is no checkout CTA; the only actionable link in the empty state goes to `/medicines` (`:30–33`).

Missing values are rendered as `—` and group kind is displayed directly, with no explicit validation/ownership/item freshness or stock state in the page (`:27–32`). This remains a read-only summary and cannot complete any purchase journey. No Phase 0 remediation was made.
