# Provider app: push and calls matrix (rows for `docs/qa/push-calls-matrix.md`)

Status: **PASS** = the code path is complete and proven by a test or a prebuild; **NEEDS-KEY** = the code is ready but a credential or file that is not in the repo is required; **FAIL** = not working, with the file:line. **Nothing here was observed on a phone**: there is no device, no FCM project and no APNs key in this environment. PASS therefore means "proven in code and by tests", never "heard ringing".

## What changed in this PR
- One push setup (`provider-app/src/utils/notifications.ts`). The second one (`PushNotifications.ts`) fetched a token and threw it away and re-created the `default` channel at another importance; it is deleted.
- Android channels created at app start and before any push (`notifications.ts:119`): `new_order` (maximum importance, long vibration, its own sound `assets/sounds/new_order.wav`, public on the lock screen), `calls`, `default` (high).
- Taps are handled: app in the background (`App.tsx:102`) and app started by the tap from a killed state (`App.tsx:103`). Target per provider type in `src/utils/pushRouting.ts`.
- Backend: the provider notice push now says which channel and sound (`notifications.service.ts` `sendPush`), FCM with high priority and the channel (it had neither, so a dozing phone held it back and it landed on the quiet channel), Expo with `channelId`, `priority: high`, and the booking id and type in the data for the tap. Shared mapper `backend/src/common/push-channel.ts`.
- `app.json`: the notifications plugin bundles the sound and sets the default channel; iOS `UIBackgroundModes: remote-notification`. `app.config.js` takes `google-services.json` / `GoogleService-Info.plist` by path when they exist (never committed; ignored in `.gitignore`). `expo prebuild` for both platforms was run: the sound lands in `res/raw`, the background mode in `Info.plist`.

## Order or booking arrives (new_request)
| State | Android | iOS |
|---|---|---|
| Token registered | **NEEDS-KEY**: FCM token via `getDevicePushTokenAsync`, sent to `/push/register` (`notifications.ts:62-91`); needs `google-services.json` in the build and the Firebase service account on the backend (`FIREBASE_*`) | **NEEDS-KEY**: Expo token needs `EXPO_PUBLIC_PROJECT_ID` (`notifications.ts:66`; without it no token at all) and an APNs key in the Expo or Firebase project |
| App open | **PASS**: handler shows banner and sound (`notifications.ts:21-29`). The list does **not** refresh by itself: **FAIL** `App.tsx:102` passes an empty received-callback (register R4) | same |
| Background | **PASS (code)**: notification message, `priority: high`, channel `new_order` (`notifications.service.ts` `sendFcmPush`), test `notify-provider-push-channel.spec.ts` | **NEEDS-KEY**: APNs sound `new_order.wav` bundled by the plugin (prebuild checked) |
| Killed | **PASS (code)**: the system shows a notification message without the app running; the tap starts the app and opens the target (`App.tsx:103`) | **NEEDS-KEY** (same) |
| Phone locked | **PASS (code)**: channel is public on the lock screen, heads-up, sound and vibration. A user who turned the channel off or Do Not Disturb on is not overridden (Android rule) | **NEEDS-KEY**; an iOS Focus mode can silence it, and a time-sensitive entitlement is not set (**FAIL**, `app.json` has no `UNNotificationInterruptionLevel`; needs a native entitlement decision) |
| Tap opens the order | doctor: **PASS** appointment detail (`pushRouting.ts:36`). lab, radiology, nursing, pharmacy, facility: **PARTIAL** the notifications list, because those dashboards have no order route (orders are cards in the dashboard); **FAIL** until each gets a detail route | same |

## Chat message
| State | Android | iOS |
|---|---|---|
| App open | **PASS**: socket (`chat.gateway.ts`); push only for recipients who are offline (`push.module.ts` `onChatMessage`) | same |
| Background / killed / locked | **NEEDS-KEY**: push on `default` (high), private on the lock screen | **NEEDS-KEY** |
| Tap opens the thread | lab: **PASS** `chat` route. doctor, nursing, pharmacy, radiology, facility: **FAIL**, no thread route (chat is a tab or a list); lands on the notifications list | same |

## Incoming call
| State | Android | iOS |
|---|---|---|
| Any state | **FAIL**: the provider app has no CallKit / ConnectionService / PushKit. `grep -ri callkeep provider-app/src` finds nothing; the patient app has them (`patient-app/src/calls/*`, `react-native-callkeep`). The backend sends `call.incoming` as an alert push on the `calls` channel (`push.module.ts:808-820`): it appears like a notification, with the default sound once, and cannot be answered from the lock screen | **FAIL** (same); no `voip` background mode, no `apns_voip` token registered |
| Tap on the call push | **FAIL**: resolves to the notifications list (`pushRouting.ts`); the room screen (`VideoCallRoom.tsx`) starts a call by appointment id, it cannot join a session id from a push | same |

Needed from H (shared plumbing): port `callkeepLogic`, `ringTask`, `voipPush` and the `react-native-callkeep` / `react-native-voip-push-notification` config plugins to the provider app, a join-by-session entry in `VideoCallRoom`, a data-only FCM handler that rings in a killed app, and the APNs VoIP key. `@react-native-firebase/app` and `/messaging` are in `provider-app/package.json` but used nowhere and not configured; they are dead weight until that port decides whether to use them.

## Counts
Order or booking: 5 rows PASS(code) or NEEDS-KEY, 2 FAIL (list refresh, iOS interruption level), 1 PARTIAL (tap target for 5 of 6 provider types). Chat: 2 NEEDS-KEY, 1 PASS, 1 FAIL (tap target for 5 of 6 types). Calls: 2 FAIL (all states, tap). Needs from the owner: `google-services.json`, `GoogleService-Info.plist`, `EXPO_PUBLIC_PROJECT_ID`, APNs key, Firebase service account on the backend, and a decision on the new-order sound (the file is a generated placeholder tone; replace it with the brand sound under the same name).
