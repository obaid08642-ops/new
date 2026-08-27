# Provider Surface Completeness Matrix — Governance Review Evidence

**Review scope:** `remediation/provider-production-governed`, source tree under `.work/`, no merge/deploy authorization implied.

**Release rule:** only the governed Pharmacy journey is in remediation scope. A surface is not production-ready merely because a screen or route exists. Any surface without reviewed ownership, authorization, server-authoritative clinical/financial data, durable side-effects, privacy controls, and integration evidence remains explicitly unavailable.

| Surface | Source-level evidence | Governance result | Required UI/backend state |
|---|---|---|---|
| Pharmacy | `.work/provider/src/screens/pharmacy/PharmacyDashboard.tsx`; `.work/backend/src/modules/pharmacy/services/pharmacy-broadcast.service.ts`; `pharmacy-offer.service.ts`; `pharmacy-allocation.service.ts`; `pharmacy-payment-evidence.service.ts`; `pharmacy.controllers.ts` | Remediation scope is materially governed: server-composed offers, selected-pharmacy insurance decision, verified payment evidence, allocation/payment gates, idempotency, and minimized broadcast DTOs. Delivery settlement and live gateway integration remain unapproved. | Pharmacy dashboard may remain available only for reviewed flows. Delivery/COD settlement and earning paths stay unavailable. |
| Shared Provider Home | `.work/provider/src/screens/shared/ProviderHome.tsx:5-19` | Explicitly fail-closed; no clinical/chat/call/order mutation is exposed. | Render unavailable message; no fallback CTA. |
| Doctor / consultation | `.work/provider/App.tsx:54-60`; `.work/provider/src/screens/doctor/*`; `.work/backend/src/modules/doctor/*` | Existing code is not evidence of a complete production contract for slot/capacity, payment/insurance, EHR/video audit, and ownership. | Logged-in non-pharmacy users are routed to `ProviderHome`; backend remains outside this branch’s go-live scope and must not be represented as enabled. |
| Lab | `.work/provider/src/screens/lab/*`; `.work/backend/src/modules/labs/controllers/labs-engine.controller.ts`; `.work/backend/src/modules/labs/labs.controller.ts` | Legacy and canonical routes require a separate contract reconciliation for chain of custody, private reports, consent, payment, ownership, and role enforcement. | Routed to unavailable UI; no provider mutation is enabled by this remediation. |
| Radiology | `.work/provider/src/screens/radiology/*` | UI/catalog/report presence does not prove approval, coverage, consent, private storage, or server-authoritative pricing. | Routed to unavailable UI; no go-live claim. |
| Facility / hospital | `.work/provider/src/screens/facility/*` | Facility lifecycle and staff authority are not part of the reviewed Pharmacy release contract. | Routed to unavailable UI for logged-in non-pharmacy providers. |
| Nursing / home care | `.work/provider/src/screens/nursing/*` | Visit/location/signature/payment authority and field-operation integration are not proven for this release. | Routed to unavailable UI; no field mutation path enabled. |
| Ambulance / emergency | `.work/provider/src/screens/ambulance/*` | Dispatch, mission ownership, location authority, and operational audit are not proven. | Routed to unavailable UI; no mission mutation path enabled. |
| Onboarding / facility availability | `.work/provider/App.tsx:77-90`; provider registration screens | Registration screens are onboarding surfaces, not proof of approved operational capability. No synthetic commercial/location defaults may be used. | Pending/unavailable until approved server status and sector contract exist. |
| Payout / earnings | `.work/backend/src/modules/pharmacy/services/pharmacy-allocation.service.ts`; provider wallet consumers | No delivery completion or generic status may create earnings. Reconciliation, settled ledger, and bank lifecycle remain incomplete. | Earnings and withdrawal paths remain unavailable unless an independently reviewed ledger contract is present. |

## Evidence gates completed in this branch

The branch contains source changes that hard-disable the shared ProviderHome mutation bypass, close legacy Pharmacy mutation routes with `canonical_flow_required`, scope insurance decisions to the selected pharmacy, require verified `pharmacy_payment_evidence` for fulfillment, minimize broadcast PII, compose offers from server inventory/catalog data, and surface critical event/outbox failures instead of swallowing them with `.catch(() => null)`.

The Provider App now routes every logged-in provider type other than `pharmacy`/`pharmacist` to the explicit unavailable `ProviderHome` state (`.work/provider/App.tsx:54-60`). This is a UI gate, not a claim that the underlying Doctor/Lab/etc. code is production-ready.

## Remaining independent-review requirements

An independent reviewer must inspect the complete diff, verify all legacy route registrations in the deployed build, run the isolated integration harness against approved provider identities and owned resources, validate payment webhook signatures and replay handling with the real gateway contract, and separately approve any non-Pharmacy surface before enabling it. No merge or deployment is authorized by this matrix.
