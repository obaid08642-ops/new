# Semantic evidence — Patient Web pharmacy cart and orders

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Cart

Source: `app/[locale]/cart/page.tsx`.

The cart page requires patient access, fetches `/cart` server-side, parses the response through `extractCartSummary`, and renders truthful unavailable/empty states. It groups non-empty cart items, displays server-derived quantity/price/payment method and subtotal/fees/total, and links an empty cart back to medicines. Undefined values render an em dash. There are no quantity, remove, reorder, checkout mutation, insurance or cash controls in this page; those capabilities are not proven by the catalog display.

## Orders

Source: `app/[locale]/orders/page.tsx`.

The orders page requires patient access, reads `/patient/pharmacy/orders`, parses rows through `extractOrderRows`, supports translated all/pending/completed/cancelled GET filters, and links each row to `/orders/:id`. It handles 401 via login, 403/404 as not-found, and non-OK responses with an unavailable/retry state. Status bucketing is client-side and includes completed/delivered/result-ready/approved/resolved and cancelled/rejected/no-show/refunded mappings.

The page proves a read-only order list, not owner-safe detail, cancellation, refund, reorder or delivery tracking. The client-side status bucket is not a substitute for the server state machine. Detail/tracking routes and mutation contracts require separate evidence.

No Phase 0 remediation was made.
