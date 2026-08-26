# Patient Mobile: Diagnostics core booking, insurance and results — manual semantic review

## Reviewed sources

| Source | Scope |
|---|---|
| `app/(tabs)/diagnostics.tsx` | lab/radiology discovery, cart entry, provider selection and route handoffs |
| `app/diagnostics/cart.tsx` | lab basket and compatible-provider selection |
| `app/diagnostics/checkout.tsx` | redirect stub |
| `app/diagnostics/booking-confirm.tsx` | redirect stub |
| `app/diagnostics/insurance-upload.tsx` | prescription/insurance intake and initial request |
| `app/diagnostics/insurance-approval.tsx` | poll, partial/reject/cash opt-in and co-pay display |
| `app/diagnostics/order/[id].tsx` | booking state, cancellation, reports and images |

## Evidence-backed findings

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| PM-DX-001 | `(tabs)/diagnostics.tsx:55–84, 107–199` | the hub fetches catalogs but its search query and active filter are never applied to catalog data; home/clinic is a local toggle and insurance entry makes a blanket claim that one upload discovers coverage | server-supported search/filter/eligibility with address/service-mode capability and precise patient copy |
| PM-DX-002 | `(tabs)/diagnostics.tsx:246–275, 302–333` | lab tests are inserted into local cart with client `price`, parsed inconsistently from strings; no service/provider/slot quote is locked | cart carries service references only; server creates a provider/slot-aware quote and payment/insurance decision |
| PM-DX-003 | `(tabs)/diagnostics.tsx:354–381` | radiology booking passes `total`, `radiologyType`, `serviceId`, and home/clinic in route params to `checkout`, but `checkout.tsx:1–6` redirects back to the hub | implement real radiology booking request: service + provider + eligible location + slot → cash intent or insurance request; remove dead handoff |
| PM-DX-004 | `diagnostics/cart.tsx:26–42, 126–197` | compatible providers are fetched, but every provider displays `baseTotal` calculated from client cart prices despite text saying final price must be confirmed; no slot/address/insurance eligibility is selected before the handoff to a redirect | server quote per provider/version, slot and service-mode eligibility before payment or insurance submission |
| PM-DX-005 | `diagnostics/insurance-upload.tsx:84–143, 228–247, 313–375` | raw image URI is stored as prescription state; OCR line strings are not patient-selectable/linked to catalog service IDs; “labs accepting insurance” are merely general nearby provider records; client posts `items`, `providerId`, `status` and `totalAmount:0` to generic `/orders/create` | scoped PHI upload/document ID, typed insurance request DTO, server verifies payer/network/provider/service eligibility and owns request state/price |
| PM-DX-006 | `diagnostics/insurance-approval.tsx:30–65, 102–114, 154–269` | approval polling lacks initial fetch/error/expiry; Arabic display statuses determine financial behavior; item cash additions and home fee 50 are calculated client-side; next step is `checkout`, which is a redirect stub | server co-pay/partial/full/reject decision object, explicit patient consent, payment intent for authoritative share, then confirmed booking; notification/event instead of fragile poll-only UI |
| PM-DX-007 | `diagnostics/order/[id].tsx:28–52, 109–132, 262–278` | generic order screen probes radiology then lab and locally normalizes state into a reduced tracker; cancellation is `POST` without idempotency/reason/refund state; missing/unknown state appears as 0% generic status | type-safe unified booking read model or exact contracts, authoritative timeline, idempotent cancellation and explicit refund/insurance/COD outcomes |
| PM-DX-008 | `diagnostics/order/[id].tsx:199–242` | PDF uses a protected report ID route, but radiology DICOM/images still call `Linking.openURL` with booking payload URLs | image/report viewer must use owned report/study ID, short-lived signed viewer URL, role/ownership checks, audit/access expiry; never raw URL from booking payload |
| PM-DX-009 | `diagnostics/booking-confirm.tsx:1–6`, `diagnostics/checkout.tsx:1–6` | two primary booking paths have been replaced by redirects rather than an implemented workflow | retain as explicitly deprecated deep-link handlers only after migrating routes to the real transactional flow; otherwise they are missing capability |

## Conclusion

The Mobile diagnostics hub contains live catalog reads but the transaction chain is not viable: services are locally priced, provider selection does not create a quote or slot, radiology handoffs terminate at redirects, and the insurance branch posts a client-built generic order then returns to a redirect rather than payment/confirmation. These defects must be solved as one Backend/Data-owned diagnostics state machine shared with Provider and Web.
