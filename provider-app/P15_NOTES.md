# P15 — Phase 15 (Resilience), provider-app slice

Branch `p15-prov`. Worktree `.../T/opencode/p15/prov`. No `git push` was run; the
orchestrator merges.

| Task | Commit | Result |
|---|---|---|
| 15.1 one API client | `b4d9189` | PASS |
| 15.5 no blank screens + Sentry | `6a07c9c` | PASS (live Sentry send BLOCKED) |
| 15.10 devices + device farm | `bd35bac` | PASS for code/config (farm run BLOCKED) |

Commands used throughout (bare `npx jest` in this repo resolves a wrong cached copy and
rejects `--testPathPatterns`; this repo's Jest wants `--testPathPattern`):

```
cd provider-app
node node_modules/jest/bin/jest.js --silent
node node_modules/typescript/bin/tsc --noEmit
```

`git` needs `DEVELOPER_DIR=/Library/Developer/CommandLineTools` on this machine
(`/usr/bin/git` shells out to `xcrun`; `xcode-select -p` points at a missing Xcode.app).
Pre-existing, unrelated to this work.

---

## Verification pass (independent audit of the three commits)

A second session re-verified all three tasks from scratch rather than trusting the
implementation. What was independently confirmed, with commands:

### 15.1 — the consolidation is real, not claimed

```
$ grep -rnE "(^|[^.[:alnum:]_$])fetch[[:space:]]*\(" src --include='*.ts' --include='*.tsx' | grep -v __tests__
NONE
$ grep -rn "axios.create" src --include='*.ts' --include='*.tsx' | grep -v __tests__
src/api/client.ts:317:export const client: AxiosInstance = axios.create({
$ grep -rln "from '.*api/client'" src | grep -v __tests__ | wc -l
119
```
0 raw `fetch(`, exactly 1 `axios.create` (in `src/api/client.ts`), 119 modules importing
the shared client.

### 15.1 — the timeout classification is grounded in real endpoints, not invented

The URL heuristic (`/storage/` → 60 s, `/ai/` → 45 s) was checked against the backend and
against real call sites:

```
$ grep -nE "@(Post|Get|Put|Delete)\(" ../backend/src/modules/storage/storage.module.ts
380:  @Post('upload')
$ grep -n "client.post" src/api/provider.ts
94:      const res = await client.post('/storage/upload', {…
$ grep -rn "ai/drug-interactions" src
178:      const res: any = await client.post('/ai/drug-interactions', …)
$ grep -rnE "@Controller\(" ../backend/src --include='*.ts' | grep -iE "storage|ai"
../backend/src/modules/storage/storage.module.ts:375:@Controller('storage')
../backend/src/modules/ai/ai.controller.ts:11:@Controller('ai')
```
Both classified prefixes correspond to real backend controllers and real provider-app call
sites, so the 60 s / 45 s budgets are armed on requests that actually exist.

### 15.1 — error-catalog parity proven without the shipped test

The parity test was not trusted; the app table was extracted and compared to the backend
JSON field-by-field:

```
backend codes: 14 | app codes: 14
missing in app : []
invented in app: []
PARITY: EXACT (all codes, both locales, both fields)
backend per-code locales: ["en","ar"]
```

### 15.5 — boundaries really are mounted, Sentry really is a dependency

```
$ grep -nE "ErrorBoundary|ScreenBoundary|SafeAreaProvider" App.tsx
194:    <SafeAreaProvider>
194:      <ErrorBoundary screenName="AppRoot">
197:        <DeviceGate>
202:              <ScreenBoundary name="AppNavigator">
… plus a ScreenBoundary on all 7 registration wizards, Welcome, Login, ForgotPassword,
  Pending, MedicalJobs, MedicalDrugIndex and all 7 provider dashboard navigators.

$ node -e "…print sentry/expo-device/safe-area deps…"
 "@sentry/react-native": "~7.11.0",
 "expo-device": "~57.0.1",
 "react-native-safe-area-context": "~5.7.0"
$ ls -d node_modules/@sentry/react-native node_modules/expo-device
node_modules/@sentry/react-native
node_modules/expo-device
```

### 15.10 — minimum OS is read from the toolchain, not invented

```
$ grep -n -A3 "platforms" node_modules/expo/Expo.podspec
39:    :ios => '16.4',
$ grep -n "minSdk" node_modules/react-native/gradle/libs.versions.toml
3:minSdk = "24"
```
iOS 16.4+ / Android 7+ is exactly what Expo SDK 57 / RN 0.86 compile against.

### 15.10 — device farm: config validates offline, `--run` refuses to fabricate

```
$ node devicefarm/run.js --validate
matrix OK: 8 devices, 6 environments, minimum iOS 16.4 / Android 7
… 48 gcloud invocations printed (8 devices × 6 environments) …
(--validate/--plan only: no farm contacted, no report produced)
EXIT=0

$ node devicefarm/run.js --run
BLOCKED: `gcloud` is not installed. Firebase Test Lab is driven through the gcloud CLI.
```
`--run` exits non-zero rather than printing a report it cannot produce. The matrix asserts
the contract's device classes exist (`run.js:60-71`), so deleting the Huawei entry fails
validation.

### No skips, no weakening, no placeholders

```
$ grep -rnE "\.(skip|only)\(|xit\(|xdescribe\(|it\.todo|test\.todo|describe\.skip" src
(no skipped/only tests found)
$ grep -rnE "TODO|FIXME|XXX|placeholder|not implemented" src/api src/components/ErrorBoundary.tsx \
    src/utils/sentry.ts src/deviceSupport devicefarm App.tsx app.config.js
(none)
```
`OtpModal.test.tsx` and `OtpModal.tsx` were **not** touched by any P15 commit
(`git diff f0551ec..HEAD` on both paths is empty), so the pre-existing suite was neither
weakened nor skipped.

---

## The pre-existing OtpModal failure — root cause identified

The brief described it as "error thrown at `Object.describe`, line 16". Reproduced on a
pristine copy of the baseline commit (`git archive f0551ec`, worktree-local, since removed):

```
FAIL src/components/__tests__/OtpModal.test.tsx (35.835 s)
  ● … › pasting the full code fills all six boxes and a correct code closes the modal
    thrown: "Exceeded timeout of 5000 ms for a test."
      16 | describe('OtpModal (provider sign-up / email verification)', () => {
    > 17 |   it('pasting the full code …', async () => {
      at it (src/components/__tests__/OtpModal.test.tsx:17:3)
      at Object.describe (src/components/__tests__/OtpModal.test.tsx:16:1)
```

`Object.describe … :16` is only the Jest **stack frame** that registered the failing `it`,
not a module-load throw. The real failure is Jest's **default 5 s per-test timeout**, hit by
the first test in the file (13187 ms).

Root cause, established by experiment rather than inference: the cost is a **cold Babel/Jest
transform cache**, which the first test in a suite absorbs. Warm cache, unmodified baseline:

```
=== BASELINE PROBE, warm cache, run 1 ===   (f0551ec, zero P15 code)
PASS src/components/__tests__/OtpModal.test.tsx (5.491 s)
    ✓ pasting the full code fills all six boxes … (1203 ms)
Tests:       5 passed, 5 total
```

So the failure is a cold-cache artifact of the *environment*, reproducible on unmodified
baseline code, and **not caused by P15**. It appears when the machine is loaded (baseline
full-suite run: 94.9 s for this file; ~1200 ms when warm and idle).

I did **not** modify the suite, and I am not claiming credit for it going green. It is
listed here as a diagnosed pre-existing flake with a reproducible cause.

---

## Mutation proof (rule 6) — re-run independently

Backups were kept **inside the worktree** (`.p15-verify-bak/`, removed afterwards) and
restored with `shasum -c` before each next mutation. Restore verified; `git status` clean.

**Mutation 1 — make every method retry-eligible (deletes the idempotency gate):**
```
$ node node_modules/jest/bin/jest.js --testPathPattern "client.resilience" -t "RETRY"
    ✕ the pure policy: safe methods yes, others only with a caller key (16 ms)
    ✕ DOES NOT RETRY: a POST without an idempotency key is attempted exactly once (933 ms)
    ✕ DOES NOT RETRY across every unsafe method without a caller key (901 ms)
Tests:       3 failed, 20 skipped, 9 passed, 32 total
```
Covers contract test #3 (no retry for a non-idempotent POST without a key).

**Mutation 2 — default timeout 15 s → 60 s:**
```
$ node node_modules/jest/bin/jest.js --testPathPattern "client.resilience" -t "timeout"
    ✕ budgets every request: 15 s default, 60 s upload, 45 s AI (19 ms)
    ✕ arms that budget on the request it actually sends (20 ms)
    ✕ FIRES: rejects once the 15 s budget elapses, mapped to the catalog (40007 ms)
    ✕ a fired timeout on a safe request is retried, then reported as retryable (60001 ms)
Tests:       4 failed, 27 skipped, 1 passed, 32 total

$ node node_modules/jest/bin/jest.js --testPathPattern "singleClient"
    ✕ the shared client enforces the documented guarantees (3 ms)
Tests:       1 failed, 5 passed, 6 total
```
Covers contract test #1 (the timeout fires).

**Mutation 3 — drop the release from `Sentry.init`:**
```
$ node node_modules/jest/bin/jest.js --testPathPattern "ErrorBoundary"
    ✕ passes the release to Sentry.init so every event is tied to a build (15 ms)
Tests:       1 failed, 13 passed, 14 total
```

**Mutation 4 — boundary renders children even after a throw (i.e. the blank screen):**
```
$ node node_modules/jest/bin/jest.js --testPathPattern "ErrorBoundary"
    ✕ a thrown render error shows the fallback, not a white screen (120 ms)
    ✕ names the screen that broke, so the report is locatable (101 ms)
    ✕ offers "contact support" and defaults to the support URL (62 ms)
    ✕ routes "contact support" to the in-app handler when one is supplied (4 ms)
    ✕ a caught render error is reported, tagged with the screen (15 ms)
    ✕ stays disabled without a DSN rather than crashing at startup (29 ms)
    ✕ clears the error and re-renders the children once the cause is fixed (11 ms)
Tests:       7 failed, 7 passed, 14 total
```
Covers contract 15.5 "a thrown render error shows the fallback, not a white screen".

**Mutation 5 — lower the iOS floor 16.4 → 12.0:**
```
$ node node_modules/jest/bin/jest.js --testPathPattern "deviceSupport"
Tests:       3 failed, 16 passed, 19 total
```

**Restore verification:**
```
$ shasum -c .p15-verify-bak/SHA256SUMS.pre
src/api/client.ts: OK
src/utils/sentry.ts: OK
src/deviceSupport/minOs.ts: OK
RESTORED OK
$ git status --porcelain -- . ':!node_modules'
(empty except the untracked notes file and node_modules symlinks)
```

---

## Retry-After (contract test #2) — verified by running the suite

```
$ node node_modules/jest/bin/jest.js --testPathPattern "client.resilience"
PASS src/api/__tests__/client.resilience.test.ts (75.699 s)
Tests:       32 passed, 32 total
```
Including `✓ RETRIES: waits the server-specified delay before the next attempt` and
`✓ a server Retry-After wins over the computed backoff`, plus
`✓ parses both Retry-After forms` (delta-seconds and HTTP-date, `parseRetryAfter` at
`src/api/client.ts:138`).

---

## Design decisions worth a reviewer's attention

1. **An auto-generated `Idempotency-Key` does NOT make a POST retryable.** The request
   interceptor adds a random key to every mutation for the backend's `@RequireIdempotency`
   check (`client.ts:343-347`). Treating that random key as a retry guarantee would make
   required test #3 vacuous, so `isRetryEligible` returns `false` for keys the client
   generated itself and only honours a **caller-supplied** key (`client.ts:107-116`).
2. **A timeout is not "offline".** `codeForStatus` maps "no HTTP response" to
   `SERVICE_UNAVAILABLE`, but a timeout gets `offline: false` + `remedy: 'retry'`, while a
   genuine transport failure gets `offline: true` + `remedy: 'check_connection'`
   (`client.ts:390-394`). The retry gate captures reachability *before* recording the
   failure, so the first blip on a connected device is still retried instead of
   immediately condemning the app offline.
3. **Cancellation is honoured by a real screen, not just the API surface.**
   `MedicalDrugIndexScreen.tsx:193,209,225` passes `AbortController` signals, so closing the
   screen cancels in-flight requests.
4. **The root error boundary reads `SafeAreaInsetsContext` directly**, not
   `useSafeAreaInsets()`, because the root boundary sits above `SafeAreaProvider` where
   that hook throws — a fallback that can itself crash is the blank screen this component
   prevents. `ErrorBoundary.test.tsx` asserts the no-provider case.

### Preserved behaviour (regression risk checked)

`reset-password` previously regex-matched the backend message to decide "wrong code →
bounce back to the OTP step". Catalog-mapped errors no longer carry that text, so
`backendDetail(err)` (`client.ts:245`) exposes the raw payload and the screen reads the OTP
signal from there. Flow control is unchanged; user-visible text is now the localized
catalog entry.

---

## Final state

```
$ node node_modules/typescript/bin/tsc --noEmit
TSC_EXIT=0

$ node node_modules/jest/bin/jest.js --silent
PASS src/deviceSupport/__tests__/deviceSupport.test.tsx (10.298 s)
PASS src/components/__tests__/ErrorBoundary.test.tsx (11.023 s)
PASS src/api/__tests__/singleClient.test.js
BLOCKED: `gcloud` is not installed. Firebase Test Lab is driven through the gcloud CLI.
PASS src/deviceSupport/__tests__/deviceFarmConfig.test.js
PASS ./provider-app.contracts.test.js
PASS src/screens/shared/video-call-room.livekit.test.js
PASS src/utils/version-check.test.js
PASS src/api/__tests__/errorCatalog.parity.test.js
PASS src/components/__tests__/OtpModal.test.tsx (13.213 s)
PASS src/api/__tests__/client.resilience.test.ts (75.699 s)

Test Suites: 10 passed, 10 total
Tests:       107 passed, 107 total
Snapshots:   0 total
Time:        79.852 s
```

(The `BLOCKED: gcloud` line is stdout from `devicefarm/run.js --run` inside a passing test —
the runner correctly refusing to fabricate a report.)

### vs the stated baseline

| | baseline | final |
|---|---|---|
| Test suites | 1 failed, 3 passed, **4 total** | **10 passed, 10 total** |
| Tests | 1 failed, 26 passed, **27 total** | **107 passed, 107 total** |
| `tsc --noEmit` | clean | clean |
| Suites added | — | 6 = 80 tests |
| Tests added | — | +80 |

`OtpModal` passes now, but as shown above that is a cold-cache artifact and it reproduces on
unmodified baseline code — **not** a fix, and not claimed as one.

`client.resilience.test.ts` takes ~75 s. Two tests deliberately wait the **real** 15 s and
3 × 15 s budgets with real timers, because "the timeout fires" is only meaningful if the
timer actually fires at the documented value. The other timeout assertions are instant.

---

## BLOCKED

- **BLOCKED: Sentry DSN is an owner secret.** `EXPO_PUBLIC_SENTRY_DSN` and
  `SENTRY_AUTH_TOKEN` are unavailable, so the live event send and the source-map upload
  cannot be exercised. Wiring, release injection, screen tagging, the no-DSN-safe path and
  the tests are done and verified against a mocked Sentry module. **No claim is made that an
  event reached Sentry.**
- **BLOCKED: device farm is a paid external service with no account configured.** No farm
  run was performed; **no "0 blocking issues" report exists**, and none is fabricated.
  `gcloud` is not installed and this machine has no docker, so there was no local
  substitute. The committed `.maestro/provider-smoke.yaml` flow has **never been executed
  against a binary** — it is written against the real literal strings the welcome screen
  renders, but "written correctly" is not "verified". `devicefarm/README.md` lists the
  owner actions.
- **BLOCKED: the shared `node_modules` target was emptied mid-task by another agent's
  aborted install**, removing `jest` and `tsc`. `package.json`/`package-lock.json` in this
  worktree were confirmed byte-identical to that directory before restoring the tree with
  `npm install --no-audit --no-fund --prefer-offline`. All worktrees share one install
  directory — **coordinate dependency installs across agents.**

## DEFERRED-OUT-OF-SCOPE

- **DEFERRED-OUT-OF-SCOPE: the device-farm CI workflow.** `node devicefarm/run.js --run`
  should be a required check in `.github/workflows/`, but `.github/` is owned by another
  agent. `devicefarm/README.md` lists the owner actions and the exact command.
- **DEFERRED-OUT-OF-SCOPE: the web half of 15.10.** The contract's 15.10 also covers Safari
  iOS 16+, Chrome Android, Samsung Internet and desktop browsers via Playwright in CI. That
  belongs to `patient-web/` and a Playwright harness, neither in `provider-app/`. What is
  covered here: `DeviceGate` treats `Platform.OS === 'web'` as having no minimum-OS floor,
  so the web build is unaffected.
- **DEFERRED-OUT-OF-SCOPE: localizing the catalog beyond ar/en.** The backend's
  `error-catalog.ts` declares `SUPPORTED_LOCALES = ['ar','en']` while the product ships
  ar/en/ur/hi/bn/fil. That file is read-only for me, so provider-app mirrors the backend
  exactly and `errorCatalog.parity.test.js` fails on drift. Adding ur/hi/bn/fil needs a
  backend change first.

## Other environment notes

- `@testing-library/react-native` 14 + React 19 has a quirk here: once an error boundary in
  a test file has both **caught** and **recovered**, later `render()` calls in that file
  return null trees. `ErrorBoundary.test.tsx` puts its single recovery test last, with a
  comment explaining why. `render()` and `rerender()` are async and must be awaited.
- `jest.setup.js` stubs `@sentry/react-native`: it ships ESM outside the transform ignore
  patterns, so importing it from a component threw `SyntaxError: Unexpected token 'export'`
  before any test body ran. Tests that assert on reporting override the factory.
- Do not keep mutation backups in `/tmp` while agents run concurrently — a prior session had
  its backup overwritten by another agent's identical path. Use a worktree-local directory.
