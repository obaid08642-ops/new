# Semantic evidence — Mobile Pharmacy Manual Order

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/manual-order.tsx:20–33,95–109` captures only medicine name, free-form description and a local image URI via `expo-image-picker`; no upload, file ID, type/size/content validation, prescription consent, PHI retention or backend request is visible. The UI presents the photo as local preview, but does not establish that a pharmacist or server can access it.

`handleAddToCart` (`:35–48`) adds a synthetic local cart item with ID `manual_${Date.now()}`, `price: 0`, `rx: false`, quantity 1, and only the medicine name; `medDesc` and `photo` are discarded. It then routes to `/pharmacy/cart`. Thus the primary “manual order” action does not submit a request, preserve clinical evidence, obtain server quote/availability, bind the item to patient/order/address, or expose a request status. The zero price is explicitly a placeholder-like local value and can flow into checkout unless the server rejects it; the forced `rx:false` can erase prescription requirements.

The only validation is that medicine name length is greater than two (`:113–120`); no quantity field, dose structure, locale normalization, duplicate prevention, idempotency, error/retry state, or ownership/session boundary is present. The explanatory copy promises pharmacist search and pricing (`:67–72`) but no contract implements this in the screen. No Phase 0 remediation was made.
