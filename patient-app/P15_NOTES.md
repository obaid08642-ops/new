# Phase 15 (Resilience) — patient-app slice

Branch `p15-app`. Worktree `/var/folders/f1/j1zvgjbj0m16m2rwky7f5zqr0000gn/T/opencode/p15/app`.
Everything below was run in `patient-app/` with the local binaries
(`node node_modules/jest/bin/jest.js`, `node node_modules/typescript/bin/tsc`).

## Commits

| Task | SHA | Summary |
|---|---|---|
| 15.1 | `e38ab01` | one API client: timeouts, retries with `Retry-After`, cancellation, offline, catalogue |
| 15.3 | `777d21d` | optimistic UI only where safe; never for payment/booking/Rx/emergency |
| 15.4 | `25a5359` | outbox, cached reads, resumable uploads, image budget, call fallback |
| 15.5 | `7b81864` | root + per-screen error boundaries, Sentry releases |

---

## Baseline measured BEFORE any change

The task brief quotes `3 failed suites / 1 failed test`. **On this machine I measured
something different**, so the numbers below are mine, not the brief's:

```
$ node node_modules/jest/bin/jest.js --silent
FAIL src/services/HttpClient.offline.test.ts
FAIL src/hooks/__tests__/push-router.test.ts

Test Suites: 2 failed, 51 passed, 53 total
Tests:       180 passed, 180 total
```
(reproduced twice, identical both times)

```
$ node node_modules/typescript/bin/tsc --noEmit
TSC_EXIT=0
```

Both failing suites failed for the stated reason (`react-native-localize` needs the
native TurboModule, which does not exist under Jest), and both were suite-level
failures, so no individual test was counted as failed — hence `180 passed / 0 failed`
rather than the brief's `179 / 1`.

**Both baseline failures are now fixed** as a side effect of the 15.1 work (see
15.1 "Un-broke the RN dependency"). Final state is 61/61 suites and 353/353 tests green.

---

## 15.1 — One API client per app

### What changed

**New `src/services/http/` — the single network implementation**

| File | Role |
|---|---|
| `client.ts` | `httpRequest()`: the only place that calls `fetch`. Timeout via `AbortController`, retry loop, catalogue mapping. |
| `policy.ts` | `REQUEST_TIMEOUTS` (15 s / 60 s upload / 45 s AI), `isSafeMethod`, `isRetryEligible`, `parseRetryAfter`, `computeRetryDelay`, `decideRetry`. |
| `connectivity.ts` | one offline signal: NetInfo push events + transport outcomes. |
| `errors.ts` | `ApiError` (stable machine token in `message`, localized sentence in `userMessage`, instruction in `nextStep`), `describeError`, `toApiError`. |
| `errorCatalog.ts` + `errors.i18n.json` | the 13.R5 catalogue on the client. |
| `axiosAdapter.ts` | an axios adapter backed by `httpRequest`, so RTK Query and the axios call sites share the policy. |

**Consolidation.** The three former `apiFetch` implementations now all resolve to
one client:

- `src/utils/api.ts` (≈170 call sites) — the public face. Keeps its path and
  `(endpoint, options: RequestInit)` signature. It only does what is app-specific:
  read the token from `SecureStore`, attach auth + idempotency key, clear the session
  on a 401.
- `src/services/HttpClient.ts` — no longer a second client. `adapter: singleClientAdapter`
  routes every axios call through `httpRequest`. Its retry logic was **deleted** (retry
  ownership moved to the client); what remains in the interceptor is only the app-level
  contract the offline test asserts — a mutation that never reached the server is not
  replayed, queued, or reported as success — plus the 13.R5 envelope → `AppError` mapping.
- `utils/api.ts` (root) — a re-export shim. No network code, no `axios` import. Its three
  call sites (`app/(auth)/login.tsx`, `app/(auth)/welcome.tsx`, `src/core/platform/auth/SessionManager.ts`
  for `BASE_URL`) keep resolving. The comment marks it as a shim so nobody imports from
  it again.

**Screen-close cancellation.** `apiFetch` accepts `signal` (part of the `RequestInit` it
already took). `src/hooks/useRequestSignal.ts` supplies one that aborts on unmount;
wired into `app/notifications/index.tsx`.

**Error catalogue — the decision the brief asked me to justify.**
`errors.i18n.json` is a **byte-for-byte copy** of `backend/src/common/errors.i18n.json`,
not a re-typed set of strings. Rationale: Metro cannot import from `backend/`, the
backend cannot be edited from this slice, and a hand-typed copy is exactly how a client
ends up serving a message the server never emits. `errorCatalog.parity.test.ts` reads
both files and fails the suite if they drift.

The copied catalogue carries **`ar` + `en` only** (the backend's `SUPPORTED_LOCALES`),
while the app ships six locales. `resolveCatalogLocale` falls back to **`ar`** (the app
default) for `ur/hi/bn/fil` rather than leaking an English sentence into a non-English
UI. `CATALOG_LOCALES.sort()` is asserted to be exactly `['ar','en']` so the shortfall is
visible rather than silent.

`ErrorHandler.tsx` was split: all parsing/typing/catalogue logic moved to
`src/services/errors.ts` (no React imports), leaving only the boundary component in
`.tsx`. Everything is re-exported, so `@/services/ErrorHandler` imports are unchanged.

### Why `fetch` and not axios as the transport

RN's `XMLHttpRequest` cannot distinguish "aborted because the screen closed" from
"aborted by our own timeout", and has no usable `Retry-After` access on abort. Wrapping
the fetch core in an **axios adapter** preserves the axios surface (`baseApi`'s
`axiosBaseQuery` shape, `HttpRemoteDataSource`, `http.get/post`, the interceptors the
existing offline test reaches into), so consolidation did not require rewriting 170
call sites.

### Retry eligibility — the subtle part

The client auto-generates an `Idempotency-Key` for mutations, because routes marked
`@RequireIdempotency` answer `400 idempotency_key_required` without one. That key
de-duplicates *one* attempt. So retry eligibility is **safe method OR caller-supplied
key** — the auto key never unlocks a replay. `apiFetch` records
`callerSuppliedIdempotencyKey = headers.get('Idempotency-Key') != null` **before** it
auto-generates one, and passes that. `retryable: false` (used for payments) forbids a
replay even when a key is present.

### Verify (all three required checks)

`src/services/http/client.resilience.test.ts` (30 tests) and
`src/utils/api.resilience.test.ts` (9 tests).

```
$ node node_modules/jest/bin/jest.js src/services/http/ src/utils/api.resilience.test.ts
PASS src/services/http/errorCatalog.parity.test.ts
PASS src/services/http/client.resilience.test.ts
PASS src/services/http/consolidation.test.ts
PASS src/utils/api.resilience.test.ts
Tests: 42 passed, 42 total   (30 + 3 + 9)
```

1. **the timeout fires** — `client.resilience.test.ts` "rejects with TIMEOUT_ERROR after
   the configured budget instead of waiting forever", "gives every request a timeout even
   when the caller supplies none", "a timed-out request is not retried even for a safe
   method"; plus `api.resilience.test.ts` "gives up after 15 s instead of waiting forever
   on a weak network" (asserts exactly 1 fetch).
2. **a retry honours `Retry-After`** — "waits the number of seconds the server asked for
   before replaying a safe read" (both `Retry-After` forms and the ceiling are unit
   tested), and `api.resilience.test.ts` measures real elapsed wall-clock between the two
   attempts (700–1200 ms for `Retry-After: 1`).
3. **no retry for a non-idempotent POST without an idempotency key** — 6 tests, including
   a network failure, a 500, a DELETE without a key, and the positive control that the
   same POST *is* replayed when the caller supplies a key (and the key is reused on the
   replay).

### Un-broke the RN dependency (side effect, both baseline suites now pass)

`HttpClient.ts` → `ErrorHandler.tsx` → `design-system` → `AppContext` → `react-native-localize`
was why `HttpClient.offline.test.ts` could not even load. `HttpClient` now imports the
pure `./errors` module, and `push-router.test.ts` (which reaches `HttpClient` via
`usePushNotifications`) benefits too. **No test was skipped, deleted or weakened** — the
suite `HttpClient.offline.test.ts` is byte-identical and now passes.

### Mutation proof (rule 6)

```
$ cp src/services/http/client.ts /tmp/client.ts.bak
$ cp src/services/http/policy.ts /tmp/policy.ts.bak

########## MUTATION 1: the timeout never aborts ##########
$ python3 -c "... setTimeout(() => { /* MUTATION: no abort */ }, timeoutMs)"
$ node node_modules/jest/bin/jest.js src/services/http/client.resilience.test.ts src/utils/api.resilience.test.ts
  ● 15.1 · apiFetch · no retry for a non-idempotent POST without a key › replays a POST that carries the caller's own idempotency key, reusing that key
  ● 15.1 · apiFetch · retry honours Retry-After › waits the server-requested delay before replaying a safe read
  ● 15.1 · apiFetch · timeout › gives up after 15 s instead of waiting forever on a weak network
  ● 15.1 · the timeout fires › a timed-out request is not retried even for a safe method
  ● 15.1 · the timeout fires › gives every request a timeout even when the caller supplies none
  ● 15.1 · the timeout fires › rejects with TIMEOUT_ERROR after the configured budget instead of waiting forever
Test Suites: 2 failed, 2 total
Tests:       6 failed, 33 passed, 39 total

########## MUTATION 2: Retry-After ignored (use the backoff base instead) ##########
  ● 15.1 · a retry honours Retry-After › waits the number of seconds the server asked for before replaying a safe read
  ● 15.1 · apiFetch · retry honours Retry-After › waits the server-requested delay before replaying a safe read
Test Suites: 2 failed, 2 total
Tests:       2 failed, 37 passed, 39 total

########## MUTATION 3: non-idempotent POST becomes retryable ##########
  ● 15.1 · a retry honours Retry-After › decideRetry reports why it refused, so the reason is assertable
  ● 15.1 · apiFetch · no retry for a non-idempotent POST without a key › makes one attempt for a POST that gets a 500
  ● 15.1 · apiFetch · no retry for a non-idempotent POST without a key › makes one attempt for a POST that only received the auto-generated key
  ● 15.1 · apiFetch · no retry for a non-idempotent POST without a key › retryable:false forbids a replay even when a key is present — payments never replay
  ● 15.1 · no retry for a non-idempotent POST without an idempotency key › makes exactly one attempt when the POST gets a 500, even with retries enabled
  ● 15.1 · no retry for a non-idempotent POST without an idempotency key › makes exactly one attempt when the POST has no caller-supplied key
  ● 15.1 · no retry for a non-idempotent POST without an idempotency key › replays HEAD and OPTIONS but not DELETE-without-key
Test Suites: 2 failed, 2 total
Tests:       7 failed, 32 passed, 39 total

########## RESTORED ##########
Test Suites: 2 passed, 2 total
Tests:       39 passed, 39 total
```

### BLOCKED / DEFERRED

- `DEFERRED-OUT-OF-SCOPE: migrating the three call sites of the root utils/api.ts onto
  src/utils/api.ts — the file is now a re-export shim that satisfies them identically, so
  the migration is cosmetic. Deferred to a later sweep that also updates the deprecation
  comment.` Not required: the brief only said "migrate the call sites of the other two",
  and both are now single-sourced.
- `DEFERRED-OUT-OF-SCOPE: backend/src/common/error-catalog.ts SUPPORTED_LOCALES cannot be
  extended to six locales from this slice. The client-side fallback to 'ar' is implemented
  and tested; adding ur/hi/bn/fil to the backend catalogue is a backend change.`

---

## 15.3 — Optimistic UI only where it is safe

### What changed

- `src/utils/optimistic.ts` — framework-free core.
  - `runOptimistic({kind, read, write, apply, commit, rollback, explain})`: snapshot →
    apply → commit → **on failure restore the snapshot and return the 13.R5 message +
    next step**. If the restore itself throws it reports `rolledBack: false` so the screen
    can force a reload rather than leave the UI lying.
  - `assertOptimisticAllowed`: **`runOptimistic` throws `OptimisticNotAllowedError` for
    `payment | booking | prescription | emergency`.** The never-optimistic rule is a
    throw, not a comment, so it survives future edits.
  - `runCommitted({kind, onProcessing, commit, …})`: holds `processing` from before the
    request until the server answers; returns `confirmed: true` **only** on success and
    `confirmed: false` + explanation on refusal.
- `src/hooks/useOptimisticMutation.ts` — React bindings. Auto-toast on a rollback, a
  double-tap guard while a write is in flight (shared with 15.2), and
  `useCommittedMutation` for critical actions.
- `ToastProvider` mounted at the app root (`app/_layout.tsx`) — a rollback cannot be
  explained without a toast host.
- Wired:
  - `app/pharmacy/wishlist.tsx` — remove (already rolled back, now also explains).
  - `app/notifications/index.tsx` — mark one read + mark all read.
  - `app/health/medication-reminder-list.tsx` — stop reminder (reminders on/off).
  - `app/pharmacy/payment.tsx` — `useCommittedMutation` + explicit "confirming payment,
    do not close the screen" copy, and `retryable: false` on the payment intent.

Not wired, and why: cart add/remove/quantity. `src/context/CartContext.tsx` is
**local-only staging** — `addItem/removeItem/updateQty` never touch the network (there is
no server cart call to fail), so there is nothing to roll back. I did not invent a server
call. The optimistic primitive covers `kind: 'cart'` and is unit-tested.

### Verify

```
$ node node_modules/jest/bin/jest.js src/utils/optimistic.test.ts
Tests: 15 passed, 15 total
$ node node_modules/jest/bin/jest.js src/hooks/__tests__/useOptimisticMutation.test.tsx
Tests:  6 passed, 6 total
```

- **a forced 500 → the UI rolls back and explains** — `optimistic.test.ts` ("wishlist
  removal: the item comes back and the user is told why") plus the rendered test
  ("the rows come back as unread and a toast carries the explanation", which asserts the
  exact toast payload: title "The change was rolled back", message "This service is
  temporarily unavailable. Please try again in a little while.").
- **payment shows "processing" until the server confirms** — rendered test with a
  test-controlled deferred so the in-flight window is deterministic: asserts `processing`
  while in flight, asserts `unpaid` at that moment, then releases and asserts `paid`.
  Plus "reports success to the caller only after the server confirmed" (`onSuccess` is not
  called while in flight) and the refused-payment case.
- The gate is enforced: `runOptimistic` throws for all four critical kinds.

### Mutation proof (rule 6)

```
########## MUTATION A: never roll back ##########
  ● … › reports rolledBack:false when the restore itself throws, so the screen can reload
  ● … › wishlist removal: the item comes back and the user is told why
  ● 15.3 · the UI rolls back and explains on a forced 500 › the rows come back as unread and a toast carries the explanation
Test Suites: 2 failed, 2 total
Tests:       3 failed, 17 passed, 20 total

########## MUTATION B: allow a critical kind to be optimistic ##########
  ● 15.3 · payment, booking, prescription and emergency are never optimistic › booking and prescription get the same never-optimistic treatment
  ● … › refuses an optimistic update for every critical kind
  ● … › runOptimistic throws for a payment instead of applying it locally
Test Suites: 1 failed, 1 passed, 2 total
Tests:       3 failed, 17 passed, 20 total

########## MUTATION D: processing released before the server answers ##########
  ● 15.3 · payment shows "processing" until the server confirms › a refused payment never becomes paid and ends with an explanation
  ● 15.3 · payment shows "processing" until the server confirms › is processing while in flight and never shows paid before the server answers
  ● … › a refused payment ends in confirmed:false with an explanation, never a fake success
  ● … › holds "processing" until the server confirms, and reports confirmed:false when it does not
Test Suites: 2 failed, 2 total
Tests:       4 failed, 16 passed, 20 total

########## MUTATION C (after adding the onSuccess test) ##########
  ● 15.3 · payment shows "processing" until the server confirms › a refused payment never becomes paid and ends with an explanation
  ● 15.3 · payment shows "processing" until the server confirms › reports success to the caller only after the server confirmed
Test Suites: 1 failed, 1 passed, 2 total
Tests:       2 failed, 19 passed, 21 total

########## RESTORED ##########
Test Suites: 2 passed, 2 total
Tests:       21 passed, 21 total
```

An earlier version of mutation C (calling `onSuccess` before `commit`) left all 20 tests
green — the harness did not pass an `onSuccess`, so nothing observable changed. I added
the "reports success to the caller only after the server confirmed" test and re-ran it
(red above). Reporting that rather than quietly keeping the convenient mutation.

### BLOCKED

- `BLOCKED: cart add/remove/quantity have no server write to be optimistic about —
  CartContext is local-only staging in this codebase, so there is no failure to roll
  back. No server call was invented.`

---

## 15.4 — Weak and no network

### What changed

- `src/services/offline/outbox.ts` — ordered, persistent queue.
  - `assertQueueable` throws `OutboxForbiddenError` for payment/booking/prescription/
    emergency. Both `enqueue()` **and** `submit()` go through it, so the online fast path
    cannot be used to sneak a payment in.
  - Replay is strictly in `sequence` order. A failed entry **stops** the replay (a later
    entry may depend on an earlier one) and is **kept** with its attempt count and error,
    so nothing is silently lost.
  - `startAutoReplay()` subscribes to the **single** connectivity signal.
- `src/services/offline/cache.ts` — timestamped cache (`updatedAt`), `lastUpdatedAt`,
  `formatLastUpdated`, banner copy in both locales.
- `src/components/OfflineBanner.tsx` — now reads the single connectivity signal instead
  of opening its own NetInfo listener, and shows the **last-updated time** plus the
  **pending-queue count**.
- `src/services/offline/uploadResume.ts` — chunked upload (512 KB chunks) that continues
  from the acknowledged offset after a dropped connection or an app restart.
- `src/services/offline/degrade.ts` — image quality tier by connection, and the
  video → audio → chat fallback ladder.
- `ProductImage` / `RotatingCardImage` — opt-in `networkBudget`; enabled on the pharmacy
  catalogue grid, where images dominate. Off by default so no other call site changes.
- `src/hooks/useOfflineData.ts` — rebuilt on the shared cache and the single connectivity
  signal; keeps its exported API and still reads the legacy `@nabdah_offline_` keys.
- `app/notifications/index.tsx` — mark-as-read goes through `outbox.submit`, so with no
  connection it queues and replays in order.

### One honest limitation, stated plainly

`imageUrlForTier` (request `?w=320&q=45`) is implemented and unit-tested, but **nothing in
this repo configures a CDN image transformer**. Appending those params to a CDN that
ignores them would download the original anyway while the code claimed a saving — a fake
success path — and appending them to a CDN that *does* transform would 404 if the config
differs. So the shipped behaviour on a poor link is `shouldSkipRemoteImage`: the local
placeholder is shown and **no bytes are spent**, which is a real saving rather than a
claimed one. The wire-level rendition stays available behind the same policy helper for
when the CDN grows transforms. This is documented in the code at the decision point.

### Verify

```
$ node node_modules/jest/bin/jest.js src/services/offline/
Tests: 40 passed, 40 total
```

Covers: queue order, replay, replay-stops-at-first-failure, resume-after-transient,
replay-on-reconnect, submit-when-online vs queued-when-offline, survival across an app
restart, corrupt-store tolerance, payment/booking/prescription/emergency exclusion,
cached data staying visible with `updatedAt`, last-updated formatting in both locales,
banner copy, image tier per connection quality, downgrade/skip decisions, the
video → audio → chat ladder, and resumable upload (chunking, resume from the acknowledged
offset, progress, no-ack guard, argument validation).

**NOT RUN — and it cannot be here:** the live throttled-network journey (Playwright/Detox
at 3G with 1 % loss, or `tc netem`). This machine has no `docker` and no
browser/device runtime, so `tools/live/run_gate.sh` cannot run. The unit tests above are
the equivalent coverage; the throttled journey itself is untested.

### Mutation proof (rule 6)

```
########## MUTATION A: allow a payment into the outbox ##########
  ● 15.4 · payments are never queued › assertQueueable is the single gate both paths go through
  ● 15.4 · payments are never queued › refuses submit() as well, so the online fast path cannot be used to sneak one in
  ● 15.4 · payments are never queued › refuses to enqueue a booking
  ● 15.4 · payments are never queued › refuses to enqueue a emergency
  ● 15.4 · payments are never queued › refuses to enqueue a payment
  ● 15.4 · payments are never queued › refuses to enqueue a prescription
Tests: 6 failed, 34 passed, 40 total

########## MUTATION B: replay in reverse order ##########
  ● 15.4 · queue order and replay › replays entries strictly in the order they were enqueued
  ● 15.4 · queue order and replay › resumes on the next reconnect and finishes the queue in order
  ● 15.4 · queue order and replay › stops at the first failure instead of skipping ahead, and keeps the failed entry
Tests: 3 failed, 37 passed, 40 total

########## MUTATION C: a failed entry is skipped instead of stopping the replay ##########
  ● 15.4 · queue order and replay › resumes on the next reconnect and finishes the queue in order
  ● 15.4 · queue order and replay › stops at the first failure instead of skipping ahead, and keeps the failed entry
Tests: 2 failed, 38 passed, 40 total

########## MUTATION D: a dropped upload restarts from byte 0 ##########
  ● 15.4 · uploads resume › continues from the acknowledged offset after a dropped connection, not from zero
Tests: 1 failed, 39 passed, 40 total

########## MUTATION E: keep full-size images on a poor link ##########
  ● 15.4 · lower image quality on a slow network › skips the remote fetch entirely on a link that cannot afford it
Tests: 1 failed, 39 passed, 40 total

########## MUTATION F: video falls straight to chat, skipping audio ##########
  ● 15.4 · calls fall back to audio, then to chat › a video call on a poor network drops to AUDIO, not to chat
Tests: 1 failed, 39 passed, 40 total

########## RESTORED ##########
Test Suites: 1 passed, 1 total
Tests:       40 passed, 40 total
```

### BLOCKED

- `BLOCKED: the live throttled-network journey (3G, 1% loss, offline) is not runnable in
  this worktree — no docker and no browser/device runtime. Queue order, replay, payment
  exclusion, offline banner, quality downgrade and upload resume are covered by unit
  tests instead; the throttled journey itself remains unverified.`

---

## 15.5 — Nothing crashes to a blank screen

### What changed

- `src/components/ErrorBoundary.tsx` — the shipped recovery UI: an icon, a plain
  explanation, **"try again"** and **"contact support"** (both required by the task), and a
  short quotable **error id** — the same id attached to the Sentry event, so support can
  find it. Arabic and English copy.
  - `ErrorBoundary` (class) — catches a render error, reports it, and renders the fallback.
  - `ScreenErrorBoundary` — the shape expo-router wants (`{error, retry}`); reports once
    per fallback instance and renders the same UI.
- `app/_layout.tsx`:
  - `<ErrorBoundary scope="root">` wraps the **provider tree**, not just the `Stack`, so a
    crash in a provider or layout is caught too.
  - `export const unstable_settings = { screenErrorBoundary: ScreenErrorBoundary }`.
    expo-router wraps **every route beneath the root layout** in its own instance, so each
    screen gets its own boundary — including routes added later, without touching their
    files. `Sentry.wrap(RootLayout)` is kept.
- `src/services/monitoring/crash.ts` — the release, which was the missing piece.
  - `resolveRelease()` → `app@<version>(<native build>)`, e.g. `app@1.0.0(42)`; `source`
    when no build number is available; `EXPO_PUBLIC_SENTRY_RELEASE` wins (CI).
  - Passed to `init({ release })`, stamped on **every** event via `beforeSend`
    (`event.release` + `event.tags.release`, never overwriting an explicit release), and
    set as a Sentry tag. `captureException` also carries it in the hint.
  - No DSN → `initialised: true, enabled: false` and every capture is a no-op. A throwing
    SDK disables reporting rather than propagating, so monitoring can never be the reason
    the app fails to start.
- `src/utils/sentry.ts` — now forwards to that module (`initSentry` / `setSentryUser`
  signatures unchanged). `@sentry/react-native` is already a dependency and already in
  `app.json`'s config-plugin list, so a build uploads source maps; a test asserts the plugin
  is present.

### Verify

```
$ node node_modules/jest/bin/jest.js src/components/__tests__/errorBoundary.test.tsx
Tests: 25 passed, 25 total
```

- **a thrown render error shows the fallback, not a white screen** — the root boundary is
  rendered around a component that throws; the test asserts the fallback testID, the title,
  and both actions. `"try again" re-renders the screen, and the screen then works` proves
  the recovery is real, not decorative.
- **both required actions** — `screen-error-retry` and `screen-error-contact`, both with a
  live `onPress`. "Contact support" opens a pre-filled `mailto:` carrying the error id and
  the app release.
- **Sentry receives it with the release** — a fake SDK asserts `init` got the release, that
  `beforeSend` stamps it, and that a real render crash arrives as
  `captureException(error, { tags: { release }, extra: { release, scope: 'screen', errorId } })`.
- **wiring cannot be quietly removed** — a source-level contract test asserts the root
  boundary is mounted *before* `<Provider store={store}>`, that
  `unstable_settings.screenErrorBoundary` is registered, that `initSentry()` runs, that
  `Sentry.wrap(RootLayout)` is still there, that **no DSN is committed** to `app/_layout.tsx`
  or `app.json`, and that the Sentry config plugin is present.

### Mutation proof (rule 6)

```
########## MUTATION A: the boundary renders nothing (blank screen) ##########
  ● 15.5 · Sentry receives the error WITH the release › a render crash is captured with the release on the payload
  ● 15.5 · a thrown render error shows the fallback, not a white screen › "try again" re-renders the screen, and the screen then works
  ● 15.5 · a thrown render error shows the fallback, not a white screen › offers BOTH required actions: try again and contact support
  ● 15.5 · a thrown render error shows the fallback, not a white screen › shows a quotable error id the user can give to support
  ● 15.5 · a thrown render error shows the fallback, not a white screen › the root boundary replaces the crashed tree with the recovery UI
  ● 15.5 · with no DSN the app still starts and reporting is a no-op › the boundary still shows the fallback with no DSN configured
Tests: 6 failed, 19 passed, 25 total

########## MUTATION B: drop the release from init ##########
  ● 15.5 · Sentry receives the error WITH the release › the release is initialised on the SDK
Tests: 1 failed, 24 passed, 25 total

########## MUTATION C: beforeSend stops stamping the release on events ##########
  ● 15.5 · Sentry receives the error WITH the release › beforeSend stamps the release on every event, so a stack trace is resolvable
Tests: 1 failed, 24 passed, 25 total

########## MUTATION D: unmount the root boundary from the layout ##########
  ● 15.5 · the boundaries are actually wired into the app › the root layout mounts a boundary around the provider tree
Tests: 1 failed, 24 passed, 25 total

########## MUTATION E: drop the per-screen boundary registration ##########
  ● 15.5 · the boundaries are actually wired into the app › the root layout registers a per-screen boundary for every route beneath it
Tests: 1 failed, 24 passed, 25 total

########## MUTATION F: remove the contact-support action ##########
  ● 15.5 · a thrown render error shows the fallback, not a white screen › offers BOTH required actions: try again and contact support
  ● 15.5 · a thrown render error shows the fallback, not a white screen › renders the English copy when the app language is English
  ● 15.5 · a thrown render error shows the fallback, not a white screen › the root boundary replaces the crashed tree with the recovery UI
  ● 15.5 · with no DSN the app still starts and reporting is a no-op › the boundary still shows the fallback with no DSN configured
Tests: 4 failed, 21 passed, 25 total

########## RESTORED ##########
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
```

### BLOCKED / target, not a measurement

- `BLOCKED: Sentry DSN is an owner secret — EXPO_PUBLIC_SENTRY_DSN is read from the
  environment and is not committed. The wiring, the release derivation, the release on
  every event, the no-DSN path and the tests are all here; the real project cannot be
  pointed at from this worktree.`
- **≥ 99.5 % crash-free users is a target, not something I can measure.** It needs real
  session data from the Sentry project. Nothing in this repo can compute it, and I did not
  fabricate a number.

---

## Final state

```
$ node node_modules/typescript/bin/tsc --noEmit
TSC_EXIT=0

$ node node_modules/jest/bin/jest.js --silent
PASS __tests__/icon-font.test.ts
PASS src/utils/pharmacy-draft.test.ts
PASS src/utils/security.storage.test.ts

Test Suites: 61 passed, 61 total
Tests:       353 passed, 353 total
Snapshots:   0 total
Time:        51.974 s
```

| | before | after |
|---|---|---|
| `tsc --noEmit` | exit 0 | exit 0 |
| Test suites | 2 failed, 51 passed, 53 total | **61 passed, 61 total** |
| Tests | 180 passed, 180 total | **353 passed, 353 total** |

Both pre-existing baseline failures are fixed, no test was skipped, deleted or weakened,
and the working tree is clean.

## Notes for the orchestrator

- **Environment**: `git` needed `DEVELOPER_DIR=/Library/Developer/CommandLineTools`
  (the configured Xcode path does not exist). If you merge this branch with a working
  `git`, no action is needed.
- **`@testing-library/react-native` is v14, where `render()` is async** and returns the
  query object. `src/hooks/__tests__/useOptimisticMutation.test.tsx` documents two
  determinism choices forced by this harness (mocked toast host, payment describe first);
  both are explained in the file header.
- **Scope**: only files under `patient-app/` were touched. Nothing was pushed.
