# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_B_REALTIME_ROOM_AUTHORIZATION_20260819.md`
- **Member SHA-256:** `c8a11696cdf5b570e201e1a1fd9c083ef4984a9630cd0d35b99353be4b0b2628`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | `waiting_room:join` | The socket entered `appointment:<id>` before lookup; any authenticated user could enqueue a guessed appointment. | Lookup now occurs first. Entry requires authenticated identity, canonical appointment participant (`p`
- `14: | Terminal appointment | A completed/cancelled visit could enter waiting-room infrastructure. | Join now rejects non-open state with `appointment_not_open`. |`
- `25: | Branch upload | **PASS** — source commit `6d07583` (`fix: authorize realtime room subscriptions`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `5: This batch addresses the confirmed Phase 5 P0 risk that an authenticated socket could subscribe to arbitrary Socket.IO room names and could enter or alter another appointment’s waiting-room queue without proving a participant relationship.`
- `11: | `join_channel` / `leave_channel` | Caller-controlled arbitrary room name was passed directly to Socket.IO. | Both handlers now reject with `unsupported_channel` and do not join/leave a caller-named room. Supported room types remain purpos`
- `12: | `waiting_room:join` | The socket entered `appointment:<id>` before lookup; any authenticated user could enqueue a guessed appointment. | Lookup now occurs first. Entry requires authenticated identity, canonical appointment participant (`p`
- `29: This batch does not claim that all presence, call signaling, offline queues, thread authorization, user/role broadcast rooms or distributed Socket.IO delivery are complete. Thread handlers already invoke chat membership lookup, but Phase 9 `
### auth_ownership
- `1: # Phase 8 — Batch B: Realtime room authorization remediation`
- `20: | Focused realtime Jest regression | **PASS** — `realtime.gateway.authorization.spec.ts`: 1 suite, 4 tests. It rejects arbitrary room request, rejects foreign join/leave without room or queue mutation, permits an authorized participant, and`
- `21: | Combined Phase 8 regressions | **PASS** — 2 suites, 8 tests across public-care DTO/status/search and Realtime room authorization. |`
- `29: This batch does not claim that all presence, call signaling, offline queues, thread authorization, user/role broadcast rooms or distributed Socket.IO delivery are complete. Thread handlers already invoke chat membership lookup, but Phase 9 `
### state_transitions
- `5: This batch addresses the confirmed Phase 5 P0 risk that an authenticated socket could subscribe to arbitrary Socket.IO room names and could enter or alter another appointment’s waiting-room queue without proving a participant relationship.`
- `12: | `waiting_room:join` | The socket entered `appointment:<id>` before lookup; any authenticated user could enqueue a guessed appointment. | Lookup now occurs first. Entry requires authenticated identity, canonical appointment participant (`p`
- `14: | Terminal appointment | A completed/cancelled visit could enter waiting-room infrastructure. | Join now rejects non-open state with `appointment_not_open`. |`
- `20: | Focused realtime Jest regression | **PASS** — `realtime.gateway.authorization.spec.ts`: 1 suite, 4 tests. It rejects arbitrary room request, rejects foreign join/leave without room or queue mutation, permits an authorized participant, and`
- `21: | Combined Phase 8 regressions | **PASS** — 2 suites, 8 tests across public-care DTO/status/search and Realtime room authorization. |`
### payment_insurance_relevance
- `23: | Archive integrity | **PASS** — `nabdah-backend.zip` validates with `unzip -tq`; `node_modules`, `dist`, and `coverage` are excluded. |`
### error_empty_loading_retry_cancel
- `14: | Terminal appointment | A completed/cancelled visit could enter waiting-room infrastructure. | Join now rejects non-open state with `appointment_not_open`. |`
- `29: This batch does not claim that all presence, call signaling, offline queues, thread authorization, user/role broadcast rooms or distributed Socket.IO delivery are complete. Thread handlers already invoke chat membership lookup, but Phase 9 `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
