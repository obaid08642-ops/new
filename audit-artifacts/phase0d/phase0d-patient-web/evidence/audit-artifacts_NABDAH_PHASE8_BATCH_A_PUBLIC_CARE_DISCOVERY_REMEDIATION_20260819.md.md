# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_A_PUBLIC_CARE_DISCOVERY_REMEDIATION_20260819.md`
- **Member SHA-256:** `b45a68af37cf1c840b0d579cd6d10c550a75e4c430191144a03a363f1c8e2008`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: | Pagination truthfulness | Doctor list returns an exact total only where it is exact; distance/availability-derived result sets mark total as non-exact and expose `has_more` rather than reporting the page length as a total. |`
- `30: | Branch upload | **PASS** — source commit `7cd5c71` (`fix: secure public care discovery`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `20: The batch does not treat provider status as a substitute for legal content approval, does not publish an exact location, does not expose KYC/document URLs, does not change appointment/payment/insurance workflows, and does not activate conse`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: This batch remediates the confirmed Phase 6 finding that public care endpoints could return raw provider/facility data and did not consistently restrict public details and slots to active records. The change was made only in the Backend sou`
- `11: | Public doctor detail and slot | `doctorById` and `doctorSlots` now require `type=DOCTOR` and `status=ACTIVE`; unknown, pending, rejected and suspended records resolve as not found. |`
- `14: | Similar providers and facility members | Similar-doctor and facility-doctor lookups require active provider status and use the same public DTO. |`
- `20: The batch does not treat provider status as a substitute for legal content approval, does not publish an exact location, does not expose KYC/document URLs, does not change appointment/payment/insurance workflows, and does not activate conse`
- `34: Phase 9 must run the broader Backend suite and contract tests. Phase 11 must perform public/foreign negative HTTP checks against a non-production or approved sandbox deployment: pending/suspended provider detail and slots must return the sa`
### payment_insurance_relevance
- `5: This batch remediates the confirmed Phase 6 finding that public care endpoints could return raw provider/facility data and did not consistently restrict public details and slots to active records. The change was made only in the Backend sou`
- `12: | Public provider DTO | Doctor list, detail, similarity and search now flow through an explicit allowlist. It excludes internal user/account IDs, licensing/KYC files and verification history, bank details, exact address/coordinates, insuran`
- `13: | Public facility DTO | Facility list/detail require `is_active=true` and use a public allowlist; contact channels, exact address/coordinates and insurance contracts remain private. |`
- `16: | Pagination truthfulness | Doctor list returns an exact total only where it is exact; distance/availability-derived result sets mark total as non-exact and expose `has_more` rather than reporting the page length as a total. |`
- `20: The batch does not treat provider status as a substitute for legal content approval, does not publish an exact location, does not expose KYC/document URLs, does not change appointment/payment/insurance workflows, and does not activate conse`
- `28: | Archive integrity | **PASS** — rebuilt `nabdah-backend.zip` validates with `unzip -tq`; `node_modules`, `dist` and `coverage` were excluded. |`
### error_empty_loading_retry_cancel
- `11: | Public doctor detail and slot | `doctorById` and `doctorSlots` now require `type=DOCTOR` and `status=ACTIVE`; unknown, pending, rejected and suspended records resolve as not found. |`
- `34: Phase 9 must run the broader Backend suite and contract tests. Phase 11 must perform public/foreign negative HTTP checks against a non-production or approved sandbox deployment: pending/suspended provider detail and slots must return the sa`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
