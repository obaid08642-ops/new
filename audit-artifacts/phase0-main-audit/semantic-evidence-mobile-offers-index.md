# Semantic evidence — Mobile Offers Index

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/offers/index.tsx:20–32` calls `GET /home/offers`, accepts either an array or `res.data`, and has visible loading/error/empty/retry states. However, the response is untyped and there is no pagination, cursor, refresh, stale timestamp, deduplication or cache policy. The screen does not establish whether guest/auth access, offer eligibility, regional availability or server publication/expiry rules are enforced.

Offer cards read abbreviated fields `o.id`, `o.t`, `o.prov`, `o.disc`, `o.price`, `o.old`, `o.rating`, and `o.sponsored` directly (`:56–83`). No schema validation, currency assertion, price/discount arithmetic verification, start/end/expiry display, inventory/availability, terms, provider identity, or sponsored disclosure contract is visible. Missing IDs use list index keys and cannot navigate; missing values render undefined-looking content rather than a domain empty/error state. `rating` is displayed without review-count/source/freshness.

The card navigates to `/offers/{id}` only if an ID exists (`:58–60`), with no identifier validation or not-found/expired handling proven here. The list has no category/filter/search, saved offer, share, redeem, purchase/booking CTA, or linkage to a complete service journey. No Phase 0 remediation was made.
