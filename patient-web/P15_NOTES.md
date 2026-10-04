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
