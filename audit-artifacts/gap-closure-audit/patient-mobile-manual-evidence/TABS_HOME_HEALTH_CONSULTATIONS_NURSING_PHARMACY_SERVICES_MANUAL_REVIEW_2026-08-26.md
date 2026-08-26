# Patient Mobile: Tab launchers — home, health, consultations, nursing, pharmacy and services — manual review

## Scope boundary

This read-only source review covers the five remaining top-level tab routes. It does not validate any service contract end-to-end, inventory/slot authority, insurance eligibility, price quote/expiry, prescription adjudication, PHI owner access, payment/settlement, video-call authorization or backend runtime behavior.

| Reviewed source | Scope |
|---|---|
| `app/(tabs)/index.tsx` | Daily health overview and service quick links |
| `app/(tabs)/health.tsx` | Health hub, vitals/score display and PHI shortcuts |
| `app/(tabs)/consultations/index.tsx` | Doctor discovery, filters and insurance catalog selector |
| `app/(tabs)/nursing.tsx` | Home-care service/package discovery and cash/insurance UI selection |
| `app/(tabs)/pharmacy.tsx` | Medicine catalog, cache, cart, Rx messaging and manual-order handoff |
| `app/(tabs)/services.tsx` | Static cross-service launcher |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-TAB-001 | `STATIC_MATCHED_PARTIAL` | `(tabs)/index.tsx:37–59, 61–110`; `(tabs)/health.tsx:99–127, 206–375` | Daily/health hubs aggregate several health, maternity, mood, vital and appointment responses and route to related screens. They use partial `Promise.allSettled` results and client display derivations. Static source cannot prove PHI ownership, source freshness, clinical score semantics, appointment/video authorization or correct aggregation under mixed failures. | Owner-scoped aggregation contracts, source timestamps/provenance, clinical-score governance and runtime partial-failure/authorization testing. |
| PM-TAB-002 | `CONFIRMED_DEFECT` | `(tabs)/health.tsx:112–123, 338–350` | Health hub identifies a water vital by Arabic display label and mutates it client-side; it also falls back to appointment ID `"1"` when routing to waiting room. Both are non-authoritative state/identity behavior in PHI/video journeys. | Typed vital identifiers, authoritative nutrition/vital projection, required appointment ID and call-token/session authorization tests. |
| PM-TAB-003 | `CONFIRMED_DEFECT` | `(tabs)/consultations/index.tsx:31–37, 63–119, 132–195, 293–364, 566–619` | Consultation tab reads provider/specialty/offer/insurance data but filters price, availability, network and payment client-side. Booking CTA uses generic doctor detail and only passes ID. The insurance modal chooses company/network UI state without policy verification or service/slot eligibility. | Server-authoritative search/filter/price/availability/insurance eligibility; provider/service/slot/quote context and Cash/Insurance booking state-machine tests. |
| PM-TAB-004 | `CONFIRMED_DEFECT` | `(tabs)/nursing.tsx:32–53, 90–103, 129–146, 182–215, 219–262` | Nursing payment mode and gender/availability/nationality filters are client-only state passed through route parameters; list itself is never filtered by them. Service price is displayed catalog data with no authoritative quote/insurance decision. | Server-enforced provider/service/slot availability, service/insurance eligibility and quote contract; owner/payment/decision reconciliation tests. |
| PM-TAB-005 | `CONFIRMED_DEFECT` | `(tabs)/pharmacy.tsx:107–142, 152–174, 176–214, 350–380, 424–504` | Pharmacy keeps offline-cached catalog data without freshness/expiry indicator, filters/sorts fallback client-side, allows add-to-cart for Rx products after a toast/alert only, and offers a manual order when no results. This cannot satisfy prescription validation, inventory/price authority, cart→broadcast→offers→selection or payment/insurance rules. | Explicit stale-cache UI/policy, server quote/stock/Rx validation, patient cart→geo broadcast→pharmacy offers→selection and payment/insurance/COD state-machine tests. |
| PM-TAB-006 | `MISSING_CAPABILITY` | `(tabs)/services.tsx:20–95, 113–190` | Services tab is a static launcher with hard-coded titles/descriptions/routes. It has no catalog, capability, availability or operational state of its own. | Convert to authoritative discoverability model or consistently label as navigation-only; validate each downstream journey separately. |

## Conclusion

All six listed tab inventory routes have completed source review. They are entry/aggregation surfaces and do not prove service readiness. Confirmed defects include local medical/appointment identity derivation, client-side consultation/nursing decision state, and pharmacy Rx/cache/order gaps.
