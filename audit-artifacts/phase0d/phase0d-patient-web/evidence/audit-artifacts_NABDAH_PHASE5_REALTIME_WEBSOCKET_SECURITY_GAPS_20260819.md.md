# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_REALTIME_WEBSOCKET_SECURITY_GAPS_20260819.md`
- **Member SHA-256:** `635b1699f0f01c7d230109bf510c2896937bfc4b0df74af97db1112122b5300f`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: Realtime infrastructure is **P0 FIX/BLOCKED**. JWT connection authentication does not compensate for arbitrary room joining and waiting-room impersonation; these must be remediated before chat, call, booking or notification E2E claims.`
### backend_consumers_or_contracts
- `1: # Phase 5 Backend/Database — realtime and WebSocket security gaps`
- `11: | **P0** | Generic channel subscription lets any authenticated client join arbitrary Socket.IO rooms | `join_channel`/`leave_channel` call `client.join(data.channel)` without ownership/allowlist. A user can join `user:<other-id>`, `role:adm`
- `12: | **P0** | Waiting-room join/leave does not verify appointment participant or authorized provider | Any connected user may join any appointment ID, alter an in-memory doctor queue and receive queue/ready signals. | Validate patient/doctor/a`
### auth_ownership
- `5: Connection requires a JWT; thread typing/read/delivery and call signaling validate chat participation or LiveKit authorization before targeted emissions. These are appropriate per-feature controls.`
- `11: | **P0** | Generic channel subscription lets any authenticated client join arbitrary Socket.IO rooms | `join_channel`/`leave_channel` call `client.join(data.channel)` without ownership/allowlist. A user can join `user:<other-id>`, `role:adm`
- `14: | **P1** | Chat delivery/read receipts are broadcast but not persisted | Receipts trust client payload and emit events with no message-state write, idempotency, ordering or multi-device reconciliation. | Persist recipient-specific delivery/`
- `16: | **P1** | Doctor waiting queue is process-memory with fixed 15-minute ETA | Queue does not survive restart/scale-out, has no actual appointment authorization/state, and presents fixed per-position time. | Use shared durable queue/state, ve`
### state_transitions
- `3: ## Confirmed strengths`
- `7: ## Confirmed defects`
- `12: | **P0** | Waiting-room join/leave does not verify appointment participant or authorized provider | Any connected user may join any appointment ID, alter an in-memory doctor queue and receive queue/ready signals. | Validate patient/doctor/a`
- `14: | **P1** | Chat delivery/read receipts are broadcast but not persisted | Receipts trust client payload and emit events with no message-state write, idempotency, ordering or multi-device reconciliation. | Persist recipient-specific delivery/`
- `15: | **P1** | Offline queue deletes events immediately after emit with no client acknowledgement | Replay emits every Redis list item then deletes list, so disconnect/client processing failure can lose events; parsing errors can disrupt replay`
- `16: | **P1** | Doctor waiting queue is process-memory with fixed 15-minute ETA | Queue does not survive restart/scale-out, has no actual appointment authorization/state, and presents fixed per-position time. | Use shared durable queue/state, ve`
### payment_insurance_relevance
- `14: | **P1** | Chat delivery/read receipts are broadcast but not persisted | Receipts trust client payload and emit events with no message-state write, idempotency, ordering or multi-device reconciliation. | Persist recipient-specific delivery/`
### error_empty_loading_retry_cancel
- `15: | **P1** | Offline queue deletes events immediately after emit with no client acknowledgement | Replay emits every Redis list item then deletes list, so disconnect/client processing failure can lose events; parsing errors can disrupt replay`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
