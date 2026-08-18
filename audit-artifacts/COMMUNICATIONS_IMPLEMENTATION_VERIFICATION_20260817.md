# Nabdah Communications Implementation Verification

**Author:** Manus AI  
**Branch:** `manus/on-live-reconciliation`  
**Verification date:** 2026-08-17  
**Scope:** focused verification of chat, realtime messaging, voice/video calling, push notifications, notification audio, and their backend contracts. This document does not replace the previous full-system audit.

> **Evidence rule:** `VERIFIED-SOURCE` means the actual source path was traced. `VERIFIED-LOCAL` means the relevant local build or automated test passed. `STAGING-REQUIRED` means the behavior still requires a deployed environment, credentials, Redis/Mongo/LiveKit, push credentials, or a physical device. No staging or live result is claimed unless it was actually executed.

## Executive decision

The communications stack is not a collection of static screens: the main chat path persists to MongoDB, emits backend events, uses Socket.IO for realtime delivery, and the push module uses BullMQ with Expo/FCM/APNs/Web Push adapters. The focused pass nevertheless found contract and authorization defects that could make the user-facing experience incomplete or expose communication resources. Those source-level defects have been corrected on this branch.

The implementation is **not yet operationally closed for production**. Full bidirectional chat, call signaling, push delivery in foreground/background/terminated states, audio-channel behavior, Redis replay, and LiveKit media must still be executed against staging and on physical iOS/Android devices. The local evidence below is strong for compilation and unit behavior, but it cannot prove provider credentials, OS notification behavior, or real media connectivity.

## Communications Implementation Matrix

| Feature | Frontend | Backend | API/WebSocket/Signaling | Database/Storage | Notifications | Audio | Tests | Status |
|---|---|---|---|---|---|---|---|---|
| Patient ↔ provider direct chat | Patient `app/consultations/chat-with-doctor.tsx`; real REST thread creation and message loading | `modules/chat/chat.module.ts`; `ChatThread` and `ChatMessage` Mongo schemas | `POST /chat/threads/direct`, `GET/POST /chat/threads/:id/messages`, `chat:join`, typing/read/delivery events | `chat_threads`, `chat_messages`; deduplication by `client_message_id` | Backend `chat.message_sent` event queues push to every non-sender participant after correction | Generic push sound only; custom per-category sonic identity is not closed | Patient typecheck and 7 suites/23 tests passed after the final source patches; backend 26 suites/211 tests passed after the final event payload and ownership changes | **VERIFIED-SOURCE / VERIFIED-LOCAL-PARTIAL; STAGING-REQUIRED** |
| Offline chat replay | Patient `src/context/SocketContext.tsx` | Same ChatController contract | Replay now posts `{ body, type, client_message_id }`, matching backend instead of unsupported `{ content, message_type, receiver_id }` | Backend deduplicates retries | Push is generated after successful persistence | Not applicable | Patient typecheck and 7 suites/23 tests passed after the final post-patch rerun | **SOURCE-FIXED; LOCAL-REVALIDATION REQUIRED** |
| Chat authorization and receipts | Patient joins a thread and sends through REST | Membership now enforced for `markRead`, `markDelivered`, reactions, pin, and participant management | Gateway validates membership before join/leave/typing/read/delivery fanout | Reads/writes are scoped to the thread participant | Push recipient list is based on persisted participant IDs | Not applicable | Backend build/tests passed after the final ownership and event payload patches | **SOURCE-FIXED; STAGING BOLA TEST REQUIRED** |
| Provider pharmacy chat | `NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx` uses pharmacy chat REST routes | `modules/pharmacy/services/pharmacy-chat.service.ts` validates patient/pharmacy ownership and screens external contact data | `/pharmacy/chat/threads`, `/pharmacy/chat/threads/:id/messages` with `{ text }` | Pharmacy chat thread/message repositories | Substitute events use EventBus; push delivery path requires staging event verification | No category-specific custom sound | Provider 1 suite/3 tests and typecheck passed in focused run | **VERIFIED-SOURCE / VERIFIED-LOCAL; REAL-TIME UI PARTIAL** |
| Voice/video initiation | Patient `app/consultations/video-call.tsx`; provider `src/screens/shared/VideoCallRoom.tsx` | `modules/livekit/livekit.controller.ts` and `livekit.service.ts` | `POST /calls/initiate`, `POST /calls/:sessionId/join`, `/end`, `/reject`, `/metrics` | `callsessions`; appointment participant IDs are now authoritative | `call.incoming` event normalized to `callee_id`, `caller_id`, `caller_name`, `call_type`, `session_id` | LiveKit media plus native incoming-call bridge; OS ringtone behavior still device-dependent | Backend build and 26 suites/211 tests passed after the final ownership and payload changes; mobile provider tests passed | **SOURCE-FIXED / VERIFIED-LOCAL-PARTIAL; LIVEKIT-STAGING-REQUIRED** |
| Call ownership and signaling | Patient/provider LiveKit screens and Socket.IO gateway | LiveKit service now restricts join/end/reject/metrics/session lookup to patient/provider participants; admin room APIs use `Roles(ADMIN,SUPER_ADMIN)` | Realtime gateway authorizes chat room membership and call signaling against the persisted call session | `callsessions` ownership fields | Incoming call push contract now matches PushService and patient NotificationHandler | Incoming-call screen no longer uses a fake doctor identity; it displays a neutral label when caller identity is unavailable | Backend build passed after the final ownership patches; adversarial websocket/live tests not run | **SOURCE-FIXED; STAGING/E2E-REQUIRED** |
| Push registration and delivery | Patient `NotificationHandler`/`utils/notifications.ts`; Provider `src/utils/notifications.ts` | `modules/push/push.module.ts` stores tokens, queues BullMQ jobs, handles Expo/FCM/APNs/Web Push, retry and failure deactivation | `POST /push/register`, `/unregister`, `/devices`, `/events`; backend events include booking/chat/call/payment/report | `PushToken`, `PushLog`, `PushEngagement`, `WebPushSubscription` | Real event listeners and retry queue are present; call/chat payload mismatches were fixed | Backend currently sends `default`; Android `calls` channel exists in clients | Source verified; credential delivery and OS execution not locally provable | **VERIFIED-SOURCE; STAGING/DEVICE-REQUIRED** |
| Deep links and terminated notifications | Patient `NotificationHandler.tsx` whitelists routes and handles last response/click | Push data contains type and identifiers | `type: call` and legacy `incoming_call` are both accepted; `session_id` and legacy `sessionId` are both accepted | Engagement events persist | Open/click/received tracking posts to `/push/events` | Incoming call invokes CallKeep where available | Static source verification only | **SOURCE-FIXED; DEVICE-REQUIRED** |
| Notification sounds / sonic branding | Patient has `assets/sounds/notification.wav`; provider has `assets/audio/rad_dispatch_alert.mp3` | Backend selects `channelId` but sends `sound: default` for Expo/FCM and APNs | Android `calls` and `default` channels are configured in client utilities | No audio persistence needed | Delivery is real but category-specific asset selection is incomplete | Separate patient notification, provider order, chat, voice, and video assets are not all present/configured | Asset/config source inspection only | **PARTIAL / BLOCKED ON PRODUCT ASSETS AND DEVICE QA** |

## Exact source changes made in this focused pass

The backend `ChatService` now checks that the caller belongs to the thread before marking messages read or delivered, reacting, pinning, adding participants, or removing participants. The participant-management controller now receives `CurrentUser` and forwards the actor identity to the service. This closes the previously identified authorization gaps without changing the persisted message model.

The patient offline queue now posts the actual ChatController fields `body`, `type`, and `client_message_id`. The patient doctor-chat screen now reads `body`, sends the same real contract, and accepts the backend event payload. The backend chat event now includes `actor_account_id` and `meta`, allowing the PushService listener to identify recipients and message content consistently.

The LiveKit service now derives patient/provider ownership from the real appointment record, requires an appointment identifier for initiation, rejects callers or callees outside that appointment, uses UUID-based room/session identifiers, and scopes join/end/reject/metrics/session lookup to the persisted session participants. The LiveKit controller now protects administrative room operations with existing role metadata. The Realtime gateway validates chat membership before room join/typing/read/delivery fanout and validates call signaling against a persisted LiveKit session. The patient NotificationHandler accepts both the normalized call payload and the legacy payload shape. The incoming-call overlay no longer inserts a fictitious doctor identity.

## What was already correct

The main chat service already had Mongo persistence, participant checks for thread/message retrieval and sending, client-message deduplication, message read/delivery arrays, edit/delete ownership checks, and an EventBus path. The push module already had a real queue and provider adapters with token failure handling. The provider LiveKit room already used the real initiate/join/end contract and LiveKit media room rather than a fake connected state. These capabilities were preserved rather than replaced.

## Confirmed remaining blockers

The first blocker is **staging execution**. The branch must be deployed to the staging API with MongoDB, Redis/BullMQ, LiveKit URL/API credentials, and push credentials. The tests must then use two users to verify that an unrelated patient/provider cannot join a thread, read receipts cannot be forged, call signaling cannot target an unrelated user, and a session cannot be joined or ended by a third identity.

The second blocker is **physical-device validation**. Notification permission, Android channels, iOS APNs behavior, terminated-app deep links, CallKeep, vibration, audio focus, background/foreground transitions, and LiveKit camera/microphone permissions cannot be certified by TypeScript or Jest alone.

The third blocker is **audio product completion**. The repository does not contain a complete set of approved, category-specific patient/provider call and notification sounds. The existing files are not enough to claim the requested sonic branding. New assets require product approval and packaging tests; they must not be fabricated as placeholder audio.

The fourth blocker is **legacy socket-contract retirement or formal classification**. `modules/chat/chat.gateway.ts` and `modules/socket/socket.gateway.ts` expose parallel legacy event names and room conventions. The active application path mapped in this pass uses `realtime.gateway.ts`, but the legacy gateways should be disabled, removed, or explicitly documented behind a compatibility boundary after staging confirms no client depends on them.

## Evidence classification

| Evidence class | Result |
|---|---|
| Verified from source | Chat persistence, REST contracts, push queue/adapters, LiveKit architecture, patient/provider call screens, route allowlist, audio asset inventory, and the defects listed above. |
| Verified by local test | Backend build passed; backend tests passed at 26 suites/211 tests with `JWT_SECRET`; Patient passed typecheck and 7 suites/23 tests; Provider passed typecheck and 1 suite/3 tests in the focused run. |
| Verified against staging/live | Not claimed in this focused pass. The environment must be redeployed with the new commit before E2E. |
| Not testable from current environment | Real push delivery, APNs/FCM credentials, terminated-app behavior, physical audio/ringtone behavior, camera/microphone permission flows, reconnect behavior over real network loss, and LiveKit media quality. |

## Required next acceptance run

The acceptance run should use a patient and provider pair attached to one real appointment, plus a third unrelated account. It should create a message from each side, verify persistence and ordering, disconnect and replay an offline message, verify read/delivery state, attempt unauthorized thread and call access, initiate voice and video calls, accept/reject/end from both sides, and confirm the corresponding `callsessions` state. It should then register real device tokens, deliver booking/chat/call notifications in foreground/background/terminated states, tap each notification, and verify the expected deep link and sound channel on supported devices.

## Source references

The primary source references for this report are the files below in the four application archives and extracted working trees:

| Reference | Path |
|---|---|
| Backend chat | `backend/nabdah-backend/src/modules/chat/chat.module.ts` |
| Backend realtime | `backend/nabdah-backend/src/modules/realtime/realtime.gateway.ts` |
| Backend calls | `backend/nabdah-backend/src/modules/livekit/livekit.service.ts`, `livekit.controller.ts` |
| Backend push | `backend/nabdah-backend/src/modules/push/push.module.ts` |
| Patient chat | `patient/nabd_plus/app/consultations/chat-with-doctor.tsx` |
| Patient socket | `patient/nabd_plus/src/context/SocketContext.tsx` |
| Patient notifications | `patient/nabd_plus/src/components/NotificationHandler.tsx` |
| Provider calls | `provider/NabdProvider/src/screens/shared/VideoCallRoom.tsx` |
| Provider pharmacy chat | `provider/NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx` |

**Final judgment:** source-level communications remediation is substantially advanced and the newly identified contract/security defects are fixed in the working tree. The communications feature set must remain **not production-closed** until staging and physical-device acceptance produce evidence for the operational paths explicitly listed above.
