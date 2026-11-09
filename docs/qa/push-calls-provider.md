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
| Token registered | **NEEDS-KEY**: FCM token via `getDevicePushTokenAsync`, sent to `/push/register` (`notifications.ts:65-91`); needs `google-services.json` in the build and the Firebase service account on the backend (`FIREBASE_*`) | **NEEDS-KEY**: Expo token needs `EXPO_PUBLIC_PROJECT_ID` (`notifications.ts:75`; without it no token at all) and an APNs key in the Expo or Firebase project |
| App open | **PASS**: handler shows banner and sound (`notifications.ts:15-22`). The list does **not** refresh by itself: **FAIL** `App.tsx:102` passes an empty received-callback (register R4) | same |
| Background | **PASS (code)**: notification message, `priority: high`, channel `new_order` (`notifications.service.ts` `sendFcmPush`), test `notify-provider-push-channel.spec.ts` | **NEEDS-KEY**: APNs sound `new_order.wav` bundled by the plugin (prebuild checked) |
| Killed | **PASS (code)**: the system shows a notification message without the app running; the tap starts the app and opens the target (`App.tsx:103`) | **NEEDS-KEY** (same) |
| Phone locked | **PASS (code)**: channel is public on the lock screen, heads-up, sound and vibration. A user who turned the channel off or Do Not Disturb on is not overridden (Android rule) | **NEEDS-KEY**; an iOS Focus mode can silence it, and a time-sensitive entitlement is not set (**FAIL**, `app.json` has no `UNNotificationInterruptionLevel`; needs a native entitlement decision) |
| Tap opens the order | doctor: **PASS** appointment detail (`pushRouting.ts:33`). lab, radiology, nursing, pharmacy, facility: **PARTIAL** the notifications list, because those dashboards have no order route (orders are cards in the dashboard); **FAIL** until each gets a detail route | same |

## Chat message
| State | Android | iOS |
|---|---|---|
| App open | **PASS**: socket (`chat.gateway.ts`); push only for recipients who are offline (`push.module.ts` `onChatMessage`) | same |
| Background / killed / locked | **NEEDS-KEY**: push on `default` (high), private on the lock screen | **NEEDS-KEY** |
| Tap opens the thread | lab: **PASS** `chat` route. doctor, nursing, pharmacy, radiology, facility: **FAIL**, no thread route (chat is a tab or a list); lands on the notifications list | same |

## Incoming call
Ported from the patient app (`patient-app/src/calls/*`, `utils/callkeep.ts`): `provider-app/src/calls/{ringTask,voipPush,callkeepLogic,activeCall,callHold,callSignals,openCall}.ts`, `src/utils/callkeep.ts` (react-native-callkeep: CallKit on iOS, ConnectionService on Android), `src/screens/shared/IncomingCallScreen.tsx`. The token is registered with `call_ring: canRingNatively()` (`notifications.ts`), so the backend sends the call as a data-only, high-priority, 30 s push (`push.module.ts` `fcmMessage` ring path); Android runs `nabd-call-ring` (expo-task-manager) and shows the system call screen, iOS rings from PushKit.

| State | Android | iOS |
|---|---|---|
| App open | **PASS (code)**: `App.tsx` `received` shows the system call screen, else the in-app `IncomingCall` screen | same |
| Background | **NEEDS-KEY**: data-only push runs the ring task; needs `google-services.json` + Firebase service account, and a development build (not Expo Go) | **NEEDS-KEY**: PushKit VoIP push; needs the APNs key and the `react-native-voip-push-notification` native module (`voipPush.ts` is a no-op without it, as in the patient app) |
| Killed | **NEEDS-KEY** (same as background; the task runs without the app) | **NEEDS-KEY** (same) |
| Phone locked | **NEEDS-KEY**: full-screen intent (`USE_FULL_SCREEN_INTENT`, `MANAGE_OWN_CALLS` added to `app.json`). Android 14 asks the user to allow full-screen intents; not grantable from code | **NEEDS-KEY**: CallKit shows the lock-screen call UI |
| Answer | **PASS (code)**: `answerCall` opens `CallRoom` for the session (`callkeep.ts`, `openCall.ts` waits up to 20 s for a killed app to restore the session); `VideoCallRoom` joins the existing session, it does not start a new one | same |
| Decline / caller hangs up | **PASS (code)**: `endCall` posts `/calls/:id/reject` only if it was never answered; a `call_missed` push dismisses the ringing screen | same |
| Second call while in one | **PASS (code)**: answered busy (`activeCall.ts`) | same |
| Phone call interrupts | **PASS (code)**: hold stops audio/video, resume restarts, room kept (`callHold.ts`, `VideoCallRoom.tsx`) | same |
| No native module (Expo Go, web) | **PASS**: a high-priority notification on the `calls` channel; tapping it opens the in-app `IncomingCall` screen (`pushRouting.ts`) | same |

Tests: `src/calls/__tests__/ring.test.ts` (payload handling, answer/decline, busy), `pushRouting.test.ts`. Nothing rang on a device.

Still **FAIL** or open: the backend sends `call_missed` when a call ends unanswered but no `call_cancelled`; a caller hanging up while the phone is ringing is told to the app through `call_missed` only. The `@react-native-firebase/*` dependencies stay unused.

## Counts
Order or booking: PASS(code) or NEEDS-KEY except 2 FAIL (list refresh, iOS interruption level) and 1 PARTIAL (tap target for 5 of 6 provider types). Chat: 2 NEEDS-KEY, 1 PASS, 1 FAIL (tap target). Calls: 8 PASS(code) or NEEDS-KEY rows, 0 FAIL. Needs from the owner: `google-services.json`, `GoogleService-Info.plist`, `EXPO_PUBLIC_PROJECT_ID`, APNs key (push and VoIP), Firebase service account on the backend, the PushKit native module in the iOS build, and the brand new-order sound (the file is a generated placeholder tone; replace it under the same name).
