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

## Final Web surface inventory checkpoint

The Patient Web route inventory at baseline includes appointments, articles, cart/checkout/prescription, chat, consultations/doctors/specialties, diagnostics/labs/packages/radiology, family, health/reports/vitals/chronic/sleep/trends/score, home-care/services, insurance, medicines/catalog, mental-health, notifications/settings, orders/tracking, prescriptions, profile, reminders, settings and wishlist. It also includes BFF routes for auth/OTP/session, appointment booking/payment/cancel/reschedule/call-token and patient catch-all. The complete file inventory is preserved by the Phase 0 source checkout and the scan artifact `web-cta-parity-scan-2026-08-24.txt`.

The sweep confirms the principal Web↔Mobile gap is not only visual parity: Web generally exposes SSR/read-only pages and narrowly allowlisted mutations, while Mobile exposes broader local/cart, wallet, support, social, settings and program actions. Therefore a matching-looking page is not sufficient; each Mobile action needs an explicit Web contract decision, or Web must state that the capability is intentionally unavailable. Existing Web tests exercise SSR security and route boundaries, but they do not prove parity for every Mobile CTA, state machine, locale, accessibility behavior or live transaction.

The scan artifact is an audit input, not a remediation. No Web route or component was changed in Phase 0.
