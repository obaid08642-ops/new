# Calls and chat findings (2026-10-31)

One line per finding: `file:line | severity | defect | how it was checked`.
Severity: **P0** = a common path fails for users, or access or data is exposed. **P1** = a realistic case (permission denied, network switch, offline, retry, scan pending, window edge) degrades or misleads. **P2** = minor, edge, or UX.
"Read" = the code line was read in this sweep. "Read, not run" = no runtime check. No finding here has been reproduced on a running stack yet.
"Status" was added on 2026-10-31 for every patient-app and patient-web line: **fixed (PR)**, **fixed in #… (not on main yet)**, or **open**. "Not verified fixed" means the code was not found to handle it, not that it was run.

## Calls: backend and web

- `backend/src/modules/livekit/livekit.service.ts:356` | P0 | Fallback path issues a 2-hour LiveKit token with no appointment-state or consent check, unlike `joinCall` (lines 286-295) | Read
- `backend/src/modules/livekit/livekit.service.ts:406` | P1 | `new WebhookReceiver(secret, secret)` passes the secret twice; if the SDK takes (apiKey, apiSecret), webhooks never verify and `room_finished` never ends a session | Read; SDK signature not checked
- `backend/infra/livekit.yaml:25` | P1 | Webhooks go to `/webhooks/livekit`, which only emits events nothing consumes; `deploy/livekit/livekit.yaml` has no webhooks block | Read
- `patient-web/components-next/video-room-client.tsx:152` | P1 | `leave()` disconnects but never calls the backend end, so the session stays ACTIVE and `assertHostFree` (`livekit.service.ts:246`) blocks the host's next call for 3 hours | Read | **Status (2026-10-31): fixed (#2210: `endCallSession` on leave)**
- `backend/src/modules/livekit/livekit.service.ts:74` | P1 | A guardian who booked for a family member gets 404; consent (line 62) and payments (`payments.module.ts:237`) treat `booked_by_user_id` as a party | Read
- `backend/src/modules/livekit/livekit.service.ts:51` | P1 | Call credential lives 10 minutes (`ttl: '10m'`) and is not refreshed; the join window (line 82) refuses a rejoin after slot + 15 min | Read
- `backend/src/modules/livekit/livekit.service.ts:86` | P1 | Identity is the display name, not the user id, so two people with the same name in one room collide | Read
- `patient-web/app/[locale]/consultations/video-call/page.tsx:26` | P1 | Early or late join returns 400 (`livekit.service.ts:82-83`), but only 409 maps to "not ready", so the patient sees "unavailable" | Read | **Status (2026-10-31): fixed (#2210: `callTokenFailure` maps 400 outside the window to "not ready"; this PR: the launcher uses the same mapping)**
- `patient-web/components-next/video-room-client.tsx:78` | P1 | `ConnectionQualityChanged` fires only on change, so two consecutive poor reports never happen and the audio-only fallback is unreachable | Read | **Status (2026-10-31): fixed (#2210: a link that stays poor is reported on every sample, not only on change)**
- `patient-web/components-next/video-room-client.tsx:102` | P1 | `enableCameraAndMicrophone()` requests both tracks in one call; a refused or missing camera also loses the mic, and the error is swallowed (`.catch(() => undefined)`) | Read | **Status (2026-10-31): fixed (#2210: mic and camera enabled separately)**
- `patient-web/components-next/video-room-client.tsx:106` | P1 | A failed `room.connect` (blocked or offline) shows "call ended" with no error and no retry | Read | **Status (2026-10-31): fixed (#2210: failed connect shows an error and a retry)**
- `patient-web/components-next/video-room-client.tsx:91` | P1 | Nothing handles `AudioPlaybackStatusChanged` or calls `startAudio`, so blocked autoplay can leave remote voice silent | Read | **Status (2026-10-31): fixed (#2210: `AudioPlaybackStatusChanged` + `startAudio` button)**
- `patient-web/components-next/video-room-client.tsx:144` | P2 | Toggle errors are swallowed; the button stays off with no reason | Read | **Status (2026-10-31): fixed (#2210: toggle failure is shown)**
- `patient-web/lib/consult/call-resilience.ts:35` | P2 | No camera flip (`facingMode`) in the call code; `videoCaptureDefaults` sets only resolution | Read | **Status (2026-10-31): open (P2: no camera flip on web)**
- `backend/src/modules/livekit/livekit.service.ts:304` | P2 | Join uses the display name as identity while the fallback (line 356) uses the user id, so one person can join twice | Read
- `backend/src/modules/livekit/livekit.service.ts:543` | P2 | `removeParticipant` swallows LiveKit failures (`.catch(() => null)`) and reports success to the admin | Read
- `backend/src/modules/livekit/livekit.service.ts:182` | P2 | Session reads return the whole document (metrics, the other side's `relayed_bytes_by`); only `_id` is removed | Read
- `patient-web/components-next/call-token-launcher.tsx:18` | P2 | The launcher mints a token only to check readiness, and the video page mints a second one | Read | **Status (2026-10-31): open (P2: the launcher still mints a token only to check readiness)**
- `patient-web/lib/consult/call-history.ts:27` | P2 | `FAILED` with `appointment_not_active` is shown as "missed" | Read | **Status (2026-10-31): open (P2: `FAILED` with `appointment_not_active` still shows "missed")**
- `backend/src/modules/livekit/livekit.service.ts:85` | P2 | Booking-window calls create no `callsessions` row, so they never appear in call history | Read
- `patient-web/lib/consult/p2p-call.ts:56` | P2 | `P2PCall` is used by no component (only its test), so the P2P path is dead on web | Read | **Status (2026-10-31): open (P2: `P2PCall` still has no component; decision needed whether to keep the P2P path)**

## Calls: native apps

- `patient-app/app/consultations/video-call.tsx:205` | P0 | Unmount during connect leaks a live room: cleanup disconnects only `activeRoom`, which is set after connect completes (line 189), so mic and camera stay on | Read | **Status (2026-10-31): fixed (#2204)**
- `provider-app/src/screens/shared/VideoCallRoom.tsx:179` | P0 | Refused camera permission: `enableCameraAndMicrophone` throws; the catch (line 187) shows an error without disconnecting, and Retry creates a second room; no audio-only fallback | Read
- `patient-app/app/consultations/video-call.tsx:251` | P1 | Mute effect calls `setMicrophoneEnabled(micOn)` ignoring `held`; camera effect (line 244) does the same; a hold set before `room` exists is undone when the room is set | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): hold gates mic and camera in one effect**
- `patient-app/app/consultations/video-call.tsx:255` | P1 | End does not call `POST /calls/:id/end`; the session stays open and call history can show it as active | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): End posts `/calls/:id/end`**
- `patient-app/app/consultations/video-call.tsx:153` | P1 | Remote drop only clears state; no Reconnecting/Reconnected handling, no timeout, no exit | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): `callResilience` state machine**
- `patient-app/app/consultations/post-call-rating.tsx:43` | P1 | Rating is dropped silently for calls answered from the ring (no `appointmentId`), yet the screen goes home as if saved | Read | **Status (2026-10-31): open (not verified fixed on #2207)**
- `patient-app/src/utils/callkeep.ts:76` | P1 | A voice call answered from the native UI passes no `mode`, so `video-call` treats it as video and publishes the camera | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): call type passed through**
- `patient-app/src/utils/callkeep.ts:86` | P1 | The `endCall` listener posts `/reject` for every end event, including ending an answered call | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): an answered call that ends is a hang-up, not a reject**
- `patient-app/src/utils/callkeep.ts:139` | P1 | `ringNativeCall` returns silently when CallKeep is not initialised, so a VoIP or Android push rings nothing | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): visible high-priority notification when CallKeep is not initialised**
- `patient-app/src/components/NotificationHandler.tsx:110` | P1 | VoIP listeners attach only in an effect gated on `isAuthenticated`; a killed-app VoIP wake before auth hydrates may report no call | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): VoIP listeners start without waiting for sign-in**
- `patient-app/app/consultations/incoming-call.tsx:39` | P1 | In-app ring is not dismissed by `call_cancelled` or `call_missed`; it rings 35 s and then posts reject | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): `call_cancelled`/`call_missed` dismiss the ring**
- `patient-app/app/consultations/incoming-call.tsx:59` | P1 | Accepting during a call uses `router.replace` over a pushed screen, so the first room stays connected and two rooms run; no busy check found | Read | **Status (2026-10-31): fixed in #2207 (not on main yet): busy check answers "busy"**
- `provider-app/src/screens/shared/VideoCallRoom.tsx:162` | P1 | Auto-reconnect calls `connect()` again, which re-enables mic and camera (line 179), so mute and camera-off are lost after a drop | Read
- `provider-app/src/screens/shared/VideoCallRoom.tsx:240` | P1 | Refused permission shows only a generic network error, with no permission message or settings link | Read
- `provider-app/src/screens/shared/VideoCallRoom.tsx:18` | P1 | No hold or audio-route handling: `AudioSession` is a no-op fallback and no hold listener exists | Read
- `patient-app/app/consultations/video-call.tsx:180` | P2 | Audio routes read once after connect; a headset plugged in later is not reflected | Read | **Status (2026-10-31): open (not verified fixed on #2207)**
- `patient-app/app/consultations/video-call.tsx:176` | P2 | `denied` is never cleared after returning from Settings; only the first denial is shown | Read | **Status (2026-10-31): open (not verified fixed on #2207)**
- `patient-app/app/consultations/video-call.tsx:94` | P2 | "Call again" sends `call_type: 'video'` hard-coded, so a voice call is re-dialled as video | Read | **Status (2026-10-31): open (`call_type: video` is still hard-coded in the initiate call)**
- `patient-app/app/consultations/video-call.tsx:146` | P2 | `remoteMuted` is not reset on disconnect or participant leave | Read | **Status (2026-10-31): open (not verified fixed on #2207)**
- `patient-app/app/consultations/video-call.tsx:280` | P2 | While initiate and join are pending, the screen is a spinner with no back or end control and no timeout | Read | **Status (2026-10-31): open (no connect timeout found on #2207)**
- `provider-app/src/screens/shared/VideoCallRoom.tsx:153` | P2 | Metrics timer is not stopped on a drop; it keeps posting stats for the dead room | Read

## Chat: backend

- `backend/src/modules/chat/chat.service.ts:592` | P0 | Any participant of a direct thread can add a user or remove the other party (the group-only rule at 592 and 603 is not applied to direct threads of the same kind), so a stranger can receive the history | Read
- `backend/src/modules/chat/chat.service.ts:280` | P0 | `booking_kind` comes from the client (`chat.module.ts:110`); a `doctor` kind opens a thread with no consultation window, so send, upload and voice are not window-checked | Read
- `backend/src/modules/chat/chat.gateway.ts:120` | P1 | Socket `send_message` relays to any thread room with no participant, window or persistence check; state is trusted from the client (line 111). No client listens for `new_message` today | Read
- `backend/src/modules/chat/chat.service.ts:293` | P1 | Window check fails open: an error loading the appointment or config is logged and the send is allowed (line 296) | Read
- `backend/src/modules/chat/chat.service.ts:291` | P1 | Voice gate keys on the client's `type`, so the same audio sent as `file` or `text` passes `can_voice` in a clinic or home follow-up | Read
- `backend/src/modules/chat/chat.service.ts:202` | P1 | Media ownership check ignores `scan_status`; a message can attach a file still pending scan, or later found infected; the recipient gets 423 or 404 | Read
- `backend/src/modules/chat/chat.service.ts:400` | P1 | Realtime payload cuts body to 120 characters (composer allows 2000); the other party sees truncated text until reload | Read
- `backend/src/modules/chat/chat.service.ts:418` | P1 | `chat.message_sent` is emitted twice (bus fan-out in `event-bus.service.ts:65`, then this line), so push and in-app notifications queue twice | Read
- `backend/src/modules/chat/consultation-window.ts:38` | P1 | Follow-up end falls back to appointment `updatedAt` (no writer of `completed_at` found), so any later edit extends the window | Read; `completed_at` writer search not exhaustive
- `backend/src/modules/media/media.controller.ts:154` | P1 | Upload gate uses `completed_at`/`updatedAt` and ignores `extended_until` and `closed_at`, so uploads disagree with messages after a close or extension | Read
- `backend/src/modules/chat/chat.service.ts:346` | P2 | Message `type` taken from the client unvalidated (`system` accepted), so clients can forge system messages or mislabel files | Read
- `backend/src/modules/chat/chat.service.ts:490` | P2 | `editMessage` has no window or thread check and emits nothing, so the other party never sees the edit | Read

## Chat: patient-app and patient-web

- `patient-app/app/consultations/chat-with-doctor.tsx:132` | P0 | The server returns messages newest first (`chat.service.ts:443`); the screen maps them without reversing, so history shows upside down. The provider reverses (`chatMap.ts:48`) | Read; not run | **Status (2026-10-31): fixed (#2204)**
- `patient-app/src/chat/outbox.ts:67` | P1 | Head-of-line block: flush stops at the first failure (`break`) and `attempts` is never incremented, so one permanent failure (oversize file, voice over 600 s, 400) blocks later messages on every reconnect | Read | **Status (2026-10-31): fixed (#2209: attempts counted, a dead item stops blocking the rest)**
- `patient-app/app/consultations/chat-with-doctor.tsx:239` | P1 | A new message calls `deliver()` without waiting for older queued items; after reconnect the newest can be stored first | Read | **Status (2026-10-31): fixed (#2209: queued items go first)**
- `patient-app/app/consultations/chat-with-doctor.tsx:287` | P1 | Queue flushes only while this screen is open with a socket; the thread cannot open offline (lines 112, 143-145), so queued messages wait for a reopen | Read | **Status (2026-10-31): fixed (#2209: the outbox runner starts from `NotificationHandler`)**
- `patient-app/app/consultations/chat-with-doctor.tsx:326` | P1 | A file still scanning (423) goes through `apiFetch`, which throws; the user gets a generic "could not open" instead of a "being checked" state (`useScanGate` unused here) | Read | **Status (2026-10-31): fixed (#2209: a file still scanning shows a "being checked" state)**
- `patient-web/lib/chat/send-message.test.ts:73` | P1 | No client calls `/read` or `/delivered` (patient-web proxy forbids them; patient-app and provider-app never call them), so "seen" never appears and "delivered" only if the recipient was online at send (`chat.service.ts:391`) | Read; test asserts the proxy block | **Status (2026-10-31): fixed (this PR: app and web now post `/delivered` and `/read`)**
- `patient-app/app/consultations/chat-with-doctor.tsx:127` | P2 | Only the first 50 messages load and `has_more` is ignored, so older history is unreachable | Read | **Status (2026-10-31): open (P2: only the first 50 messages load, `has_more` is still ignored)**

## Chat: provider-app

- `provider-app/src/screens/shared/shared/ChatSystem.tsx:246` | P1 | The doctor's room cannot open an attachment: images show a placeholder, files and voice notes show only a name, with no link or player | Read
- `provider-app/src/screens/doctor/doctor/PreVisitChatScreen.tsx:81` | P2 | Pre-visit send has no client message id or idempotency key; a send that timed out but was stored is duplicated on retry | Read
- `provider-app/src/screens/doctor/doctor/PreVisitChatScreen.tsx:30` | P2 | Attachments never appear: the screen reads `attachment_url`, which the server never stores (`chat.service.ts:348`, `:316`) | Read

## Checked and fine

- Text, image and file messages are gated by purpose, MIME and size on the server (`upload-security.service.ts:178, 235`).
- REST send de-duplicates on `client_message_id`, scoped to sender and thread.
- The patient-app queue survives restart (AsyncStorage) and enqueues before sending.
- The provider's `chatMap` reverses history correctly (`chatMap.ts:48`).

## Not verified

- LiveKit permission-denial behaviour (throws or silent) for the native and web denial cases: `livekit-client` is not installed on this checkout.
- Hold and mute surviving a reconnect: nothing re-applies them, but no reconnect was run.
- iOS HEIC photos (the server sniff table has no HEIC); `apiFetch` offline detection and `SocketContext` reconnect.
- patient-web thread page and ConsultPage mounting, so web tick display is unverified.
- Production `UPLOAD_SCAN` mode and ClamAV availability.
- Whether the patient-web proxy forwards idempotency keys, and idempotency replay under 403 or 5xx.
- Whether incoming-call push links open `/room/[id]`, which joins but never ends the session.
- `WebhookReceiver` constructor signature in the installed LiveKit SDK (`livekit.service.ts:406`).
