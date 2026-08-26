# Provider VideoCallRoom: manual semantic review

## reviewed source

`src/screens/shared/VideoCallRoom.tsx`, lines 1–252, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

## result

This component is materially more complete than `LiveKitRoomProvider`: it creates a room, handles local/remote tracks, offers retry, and attempts an end event. It is still **not a validated call contract**.

| ID | evidence | gap / defect | closure evidence |
|---|---|---|---|
| P-CALL-005 | 85–94 | `initiate` then `join` are client anchors only; comment at 1–10 is not evidence | reconcile exact backend controllers/DTOs, appointment/provider/patient ownership, allowed appointment states, token TTL, one-room isolation and cancellation behavior |
| P-CALL-006 | 94 | production URL falls back to literal `wss://live.nabd.plus` | server must return an allowlisted configured URL; no unsafe fallback or environment confusion; verify certificate and coturn configuration at runtime |
| P-CALL-007 | 156–166 | `/end` failure is swallowed; UI invokes `onEnd` after local disconnect, so a call can appear ended client-side with no durable server/audit/booking transition | make call end idempotent, durable and observable; surface unresolved end event/retry policy and separate media disconnect from clinical session outcome |
| P-CALL-008 | 141–151, 178–191 | unmount/error exits disconnect locally but do not make an explicit server leave/cancel/end transition | define leave/reconnect/timeout policy; record participant events and update booking state from the server |
| P-CALL-009 | whole file paired with `LiveKitRoomProvider` | two divergent Provider call implementations coexist; one is explicitly demo/placeholder | choose one audited implementation and remove the legacy/demo path, then test owner/stranger/unauth/expired/ended/reconnect cases |
| P-CALL-010 | 72–79 | the app permits reaching a video flow that is unavailable in Expo Go; this is honestly disclosed but not product completion | distribution/build capability needs a release policy and device preflight before scheduling/starting an eligible call |

No line in this component proves payment/insurance confirmation, appointment lock/state, medical consent, recording policy, patient notification, or administrative audit. Those remain shared journey obligations.
