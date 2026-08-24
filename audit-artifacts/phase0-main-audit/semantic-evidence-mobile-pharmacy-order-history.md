# Semantic evidence — Mobile Pharmacy Order History

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/order-history.tsx:24–31` explicitly states that guests can view order history through a device-bound guest account, but this policy is only a comment in the screen and is not proven through auth/ownership contract evidence. The imported `useGuestGuard` is not used.

The screen calls `/orders/mine` and converts any failure into `orders=[]` (`:48–87`). Thus unauthorized, forbidden, unavailable and empty are rendered identically; there is no visible error/retry state apart from pull-to-refresh. The status configuration recognizes only DELIVERED, CANCELLED and PENDING; every other backend state falls back to PENDING (`:39–46,192–194`).

The reorder action exists only for DELIVERED orders and copies locally mapped item IDs, names, prices and quantities into the local cart, setting `rx:false`, then navigates to `/pharmacy/cart` (`:98–109,261–269`). It does not revalidate stock, server price, prescription requirement, product identity, availability, or duplicate/replay semantics, and it can erase prescription sensitivity by forcing `rx:false`.

Each order card navigates to `/pharmacy/order-tracking` with the mapped order ID (`:195–201`), but the source does not validate a non-empty ID or prove owner/stranger 404 behavior. Displayed totals and item prices are mapped from the response with `o.total || o.subtotal || 0` and `i.price || 0`, so zero/absent values are conflated and no currency/server freshness semantics are shown (`:55–76,280–291`). No Phase 0 remediation was made.
