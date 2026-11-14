# Push and calls matrix (app × platform × state × event)

Written from the code at `main` (2026-11-03). Nothing here was run on a device: no device, emulator push or push key exists on this runner. What CI proves without a key is the static section "CI check" below.
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
| Missed-call notice (nobody answers) | PASS in this PR: `LiveKitService.sweepUnanswered` (`livekit.service.ts`, every minute) marks a call still INITIATED after 2 min as MISSED and emits `call.missed`; `push.module.ts` `onCallMissed` sends `call_missed` (the client ends the ringing on it, `ringTask.ts:32`) and notifications.service writes the notice. Tests `livekit.cancel.spec.ts` (3 new). Runs only in the background-work process role (`process-role.ts:26`); calls created before this change carry no callee and are skipped |
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
| any | incoming call | Android: code PASS (revised, the earlier FAIL is out of date): `provider-app/src/utils/callkeep.ts` (CallKeep), `src/calls/ringTask.ts` (data-only push → system call screen), `package.json` has `react-native-callkeep` and `expo-task-manager`, `app.json` has `USE_FULL_SCREEN_INTENT`, `MANAGE_OWN_CALLS`, `FOREGROUND_SERVICE_PHONE_CALL`. The ConnectionService was **not declared** in the manifest (FAIL, fixed in this PR by `plugins/with-callkeep-android-service.js`, checked on the built APK in CI); sending NEEDS-KEY FCM | iOS: FAIL `src/calls/voipPush.ts:28` loads `react-native-voip-push-notification`, which is in neither `package.json` nor the lockfile (the `require` is wrapped, so it silently returns null): no PushKit token, no ring when killed |
| killed / locked | call | Android: UNVERIFIED on a device (needs FCM key + a phone); the static prerequisites are checked in CI. iOS: FAIL, same PushKit module gap | same |
| killed / locked | chat / booking | NEEDS-KEY | NEEDS-KEY |
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
1. iOS: add `react-native-voip-push-notification` (config plugin + AppDelegate `reportNewIncomingCall` call) to BOTH apps: `patient-app/src/calls/voipPush.ts` and `provider-app/src/calls/voipPush.ts` already require it, neither `package.json` lists it, so the iOS killed-app ring cannot work. Needs a native rebuild and a device to prove, so it is not done blind here.
2. ~~Provider app: CallKeep + ring task~~ exists on `main` (`provider-app/src/calls/*`, commit 3bdc4d793); what was missing was the Android ConnectionService declaration in both apps: fixed in this PR.
3. Backend: per-app VoIP topic.
4. Both apps: badge counts from unread items; battery-optimisation guidance screen (needs six-language strings).

Done in this PR: `call_cancelled` push (backend). Corrected: sign-out token removal already works server-side.
5. A real-device run of every cell marked UNVERIFIED once the keys are installed.


## CI check (no key, no device): `tools/native/calls_static_check.py`
Run by `native-e2e.yml` on every built app (`build` for the release APK, `build-ios` for the simulator `.app`); results also go to the job summary.
| Check | Where | Gate |
|---|---|---|
| `service:connection`, `service:bind-permission`: the merged manifest declares `io.wazo.callkeep.VoiceConnectionService` with action `android.telecom.ConnectionService` and `BIND_TELECOM_CONNECTION_SERVICE` | Android APK, both apps | required (red if missing); proven on a prebuilt manifest, it FAILS without the plugin and PASSES with it |
| `perm:` `MANAGE_OWN_CALLS`, `USE_FULL_SCREEN_INTENT`, `FOREGROUND_SERVICE_PHONE_CALL`, `FOREGROUND_SERVICE_MICROPHONE` | Android APK, both apps | required |
| `plist:voip`, `plist:remote-notification`: `UIBackgroundModes` | iOS `.app`, both apps | required |
| `binary:pushkit`: the binary links `PushKit.framework` | iOS `.app`, both apps | reported, not gated: it is the known PushKit gap above, so it shows FAIL until the module is added |

Not provable without a device or a key: that the phone actually rings killed or locked, answer and decline from the lock screen, and every NEEDS-KEY cell. Those wait for the keys in `docs/ops/PUSH_KEYS.md` (APNs: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_AUTH_KEY`, `APNS_BUNDLE_ID`; the four Firebase app files: `docs/ops/FIREBASE_SETUP.md`).
