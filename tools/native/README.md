# Native E2E (Android + iOS, Maestro)

`.github/workflows/native-e2e.yml` builds a release APK of patient-app or provider-app, starts the real test stack on the
runner (backend, MongoDB, Redis, S3/SMTP/payment/Saudi Post/ClamAV doubles, admin BFF), seeds data with the live journeys
(`seed.py`), runs the Maestro flows on an Android emulator (`flows/`) and, if asked, crawls every screen
(`native_crawl.py`). `report.py` merges the results into `NATIVE_REPORT.md` (the run summary and the artifact `native-report`):
pass/fail per Maestro flow first, then the crawl.

**Triggers:** manual (`workflow_dispatch`) and a **nightly run at 01:23 UTC** of both apps on both platforms (**every flow** in `flows/`, first target); there is no pull_request or push trigger because it is slow and costs runner minutes.
Inputs: `app` (patient | provider | both), `platform` (android | ios | both), `flow` (part of a flow file name, e.g. `login`, `consultation_booking`, `chat`, `pharmacy_order`, or `all` / `none`; default `login`; the nightly run uses `all`), `crawl`
(true/false, default false) and `target` (patient shard `0/6`..`5/6` or provider type; empty = the first, `all` = every one).
From a terminal: `gh workflow run native-e2e.yml --ref <branch> -f app=patient -f flow=login`.

Flows are `flows/<app>_<name>.yaml`, the same files on both platforms; controls are found by testID, not by text. The runner runs every
`flows/<app>_*.yaml` that `NATIVE_FLOW` selects, prints `flow <name>: ok|reason` and fails the job when one failed.

| Flow | What it does (all through the real screens, against the seeded backend) |
|---|---|
| `patient_login` | fresh install -> language -> intro -> Welcome -> log in -> Home |
| `patient_consultation_booking` | Consultations tab -> first doctor -> profile -> Book (tomorrow, first free time) -> confirm, pay at the clinic -> booking placed -> booking status |
| `patient_chat` | Consultations -> appointments -> Past -> the seeded finished appointment -> chat; asserts a doctor message posted before the flow (receive) and one sent from the app (send) |
| `patient_pharmacy_order` | Pharmacy tab -> add a medicine -> cart -> checkout (the seeded address, cash) -> request sent -> broadcast status ("waiting for offers"); no offer is required |
| `provider_login` | provider sign-in (text-based: provider-app has no testIDs on those screens) |

`flows/lib/patient_signin.yaml` is the shared sign-in sub-flow every patient flow starts with (`runFlow: lib/patient_signin.yaml`; it is in a
sub-folder so the runner does not run it alone). It keeps the platform differences: iOS types the e-mail in three parts around the `@`,
Android hides the keyboard, and both answer the emulator's "isn't responding" dialog.

A flow can have a **setup step** `setup/<app>_<name>.py`, run by the runner before the flow, acting through the real APIs. It receives the
accounts file (`seed.py` writes the patient, every provider type and every approved doctor) and the text of `DOCTOR_MSG`, and prints one JSON
line whose entries reach the flow as `-e` variables. `setup/patient_chat.py` signs the seeded patient in, finds the appointment whose chat one of
the seeded doctors can open, makes that doctor post `DOCTOR_MSG` (`POST /provider/chat/send`, as the provider app does) and prints `APPT_ID`.
Every flow also gets `DOCTOR_MSG` and `APP_MSG` (unique texts for the chat flow).

`python3 -m unittest tools/native/test_flow_ids.py` (needs PyYAML) checks, without an emulator, that each flow is valid YAML, that every `id:`
exists as a testID in the app source (literal, template, or derived by a shared component), that sub-flow files exist and that every `${VAR}`
is supplied by the runners or a setup script. The testIDs the journeys needed and the app lacked were added as one-line props (tab bar tabs
`main-tab-bar-<tab>`, `book-day-<i>`, `book-slot-<i>`, `appointment-<id>-open`, `chat-input`); the screens look the same.

`routes.py` reads the patient routes from `patient-app/app`, so the crawl follows today's screens.

Test-build-only workarounds in `build_android.sh` are each tied to an open defect (Q58, Q62, Q63, Q67, Q68); they are detected
from the checkout (a `jcenter()` user, a duplicate WebRTC, a version mismatch), so each switches itself off once its defect is fixed.

## iOS simulator (macos-latest)

`build-ios` makes an unsigned simulator build (`build_ios.sh`: `expo prebuild -p ios`, App Transport Security opened for the local test
backend, `pod install`, `xcodebuild -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO`); `run-ios` starts the same test stack (`ci_stack.sh`
takes MongoDB and Redis from Homebrew on macOS, which has no Docker), boots the newest iPhone simulator, sets the app language to Arabic
and runs the **same Maestro files** (`run_job_ios.sh`). The screen crawl uses adb and stays Android only. Result tags start with
`ios_`, so the report lists iOS and Android flows side by side.

## Real-device smoke (Firebase Test Lab)

The `ftl` job builds an arm64 release APK and runs a 3-minute Robo test on a physical Pixel 6 (free Spark-plan quota is a few physical-device
runs per day). Google's devices cannot reach the test stack, so it checks install, launch and onboarding without a crash, not sign-in.
**The owner must create**: a Firebase project with the Test Lab API enabled, a service account with the role *Firebase Test Lab Admin*
(plus *Service Usage Consumer* and storage access to the default results bucket), and add its JSON key as the repository secret
`FIREBASE_TEST_LAB_SA` and the project id as `FIREBASE_PROJECT_ID`. Until then the job passes and says "not configured".

## Not done: two-device caller/callee flow

Maestro drives one device per `maestro test`; two flows can run in parallel on two devices but cannot wait for each other, so a caller
flow plus a callee flow would need a shared signal (for example both polling the backend session) and two emulators on one runner
(about 2x the RAM) with a patient and a provider app installed. It is not built; the call itself is covered by the unit tests and the
manual device matrix in the calls PRs.
