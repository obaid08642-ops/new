# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE11_SANDBOX_ACCEPTANCE_BOUNDARY_20260819.md`
- **Member SHA-256:** `4bba2b65cdd7b7421cd46b58d2bf6d8d7aa1b7ac37771cf34647c03b84872b7a`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: The following remain out of scope unless the owner separately authorizes a bounded test: production deployment; payment capture/refund/Moyasar mutation; SOS dispatch; QR or consent activation; real user data access; catalog/governance mutat`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: Acceptance work may use only the supplied sandbox identities and the production API endpoint. It begins with read-only health/session/owned-record checks and negative authorization cases. Every request must be attributable to a sandbox iden`
- `9: The following remain out of scope unless the owner separately authorizes a bounded test: production deployment; payment capture/refund/Moyasar mutation; SOS dispatch; QR or consent activation; real user data access; catalog/governance mutat`
- `16: | 2 | Negative authorization: patient2 against patient1-owned known sandbox resources, and role boundary checks. | `403`/`404` or equivalent fail-closed result. |`
- `21: Moyasar, emergency/QR/consent/location, unapproved administrative operations and high-risk dependency migrations remain blocked. Passing a sandbox check is evidence for that exact contract only; it is never blanket production-release approv`
### state_transitions
- `5: Acceptance work may use only the supplied sandbox identities and the production API endpoint. It begins with read-only health/session/owned-record checks and negative authorization cases. Every request must be attributable to a sandbox iden`
- `9: The following remain out of scope unless the owner separately authorizes a bounded test: production deployment; payment capture/refund/Moyasar mutation; SOS dispatch; QR or consent activation; real user data access; catalog/governance mutat`
- `17: | 3 | Only reversible sandbox workflow actions already authorized in the execution plan. | Server confirmation, before/after state, cleanup/reversal evidence. |`
- `21: Moyasar, emergency/QR/consent/location, unapproved administrative operations and high-risk dependency migrations remain blocked. Passing a sandbox check is evidence for that exact contract only; it is never blanket production-release approv`
### payment_insurance_relevance
- `9: The following remain out of scope unless the owner separately authorizes a bounded test: production deployment; payment capture/refund/Moyasar mutation; SOS dispatch; QR or consent activation; real user data access; catalog/governance mutat`
- `21: Moyasar, emergency/QR/consent/location, unapproved administrative operations and high-risk dependency migrations remain blocked. Passing a sandbox check is evidence for that exact contract only; it is never blanket production-release approv`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
