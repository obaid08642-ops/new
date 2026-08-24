# Semantic evidence — Mobile Pharmacy Cart

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/cart.tsx:23–30,68–80,82–136` reads all lines and quantities from `CartContext`, with add/update/remove/clear operations local to the shared client state. There is no visible server cart read, account isolation, synchronization, ownership contract, stock/price freshness or Idempotency-Key. The empty state is honest for local state but does not establish whether a server cart exists or whether data survives account/device boundaries.

Prescription selection uses `expo-image-picker` and stores only the selected local URI through `setPrescriptionUrl` (`:31–61,138–191`). The UI then labels the prescription “uploaded” and permits checkout, but no upload request, file ID, type/size/content validation, PHI retention/consent, OCR/verification, prescription-to-line binding or pharmacist review contract is visible. Removing the URI is only local state. Permission denial has an alert but no persistent recovery or upload error lifecycle.

Quantity changes and removal use local `updateQty`/`removeItem` (`:120–135`), and clear-cart is local after an alert (`:91–93`). The displayed “estimated total” comes from local `subtotal` (`:207–212`) and does not prove server quote, fees, currency, discount, stock or prescription adjustments. The checkout CTA only checks the presence of a local prescription URI and routes to `/pharmacy/checkout` (`:63–66,213–225`); it does not create an order, reserve stock, bind address/delivery/payment/insurance, or establish an owner-scoped server cart/order context. The manual-order route is another unverified handoff (`:195–203`). No Phase 0 remediation was made.
