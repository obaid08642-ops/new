# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AC_FACILITY_STAFF_ASSIGNMENT_INTEGRITY_20260819.md`
- **Member SHA-256:** `7b94c52062662f74ad6a84c661d0e00c06b17fbf9c6207b183a2848da25d92d0`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Backend route `POST /provider/requests/:id/assign-staff` accepted any client-provided `staff_id` after only checking request ownership. It did not verify that the person belonged to the facility, was active, or represented an authorized`
- `15: | Provider app surface | No Provider UI currently calls the direct assignment route; therefore no free-text UI consumer is retained. Any future UI must consume a roster endpoint and submit an operator ID—not a typed name—before this endpoin`
- `26: | Branch upload | **PASS** — source commit `6004620` (`fix: validate facility staff assignments`) is on `manus/on-live-reconciliation`. |`
- `30: No facility operator, provider request, roster membership, or production data was altered. A roster list UX is intentionally not fabricated because no current Provider app route consumes this assignment surface. Phase 9 must add an explicit`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The Backend route `POST /provider/requests/:id/assign-staff` accepted any client-provided `staff_id` after only checking request ownership. It did not verify that the person belonged to the facility, was active, or represented an authorized`
- `30: No facility operator, provider request, roster membership, or production data was altered. A roster list UX is intentionally not fabricated because no current Provider app route consumes this assignment surface. Phase 9 must add an explicit`
### state_transitions
- `11: | Roster authority | Assignment now resolves `staff_id` exclusively from the existing `ProviderOperator` directory with exact `provider_account_id` matching the request facility and `status: active`. |`
- `12: | Fail-closed behavior | A missing staff ID, foreign facility staff ID, disabled/invited/revoked operator, or non-existent operator is rejected with `staff_not_in_active_facility_roster`; the request remains unchanged. |`
- `14: | Audit evidence | Every successful assignment writes a `request.staff_assigned` audit record including the prior staff identity and the immutable roster identity used for the new assignment. |`
- `30: No facility operator, provider request, roster membership, or production data was altered. A roster list UX is intentionally not fabricated because no current Provider app route consumes this assignment surface. Phase 9 must add an explicit`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
