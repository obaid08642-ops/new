# Calls: cross-platform matrix

Every pairing of patient and doctor must connect, hear, and (for video) see. All sides use LiveKit (`livekit-client` 2.x) over WebRTC.

## Minimum versions (from the build, not guesses)
| Platform | Minimum | Source |
|---|---|---|
| iOS app | 15.1 | React Native 0.88 `min_ios_version_supported` |
| Android app | API 24 (Android 7.0) | React Native 0.88 `minSdk = 24` |
| Android full-screen call (ringing locked) | Android 10+ for reliable full-screen intent; Android 14+ may need the user to grant it | platform behaviour |
| Chrome / Edge (desktop, Android) | current − 2 | WebRTC + VP8 |
| Firefox | current − 2 | WebRTC + VP8 |
| Safari macOS / iOS Safari | 15.4+ (reliable `getUserMedia` + VP8) | WebRTC |

## Codecs
- Video is published as **VP8** everywhere (web, patient app, provider app): decoded by every browser and by libwebrtc, simulcast works on all of them (180p / 360p / 720p layers).
- Web falls back to **H.264** only if the browser's `RTCRtpSender.getCapabilities('video')` has no VP8 (`pickVideoCodec`).
- Audio is Opus with DTX; the "audio only" advice from the server still drops video on weak links.
- H.264 hardware encode (battery) is not used on purpose: mixed H.264 profiles between Safari, Android and libwebrtc are the usual cause of black video.

## Matrix (what is covered by what)
| Caller ↔ callee | Automated | Real device |
|---|---|---|
| Web Chrome ↔ Web Chrome/Firefox/Safari | codec and room options unit tests; Playwright flows in `native-e2e`/web e2e when run | **not verified** here |
| Web ↔ Android app | options tests | **not verified** |
| Web ↔ iOS app | options tests | **not verified** |
| Android ↔ iOS | options tests | **not verified** |
| iOS Safari ↔ any | `pickVideoCodec` test | **not verified** |

Device runs belong to the Firebase Test Lab / real-device smoke job (see the iOS simulator e2e item); until it exists the "Real device" column stays **not verified**.
