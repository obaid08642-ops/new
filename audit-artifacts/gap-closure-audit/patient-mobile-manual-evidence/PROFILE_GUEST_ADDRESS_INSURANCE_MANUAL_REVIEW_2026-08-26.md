# Patient Mobile: Profile, guest access, address and insurance — manual review

## Scope boundary

This read-only source review covers all four Profile inventory routes. It does not establish guest/API authorization, session revocation, account deletion, address ownership/geographic serviceability, insurance verification/coverage, policy/member identity, or backend audit/logging.

| Reviewed source | Scope |
|---|---|
| `app/profile/index.tsx` | Profile hub, guest gating, loyalty badge and logout handoff |
| `app/profile/addresses.tsx` | Address list and default-address mutation |
| `app/profile/insurance.tsx` | Insurance card retrieval/add form |
| `app/profile/edit.tsx` | Redirect to Health profile edit |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-PRO-001 | `INSUFFICIENT_EVIDENCE` | `profile/index.tsx:15–35, 74–115` | Guest guard blocks only insurance and family. Guests can navigate to health, medications, prescriptions, reports, appointments, orders and wallet routes; source alone cannot prove their downstream authorization, but the client boundary is inconsistent with the high-sensitivity destinations. Logout only dispatches Redux then navigates; token revocation/storage clearing requires auth-store evidence. | Route/API authorization matrix and guest/owner/stranger tests; session/token revocation and secure-storage lifecycle evidence; PHI/financial guest policy. |
| PM-PRO-002 | `MISSING_CAPABILITY` | `profile/addresses.tsx:25–54, 95–157` | Address reader supports only default selection. “Add new address” renders without an action, and there is no edit/delete/validation/map/geofence/serviceability or address-ownership workflow in this source. | Full address CRUD/selection contract, ownership/default atomicity, geocoding/serviceability and error/runtime tests. |
| PM-PRO-003 | `CONFIRMED_DEFECT` | `profile/insurance.tsx:53–110, 151–309` | Policy form hard-codes `class: "A"` into every submission and announces a later review after any successful write without displaying server verification/status. It handles an insurance card as a profile record, not a service-specific eligibility/coverage/co-pay decision. | Insurance-policy class/benefit/verification model; server-authoritative status and eligibility-by-service/provider; owner/guest tests and reconciliation with booking/payment flows. |
| PM-PRO-004 | `MISSING_CAPABILITY` | `profile/edit.tsx:1–5` | Profile edit route is only a redirect, with no distinct Profile edit behavior or contract. | Canonical profile-edit ownership, sensitive-field validation and audit evidence in the target Health surface. |

## Conclusion

Profile navigation crosses PHI, order and financial boundaries without sufficient source evidence for the guest/session model. Address addition is visibly non-functional, and insurance capture contains a hard-coded class that cannot substantiate a coverage decision. Manual source review is complete only for the four inventory paths.
