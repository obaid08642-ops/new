# Calls and chat test matrix

Status key: **PASS** = run and seen to pass. **FAIL** = run and failed (the defect is in `findings/calls-chat.md`).
**CODE-REVIEWED** = no run, but the code path was read and its findings are listed. **NOT RUN** = automatable, not run in this sweep (reason given). **NOT AUTOMATABLE** = needs a real device, store build or browser that this runner does not have.

Branch `qa/calls-chat-matrix`, from `main` at 0444c814. No product code changed.

## Automated checks run (2026-10-31, this runner)

| Check | Command | Result |
|---|---|---|
| patient-web call, chat and consult libs | `cd patient-web && npx vitest run lib/calls lib/chat lib/consult` | 10 files, 111 tests, PASS. One test-only warning: `voice-note-player.test.tsx` renders without a `timeZone` (next-intl ENVIRONMENT_FALLBACK). |
| backend chat and livekit specs | `cd backend && npx jest src/modules/chat src/modules/livekit --runInBand` | 10 suites, 64 tests, PASS |
| live call journey (web) | `tools/live/j_web_call.py` | NOT RUN: needs the full local stack (MongoDB replica set, Redis, backend, admin and patient web, LiveKit on :7880). Its last run (`qa/e2e-sweep-account`, 2026-10-30) reached the doctor's start step once; a later run failed on a booking window that had passed (test-stack note H-1). |
| live chat journey | `tools/live/j_chat.py` | NOT RUN: same stack requirement |

## Platforms

| Platform | Status | Reason |
|---|---|---|
| Web, Chrome (Chromium) | NOT RUN (live) / CODE-REVIEWED | Only Chromium is installed (`/opt/pw-browsers/chromium`). The live stack is not started in this sweep. |
| Web, Safari (WebKit) | NOT AUTOMATABLE here | WebKit is not installed on the runner |
| Web, Firefox | NOT AUTOMATABLE here | Firefox is not installed on the runner |
| Android (patient app, provider app) | NOT AUTOMATABLE here | No device or emulator; Maestro is not installed. `tools/live/device_farm.yml` is the intended runner. |
| iOS (patient app, provider app) | NOT AUTOMATABLE here | No simulator or device; no store build |

## Network

| Cell | Status | Reason / finding |
|---|---|---|
| Wi-Fi, web call connects | NOT RUN | Needs the live stack |
| Wi-Fi, native call connects | NOT AUTOMATABLE | Device required |
| 4G / 3G throttled, web | NOT RUN | `tools/live/j_throttled_network.py` covers reconnect and the offline banner, not in-call audio downgrade. The in-call downgrade is broken (web review: `patient-web/components-next/video-room-client.tsx:78`). |
| Network switch mid-call, web | NOT RUN | No journey covers a native-style switch; `patient-web/acceptance/d-31` is a starting point. Reconnect state is weak (findings in `calls-chat.md`). |
| Network switch mid-call, native | CODE-REVIEWED | No Reconnecting/Reconnected handling in patient-app (`video-call.tsx:153`); see findings |
| Auto-reconnect within seconds | CODE-REVIEWED | Web: `video-room-client.tsx` has no reconnect UI path verified. Provider: reconnect re-enables mic and camera (`VideoCallRoom.tsx:162`). |
| Offline chat queue, reconnect | CODE-REVIEWED | Queue is kept across restart; flushes only while the thread screen is open (see findings) |

## Calls

| Cell | Status | Reason / finding |
|---|---|---|
| Audio-only call | CODE-REVIEWED | `startAudioOnly` exists on web; no automated journey |
| Video call | NOT RUN | Live stack required |
| Camera flip | CODE-REVIEWED: absent on web (`lib/consult/call-resilience.ts:35`) | Native: not verified (see findings) |
| Mute | CODE-REVIEWED | Native mute effect re-enables mic during hold (`video-call.tsx:251`) |
| Hold | CODE-REVIEWED | No hold control on web; native hold ignores the held state in the mute effect |
| Camera and microphone permission denied, web | CODE-REVIEWED | Permission error is swallowed (`video-room-client.tsx:102`); a refused camera also loses the mic |
| Camera and microphone permission denied, native | CODE-REVIEWED | Patient: `denied` never cleared (`video-call.tsx:176`); provider: refused permission leaves the room connected and retry makes a second room (`VideoCallRoom.tsx:179`) |
| Relay-only ICE (TURN) | NOT RUN | `backend/infra/livekit.yaml:13` has a placeholder TURN domain |
| Two parallel calls | NOT RUN | Not built |

## Chat

| Cell | Status | Reason / finding |
|---|---|---|
| Text, patient to doctor | CODE-REVIEWED; unit tests PASS (backend chat specs) | Patient screen shows history newest-first (`chat-with-doctor.tsx:132`, P0) |
| Text, doctor to patient | CODE-REVIEWED | Provider reverses correctly (`chatMap.ts:48`) |
| Image | CODE-REVIEWED | Server checks purpose, MIME and size (`upload-security.service.ts:178, 235`). Provider room shows a placeholder, not the image (`ChatSystem.tsx:246`). |
| File | CODE-REVIEWED | Provider room shows only a name (`ChatSystem.tsx:246`) |
| Voice note | CODE-REVIEWED | Voice gate keys on the client-sent type (`chat.service.ts:291`) |
| Offline queue, send once | CODE-REVIEWED | Head-of-line block on permanent failure (`outbox.ts:67`) |
| Sent / delivered / seen ticks | CODE-REVIEWED | No client calls `/read` or `/delivered` (see findings) |
| Consultation window, server enforced | CODE-REVIEWED | Window check fails open on error (`chat.service.ts:293`); `booking_kind` comes from the client (`chat.service.ts:280`, P0) |
| Push when receiver offline | CODE-REVIEWED | `chat.message_sent` emitted twice (`chat.service.ts:418`) |

## Next steps

1. Start the local stack and run `tools/live/j_web_call.py` and `tools/live/j_chat.py` with a future booking window. Record the results here.
2. Install Firefox and WebKit on the runner (`playwright install firefox webkit`) and repeat the web call cell in each.
3. Add a Playwright spec for permission denied and the network switch (Chromium, CDP offline toggle), on top of `tools/live/j_web_call.py`.
4. Mobile cells stay NOT AUTOMATABLE until Maestro or a device farm is attached.
