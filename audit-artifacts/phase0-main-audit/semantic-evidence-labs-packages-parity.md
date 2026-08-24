# Semantic evidence — Labs packages parity

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Mobile

`audit-work/source/nabd_plus_patient_app/app/diagnostics/packages.tsx:19–167` calls `GET /labs/packages` and `GET /labs/categories`, renders category chips, a search input, package price/labs, and routes to `/diagnostics/package-detail?id={id}`. The search input is not bound to state or request filtering (`:61–69`); category filtering is client-side by display category (`:41–44`). The catch handler only stops loading (`:35–38`), so error and empty states are not distinguished and no explicit empty message is rendered. The screen is `@ts-nocheck` and includes hard-coded fallback copy `باقة تحاليل شاملة` and `كل المختبرات المعتمدة` when fields are absent (`:129`, `:153`), requiring truthfulness review.

## Web

`audit-work/source/nabd-patient-web/app/[locale]/diagnostics/labs/page.tsx:10–26` calls the server-backed `getPublicLabServices` with `q` and `homeOnly`, supports localized unavailable/empty/no-match states, and renders service facts including price, sample type, fasting, home/facility support and unavailable flag. The source renders cards as `<article>` without a detail/booking link, so it is catalog-only in this surface.

## Confirmed cross-layer gaps

1. Mobile packages and Web services use different API concepts and response shapes; canonical contract mapping is unresolved.
2. Mobile search is visual-only and does not change the data request/filter.
3. Mobile has no explicit empty state and conflates API failure with empty content.
4. Mobile fallback copy can imply unsupported availability; Web uses explicit server fields.
5. Web has no detail/booking continuation in this page, while Mobile routes to package detail.
6. Price and service availability authority must be established server-side before a purchase/booking journey is enabled.

No Phase 0 remediation was made.
