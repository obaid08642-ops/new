# P15 — Phase 15 (Resilience), patient-web slice

Agent: `p15-web` worktree. Branch `p15-web`. Nothing outside `patient-web/` was touched.

Phase 15 tasks in this slice: **15.1, 15.3, 15.4, 15.5, 15.9, 15.10**.

## Environment reality

- No `docker`, so the live / throttled-network gates cannot run here. Nothing below is
  presented as a live result.
- Commands are run through the local binaries: `node node_modules/typescript/bin/tsc --noEmit`
  and `node node_modules/vitest/vitest.mjs run --silent`.
- `git` needs `export DEVELOPER_DIR=/Library/Developer/CommandLineTools`.

## Baseline (before any change)

```
$ cd patient-web && node node_modules/vitest/vitest.mjs run --silent --reporter=basic
 ❯ tests/translation-key-parity.test.ts:21:74
      Test Files  1 failed | 167 passed | 14 skipped (182)
           Tests  1 failed | 420 passed | 23 skipped (444)
    Start at  19:27:34
    Duration  169.90s
```

The single failure was the known reviewer item: 28 `Errors.*` keys missing in `ur`, `hi`,
`bn`, `fil` (whole `Errors` object absent in those four locales). **It is fixed** — see
15.1 — not skipped and not weakened.

---

## 15.1 — One API client per app (patient-web BFF + browser)

### What patient-web actually had (the grep the plan asks for)

- `axios` is in `package.json` and **used nowhere** in the app.
- Server → backend: a thin `fetch(patientApiUrl(...))` helper in `lib/api/upstream.ts`,
  called by `callPatientApi` from **421** sites, plus **27** sites that bypassed it and
  called `fetch(patientApiUrl(...))` directly.
- Browser → BFF: **172** direct global `fetch(...)` calls across ~130 files under
  `components-next/`, `components/`, `app/[locale]/**` (mostly `fetch("/api/...")`).

So: **two layers, one of them with 27 holes.**

### The consolidation, stated honestly

One policy core, one client, two entry points:

| File | Role |
|---|---|
| `lib/api/net/policy.ts` | Pure policy: 15 s / 60 s / 45 s deadlines, safe-method-or-idempotency-key retry rule, retryable statuses, `Retry-After` (seconds **and** HTTP-date), exponential backoff with full jitter and a hard cap. No `fetch`, no timers, no `navigator`. |
| `lib/api/net/client.ts` | `apiFetch(fetchImpl, input, init, options)` — the one client. Dependency-injected so the required proofs run in plain node. |
| `lib/api/net/errors.ts` | Every failure → a 13.R5 catalog code + an actionable next step. |
| `lib/api/net/catalog.ts` | Pure bridge from an `ApiError` to localized text (`Errors.*` + `Network.*`). |
| `lib/api/net/use-error-copy.ts` | The React hook, the only place the locale is read. |
| `lib/api/net/online.ts` | SSR-safe offline detection + `useSyncExternalStore`-stable snapshot. |
| `lib/api/net/last-sync.ts` | "Last updated" stamp, recorded by the client on every settled response. |
| `lib/api/net/install.ts` | Installs the client **once** over `globalThis.fetch`. |
| `lib/api/upstream.ts` | `patientUpstreamFetch` — the server-side entry into the same core. `callPatientApi` keeps its legacy 503 shape. |

**The trade-off, plainly:** the 172 browser call sites were **not** hand-edited to import
a helper. That would have been by far the largest diff in this app and every one of those
files carries a product test. Instead the policy is installed once over `globalThis.fetch`
from `components-next/network-policy.tsx`, mounted at the top of `app/[locale]/layout.tsx`.
Every existing call site inherits the deadline, the retry rule, the abort wiring and the
offline pre-check **without changing a line**. That is a global monkey-patch of one
built-in, and it is the least invasive consolidation that still makes every call site obey
the policy — but it is a decision a reviewer should look at on purpose, so it is stated here
rather than buried. The wrapper is transparent: it forwards the resolved `Response`
untouched, so existing `.ok` / `.json()` behaviour is unchanged.

The **server** side was migrated properly, call site by call site: all 27 direct
`fetch(patientApiUrl(...))` calls now go through `patientUpstreamFetch`, and the 421
`callPatientApi` sites inherit the policy through it. Each of those 27 sites was already
inside a `try { ... } catch { return null }`, which `patientUpstreamFetch` matches exactly
(it throws on transport failure, like `fetch`).

### Changed files

- new: `lib/api/net/{policy,errors,client,catalog,use-error-copy,online,last-sync,install}.ts`
  + `lib/api/net/{client,catalog,install}.test.ts`
- new: `components-next/network-policy.tsx`
- migrated: `lib/api/{articles,clinics,diagnostics,doctors,home-care-services,labs,nursing-catalog,nursing,public-config,public-medicines,public-products,reports,specialties}-server.ts`,
  `app/[locale]/diagnostics/page.tsx`, `app/[locale]/medicine-catalog/page.tsx`,
  `app/[locale]/medicines/[medicineId]/page.tsx`, `app/sitemap.xml/route.ts`
- `lib/api/upstream.ts` rewritten around the shared core
- `app/[locale]/layout.tsx` mounts `NetworkPolicy`
- `messages/*.json`: new `Network.*` namespace in all six locales; `Errors.*` (the 13.R5
  catalogue, 14 codes × message + nextStep) filled in for `ur`, `hi`, `bn`, `fil`

### Real output

`tsc --noEmit` (must stay clean):

```
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
```

Targeted run:

```
$ node node_modules/vitest/vitest.mjs run lib/api --reporter=dot
 Test Files  80 passed | 14 skipped (94)
      Tests  175 passed | 23 skipped (198)
    Duration  68.01s
```

Full suite after 15.1:

```
$ node node_modules/vitest/vitest.mjs run --silent
 Test Files  171 passed | 14 skipped (185)
      Tests  462 passed | 23 skipped (485)
    Duration  161.50s
```

**0 failed.** The `translation-key-parity` failure is gone: filling `Errors.*` for the four
missing locales was required anyway, because 15.1 has to produce a localized message and a
next step in **all six** locales. Test count went 420 → 462 passed, 0 failed.

### Mutation proof (rule 6)

Three deliberate breaks, each confirmed red, then restored and confirmed green.

**1. Retry rule removed → the "no retry for a non-idempotent POST" test goes red.**

```
$ python3 -c "…'  return isSafeMethod(init?.method) || hasIdempotencyKey(init);' -> 'return true; // MUTATION'"
$ node node_modules/vitest/vitest.mjs run lib/api/net/client.test.ts --reporter=dot
       |                   ^
    156|     expect(sleep).not.toHaveBeenCalled();
 Test Files  1 failed (1)
      Tests  1 failed | 15 passed (16)
```

**2. `Retry-After` ignored → the Retry-After tests go red.**

```
$ python3 -c "…parseRetryAfterMs: 'if (raw) return undefined; // MUTATION'…"
$ node node_modules/vitest/vitest.mjs run lib/api/net/client.test.ts --reporter=dot
 ⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯
 Test Files  1 failed (1)
      Tests  2 failed | 14 passed (16)
```

**3. Default deadline 15 s → 60 s → the timeout test goes red.**

```
$ python3 -c "…'  default: 15_000,' -> '  default: 60_000, // MUTATION'"
$ node node_modules/vitest/vitest.mjs run lib/api/net --reporter=dot
AssertionError: expected { default: 60000, upload: 60000, …(1) } to deeply equal { default: 15000, upload: 60000, …(1) }
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 40 passed (41)
```

Restored, all green again:

```
$ node node_modules/vitest/vitest.mjs run lib/api/net --reporter=dot
 Test Files  3 passed (3)
      Tests  41 passed (41)
```

### Note on an existing test

`lib/api/labs-server.test.ts` mocked `@/lib/api/upstream` as a single-function module
(`{ patientApiUrl }`), which stopped covering the module once the migration added
`patientUpstreamFetch`. **No assertion was changed.** The mock now points the real base URL
at a test origin via `vi.hoisted`, so the real client runs and all three original assertions
(query-parameter allowlist, exact `Accept` header, no `Authorization`) still hold — and the
real header-shaping path is now covered too.

### BLOCKED / DEFERRED

- none for 15.1.

---

## 15.3 — Optimistic UI only where it is safe

### Scope honesty: what patient-web actually has

The plan lists cart add/remove/quantity, wishlist, reminders on/off, mark as
read, likes as optimistic candidates. Grep of this codebase:

- **Cart** (`lib/context/CartContext.tsx`): localStorage-only, zero `fetch` calls.
  There is no server round trip, so there is nothing to be optimistic *about*
  and nothing to roll back. No change; nothing invented.
- **Wishlist** (`lib/api/wishlist-server.ts`, wishlist page): read-only server
  loaders (`getPatientWishlist`), no toggle/mutation endpoint in patient-web.
  No change.
- **Mark as read / likes**: no write endpoint exists in patient-web. No change.
- **Reminders on/off** (`notification-toggle.tsx`, PATCH
  `/api/patient/users/me/notification-settings` with idempotency key) and
  **mark dose taken** (`reminder-actions.tsx`, POST dose log with idempotency
  key): real idempotent writes. **Migrated to optimistic with rollback.**

So the migrated surface is exactly the two real safe writes. The previous code
silently swallowed failures (toggle) or showed only a local alert; both now
roll back and push an explaining toast.

### Changed files

- new: `lib/api/optimistic.ts` — `SAFE_OPTIMISTIC_KINDS`
  (cart/wishlist/reminder/notification/like), `NEVER_OPTIMISTIC_KINDS`
  (payment/booking/prescription/emergency), `pendingMode()`, and the single
  `runOptimistic()` runner. A never-optimistic kind never calls `apply` or
  `rollback`, on success or failure — the UI stays in "processing".
- new: `lib/api/use-optimistic-action.ts` — React hook: `pending` for the
  button, in-flight double-tap guard, catalog-resolved failure copy.
- new: `lib/api/net/toast.ts` — 40-line observable toast store (node-testable).
- new: `components-next/network/toast-viewport.tsx` — mounted once in
  `app/[locale]/layout.tsx`; titles/messages arrive already localized.
- migrated: `notification-toggle.tsx`, `reminder-actions.tsx` (logTaken only;
  DELETE stays pessimistic with confirm).
- `messages/*/Network.dismiss` added in all 6 locales (parity holds).
- `reminders-ssr.test.ts`: added the repo-standard client-intl mock
  (`vi.mock("next-intl", ...)` passthrough, same as `login-form.test.tsx`)
  because `ReminderActions` now legitimately resolves copy through the provider
  the layout supplies in production. **No assertion changed.**

### Never-optimistic verification

- `pharmacy-payment-client.tsx`: `paying` disables all method buttons and shows
  "Redirecting…/جارٍ التحويل…" — nothing is marked paid before the server
  confirms (success path is a redirect to the checkout URL).
- `consultation-payment-action.tsx`: spinner + disabled buttons in flight, and
  on-screen copy stating booking is not payment confirmation.
- `pendingMode()` returns `"processing"` for all four never-kinds; the
  static-markup tests assert both payment screens render idle/loading with zero
  success markup.

### Real output

```
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
$ node node_modules/vitest/vitest.mjs run lib/api/optimistic.test.ts tests/optimistic-ui.test.tsx
 Test Files  2 passed (2)
      Tests  37 passed (37)
$ node node_modules/vitest/vitest.mjs run tests/reminders-design.test.ts \
    tests/notification-settings-design.test.ts tests/notifications-design.test.ts \
    tests/settings-design.test.ts "app/[locale]/reminders/reminders-ssr.test.ts" \
    lib/api/optimistic.test.ts tests/optimistic-ui.test.tsx \
    tests/translation-key-parity.test.ts lib/i18n/messages.test.ts
 Test Files  9 passed (9)
      Tests  56 passed (56)
```

### Mutation proof (rule 6)

First attempt mutated `NEVER_OPTIMISTIC_KINDS` to `[]` and the tests *vanished*
(21 passed) instead of failing — the test loops iterated the very constant
being mutated. Fixed the test to iterate **literal kind lists**, then re-ran:

```
$ node node_modules/vitest/vitest.mjs run lib/api/optimistic.test.ts   # mutated
 FAIL  ... payment: success commits without ever applying locally
 FAIL  ... booking: success commits without ever applying locally
 ...Failed Tests 12 ...
$ # restored
 Test Files  1 passed (1)
      Tests  33 passed (33)
```

### BLOCKED / DEFERRED

- Cart/wishlist/mark-as-read/likes optimistic UI: nothing to implement — no
  server mutation exists for these in patient-web (localStorage-only cart,
  read-only wishlist loaders). If the backend adds such endpoints, the
  `runOptimistic` runner and kind lists already cover them.

---

## 15.4 — Weak and no network

### Changed files

- new: `lib/api/net/outbox.ts` (+ `outbox.test.ts`, 15 tests) — FIFO queue for
  safe kinds only (`reminder/notification/cart/wishlist/like`); `payment`,
  `booking`, `prescription`, `emergency` and unknown kinds are rejected with
  `outbox_rejects_<kind>`. Mutations auto-get an idempotency key when the
  caller did not supply one; first failure stops the drain with the remainder
  untouched; persisted behind an injected store (guarded localStorage in
  production, memory in tests); capped at 50 actions; corrupt persisted entries
  are dropped, never choked on.
- `lib/api/optimistic.ts`: `OptimisticOutcome` gains `{status:"queued"}`;
  `shouldQueueOffline(kind, offline)` — safe kinds only.
- `lib/api/use-optimistic-action.ts` (+ `use-optimistic-action.test.tsx`,
  5 tests): `run(kind, actions, {outbox})` — offline + queueable action queues
  instead of sending (applies instantly, enqueues, info toast, returns
  `queued`); payments fail loudly now, never queue silently. Tested through the
  real hook, real outbox singleton, real toast store.
- `components-next/network-policy.tsx`: drains the outbox on the browser
  `online` event (success toast `Network.replayed`, failure toast
  `Network.outboxFailed`).
- `app/.../reminder-actions.tsx`, `app/.../notification-toggle.tsx`: pass
  replayable outbox entries; the dose-tap key is minted once per tap and shared
  by the live commit and the queue entry, so a retried tap can never log twice.
- new: `components-next/network/offline-banner.tsx` (+
  `tests/offline-banner.test.tsx`) — mounted in the locale layout; shows
  `Network.banner.offline` plus the `lastUpdated` time from the 15.1
  last-settled-response stamp (persisted, so it survives the outage).
- new: `lib/api/net/connection.ts` (+ test) — `navigator.connection` guarded
  for SSR/Safari/Firefox; `imageQualityFor` (75/50), `shouldStartAudioOnly`.
- new: `components-next/network/adaptive-image.tsx` (+ test) — drop-in
  next/image replacement; migrated `premium-product-card.tsx` and
  `product-gallery-modal.tsx`. `next.config.ts` declares `qualities: [50, 75]`
  (Next.js refuses unlisted qualities — found by the test run, see below).
- new: `lib/api/net/call-fallback.ts` (+ test) — `video→audio→chat`, chat is
  terminal. `video-room-client.tsx`: slow links join audio-only (camera off,
  mic on) with an audio-only notice; ended calls offer `chatHref` chat link
  instead of a dead end. Both call pages (`video-call`, `room/[id]`) supply the
  new labels + href.
- `lib/api/net/policy.ts` (+ `policy-upload.test.ts`): bodies ≥ 1 MB
  (`LARGE_BODY_BYTES`) classify as `upload` → 60 s deadline, so single-shot
  base64 prescription photos do not time out on weak networks.
- `scan-prescription-form.tsx` (+ `tests/scan-upload-resume.test.ts`): OCR +
  save idempotency keys minted once per chosen photo (ref, reset on new photo
  and on success) — a retry after interruption resumes the SAME logical upload.
- `messages/*/Network`: `queuedTitle` added in all 6 locales (parity holds).

### Real output

```
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
$ node node_modules/vitest/vitest.mjs run lib/api/net/connection.test.ts \
    lib/api/net/call-fallback.test.ts lib/api/net/policy-upload.test.ts \
    lib/api/net/outbox.test.ts tests/offline-banner.test.tsx \
    tests/adaptive-image.test.tsx tests/video-room-fallback.test.tsx \
    tests/scan-upload-resume.test.ts lib/api/use-optimistic-action.test.tsx
 Test Files  9 passed (9)
      Tests  47 passed (47)
```

### Findings during testing (not fabricated — the tests caught these)

1. `next/image` in this node environment never reads `next.config.ts`, so the
   downgrade test initially failed with Next.js's own warning: quality "50" not
   configured in `images.qualities [75]`, falling back to 75. Production would
   have done the same. Fixed by declaring `qualities: [50, 75]` in
   `next.config.ts`; the test mocks `next/image` with a transparent stub (the
   selection logic is mine; Next's quality handling is Next's) and asserts the
   selected value.
2. `renderToStaticMarkup` uses the `getServerSnapshot` branch of
   `useSyncExternalStore`, so the banner's hardcoded `() => true` server
   snapshot made offline states unrenderable. Changed to `getOnlineSnapshot`,
   which is deterministically online on real SSR (no navigator) and mockable.
3. React renders `dateTime`, not `datetime` — assertion fixed to the real output.

### Mutation proof (rule 6)

```
$ # outbox payment guard disabled: if (false && !isSafeOptimistic(...))
$ node node_modules/vitest/vitest.mjs run lib/api/net/outbox.test.ts \
    lib/api/use-optimistic-action.test.tsx
 FAIL ... rejects payment / booking / prescription / emergency / unknown kinds
 Test Files  1 failed | 1 passed (2)
      Tests  5 failed | 15 passed (20)
$ # restored → 20 passed, tsc clean
```

### BLOCKED / DEFERRED

- The live throttled-network journey (3G / 1% loss / offline, Playwright or
  `tc netem`) was NOT run: no docker/browser here. Covered by unit tests
  instead — queue order, replay, payment exclusion, offline banner, quality
  downgrade — as the plan allows for this slice.
- True byte-resume for uploads (chunk endpoints with offsets) needs a backend
  chunk protocol in `backend/` — another agent's scope. What patient-web does
  instead, all shipped: 60 s upload deadline for large bodies, same-key retry
  within a submission (15.1 client retries idempotent POSTs), same-key
  resubmission after interruption (scan form), and at-most-once replay keys in
  the outbox. Stated plainly: an interrupted upload re-sends whole, never
  duplicated — it does not resume mid-byte.

---

## 15.5 — Nothing crashes to a blank screen

### What existed

- `app/[locale]/error.tsx`: try-again + home, but NO contact-support link and
  NO error reporting — crashes vanished silently.
- No `app/global-error.tsx`: a root-layout crash meant a white screen.
- Sentry configs with no `release`: events could not be tied to a deploy.

### Changed files

- new: `lib/sentry-release.ts` (+ test) — `getSentryRelease()`: CI SHA via
  `NEXT_PUBLIC_SENTRY_RELEASE`, else `NEXT_PUBLIC_APP_VERSION`, else explicit
  `patient-web-dev` (never empty — an empty release ungroups everything).
- new: `lib/error-report.ts` (+ `error-report.test.ts`, 3 tests) —
  `reportSegmentError(error, {segment, locale})`: `captureException` with the
  release tag + segment context; returns the event id; never throws back into
  the fallback UI. Tested with a mocked `@sentry/nextjs`.
- `sentry.{client,server,edge}.config.ts`: `release: getSentryRelease()`.
- `app/[locale]/error.tsx`: reports on mount, adds contact-support link
  (`/{locale}/support`, `RouteState.contactSupport` in all 6 locales) and
  shows the Next.js digest as `ref:` for support matching.
- new: `app/global-error.tsx` — own `<html><body>`, bilingual hardcoded copy
  (no provider exists above it by design), try-again + en/ar support links +
  digest ref + reporting.
- `tests/route-error.test.tsx` (4 tests): both fallbacks render actions (never
  a white screen); source assertions pin the `reportSegmentError` wiring.
- `.env.production.example`: documents `NEXT_PUBLIC_SENTRY_RELEASE`.

### Real output

```
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
$ node node_modules/vitest/vitest.mjs run lib/sentry-release.test.ts \
    lib/error-report.test.ts tests/route-error.test.tsx
 Test Files  3 passed (3)
      Tests  11 passed (11)
```

### Mutation proof (rule 6)

```
$ # release tag dropped from reportSegmentError
 FAIL ... sends the error with the release tag and segment context
      Tests  1 failed | 2 passed (3)
$ # restored → 3 passed
```

### BLOCKED / DEFERRED

- `BLOCKED: Sentry DSN is an owner secret` — the live-send part only. Wiring,
  release injection, and tests are shipped; no event can actually leave the
  device without the DSN, and source-map upload likewise needs the owner's
  `SENTRY_AUTH_TOKEN` (documented in `.env.production.example`, never
  committed).

---

## 15.9 — Clocks and time zones (patient-web display)

### Changed files

- new: `lib/api/net/server-time.ts` — `noteServerDate()` records
  `offset = serverMs − deviceMs` from each response `Date` header;
  `serverNowMs()` applies it, so a fixed device skew cancels out. Unanchored
  (before the first response) it falls back to the device clock, documented.
- `lib/api/net/install.ts`: every settled response re-anchors the clock.
- new: `lib/datetime.ts` (+ `datetime.test.ts`, 11 tests) —
  `PROVIDER_TIME_ZONE = "Asia/Riyadh"`, `resolveUserTimeZone()` (device zone,
  UTC fallback), `formatServerInstant()` (never reads the device clock;
  null on garbage), `formatInProviderZone()` (Riyadh pinned),
  `isPastSlot()` (anchored guard, fail-closed on NaN).
- `diagnostics-checkout-form.tsx`, `nursing-booking-form.tsx`: the "slot in
  the past" guards now use `isPastSlot()` instead of `Date.now()` — the only
  two client-side clock decisions with server-derived meaning found by grep.
  (Server components already run on server time; chat IDs and idempotency
  suffixes using `Date.now()` are uniqueness inputs, unaffected by skew.)

### Real output

```
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
$ node node_modules/vitest/vitest.mjs run lib/datetime.test.ts
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

Device clock is moved ±1 day with fake timers while server instants and the
anchor stay fixed: formatting is identical, `serverNowMs()` returns true time,
and the past-slot guard stays put while the naive `Date.now()` comparison is
asserted to flip (proving the test can tell the difference).

### Mutation proof (rule 6)

```
$ # serverNowMs ignores the anchor offset
 FAIL ... cancels a +1 day device error
 FAIL ... cancels a −1 day device error
 FAIL ... keeps the past-slot guard stable while the naive check flips
      Tests  3 failed | 8 passed (11)
$ # restored → 11 passed
```

### BLOCKED / DEFERRED

- `DEFERRED-OUT-OF-SCOPE: server-side enforcement of server time (OTP expiry,
  slots, reminders) lives in backend/` — another agent's scope; patient-web
  only displays and guards against its own clock.

---

## 15.10 — Devices and browsers (patient-web, code part only)

### Changed files

- new: `lib/device-support.ts` (+ `device-support.test.ts`, 9 tests) —
  `parseUserAgent` + `isSupportedBrowser` with era-matched floors: iOS 16.4+
  (OS version is the WebKit engine, incl. desktop-mode iPads and iOS
  Chrome/Firefox), Android 7+, Chrome/Edge 109+, Samsung Internet 20+,
  Firefox 109+, desktop Safari 16.4+. Trident/MSIE rejected by name (cannot
  run the stack); unknown, empty, and bot agents PASS (fail open — crawlers
  and future browsers are never locked out).
- new: `components-next/old-browser-notice.tsx` (+
  `tests/old-browser-notice.test.tsx`) — evaluated once after mount (never SSR:
  no navigator there, no hydration flash), dismissible, localized
  `Network.oldBrowser.title/body` in all 6 locales. Mounted in the locale
  layout next to the offline banner.
- new: `docs/MINIMUM_BROWSERS.md` — the documented minimums plus the BLOCKED /
  DEFERRED lines below.

### Real output

```
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
$ node node_modules/vitest/vitest.mjs run lib/device-support.test.ts \
    tests/old-browser-notice.test.tsx
 Test Files  2 passed (2)
      Tests  11 passed (11)
```

### Mutation proof (rule 6)

```
$ # iOS floor disabled
 FAIL ... rejects iOS 15, accepts 16.4 and 17
      Tests  1 failed | 8 passed (9)
$ # restored → 11 passed
```

### BLOCKED / DEFERRED

- `BLOCKED: device farm is a paid external service with no account configured`
  — no Firebase Test Lab / BrowserStack / AWS Device Farm run is possible from
  this worktree; no report is attached and none is fabricated.
- `DEFERRED-OUT-OF-SCOPE: .github/ is owned by another agent` — the CI change
  this needs: a Playwright workflow running the web suite on WebKit (Safari
  iOS 16+ equivalent), Firefox, and Chromium, plus a Samsung Internet
  user-agent pass on Chromium, gating releases. Full text in
  `docs/MINIMUM_BROWSERS.md`.

---

## Final verification (all six tasks)

```
$ node node_modules/vitest/vitest.mjs run --silent
 Test Files  188 passed | 14 skipped (202)
      Tests  579 passed | 23 skipped (602)
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
```

Before → after: files 167 passed/1 failed → 188 passed/0 failed (14 skipped
both ways — frozen debt, untouched); tests 420 passed/1 failed → 579 passed/
0 failed (23 skipped both ways). The pre-existing
`translation-key-parity` failure is fixed (Errors.* filled for ur/hi/bn/fil),
not skipped or weakened. Working tree clean; no file outside `patient-web/`
touched; no `git push` performed.

---

## Fix round (independent-reviewer findings F1–F8)

Branch `p15-web`, worktree `.../T/opencode/p15/web`. The worktree directory had
been deleted (all `p15/*` worktrees listed as prunable); it was recreated with
`git worktree add .../T/opencode/p15/web p15-web` and `node_modules` reinstalled
(`pnpm install --no-frozen-lockfile`; the touched `pnpm-lock.yaml` was restored
with `git checkout`, tree clean). Prior fix commits `41c4bca` (F1), `d31571c`
(F2), `aa79148` (F3), `a6a0b2d` (F4) were already on the branch; each was
re-verified below with a fresh break → red → restore proof. New commits:
`047142d` (F8), `d1f1489` (F5), `990a6ae` (F6), `414eb0f` (F7). One fix = one
commit, `[P15.fix] <area>: <what>`; never amended, never pushed. Targeted runs
use `run <path>` without `--silent` (`--silent` with a path filter crashes this
vitest version's CLI parser — CAC parse error, not a test result).

Baseline before this round (HEAD `a6a0b2d`):

```
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
$ node node_modules/vitest/vitest.mjs run --silent --reporter=basic
 Test Files  188 passed | 14 skipped (202)
      Tests  594 passed | 23 skipped (617)
```

### F1 — fail-open optimistic default: FIXED (prior `41c4bca`, re-proved)

`lib/api/optimistic.ts:44-47` (`pendingMode` denies by default: never-list
first as defense in depth, then the `isSafeOptimistic(kind)` allowlist
decides) and `:88` (`runOptimistic` applies locally ONLY for safe kinds).
Test `lib/api/optimistic.test.ts:167` (`paymnt` typo kind: processing, no
apply, outcome `committed/optimistic:false`).

```
$ # reverted pendingMode to fail-open: return isNeverOptimistic ? processing : optimistic
 Test Files  1 failed (1)
      Tests  2 failed | 33 passed (35)
$ # restored (file backup, never git checkout)
 Test Files  1 passed (1)
      Tests  35 passed (35)
```

### F2 — `Request.signal` silently dropped: FIXED (prior `d31571c`, re-proved)

`lib/api/net/client.ts:125-154` (`combineSignals`, `AbortSignal.any` where
available, manual listener fallback for iOS 16.4) and `:186`
(`callerSignal: combineSignals(input.signal, init?.signal)`).

```
$ # mutated :186 back to `callerSignal: init?.signal ?? undefined`
 Test Files  1 failed (1)
      Tests  3 failed | 19 passed (22)
$ # restored
 Test Files  1 passed (1)
      Tests  22 passed (22)
```

### F3 — fetch wrapper changed the error type: FIXED (seam pinned `aa79148` + audit)

Exhaustive grep over shipped code (`app/`, `components-next/`, `components/`,
`lib/`, tests excluded):

- `TypeError` literal: only `lib/api/net/errors.ts:163` (the wrapper's own
  `networkError` classifier — the mapping itself, correct) and the
  `install.ts:22` doc comment. No production `catch` mentions it.
- `instanceof`: only `ApiError` (the new type), `Headers`, `FormData`,
  `URLSearchParams`, `ArrayBuffer`, `Blob`, `ReadableStream`, `Request`, `URL`
  — none a `TypeError` branch.
- `.name ===`: only `errors.ts:97` (`AbortError`, abort path still rethrows the
  caller reason — unaffected) plus data-field `name` checks (drug/product
  names, unrelated).
- `"fetch failed" / "Failed to fetch" / "NetworkError"`: zero shipped matches.

So no call site branches on the old type and no call-site code change was
needed — every shipped `catch` is either bare (`catch {` fallback copy, e.g.
both payment clients) or `.ok`-based (wrapper forwards `Response` untouched).
`TypeError` appears only in tests: `install.test.ts:78-107` (the F3 seam pin:
`TypeError("fetch failed")` → `ApiError` reason `network`, action
`check_connection`, code `SERVICE_UNAVAILABLE`, plus the localized copy),
`catalog.test.ts:80` (unknown-error copy still resolves), `outbox.test.ts:67`,
`upstream.test.ts:8`, `health-ssr.test.ts:38` (fake rejections).

```
$ node node_modules/vitest/vitest.mjs run lib/api/net/install.test.ts lib/api/net/catalog.test.ts tests/translation-key-parity.test.ts
 Test Files  3 passed (3)
      Tests  28 passed (28)
```

### F4 — tz-naive slot construction: FIXED (prior `a6a0b2d`, re-proved)

`components-next/diagnostics-checkout-form.tsx:72` and
`components-next/nursing-booking-form.tsx:65` use
`zonedDayTimeToMs(day, time, resolveUserTimeZone())` + `isPastSlot()`
(server-anchored); malformed/unknown-zone slots fail closed (`null` →
rejected). `lib/datetime.test.ts:189` pins the exact call in both form
sources.

```
$ # mutated nursing form back to Date.parse(day + "T" + time + ":00")
 Test Files  1 failed (1)
      Tests  1 failed | 16 passed (17)
$ # restored
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

### F5 — payment "processing" screen proof: FIXED (`d1f1489`)

`components-next/pharmacy-payment-client.tsx:5` imports `pendingMode`;
`:131-157` extracts the pure view `PharmacyPaymentMethods` whose container
carries `data-pending-mode={paying ? pendingMode("payment") : undefined}` —
in flight that is `"processing"`, with the tapped method showing the existing
Redirecting copy and all buttons disabled. No new user-facing strings (the
`role="status"` note was drafted, then removed for exactly that reason — the
existing copy already expresses the state). No charge is performed by the
test; `tests/optimistic-ui.test.tsx` gains 3 tests (contract pin + idle +
in-flight UI state, 7 total in file).

```
$ # mutated `pendingMode("payment")` to hardcoded "optimistic"
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
$ # restored → 7 passed; tsc exit 0
```

### F6 — dead code `formatInProviderZone`: FIXED by wiring (`990a6ae`)

`lib/datetime.ts:66-72` kept. `components-next/appointment-booking-form.tsx:8`
imports it; `:20-24` adds the exported `slotDisplay(slot, locale)` (explicit
server label wins; else the server instant formats in Asia/Riyadh; garbage
falls back to raw, never blank), and `:162` renders it in the slot buttons —
so the form no longer leaks raw ISO strings. New
`tests/appointment-slots-provider-zone.test.tsx` (4 tests, incl. full-form
static markup asserting `9:00` present and the raw `2026-10-01T06:00:00.000Z`
absent). Dates are not message keys, so i18n parity is untouched.

```
$ # mutated slotDisplay to return slot.start
 Test Files  1 failed (1)
      Tests  2 failed | 2 passed (4)
$ # restored → 4 passed; tsc exit 0
```

### F7 — per-segment error boundaries: FIXED (`414eb0f`)

New `components-next/segment-error-fallback.tsx` (try-again + home +
contact-support from existing `RouteState` keys only, digest `ref:`, reports
via `reportSegmentError` with the section name). `error.tsx` added to all 65
top-level sections under `app/[locale]/` (ai appointments articles c cart
chat community condition consultations dashboard delivery diagnostics doctor
doctors drug-scanner emergency facility family forgot-password health
home-care home-nursing insurance labs login loyalty map maternity medicine
medicine-catalog medicines mental-health notifications nursing nutrition
offers onboarding orders otp p password-reset payments pharmacies pharmacy
prescriptions privacy profile programs provider-info radiology register
reminders reports returns reviews room s search services settings support
terms voice welcome wishlist), each a 7-line wrapper naming its own segment.
Existing `app/[locale]/error.tsx` + `app/global-error.tsx` untouched (pinned
by `route-error.test.tsx`). Structural carve-outs: `app/api/**` are Route
Handlers — `error.tsx` boundaries do not catch handler errors, so they keep
try/catch (no file added, by design); root special files (sitemap, robots,
manifest, llms.txt, icons) are not segments and stay under `global-error`.
New `tests/segment-errors.test.tsx` (4 tests: coverage of every section dir,
per-file segment-name wiring, fallback render, reporter wiring).

```
$ # removed app/[locale]/payments/error.tsx
 Test Files  1 failed (1)
      Tests  2 failed | 2 passed (4)
$ # restored → 4 passed; tsc exit 0
```

### F8 — shared Sentry contract: FIXED (`047142d`)

`lib/sentry-release.ts:15,31-39`: `PATIENT_WEB_SENTRY_APP_ID =
"patient-web"`; `SENTRY_RELEASE` first, then legacy
`NEXT_PUBLIC_SENTRY_RELEASE`, verbatim; else
`patient-web@{NEXT_PUBLIC_APP_VERSION || dev}+{SENTRY_BUILD || GIT_SHA ||
VERCEL_GIT_COMMIT_SHA || dev}` with `+dev` appended unless production (mirrors
admin `a16388a`, only the appId and legacy env names differ). All four
runtimes (client/server/edge configs + `instrumentation.ts` via the server
and edge configs) already call `getSentryRelease()`, so they share the
contract with no per-client edit. `lib/sentry-release.test.ts` rewritten to
the contract (6 tests, incl. legacy-fallback and `+dev` cases);
`.env.production.example` documents `SENTRY_RELEASE` / `SENTRY_BUILD` /
`NEXT_PUBLIC_APP_VERSION`.

```
$ # stripped the +dev suffix: return base
 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
$ # restored → 6 passed; tsc exit 0
```

### Final verification (after all 8)

```
$ node node_modules/typescript/bin/tsc --noEmit; echo "tsc exit: $?"
tsc exit: 0
$ node node_modules/vitest/vitest.mjs run --silent --reporter=basic
 Test Files  190 passed | 14 skipped (204)
      Tests  607 passed | 23 skipped (630)
```

Before → after this round: files 188 → 190 passed (14 skipped both ways);
tests 594 → 607 passed (+13: sentry +2, optimistic-ui +3, slots +4,
segment-errors +4), 23 skipped both ways — frozen debt untouched.
`translation-key-parity` green (in-suite), module-boundary green (new imports
are `@/lib/*` and local components only — no `@nabd/*`), tsc clean.

### Final gap check (plan lines 635–660, patient-web slice only)

- 15.1: timeouts/retries/`Retry-After`/abort/offline/catalog all unit-proven;
  F2/F3 closed. Nothing unmet in-slice.
- 15.3: forced-500 rollback + payment-processing proven; F1/F5 closed.
  Cart/wishlist/mark-as-read/likes: no server mutation exists (documented —
  nothing to wire).
- 15.4: banner + last-updated + outbox (never payments) + image downgrade +
  call fallback + same-key upload resubmission proven. True mid-byte resume
  needs a backend chunk protocol — `DEFERRED-OUT-OF-SCOPE (backend/)`.
- 15.5: per-segment `error.tsx` (65) + global + release-tagged reports done;
  F7/F8 closed. `BLOCKED: Sentry DSN and SENTRY_AUTH_TOKEN are owner secrets`
  — wiring/tests shipped, no event or source map can leave without them. The
  ≥99.5% crash-free target needs production telemetry —
  `BLOCKED: no production data in this worktree`.
- 15.9: server-anchored guards + explicit-zone slots + ±1 day tests done; F4/F6
  closed. Server-side enforcement (OTP expiry, slot holds) lives in backend/ —
  `DEFERRED-OUT-OF-SCOPE`. Ramadan/holiday hours are provider-schedule data
  owned by provider-app/backend — `DEFERRED-OUT-OF-SCOPE (patient-web renders
  slots as given)`.
- 15.10: minimums documented + old-device notice shipped. `BLOCKED: device
  farm is a paid external service with no account configured — no report
  attached, none fabricated`. Playwright WebKit/Firefox/Chromium CI lives in
  `.github/` — `DEFERRED-OUT-OF-SCOPE (another agent owns .github/)`.
- Out of slice (not patient-web work, listed so nothing is silently dropped):
  15.2 rapid-tap live gate, 15.6 Schemathesis/empty-state snapshots, 15.7
  chaos per dependency, 15.8 app-kill-during-payment live journey, 15.11/15.12
  live gates and OTA/flags.
