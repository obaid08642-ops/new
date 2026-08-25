# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/COMMUNICATIONS_IMPLEMENTATION_VERIFICATION_20260817.md`
- **Member SHA-256:** `71635c6c882689a98d6eefdf5f2f69f3ba9a8941a00235e41e0927aad2b227c4`
- **Line count:** 81
- **Read range:** `1-81`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: The communications stack is not a collection of static screens: the main chat path persists to MongoDB, emits backend events, uses Socket.IO for realtime delivery, and the push module uses BullMQ with Expo/FCM/APNs/Web Push adapters. The fo`
- `23: | Provider pharmacy chat | `NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx` uses pharmacy chat REST routes | `modules/pharmacy/services/pharmacy-chat.service.ts` validates patient/pharmacy ownership and screens external contact dat`
- `24: | Voice/video initiation | Patient `app/consultations/video-call.tsx`; provider `src/screens/shared/VideoCallRoom.tsx` | `modules/livekit/livekit.controller.ts` and `livekit.service.ts` | `POST /calls/initiate`, `POST /calls/:sessionId/join`
- `25: | Call ownership and signaling | Patient/provider LiveKit screens and Socket.IO gateway | LiveKit service now restricts join/end/reject/metrics/session lookup to patient/provider participants; admin room APIs use `Roles(ADMIN,SUPER_ADMIN)` `
- `26: | Push registration and delivery | Patient `NotificationHandler`/`utils/notifications.ts`; Provider `src/utils/notifications.ts` | `modules/push/push.module.ts` stores tokens, queues BullMQ jobs, handles Expo/FCM/APNs/Web Push, retry and fa`
- `27: | Deep links and terminated notifications | Patient `NotificationHandler.tsx` whitelists routes and handles last response/click | Push data contains type and identifiers | `type: call` and legacy `incoming_call` are both accepted; `session_`
- `34: The patient offline queue now posts the actual ChatController fields `body`, `type`, and `client_message_id`. The patient doctor-chat screen now reads `body`, sends the same real contract, and accepts the backend event payload. The backend `
- `56: | Verified from source | Chat persistence, REST contracts, push queue/adapters, LiveKit architecture, patient/provider call screens, route allowlist, audio asset inventory, and the defects listed above. |`
- `63: The acceptance run should use a patient and provider pair attached to one real appointment, plus a third unrelated account. It should create a message from each side, verify persistence and ordering, disconnect and replay an offline message`
- `78: | Provider calls | `provider/NabdProvider/src/screens/shared/VideoCallRoom.tsx` |`
- `79: | Provider pharmacy chat | `provider/NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx` |`
### backend_consumers_or_contracts
- `12: The communications stack is not a collection of static screens: the main chat path persists to MongoDB, emits backend events, uses Socket.IO for realtime delivery, and the push module uses BullMQ with Expo/FCM/APNs/Web Push adapters. The fo`
- `18: | Feature | Frontend | Backend | API/WebSocket/Signaling | Database/Storage | Notifications | Audio | Tests | Status |`
- `21: | Offline chat replay | Patient `src/context/SocketContext.tsx` | Same ChatController contract | Replay now posts `{ body, type, client_message_id }`, matching backend instead of unsupported `{ content, message_type, receiver_id }` | Backen`
- `23: | Provider pharmacy chat | `NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx` uses pharmacy chat REST routes | `modules/pharmacy/services/pharmacy-chat.service.ts` validates patient/pharmacy ownership and screens external contact dat`
- `25: | Call ownership and signaling | Patient/provider LiveKit screens and Socket.IO gateway | LiveKit service now restricts join/end/reject/metrics/session lookup to patient/provider participants; admin room APIs use `Roles(ADMIN,SUPER_ADMIN)` `
- `26: | Push registration and delivery | Patient `NotificationHandler`/`utils/notifications.ts`; Provider `src/utils/notifications.ts` | `modules/push/push.module.ts` stores tokens, queues BullMQ jobs, handles Expo/FCM/APNs/Web Push, retry and fa`
- `50: The fourth blocker is **legacy socket-contract retirement or formal classification**. `modules/chat/chat.gateway.ts` and `modules/socket/socket.gateway.ts` expose parallel legacy event names and room conventions. The active application path`
- `76: | Patient socket | `patient/nabd_plus/src/context/SocketContext.tsx` |`
- `79: | Provider pharmacy chat | `provider/NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx` |`
### auth_ownership
- `12: The communications stack is not a collection of static screens: the main chat path persists to MongoDB, emits backend events, uses Socket.IO for realtime delivery, and the push module uses BullMQ with Expo/FCM/APNs/Web Push adapters. The fo`
- `20: | Patient ↔ provider direct chat | Patient `app/consultations/chat-with-doctor.tsx`; real REST thread creation and message loading | `modules/chat/chat.module.ts`; `ChatThread` and `ChatMessage` Mongo schemas | `POST /chat/threads/direct`, `
- `22: | Chat authorization and receipts | Patient joins a thread and sends through REST | Membership now enforced for `markRead`, `markDelivered`, reactions, pin, and participant management | Gateway validates membership before join/leave/typing/`
- `23: | Provider pharmacy chat | `NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx` uses pharmacy chat REST routes | `modules/pharmacy/services/pharmacy-chat.service.ts` validates patient/pharmacy ownership and screens external contact dat`
- `24: | Voice/video initiation | Patient `app/consultations/video-call.tsx`; provider `src/screens/shared/VideoCallRoom.tsx` | `modules/livekit/livekit.controller.ts` and `livekit.service.ts` | `POST /calls/initiate`, `POST /calls/:sessionId/join`
- `25: | Call ownership and signaling | Patient/provider LiveKit screens and Socket.IO gateway | LiveKit service now restricts join/end/reject/metrics/session lookup to patient/provider participants; admin room APIs use `Roles(ADMIN,SUPER_ADMIN)` `
- `26: | Push registration and delivery | Patient `NotificationHandler`/`utils/notifications.ts`; Provider `src/utils/notifications.ts` | `modules/push/push.module.ts` stores tokens, queues BullMQ jobs, handles Expo/FCM/APNs/Web Push, retry and fa`
- `27: | Deep links and terminated notifications | Patient `NotificationHandler.tsx` whitelists routes and handles last response/click | Push data contains type and identifiers | `type: call` and legacy `incoming_call` are both accepted; `session_`
- `32: The backend `ChatService` now checks that the caller belongs to the thread before marking messages read or delivered, reacting, pinning, adding participants, or removing participants. The participant-management controller now receives `Curr`
- `36: The LiveKit service now derives patient/provider ownership from the real appointment record, requires an appointment identifier for initiation, rejects callers or callees outside that appointment, uses UUID-based room/session identifiers, a`
- `40: The main chat service already had Mongo persistence, participant checks for thread/message retrieval and sending, client-message deduplication, message read/delivery arrays, edit/delete ownership checks, and an EventBus path. The push modul`
- `44: The first blocker is **staging execution**. The branch must be deployed to the staging API with MongoDB, Redis/BullMQ, LiveKit URL/API credentials, and push credentials. The tests must then use two users to verify that an unrelated patient/`
### state_transitions
- `14: The implementation is **not yet operationally closed for production**. Full bidirectional chat, call signaling, push delivery in foreground/background/terminated states, audio-channel behavior, Redis replay, and LiveKit media must still be `
- `18: | Feature | Frontend | Backend | API/WebSocket/Signaling | Database/Storage | Notifications | Audio | Tests | Status |`
- `20: | Patient ↔ provider direct chat | Patient `app/consultations/chat-with-doctor.tsx`; real REST thread creation and message loading | `modules/chat/chat.module.ts`; `ChatThread` and `ChatMessage` Mongo schemas | `POST /chat/threads/direct`, `
- `21: | Offline chat replay | Patient `src/context/SocketContext.tsx` | Same ChatController contract | Replay now posts `{ body, type, client_message_id }`, matching backend instead of unsupported `{ content, message_type, receiver_id }` | Backen`
- `22: | Chat authorization and receipts | Patient joins a thread and sends through REST | Membership now enforced for `markRead`, `markDelivered`, reactions, pin, and participant management | Gateway validates membership before join/leave/typing/`
- `26: | Push registration and delivery | Patient `NotificationHandler`/`utils/notifications.ts`; Provider `src/utils/notifications.ts` | `modules/push/push.module.ts` stores tokens, queues BullMQ jobs, handles Expo/FCM/APNs/Web Push, retry and fa`
- `32: The backend `ChatService` now checks that the caller belongs to the thread before marking messages read or delivered, reacting, pinning, adding participants, or removing participants. The participant-management controller now receives `Curr`
- `40: The main chat service already had Mongo persistence, participant checks for thread/message retrieval and sending, client-message deduplication, message read/delivery arrays, edit/delete ownership checks, and an EventBus path. The push modul`
- `42: ## Confirmed remaining blockers`
- `48: The third blocker is **audio product completion**. The repository does not contain a complete set of approved, category-specific patient/provider call and notification sounds. The existing files are not enough to claim the requested sonic b`
- `63: The acceptance run should use a patient and provider pair attached to one real appointment, plus a third unrelated account. It should create a message from each side, verify persistence and ordering, disconnect and replay an offline message`
### payment_insurance_relevance
- `20: | Patient ↔ provider direct chat | Patient `app/consultations/chat-with-doctor.tsx`; real REST thread creation and message loading | `modules/chat/chat.module.ts`; `ChatThread` and `ChatMessage` Mongo schemas | `POST /chat/threads/direct`, `
- `22: | Chat authorization and receipts | Patient joins a thread and sends through REST | Membership now enforced for `markRead`, `markDelivered`, reactions, pin, and participant management | Gateway validates membership before join/leave/typing/`
- `24: | Voice/video initiation | Patient `app/consultations/video-call.tsx`; provider `src/screens/shared/VideoCallRoom.tsx` | `modules/livekit/livekit.controller.ts` and `livekit.service.ts` | `POST /calls/initiate`, `POST /calls/:sessionId/join`
- `26: | Push registration and delivery | Patient `NotificationHandler`/`utils/notifications.ts`; Provider `src/utils/notifications.ts` | `modules/push/push.module.ts` stores tokens, queues BullMQ jobs, handles Expo/FCM/APNs/Web Push, retry and fa`
- `34: The patient offline queue now posts the actual ChatController fields `body`, `type`, and `client_message_id`. The patient doctor-chat screen now reads `body`, sends the same real contract, and accepts the backend event payload. The backend `
- `36: The LiveKit service now derives patient/provider ownership from the real appointment record, requires an appointment identifier for initiation, rejects callers or callees outside that appointment, uses UUID-based room/session identifiers, a`
### error_empty_loading_retry_cancel
- `20: | Patient ↔ provider direct chat | Patient `app/consultations/chat-with-doctor.tsx`; real REST thread creation and message loading | `modules/chat/chat.module.ts`; `ChatThread` and `ChatMessage` Mongo schemas | `POST /chat/threads/direct`, `
- `21: | Offline chat replay | Patient `src/context/SocketContext.tsx` | Same ChatController contract | Replay now posts `{ body, type, client_message_id }`, matching backend instead of unsupported `{ content, message_type, receiver_id }` | Backen`
- `26: | Push registration and delivery | Patient `NotificationHandler`/`utils/notifications.ts`; Provider `src/utils/notifications.ts` | `modules/push/push.module.ts` stores tokens, queues BullMQ jobs, handles Expo/FCM/APNs/Web Push, retry and fa`
- `34: The patient offline queue now posts the actual ChatController fields `body`, `type`, and `client_message_id`. The patient doctor-chat screen now reads `body`, sends the same real contract, and accepts the backend event payload. The backend `
- `63: The acceptance run should use a patient and provider pair attached to one real appointment, plus a third unrelated account. It should create a message from each side, verify persistence and ordering, disconnect and replay an offline message`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
