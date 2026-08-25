# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_BUILD_ENVIRONMENT_GATE_20260818.md`
- **Member SHA-256:** `f5b574babb18b9c91d2689e4d74fb9a49c0949306d24ab8d8bc4ca750fa510be`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: Status: **BLOCKED — environment capacity**, not a source pass/fail. No project or database data was deleted. The next action is to archive or remove only known temporary QA/cache artifacts, then install from each lockfile and run the packag`
- `11: A fresh isolated Patient copy was tested without touching the authoritative source. `npm ping` against `https://registry.npmjs.org/` passed. `npm ci` against the committed lockfile failed before installation because the lockfile is material`
- `17: After the isolated lock reconciliation and tarball-host normalization described above, the temporary Patient copy completed three real validation commands successfully: `npm run typecheck`, `npm test -- --runInBand`, and `npm run export:web`
- `19: The same temporary copy also completed `npx expo prebuild --no-install --platform android` successfully. Generated native folders remain temporary and were not copied to source. Expo emitted one non-fatal configuration warning: `userInterfa`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `11: A fresh isolated Patient copy was tested without touching the authoritative source. `npm ping` against `https://registry.npmjs.org/` passed. `npm ci` against the committed lockfile failed before installation because the lockfile is material`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
