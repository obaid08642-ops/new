# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_MOOD_JOURNAL_CONTRACT_GAP_20260819.md`
- **Member SHA-256:** `a116890b985ddb059beb33fff2c7be74add0786af3908b0dfdd24d46c3d256ff`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Patient mood journal uses real guarded Backend routes: `GET /mental-health/mood?days=7` and `POST /mental-health/mood`. Backend scopes all stored and retrieved entries by `patient_id`, so the route and ownership model are present. This `
- `13: | Save button has no request loading/idempotency guard | Backend `logMood` creates a new document per call | Double-tap or retry can create duplicate daily entries | **FIX — disable while pending and add an idempotency/day-entry policy if p`
- `14: | On history fetch failure, replaces results with empty list | Backend history is patient-scoped and may fail transiently | An honest empty state can mask a load failure | **FIX — distinguish error from genuinely empty history and provide r`
- `18: The route is protected by `JwtAuthGuard` at controller level. Backend history queries by `patient_id` and timestamps, avoiding cross-patient history reads through this interface. Client moods map to Backend enum values (`great`, `good`, `ok`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The Patient mood journal uses real guarded Backend routes: `GET /mental-health/mood?days=7` and `POST /mental-health/mood`. Backend scopes all stored and retrieved entries by `patient_id`, so the route and ownership model are present. This `
### state_transitions
- `13: | Save button has no request loading/idempotency guard | Backend `logMood` creates a new document per call | Double-tap or retry can create duplicate daily entries | **FIX — disable while pending and add an idempotency/day-entry policy if p`
- `14: | On history fetch failure, replaces results with empty list | Backend history is patient-scoped and may fail transiently | An honest empty state can mask a load failure | **FIX — distinguish error from genuinely empty history and provide r`
### payment_insurance_relevance
- `10: | Sends `activities` in POST body | `MoodEntry` schema contains mood, energy, stress, sleep, notes, tags, logged_at; no `activities` field | Activities are silently discarded, but the UI invites the patient to enter them | **FIX — add a rev`
### error_empty_loading_retry_cancel
- `13: | Save button has no request loading/idempotency guard | Backend `logMood` creates a new document per call | Double-tap or retry can create duplicate daily entries | **FIX — disable while pending and add an idempotency/day-entry policy if p`
- `14: | On history fetch failure, replaces results with empty list | Backend history is patient-scoped and may fail transiently | An honest empty state can mask a load failure | **FIX — distinguish error from genuinely empty history and provide r`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
