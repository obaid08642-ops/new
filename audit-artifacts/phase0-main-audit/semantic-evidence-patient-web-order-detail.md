# Semantic evidence — Patient Web order detail and tracking

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Order detail

Source: `app/[locale]/orders/[orderId]/page.tsx`.

The page validates locale and order UUID-like identifier through `parseOrderId`, requires patient access, fetches `/patient/pharmacy/orders/:orderId`, maps 401 to login and 403/404 to not-found, and renders an unavailable/retry state for other failures or invalid extraction. It displays status, a secure id and links to tracking. No cancel, reorder, refund or payment action is rendered.

## Tracking

Source: `app/[locale]/orders/[orderId]/tracking/page.tsx`.

The page uses the same identifier/session/not-found protections, reads `/orders/:orderId/tracking`, parses through `extractOrderTracking`, and displays server-derived status, pharmacy, delivery mode, ETA/update time and total/currency when available. No polling or mutation exists in this source. Owner isolation and whether the endpoint intentionally differs from the list/detail `/patient/pharmacy/orders` namespace require Backend verification.

The status/ETA/total values are rendered only when returned by the parser; there is no fixed operational value in these two pages. The pages establish a read/detail experience, not a complete order lifecycle. Cancellation, refund, reorder, payment reconciliation, delivery updates and privacy masking require separate contracts/tests. No Phase 0 remediation was made.
