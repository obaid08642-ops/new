# Native E2E status (patient app), 2026-10-31

Source of truth for what ran. Workflow: `.github/workflows/native-e2e.yml` (nightly + manual). Flows: `tools/native/flows/patient_*.yaml`
(the booking, chat and pharmacy flows are in PR #2225). Only results that were read from a finished job log are marked PASS or FAIL.

## Matrix (patient app)

| Flow | Android | iOS |
|---|---|---|
| login | not run: the release build failed before any flow (see below) | **FAIL** (run 100, 2026-10-31 02:08): see below |
| consultation booking | not run | not run |
| chat (send and receive) | not run | not run |
| pharmacy order | not run | not run |

"Not run" means no emulator or simulator executed the flow; it does not mean it passed.

## What the runs showed

- **Android build, run 101 (job `build (patient)`): FAIL.** `assembleRelease` failed after 21 minutes in `lintVitalAnalyzeRelease`: Android lint crashed
  (`Comparison method violates its general contract`, `AppLinksValidDetector`) on the many `https` intent-filter entries in `app.json`.
  This also fails any real release build. Fix: PR #2250 (a config plugin that disables only the six app-link detectors named in the crash).
  Not yet confirmed by a green build.
- **iOS login, run 100: FAIL at sign-in.** Backend, simulator boot, app launch, language step, intro and Welcome all passed. After typing the email and the
  password, the identifier field held `n@nabd.test` + the password and the password field was empty, so the app said "check your details".
  Either the first characters are dropped while the keyboard comes up, or the tap on the password field did not move focus. The sign-in
  sub-flow now waits between keystrokes and asserts the identifier field before the password, so the next run names the cause (commit 599615263 on `ci/native-e2e-journeys`). Not yet re-run.
- **Pending:** Android run 102 (flow=all, with the lint fix) was queued on a runner for more than an hour at the time of writing.

## Notes

- The seeding step logs `otp_no_channel` 503s for the journeys' register/login calls (the backend sends a phone-only OTP by push only): the seeds still complete.
- A second dispatch on the same branch cancels the run in progress (workflow concurrency): wait for a run to finish before dispatching again.
- iOS can reuse a build with the `ios_build_run` input only when the app code did not change; the new testIDs of #2225 change it.

## Expo builds

`expo export` succeeded locally for the patient app (Android and iOS bundles) and the provider app (Android) on main at 2026-10-31. `expo-doctor` (patient app) lists two
advisory items (a custom `metro.config.js`; `react-native-callkeep` untested on the New Architecture). No EAS build and no native binary build was run for the provider app.
