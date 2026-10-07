# Device farm — provider-app (Phase 15.10)

This directory holds the **configuration** for the device-farm gate required by
`docs/audit/02_AGENT_EXECUTION_PLAN.md` §15.10.

It does **not** contain a report. See "What is NOT here" below.

## Minimum supported OS

| Platform | Minimum | Source of truth |
|---|---|---|
| iOS | **16.4** | `node_modules/expo/Expo.podspec` → `s.platforms = { :ios => '16.4' }` |
| Android | **7.0** (API 24) | `node_modules/react-native/gradle/libs.versions.toml` → `minSdk = "24"` |

These are not policy choices: Expo SDK 57 (RN 0.86) compiles against them, so a build
from this repo cannot run below them at all.

The runtime gate lives in `src/deviceSupport/minOs.ts` + `src/deviceSupport/DeviceGate.tsx`
and is mounted in `App.tsx` above the navigator. A device below the floor gets a
bilingual explanation naming the floor and a button to `https://nabd.plus`, instead of
an install that launches into a broken screen. Covered by
`src/deviceSupport/__tests__/deviceSupport.test.tsx`.

> The build-time floors are already enforced by CocoaPods and Gradle. The runtime gate is
> for devices that reach the store listing on an older build (or via a sideloaded APK),
> which the compiler cannot warn about.

## Coverage

`firebase-testlab.yml` encodes the contract's required coverage:

| Class | Devices |
|---|---|
| small phone | iPhone SE (3rd gen), Pixel 2 |
| large phone | iPhone 15 Pro Max, Pixel 8 Pro |
| tablet | iPad Pro 11", 7" Android tablet |
| low-end Android, 3 GB RAM | Moto G5 Plus |
| no Google services | Huawei P20 (BrowserStack — see below) |

Crossed with 6 environments: `en`/`ar` × light/dark, plus font scale 200 % for both
locales. 8 device entries × 6 environments = 48 planned runs.

The Huawei entry is the one device Firebase Test Lab cannot host (no GMS images), so it
targets BrowserStack App Automate instead. `provider: browserstack` in the matrix routes
it there; that is a second paid account, not a free addition.

## Running it

```bash
cd provider-app

# Offline. Parses the matrix, checks it actually covers the contract, prints the plan.
node devicefarm/run.js --validate

# The real run. Needs: a Firebase Test Lab project, billing, `gcloud`, and an EAS
# production binary. See "What is NOT here".
node devicefarm/run.js --run
```

`--validate` is what CI can run today. It fails (exit 1) if the matrix stops covering a
required class, loses the iPhone SE / Pro Max / Huawei entries, drops the 2–3 GB
low-end device, loses a locale, dark mode or the 200 % font scale, or leaves a device
without an explicit `blocking` flag.

The run itself uses `.maestro/provider-smoke.yaml` (`--test-spec`), one `gcloud firebase
test` invocation per (device × environment), because `gcloud` takes a single locale per
run.

## What is NOT here

**BLOCKED: device farm is a paid external service with no account configured.**

Specifically, not done and not faked:

- **No farm run was performed.** No "0 blocking issues" report exists, and none is
  committed. `docs/audit/02_AGENT_EXECUTION_PLAN.md` §15.10 asks for "a device-farm report
  per release with 0 blocking issues" as the verification; that line cannot be satisfied
  here.
- **The Maestro flow has never run against a binary.** It is written against the real
  literal strings rendered by `WelcomeScreen`, but "written correctly" is not "verified".
- **`gcloud` is not installed on this machine** (checked: `gcloud not found`), and this
  machine has no docker, so no local substitute was possible.
- **No Firebase Test Lab project, billing account or BrowserStack credentials exist.**
  These are owner actions, same class as the Sentry DSN in §15.5.

`run.js` deliberately `fail()`s with a non-zero exit in this situation rather than
printing a plausible-looking report.

## Owner actions to turn this on

1. Create a Firebase Test Lab project and enable billing; grant the CI service account
   `firebase.testRunner` on it.
2. Set `GOOGLE_APPLICATION_CREDENTIALS` (or `gcloud auth application-default login`).
3. Set `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` so the run uploads symbols
   and source maps — otherwise a crash found here is unreadable.
4. Build the production binary with EAS and point `--app` at the `.apk` / `.app`.
5. For the Huawei entry, add BrowserStack App Automate credentials.
6. Wire `node devicefarm/run.js --run` into the release workflow as a required check.

## Related

`docs/review/NATIVE_CI_PROPOSAL.md` already proposes Maestro on GitHub-hosted runners for
single-device native CI. This matrix is the broader release gate and complements it; it
is deliberately kept inside `provider-app/` so the device coverage for this app is
reviewable next to the app it tests.