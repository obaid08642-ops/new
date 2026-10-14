# Native test CI — proposal (not enabled)

Status: **proposal only.** Nothing here has been added to `.github/workflows`, no secrets were created and nothing is billed. It needs the owner's approval first.

## Why
The reviewer container has no `/dev/kvm` and no macOS, so the patient and provider apps can only be tested as react-native-web builds in Chromium. These behaviours are therefore **unverified**:
- camera and document scan, image picker;
- push notifications (foreground, background, killed);
- biometrics;
- native date/time pickers, maps, LiveKit video;
- OS deep links, permissions dialogs;
- platform layout (safe areas, keyboard, fonts);
- real device performance.

## What exists already
- `patient-app/.detoxrc.js` and `patient-app/e2e/firstTest.e2e.js`.
  - The test is out of date: it expects "مرحباً زائر", tab texts, etc.
  - There is no `android/` or `ios/` folder. Expo is managed, so a build needs `npx expo prebuild`.
- `eas.json` in both apps, with development, preview and production profiles. There is no EAS token in this environment.

## Recommended setup: Maestro on GitHub-hosted runners (no EAS account needed for CI)
Maestro is preferred over Detox:
- it drives the release build as a black box, so there are no test hooks in native code;
- flows are YAML that the reviewer can write from the inventory;
- it supports Android and iOS from the same flows.

| Job | Runner | Steps | Est. time per run |
|---|---|---|---|
| `android-e2e` | `ubuntu-latest` (has KVM) | checkout → `npx expo prebuild -p android` → `./gradlew assembleRelease` (debug-signed) → `reactivecircus/android-emulator-runner` (API 34, x86_64, `pixel_6`) → install APK → `maestro test .maestro/` → upload screenshots/JUnit | 25–35 min |
| `ios-e2e` | `macos-14` | checkout → `npx expo prebuild -p ios` → `xcodebuild -sdk iphonesimulator` (no signing) → boot iPhone 15 simulator → `maestro test .maestro/` → upload | 35–50 min |

- **Backend for the app under test:** the job starts the same stack as the reviewer container (docker Mongo replica set, Redis, built backend, mail sink, fake gateway). The app is built with `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8002/api/v1` on Android, `localhost` on iOS.
- **Data:** synthetic accounts created by `tools/live/j_onboarding.py` at job start, deleted at the end.
- **Triggers** (to control cost):
  - `workflow_dispatch` plus a nightly schedule;
  - not on every PR. The PR stays on web plus unit tests.
- **Cost:**
  - Linux minutes are cheap and free on public repos;
  - **macOS minutes are billed at about 10× Linux** on private repos (≈ 40 min × 10 = 400 Linux-minute equivalents per run);
  - start with Android nightly only, and iOS weekly.

### Flows to write first (highest risk that the web build cannot cover)
1. Patient sign-up with OTP, then biometric enable prompt (verify the prompt appears; the biometric itself needs a device).
2. Doctor booking with the native date picker, then cash payment, then the appointment visible in the provider app (second emulator or API check).
3. Pharmacy prescription upload via image picker (the emulator camera returns a test image).
4. Provider document upload in onboarding (image picker / document picker).
5. Push notification: the backend sends to the emulator's FCM token. This needs a Firebase test project → secret `FIREBASE_SERVICE_ACCOUNT`. **Owner action.**
6. Deep link `nabdplus-provider://order/<id>` opens the order.

## Still not covered even with CI
- Real camera hardware.
- Real biometrics: emulators can simulate fingerprint (`adb -e emu finger touch 1`); the iOS simulator can simulate Face ID (enrolled/matching), but not real hardware.
- Carrier SMS.
- Battery and thermal performance.
- These need a device farm (Firebase Test Lab or BrowserStack App Automate; needs credentials and billing) or the owner's phones with EAS internal builds.

## Owner decisions needed
1. Approve adding `.github/workflows/native-e2e.yml` (Android nightly; iOS weekly or manual).
2. Approve committing generated native projects, or prebuilding in CI only (recommended: CI only, not committed).
3. Optional: provide a Firebase test project (push) and an Expo token (EAS builds) as GitHub secrets.
4. Optional: a device-farm account for real hardware.
