# Semantic evidence — Mobile Addresses

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/profile/addresses.tsx:1–17` is marked `@ts-nocheck` and uses `apiFetch`. The screen reads `/users/me/addresses` and turns any failure into an empty address list (`:19–37`), without a distinct unavailable/error state or retry control.

Selecting an address calls `PATCH /users/me/addresses/{id}` with `{ is_default: true }` and performs an optimistic update with snapshot rollback plus localized alert on failure (`:39–54`). This is stronger than the silent patterns found elsewhere, but no visible idempotency key, typed DTO, identifier validation or owner/stranger behavior is shown in the screen.

The rendered cards expose label/street/city and default state; tapping the card sets the default (`:95–149`). The `إضافة عنوان جديد` button is rendered without an `onPress` handler (`:151–156`), so add-address flow is not implemented in this source. No edit/delete action, address validation/map/geocode, delivery eligibility, or booking/cart selection contract is present.

No Phase 0 remediation was made.
