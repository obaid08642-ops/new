# Semantic evidence — Mobile Pharmacy Rx Order

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/rx-order.tsx:22–30` reads `/cart/prescription` and maps `medications` into local state; errors become an empty medication list with no retry or distinction between absent prescription, unauthorized access and service failure. The screen displays a server message that pharmacy, availability, address, final price and insurance are reviewed later (`:74–80`), but does not expose prescription status, expiry, issuer/patient binding, consent or verification outcome.

`continueToCheckout` filters only for string ID/name (`:32–37`), then adds missing medication lines to the local cart using client-provided name, price, quantity and `requiresRx` (`:38–52`). It does not validate stock, price, dosage, prescription line binding, duplicate/replay behavior or ownership, and it assumes `addItem` is sufficient synchronization. It chooses a prescription reference from `prescription_id`, `id`, or `prescription_url` and stores it through local `setPrescriptionUrl` (`:54–55`), so a URL or arbitrary ID can be sent later as `prescription_id` without type/ownership validation.

The screen unconditionally sets local payment type to `insurance` and navigates to `/pharmacy/checkout` (`:54–57`) without an insurance eligibility/coverage/preauthorization contract or patient selection. No request creates or reserves a server order here; any server mutation is deferred to Checkout, where the cart is local. If adding one of several medication lines fails, the prior lines may already have been added before the generic catch, with no rollback or recovery. `@ts-nocheck` removes compile-time guarantees. No Phase 0 remediation was made.
