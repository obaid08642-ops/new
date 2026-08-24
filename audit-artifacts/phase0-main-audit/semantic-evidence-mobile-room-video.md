# Semantic evidence — Mobile Room / Video Consultation

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/room/[id].tsx:145–169` obtains a LiveKit token with `POST /calls/{id}/join` through `HttpClient`, while the audit’s previously verified backend contract for consultation calls uses the unified-bookings call-token flow. This consumer route/method therefore requires live/controller reconciliation before it can be accepted as the same contract. The source checks only a Redux `user` truthiness and does not show appointment ownership, participant role, call-window, booking status or one-time/short-TTL validation at the client boundary.

The token is kept in React state (`:146–161`) and passed directly to `LiveKitRoom` (`:197–209`). There is no explicit token redaction/logging guard, refresh/expiry handling, connection retry, revoked appointment handling, network transition state, audio/video permission recovery, or remote participant identity verification. The LiveKit URL uses an environment value with a hard-coded default `wss://live.nabd.plus` (`:45–46`), requiring deployment/tenant validation.

If the native LiveKit module is unavailable, the screen shows an Expo Go limitation (`:151–155`); this is truthful but does not provide a supported permission/install recovery path. `onDisconnected` and the hang-up control only navigate back (`:171–173,197–208`) and do not show an end-call mutation, attendance event, reason, or reconnect/ended distinction.

Inside `ActiveCallView`, microphone/camera calls mutate the local participant directly without null/permission/error guards (`:48–75`), while the remote track filter dereferences `localParticipant.identity` even though the local participant may be null (`:49–60`). No screen-share, chat, recording consent, clinical escalation, audit event or PHI policy is shown. No Phase 0 remediation was made.
