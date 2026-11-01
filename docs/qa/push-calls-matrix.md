# Push and calls matrix (app × platform × state × event)

Written from the code at `main` (2026-10-31). Nothing here was run on a device: no device, emulator or push key exists on this runner.
Cell values: **PASS** = covered by a test named in the cell; **NEEDS-KEY** = code is ready, a key is missing (names in `docs/ops/PUSH_KEYS.md`); **FAIL** = a gap, with file:line; **UNVERIFIED** = code exists but no test or device run proves it.
"States": open / background / killed / locked (screen off).

## Backend (all apps)
| Item | Result |
|---|---|
| FCM HTTP v1, data-only HIGH priority, ttl 30 s for ringing calls | PASS code `backend/src/modules/push/push.module.ts:522-535`, test `push.call-ring.spec.ts`; sending NEEDS-KEY `FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY` |
| Chat/notification on their own channels (`calls` / `default`) | PASS code `push.module.ts:542`, `:651` |
| APNs token-based (.p8) alert path | NEEDS-KEY `APNS_KEY_ID/APNS_TEAM_ID/APNS_AUTH_KEY/APNS_BUNDLE_ID` (`:195-266`) |
| APNs VoIP push, topic `<bundle>.voip`, push-type voip, priority 10, expiry 30 s | NEEDS-KEY, same four (`:549-585`) |
| VoIP topic per app | FAIL `push.module.ts:565` uses one `APNS_TOPIC`/`APNS_BUNDLE_ID` for every app; the provider app (if its bundle id differs) cannot get VoIP |
| Web Push (VAPID) | NEEDS-KEY `WEB_PUSH_VAPID_*` (`:273-315`); ops task `97b-vapid-generate.sh` creates them |
| Retried and logged | Queue retries 3× with exponential backoff (`:473`, `:479`) and results are counted in `PushLog`. FAIL: the APNs/FCM calls inside one attempt are single-shot (`:33` says so on purpose, a repeat could notify twice) and `sendApnsVoip` has no retry |
| Cancel notice (caller hangs up while ringing) | PASS in this PR: `livekit.service.ts` `endCall` emits `call.cancelled` when the session was still INITIATED; `push.module.ts` `onCallCancelled` sends `call_cancelled` data-only, high priority, never PushKit (tests `livekit.cancel.spec.ts`, `push.call-ring.spec.ts`). Client end-ringing logic: `ringTask.ts:32` (PASS, `call-ring.test.ts`) |
| Missed-call notice (nobody answers) | FAIL: `onCallMissed` exists (`push.module.ts`) but nothing emits `call.missed` (no ring-timeout job in `livekit.service.ts`); needs a timer on INITIATED sessions after `RINGING_MS`. Not built |
| Tokens removed on sign-out | PASS (correction of the earlier FAIL): logout ends the session server-side and `auth.service.ts:315` calls `removeForSessions`; register stores `session_id` (`push.module.ts:389`). Test `push.sessions.spec.ts`, `auth.sessions.spec.ts:51`. The apps need no extra call |

## Patient app
| State | Event | Android | iOS |
|---|---|---|---|
| open | incoming call | UNVERIFIED `app/consultations/incoming-call.tsx`; `call-ring.test.ts` covers the payload logic | same |
| open | chat / booking / order | UNVERIFIED `NotificationHandler.tsx:127-142` routes by `data.type` | same |
| background | incoming call | NEEDS-KEY FCM. Code: data-only push runs `nabd-call-ring` task (`src/calls/ringTask.ts:73-81`) into CallKeep `displayIncomingCall` (`src/utils/callkeep.ts:134`); PASS test `call-ring.test.ts` (payload → ring/end) | NEEDS-KEY APNs, and FAIL native module: `react-native-voip-push-notification` is not in `patient-app/package.json`; `voipPush.ts:23-27` is a no-op without it, so iOS rings only through the normal alert push (no CallKit) |
| killed | incoming call | NEEDS-KEY FCM. Task defined at module load (`ringTask.ts:73`), but UNVERIFIED on a device (native E2E #2260 does not cover push) | FAIL same module gap; `startVoipListeners` is designed to run before auth (`voipPush.ts:63-66`) |
| locked | incoming call | Permissions present: `USE_FULL_SCREEN_INTENT`, `MANAGE_OWN_CALLS`, `FOREGROUND_SERVICE_PHONE_CALL` (`app.json`). UNVERIFIED: ringtone channel importance; the patient `calls` channel is created in `src/utils/notifications.ts` (check importance there) | FAIL same module gap |
| any | answer / decline from lock screen | UNVERIFIED (CallKeep `answerCall`/`endCall` handlers in `callkeep.ts`) | UNVERIFIED |
| any | chat message | NEEDS-KEY FCM (`default` channel) | NEEDS-KEY APNs alert |
| any | booking / order | NEEDS-KEY, same | NEEDS-KEY, same |
| any | tap → right screen | UNVERIFIED `NotificationHandler.tsx:127-142` | same |
| any | missed / cancel stops ringing | PASS `ringAction` end branch (`ringTask.ts:36`, test `call-ring.test.ts`); depends on the backend gap above | same |
| any | token register on sign-in | PASS code `usePushNotifications.ts`, VoIP token after auth (`voipPush.ts:40-52`) | same |
| any | battery-optimisation guidance | FAIL no screen or text anywhere in `patient-app/src` or `app/` (grep `battery` finds none) | n/a |
| any | badge | FAIL only `setBadgeCountAsync(0)` (`src/services/Notifications.ts:128`); no count set from unread | same |

## Provider app
| State | Event | Android | iOS |
|---|---|---|---|
| open / background | chat, booking, order | NEEDS-KEY FCM; token registered as `fcm` (`provider-app/src/utils/notifications.ts:49-65`); tap handling UNVERIFIED | provider iOS registers an **Expo** token only (`:45-64`, `provider: 'expo'`): it needs Expo push, not APNs direct (NEEDS-KEY `EXPO_TOKEN` plus APNs key uploaded to Expo, or add `getDevicePushTokenAsync` for iOS) |
| any | incoming call | FAIL no CallKeep, no ring task, no full-screen intent: `provider-app/package.json` has no `react-native-callkeep` or `expo-task-manager`, and `calls` channel importance MAX (`notifications.ts:98`) only shows a heads-up banner, not a ringing call screen | FAIL no CallKit/PushKit at all |
| killed / locked | any | FAIL for calls (above); chat/booking NEEDS-KEY | same |
| any | token removed on sign-out | PASS (server-side, see Backend) |
| any | badge | FAIL: nothing sets a badge count from unread items (`push.module.ts` sends `badge: 1` always; app only resets to 0 at `patient-app/src/services/Notifications.ts:128`); provider has none |
| any | deep link on tap | UNVERIFIED: response listener exists (`initNotificationListeners`), router target not traced |

## Web (patient-web)
| State | Event | Result |
|---|---|---|
| tab open | incoming call | UNVERIFIED an in-page ring exists in `lib/calls` (vitest passes per `calls-chat-matrix.md`), no end-to-end run |
| tab closed, browser running | chat / booking / order | NEEDS-KEY `WEB_PUSH_VAPID_*`. Service worker `public/sw.js:8-30` shows the notification and `notificationclick` opens/focuses the URL (`:32-`). Subscribe UI `components-next/settings/browser-push-ask.tsx`; `lib/web-push.test.ts` PASS |
| tab closed, browser running | incoming call | Notification only (Web Push), no ringtone, auto-dismiss not verified |
| browser fully closed / phone locked | any | Honest limit: browsers cannot ring like a phone. A closed browser receives nothing on desktop; Android Chrome may show the notification if the OS keeps the browser's push service alive; iOS needs the site added to the Home Screen (installed PWA) |

## What must be built (not keys), in priority order
1. iOS: add `react-native-voip-push-notification` (config plugin + AppDelegate `reportNewIncomingCall` call) to the patient app; same for the provider app if providers receive calls.
2. Provider app: CallKeep + ring task (mirror `patient-app/src/calls/ringTask.ts` and `src/utils/callkeep.ts`).
3. Backend: per-app VoIP topic; emit `call.missed` after the ring timeout.
4. Both apps: badge counts from unread items; battery-optimisation guidance screen (needs six-language strings).

Done in this PR: `call_cancelled` push (backend). Corrected: sign-out token removal already works server-side.
5. A real-device run of every cell marked UNVERIFIED once the keys are installed.
