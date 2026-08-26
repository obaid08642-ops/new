# Patient Mobile: Map provider discovery, geolocation, insurance and booking handoff — manual review

## Scope boundary

This read-only source review covers the single Map inventory route. It does not validate geolocation permission behavior across platforms, provider directory completeness/ownership, geographic accuracy, hours/availability, insurance eligibility, prices, ETA, native directions, booking identity or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/map/index.tsx` | Map provider discovery, foreground location, local search, provider sheet, insurance display and booking handoff |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-MAP-001 | `CONFIRMED_DEFECT` | `map/index.tsx:165–208, 224–247, 356–382` | On location denial/failure, the route fetches providers without coordinates/radius but has an initial Riyadh map center. Providers without coordinates are silently excluded from markers. Code comment says “keep fallback,” although no defined fallback is present in the reviewed source. This creates ambiguous location/search coverage and no explicit empty/permission/error state. | Geolocation consent/denial/failure UX, default-area policy, actual provider-directory query semantics and no-result/partial-coordinate contract/tests. |
| PM-MAP-002 | `CONFIRMED_DEFECT` | `map/index.tsx:177–203, 260–296, 577–602` | ETA is client-derived as `distance × 4` when absent, and local search auto-centers to results without validating coordinates. The map thereby presents an arrival estimate with no transport/service source. | Authoritative distance/travel-time semantics and source/timezone/freshness; coordinate validation and routing/provider-directory runtime tests. |
| PM-MAP-003 | `STATIC_MATCHED_PARTIAL` | `map/index.tsx:210–222, 604–620` | Insurance accepts a simple provider-name inclusion test and routes mismatch to `/health/edit-profile`, not policy capture/eligibility. It cannot prove network membership, policy validity, service/provider/slot coverage, co-pay or authorization. | Service-specific insurance eligibility and co-pay decision contract; policy verification/status, provider network normalization and booking/payment reconciliation. |
| PM-MAP-004 | `CONFIRMED_DEFECT` | `map/index.tsx:633–660` | Booking handoff drops the selected provider for pharmacy, lab, hospital and nursing, and routes lab to a generic booking-confirmation screen. It only passes a doctor ID for doctor routes. This cannot preserve a provider-selected journey across service types. | Provider-bound catalog/service/slot/booking contracts for every provider type; tested CTA → selected provider/service → payment/insurance outcome chain. |

## Conclusion

The Map route has confirmed client ETA derivation and provider-selection loss across most booking handoffs. Its insurance indicator is discovery-only and cannot substantiate coverage. Manual source review is complete only for `app/map/index.tsx`.
