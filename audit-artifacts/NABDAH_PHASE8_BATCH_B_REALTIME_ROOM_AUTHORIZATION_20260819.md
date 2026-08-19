# Phase 8 — Batch B: Realtime room authorization remediation

## Purpose

This batch addresses the confirmed Phase 5 P0 risk that an authenticated socket could subscribe to arbitrary Socket.IO room names and could enter or alter another appointment’s waiting-room queue without proving a participant relationship.

## Source change

| Surface | Previous risk | Implemented control |
|---|---|---|
| `join_channel` / `leave_channel` | Caller-controlled arbitrary room name was passed directly to Socket.IO. | Both handlers now reject with `unsupported_channel` and do not join/leave a caller-named room. Supported room types remain purpose-specific handlers only. |
| `waiting_room:join` | The socket entered `appointment:<id>` before lookup; any authenticated user could enqueue a guessed appointment. | Lookup now occurs first. Entry requires authenticated identity, canonical appointment participant (`patient_id`, `booked_by_user_id`, or `doctor_user_id`) and an open appointment state. Room/queue mutation occurs only after all checks pass. |
| `waiting_room:leave` | A foreign caller could remove a guessed appointment from the doctor queue. | Lookup and participant validation now occur before leave/queue mutation. A foreign caller receives `not_participant`; the room and queue remain unchanged. |
| Terminal appointment | A completed/cancelled visit could enter waiting-room infrastructure. | Join now rejects non-open state with `appointment_not_open`. |

## Verification

| Gate | Result |
|---|---|
| Focused realtime Jest regression | **PASS** — `realtime.gateway.authorization.spec.ts`: 1 suite, 4 tests. It rejects arbitrary room request, rejects foreign join/leave without room or queue mutation, permits an authorized participant, and rejects terminal state. |
| Combined Phase 8 regressions | **PASS** — 2 suites, 8 tests across public-care DTO/status/search and Realtime room authorization. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Archive integrity | **PASS** — `nabdah-backend.zip` validates with `unzip -tq`; `node_modules`, `dist`, and `coverage` are excluded. |
| Source archive SHA-256 | `4597f9fc57e40e3f6ee589a367bb307bfeb4647e4f3ce0f29fdc25f87f803555` |
| Branch upload | **PASS** — source commit `6d07583` (`fix: authorize realtime room subscriptions`) is on `manus/on-live-reconciliation`. |

## Remaining limits and later acceptance

This batch does not claim that all presence, call signaling, offline queues, thread authorization, user/role broadcast rooms or distributed Socket.IO delivery are complete. Thread handlers already invoke chat membership lookup, but Phase 9 must execute the broader suite and Phase 11 must run real socket negative tests with patient1, patient2, assigned provider, unassigned provider and a terminal appointment. The persistent/process-memory queue and offline-delivery guarantees remain tracked under Phase 5 remediation.
