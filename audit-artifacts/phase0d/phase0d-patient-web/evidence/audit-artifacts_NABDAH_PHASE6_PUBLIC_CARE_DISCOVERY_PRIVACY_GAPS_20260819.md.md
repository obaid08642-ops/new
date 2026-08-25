# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE6_PUBLIC_CARE_DISCOVERY_PRIVACY_GAPS_20260819.md`
- **Member SHA-256:** `823aaf8aacda8a2f09c6021b681d7a8b0e28ea9ef232fe3b05e643462817bba6`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Public provider detail/slot endpoints do not require active/publicly approved provider status | `doctorById` and `doctorSlots` find by ID/type only. A guessed ID for pending/suspended/non-public doctor may disclose profile and av`
- `15: | **P1** | Public discovery pagination total is not true total | `total` equals only returned page length, potentially misrepresenting result count/coverage. | Return a scoped server-calculated total/cursor and clear pagination metadata. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 6 Security/Ownership/Privacy — public care discovery gaps`
### state_transitions
- `3: ## Confirmed acceptable public scope`
- `5: Public specialty, degree and provider/facility discovery can be appropriate when limited to approved published information. Doctor list and global search filter provider status to `ACTIVE`.`
- `7: ## Confirmed defects`
- `11: | **P0** | Public provider detail/slot endpoints do not require active/publicly approved provider status | `doctorById` and `doctorSlots` find by ID/type only. A guessed ID for pending/suspended/non-public doctor may disclose profile and av`
- `13: | **P1** | Similar-doctor and facility detail queries can include inactive/unpublished records | Similar-doctor query lacks active status; `facilityById` lacks `is_active` filter though list filters active facilities. | Apply publication st`
- `14: | **P1** | Unescaped regex search accepts user-controlled patterns | Search/list filters create `RegExp(q.trim(), 'i')` directly, allowing expensive or malformed regex patterns. | Escape user input or use indexed/text search with length/rat`
- `16: | **P1** | Public location/schedule exposure lacks a declared precision and privacy policy | Exact profile coordinates can drive distance sort and public slots reveal availability, with no radius/precision/purpose/retention rule in contract`
- `20: Public care discovery is **P0 FIX/BLOCKED** for privacy and approval integrity until it consistently enforces published status and explicit minimum-data public DTOs.`
### payment_insurance_relevance
- `12: | **P0** | Public provider/facility methods return whole profile documents rather than minimum public DTOs | Detail, list, search and facility hydration largely use `_id/__v` exclusion only, so every schema field added later can become publ`
- `15: | **P1** | Public discovery pagination total is not true total | `total` equals only returned page length, potentially misrepresenting result count/coverage. | Return a scoped server-calculated total/cursor and clear pagination metadata. |`
### error_empty_loading_retry_cancel
- `11: | **P0** | Public provider detail/slot endpoints do not require active/publicly approved provider status | `doctorById` and `doctorSlots` find by ID/type only. A guessed ID for pending/suspended/non-public doctor may disclose profile and av`
- `14: | **P1** | Unescaped regex search accepts user-controlled patterns | Search/list filters create `RegExp(q.trim(), 'i')` directly, allowing expensive or malformed regex patterns. | Escape user input or use indexed/text search with length/rat`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
