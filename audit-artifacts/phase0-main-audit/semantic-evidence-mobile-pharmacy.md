# Semantic evidence — Mobile Pharmacy

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:40–214` fetches categories from `/medicines/categories` and medicine lists from `/medicines` with search/category/forms/brands/rx/min/max/sort query parameters. It caches the last server response in AsyncStorage and shows cached content on network failure (`:107–142`); this is not mock data, but freshness, invalidation, privacy and stale-price rules need verification. Client-side filtering and sorting are also applied (`:178–212`).

The screen routes to barcode scanner (`:234–240`), filters (`:254–268`), prescription scan (`:271–296`), order history (`:297–317`), and adds medicines to local cart with quantity and prescription flags (`:152–174`). The local add payload includes medicine price and display fields; cart authority and server revalidation must be proven before checkout. The source uses hard-coded category fallback labels/icons and fallback icon/color values (`:31–38`, `:69–84`, `:163–173`), which need localization/truthfulness review.

## Cross-layer verification required

1. Map `/medicines`, `/medicines/categories`, product detail, barcode, prescription upload, cart, checkout and order history to backend controllers and Web BFF routes.
2. Verify cached pharmacy data cannot expose PHI or stale actionable prices and is invalidated on logout/account switch.
3. Verify prescription-required products block checkout until a server-approved prescription exists.
4. Verify quantity, stock, price, delivery address, split-order and idempotency semantics server-side.
5. Compare Web pharmacy catalog/detail/cart/order surfaces and identify missing parity actions.

No Phase 0 remediation was made.
