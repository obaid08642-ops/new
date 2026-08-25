# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE11_PRESCRIPTIONS_AUTHORIZATION_REMEDIATION_20260819.md`
- **Member SHA-256:** `18d2829e22edf0bbad6565f43d9cfa38bc1ef1f95bb7c617dc669b03b2f85273`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 11 — prescription detail authorization remediation`
- `5: The current Backend archive contained a structural authorization gap in `GET /prescriptions/:id`: the controller supplied only the opaque prescription identifier and the service performed a bare identifier lookup. The live cross-account pro`
- `9: The endpoint now passes the authenticated user to `getByIdForUser`. The service permits the record only when the caller is the stored patient, stored doctor, stored pharmacy, or has an effective `admin`/`super_admin` role. Every other calle`
- `13: | Patient owner may read | **PASS — regression covered** |`
- `16: | Administrator may read | **PASS — regression covered** |`
- `22: The focused authorization suite passed **6/6**. The complete Backend gate passed **65 suites / 370 tests**, followed by a successful `nest build`. The rebuilt `nabdah-backend.zip` passed ZIP integrity validation, contains the new regression`
- `30: This evidence establishes the source/archive remedy only. It is **not deployed** and is not a production acceptance result. A reviewer/owner-controlled deployment, rollback point, and an authenticated cross-account sandbox proof using an ac`
### state_transitions
- `5: The current Backend archive contained a structural authorization gap in `GET /prescriptions/:id`: the controller supplied only the opaque prescription identifier and the service performed a bare identifier lookup. The live cross-account pro`
- `11: | Control | Status |`
- `22: The focused authorization suite passed **6/6**. The complete Backend gate passed **65 suites / 370 tests**, followed by a successful `nest build`. The rebuilt `nabdah-backend.zip` passed ZIP integrity validation, contains the new regression`
### payment_insurance_relevance
- `22: The focused authorization suite passed **6/6**. The complete Backend gate passed **65 suites / 370 tests**, followed by a successful `nest build`. The rebuilt `nabdah-backend.zip` passed ZIP integrity validation, contains the new regression`
### error_empty_loading_retry_cancel
- `5: The current Backend archive contained a structural authorization gap in `GET /prescriptions/:id`: the controller supplied only the opaque prescription identifier and the service performed a bare identifier lookup. The live cross-account pro`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
