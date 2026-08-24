# Semantic evidence — Web versus Mobile pharmacy parity

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Web catalog

`audit-work/source/nabd-patient-web/app/[locale]/medicine-catalog/page.tsx:13–44` uses server-backed public medicine search, renders localized medicine facts, prescription-required flag, internal detail links and JSON-LD ItemList. Metadata explicitly sets `robots: { index: false, follow: false }` (`:19–29`). The catalog has search but no add-to-cart, quantity, prescription upload, delivery address or purchase CTA.

## Web cart

`audit-work/source/nabd-patient-web/app/[locale]/cart/page.tsx:14–33` requires patient access and reads `/cart` via `callPatientApi`. It handles 401 redirect, 403/404 not-found, unavailable and empty states, then renders grouped items, quantities, payment method and server-returned subtotal/fees/total. The page has no quantity update, remove, checkout, prescription or address mutation in this source.

## Mobile comparison

Mobile pharmacy uses `/medicines` with rich filters, cache, barcode and prescription actions, local cart add/quantity behavior, and order-history navigation (`semantic-evidence-mobile-pharmacy.md`). Mobile therefore presents a materially wider commerce surface than Web, but its add/cart boundary is local and requires server revalidation. The two surfaces also use different route/API conventions (`/medicines` versus Web public catalog helper and `/cart` read), and the Web catalog is intentionally noindex.

## Confirmed cross-layer gaps

1. Web has no visible pharmacy commerce continuation despite Mobile CTAs for prescription, cart and orders.
2. Web cart is read-only despite displaying payment method and totals.
3. Mobile cached/local cart behavior needs account isolation, freshness and server-price/stock proof.
4. Prescription upload and prescription-required product policy are not parity-mapped.
5. SEO/indexing policy is intentionally disabled for Web catalogue and must be reconciled with the launch/legal decision.

No Phase 0 remediation was made.
