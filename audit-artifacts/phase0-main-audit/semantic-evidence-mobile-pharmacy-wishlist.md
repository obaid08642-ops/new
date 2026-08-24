# Semantic evidence — Mobile Pharmacy Wishlist

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/wishlist.tsx:34–41` reads `/users/me/wishlist`, but any failure leaves the initial empty list with no error, retry or unauthorized distinction. The empty state therefore conflates genuinely empty wishlist with unavailable/forbidden service. Response items are untyped under `@ts-nocheck`.

Removal is optimistically local then posts `POST /users/me/wishlist/{id}` (`:43–51`). The route method/name needs live contract verification; no visible Idempotency-Key, ownership/404 semantics, version conflict or duplicate replay handling is present. A failure restores the previous array, but concurrent actions can make this rollback stale. There is no loading state per removal or confirmation for a potentially destructive action; the remove icon is `info` rather than a semantic delete icon (`:113–118`).

Add-to-cart copies wishlist ID/name/price/rx/image into local cart (`:53–68`) without server stock/price/prescription validation, quote, idempotency or user-visible failure; price defaults to zero (`:58–60`). The in-stock button is disabled using a client field that may be stale. Product navigation passes ID/name without validation (`:161–167`), and the product visual renders `item.emoji` (`:169–178`), conflicting with the no-emoji requirement and lacking image fallback/provenance. No pagination, refresh control, stale-price warning, out-of-stock alternative, or cart confirmation state exists. No Phase 0 remediation was made.
