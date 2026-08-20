# Phase 5 Backend/Database — realtime and WebSocket security gaps

## Confirmed strengths

Connection requires a JWT; thread typing/read/delivery and call signaling validate chat participation or LiveKit authorization before targeted emissions. These are appropriate per-feature controls.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Generic channel subscription lets any authenticated client join arbitrary Socket.IO rooms | `join_channel`/`leave_channel` call `client.join(data.channel)` without ownership/allowlist. A user can join `user:<other-id>`, `role:admin`, appointment or other internal room names and receive fanout events. | Remove generic client-selected rooms or enforce a strict server-side room registry with membership/purpose checks; add negative tests for user/role/admin/appointment/thread room forgery. |
| **P0** | Waiting-room join/leave does not verify appointment participant or authorized provider | Any connected user may join any appointment ID, alter an in-memory doctor queue and receive queue/ready signals. | Validate patient/doctor/authorized staff membership and appointment state before join/leave; use durable appointment queue state and audit. |
| **P1** | Presence lookup permits arbitrary user-ID enumeration | `presence:get` forwards any requested `user_ids` to bulk presence without contact/family/thread/appointment relationship checks. | Restrict visibility to authorized relationships/purpose and limit/rate-audit requests; minimize exact presence as policy requires. |
| **P1** | Chat delivery/read receipts are broadcast but not persisted | Receipts trust client payload and emit events with no message-state write, idempotency, ordering or multi-device reconciliation. | Persist recipient-specific delivery/read cursors with event IDs and conditional updates; reconcile across reconnect/device sessions. |
| **P1** | Offline queue deletes events immediately after emit with no client acknowledgement | Replay emits every Redis list item then deletes list, so disconnect/client processing failure can lose events; parsing errors can disrupt replay. | Use durable consumer acknowledgements, event IDs/cursors, retention/dead-letter handling and idempotent replay. |
| **P1** | Doctor waiting queue is process-memory with fixed 15-minute ETA | Queue does not survive restart/scale-out, has no actual appointment authorization/state, and presents fixed per-position time. | Use shared durable queue/state, verified visit lifecycle/attendance, calculated/stated ETA policy and cross-instance synchronization. |

## Decision

Realtime infrastructure is **P0 FIX/BLOCKED**. JWT connection authentication does not compensate for arbitrary room joining and waiting-room impersonation; these must be remediated before chat, call, booking or notification E2E claims.
