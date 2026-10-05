# P15 backend notes (branch `p15-backend`)

Worktree: `/var/folders/f1/j1zvgjbj0m16m2rwky7f5zqr0000gn/T/opencode/p15/backend`
(only `backend/` touched; repo-root-relative paths below).
Test runner: `cd backend && node node_modules/jest/bin/jest.js --silent --runInBand <path>`
Typecheck: `cd backend && node node_modules/typescript/bin/tsc --noEmit` (clean at start, clean at end).
Never pushed (hard rule). `node_modules` never committed.

## Commits (oldest → newest)

- `cbc8a1f03fb24695b6891bd401ba1ce4908e36d4` [P15.15.7] fix Q81: breaker cached by name discarded the caller's work function
  (pre-existing on this branch when the session started; verified + probe-owned this session — see 15.7)
- `cf5b93635406da9ef148060d49324efda5dc6605` [P15.15.7] timeout+breaker+fallback on all 8 external deps; chaos suite
  (pre-existing on this branch; verified + repaired one env failure — see 15.7)
- `6e15d07f1c9f44654adc712788e0eefd70a0ca58` [P15.15.7] fix chaos maps test fetch stub for envs without global fetch (mine)
- `246c19d7a42d08c57ad60bfdc6e4bc456797fe80` [P15.15.2] merge duplicate idempotency interceptors into one protocol; concurrency proofs (mine)
- `cb17572c3b6e1c7ae520cc5732b0e25c6b6b6dfa` [P15.15.6] schemathesis fuzz harness; NaN pagination guards (no 500 on bad input) (mine)
- `b3e500775f6335c93746b0b9261a313884a75b1f` [P15.15.9] server-clock OTP/slots/reminders; Riyadh tz; Ramadan+holiday hours (mine)

## 15.7 — Slow or failing dependencies (Q81 + 8-dep audit + chaos)

Pre-existing work (cbc8a1f, cf5b936) found in the branch at session start and
audited file-by-file before building on it:

- `src/common/circuit-breaker.service.ts` — breaker cached BY NAME; the shared
  opossum instance now runs a `dispatch(fn, ...args)` action so the per-call
  work function travels WITH the fire args (no shared mutable slot).
  `create()`/`fire()` both bind `fn` per call. Moyasar refund passes
  `{paymentId, body}` as fire args (same args-driven shape as the sync breaker).
- 8-dep audit (from cf5b936 diff): payment (Moyasar/Stripe/Tap adapters with
  breaker+timeout in `payments.module.ts`), SMS (breaker, degrade false→OTP
  email fallback), email (`mail.module.ts`), WhatsApp, AI gateway (provider
  chain fallback), maps (no external call — local haversine; typed address is
  the primary path), S3/storage, LiveKit — each with timeout + breaker +
  specified fallback, pinned by `src/common/resilience-chaos.p15.spec.ts`.
- Q81 regression spec `src/modules/moyasar/moyasar-refund-q81.spec.ts` refunds
  TWO different payments and asserts per-payment `/refunds` URLs.

What I changed: `resilience-chaos.p15.spec.ts` maps test called
`jest.spyOn(globalThis, 'fetch')` but this jest env has no global `fetch`
→ committed suite was RED (1 failed, 27 passed). Fixed with a
stub-or-spy + finally-restore (6e15d07). No behaviour weakened.

Real terminal output (tail):
- Before fix: `FAIL src/common/resilience-chaos.p15.spec.ts … Property 'fetch'
  does not exist in the provided object … Tests: 1 failed, 40 passed, 41 total`
  (trio run with breaker + Q81 specs).
- After fix: `PASS src/common/resilience-chaos.p15.spec.ts (41.372 s)` /
  `Tests: 28 passed, 28 total`.

Mutation proofs (all restored after, `grep MUTATION-PROBE` clean):
- Q81 (mine, this session): hardcoded `paymentId: 'pay_FIRST0001'` at the
  refund fire site → `moyasar-refund-q81.spec.ts -t interleaves` RED
  (`Expected 5 urls, Received 5 [all first-id]`), restored → green.
- (Breaker dispatch/lock probes for the pre-existing 15.7 code were not
  re-run; the Q81 fire-arg probe above covers the load-bearing Q81 behaviour.)

## 15.2 — No double actions (246c19d)

Fact 2 resolved by MERGE (nothing weakened):
- `src/common/idempotency/idempotency-key.interceptor.ts` is now the single
  write-path protocol: honours AND sets BOTH per-request markers
  (`__idempotencyHandled` + `__idempotencyKeyHandled`), Redis lock NX 120 s,
  response TTL 24 h, replay with `idempotent_replay: true`, hash-mismatch →
  400, NEW legacy pre-shape replay (`findLegacyResponse` — `{response}`
  records without `request_hash` replay instead of double-executing).
- `src/common/idempotency.interceptor.ts` (global APP_INTERCEPTOR) is now a
  thin subclass adding only `@RequireIdempotency()` 400 + key-shape 400.
- One in-flight payment per order: `PaymentsService.createPaymentIntent`
  persists `initiating` under a partial unique index; 11000 loser returns the
  winner (pre-existing, pinned). One booking per slot per patient:
  `AppointmentsService.create` overlap check + unique index; 11000 → 409
  `slot_already_booked` (pre-existing, pinned).
- New specs: `idempotency-merge.p15.spec.ts` (mixed global+explicit wiring both
  orders, legacy replay, 10× concurrent → 1 execution + 9×409 + replay),
  `payments-concurrency.p15.spec.ts` (2 racers → 1 txn, 1 PSP call, shared
  winner), `appointments-concurrency.p15.spec.ts` (2 racers → 1 row + 1×409).
  Also fixed the appointments spec mock to expose `toObject()` like a real
  mongoose doc (winner was throwing `refreshed?.toObject is not a function`).

Real terminal output (tail):
- `Test Suites: 3 passed, 3 total / Tests: 6 passed, 6 total` (merge +
  appointments + payments).
- Live rapid-tap journey NOT run (no docker): `BLOCKED: live rapid-tap journey
  needs a running server (tools/live/run_gate.sh requires docker/Mongo/Redis,
  unavailable on this machine); concurrency is proven by the mocked 10× test.`

Mutation proofs (restored after):
- `acquireLock → always true`: 10× test RED (`Expected: 1, Received: 10`
  executions).
- `appointments.service.ts 11000 → 'NEVER'`: concurrency test RED (loser
  throws raw duplicate instead of 409).
- `payments.module.ts 11000 → 'NEVER'`: concurrency test RED (loser throws
  instead of sharing the winner).

## 15.6 — Bad or empty data (cb17572)

- Harness: `backend/scripts/schemathesis_fuzz.sh` (executable) with EXACT CLI
  `--base-url <url> --spec <path-or-url>` (+ optional `--auth-token`,
  `--checks` default `not_a_server_error`, `--workers`, `--max-examples`,
  `--dry-run`, `--help`). Exit 0 = no 5xx; 1 = usage/missing runner/spec;
  2 = 5xx found (fail-closed). Prefers `st`, falls back to `schemathesis`,
  override via `SCHEMATHESIS_BIN`. Verified: `--help`→0, `--dry-run`→0
  (works with no runner installed), missing `--spec`→1, bad spec path→1, no
  runner→1, `bash -n` SYNTAX_OK.
  - Fuzz run NOT executed: `BLOCKED: no schemathesis runner installed and no
    live server can start here (no docker); bring up staging plus
    'pip install "schemathesis>=3"' then run the script.`
- Production fix (real 500-class hole found by grep): `GET /medicines`
  parsed `?page=/ ?limit=` with bare `parseInt` (no `|| default`, unlike the
  rest of the codebase), and `paginate()`/`cursorPage()` propagated NaN into
  `skip()/limit()` and back out as `{page: NaN, total_pages: NaN}`. Fixed at
  both layers: controller coerces (`|| 30` / `|| 1` / `|| 500`, + radix) and
  services guard with `Number.isFinite … : default` (covers all callers).
  Cursor decode + JWT-decode paths were already try/caught (verified by read).
  Global `SentryExceptionFilter.translateMongoError` (CastError/BSONError →
  404, ValidationError → 400, 11000 → 409) already has unit coverage
  (`sentry.filter.spec.ts`, 7 tests incl. idFilter routing).
- New spec `medicines-pagination-guard.p15.spec.ts`: 7 tests (NaN → 1/30
  finite metadata, clamp negatives/huge, garbage cursor → first page, valid
  cursor still predicates, list(NaN) safe, controller coercions). All green.
- `DEFERRED-OUT-OF-SCOPE: .github/ is owned by another agent — required
  workflow step: scheduled/manual job that runs
  'backend/scripts/schemathesis_fuzz.sh --base-url <staging-url> --spec
  backend/openapi.json' (plus '--auth-token $STAGING_TOKEN' if staging needs
  auth) with 'pip install "schemathesis>=3"' and fails the gate on exit ≠ 0.`

Mutation proofs (restored after):
- Service guard reverted → `paginate(NaN,NaN)` test RED (`Expected: 1,
  Received: NaN`).
- Controller `|| 30` removed → controller test RED (`Expected: 30,
  Received: NaN`).

## 15.9 — Clocks and time zones (b3e5007)

- New `src/common/riyadh-clock.ts` (pure): `RIYADH_TZ`, `riyadhParts()`
  (Riyadh dow/hh/mm/ymd via Intl, no Date-local getters), `isRamadan()`
  (Umm al-Qura month 9 in Riyadh, false when unsupported).
- `SchedulingEngineService.checkAvailability/isOnDuty` used
  `getDay()/getHours()` = PROCESS timezone (UTC in containers) — a Riyadh
  09:00 opening was evaluated as 09:00 UTC. Now resolved in Riyadh.
- `SlotService.hoursFor()` takes optional `dateStr`, precedence:
  `special_hours` (exact date; malformed entries fall through, never strand)
  > approved slots > `ramadan_hours` (weekly shape, in-Ramadan only) >
  per-mode > legacy. `hasSlotsToday`/`nextAvailable` anchor on the Riyadh
  calendar day. `CareService` batched list mirror (`batchWindowsFor`) threads
  the same precedence (projection is exclusion-based, new fields flow through).
- Schema: `ProviderProfile.ramadan_hours` + `special_hours` (both
  `@Prop(type: [Object], default: [])`).
- OTP: verified server-side by read — both paths store bcrypt hash under
  Redis EX TTL and verify from the store; requests carry no timestamps.
  Recurring reminders already ran on server Riyadh time (pinned, not changed).
- New specs (24 tests, all green): `riyadh-clock.p15.spec.ts` (4),
  `schedule-ramadan.p15.spec.ts` (7: Ramadan/normal/holiday/catch-up/
  malformed/no-field-fallback/±1d stability/list mirror),
  `scheduling-engine-riyadh.p15.spec.ts` (4),
  `otp-server-clock.p15.spec.ts` (6: live verify, −1d ok, +6min expired,
  +1d expired, absent → expired, 300 s TTL issuance),
  `recurring-riyadh.p15.spec.ts` (3: fires 05:00Z, silent 06:00Z, no resend).
- Real terminal output (tail): `Test Suites: 5 passed, 5 total / Tests:
  24 passed, 24 total`; `tsc --noEmit` clean.

Mutation proofs (restored after):
- Engine reverted to getDay/getHours, run with `TZ=UTC` (container reality;
  dev machine is Asia/Riyadh where the bug hides): 2 RED
  (06:00Z wrongly refused; Monday-boundary wrong). Fixed code also passes
  under `TZ=UTC` (4/4) — true TZ-independence.
- Ramadan branch disabled → Ramadan test RED (`Expected "T10:30…", Received
  "2027-02-15T09:00…"`).
- `batchWindowsFor` dateStr threading removed → list Eid test RED (doc-eid
  leaks back in).
- Recurring tz → UTC → 05:00Z fire test RED (0 sends). (Line pre-existed;
  test pins it.)
- OTP absent-entry branch disabled → no-entry test RED.

## Test counts

- Baseline (session start): `tsc --noEmit` clean (verified). Known red per
  prompt: `auto-entity-seo-pipeline.spec.ts` Scenario 20 (still red — verified
  this session: `✕ Scenario 20 … 1 failed, 22 skipped`; files untouched by my
  commits). No full-suite baseline was taken (jest per-test 5 s timeouts under
  load; mongod-dependent suites cannot run here).
- Final: `tsc --noEmit` clean (verified after every commit). New specs added:
  6 (15.2) + 7 (15.6) + 24 (15.9) + Q81/chaos pre-existing 41 (28 chaos + Q81
  + breaker, all green after my fetch fix) = all focused suites green.
- Neighbouring suites re-run: slot-leave ✓, appointments-slot-buffer ✓,
  sentry.filter ✓, patient-web-auth.contract ✓, medicines guard ✓.
- Pre-existing failure observed (NOT mine, NOT fixed, files untouched):
  `doctor-list-perf.spec.ts` "filters available_today…" fails only in the
  ~22:45–24:00 UTC window — open-all-day (00:00–23:59) provider has no slots
  ≥ now+15 min that late; deterministic time-flake, passes the rest of the
  day. Left as-is per rule 5 (no weakening/fixing others' tests unasked).

## Incident (self-caused, fully remediated)

Mid-session I ran `git stash push -- <wrong-relative-paths>` (paths relative
to repo root while cwd was `backend/`); the push failed AND the trailing
`; git stash pop` popped a STALE pre-existing entry (`stash@{0}: WIP on
fix/audit-2026-09`, another session's work) causing conflicts across ~55
files including patient-app/. Remediation: restored every pop-introduced path
to HEAD via `git checkout HEAD --` (my 4 modified files excluded by filter),
deleted 2 pop-restored untracked files that predated my session
(`admin-config.controller.spec.ts`, `import-catalog-v14.spec.ts`, both
preserved inside the untouched `stash@{0}`), verified final
`git status --porcelain` shows only my intended files, and left `stash@{0}`
in place. No other agent's work was lost or committed. Lesson: never
`git stash` in a shared worktree; use in-place edit/restore probes only
(which is what all mutation proofs above used).

## Fix round 2

Branch `p15-backend`, on top of `2aac2c4`. Prior-round commits
`ad7e2bb/d76b46a/c1ae9c1/be5e3cf/2aac2c4` verified present via
`git log --oneline`; not redone. Work is mocked-repository only
(`mongodb-memory-server` SIGABRTs here); `stash@{0}` left untouched;
`auto-entity-seo-pipeline.spec.ts` Scenario 20 never touched (still red —
verified at the end). `tsc --noEmit` clean after every commit.

### F1 — booking buffer-overlap race (FIXED)

- File: `backend/src/modules/care/appointments.service.ts`
  (`paddedWindowKeys`, `claimPaddedWindow`, wired into `create()` +
  `reschedule()`); new spec
  `backend/src/modules/care/appointments-buffer-race.p15.spec.ts` (4 tests).
- Why not a transaction: concurrent txns run under snapshot isolation with no
  predicate lock — two txns both read "no overlap" and both commit. The repo's
  own concurrent paths (payments `initiating` partial index, slot-locks exact
  guard, 15.2 appointments exact-slot index) all resolve races the same way:
  a UNIQUE index + 11000-loser-returns-409. F1 extends that pattern to ranges:
  each booking atomically inserts ONE hold doc (`appointment_slot_holds`)
  carrying every 1-minute bucket key `appt-hold:<doctor_id>:<epochMinute>` of
  its padded window under a unique multikey index on `keys`. Single-doc
  inserts are atomic, so overlapping requests serialize; the loser throws
  `ConflictException('slot_already_booked_or_conflicts_with_buffer')`.
  Minute buckets are exact for minute-aligned windows (overlap ⟺ shared
  bucket). Holds are deleted after commit; `expires_at` + TTL (60 s) bounds
  crash orphans. Legacy overlap `findOne` kept as defence in depth.
- Real tails: new spec `Tests: 4 passed, 4 total`; neighbours
  `appointments-concurrency + states + slot-hold + slot-buffer`
  `Test Suites: 5 passed, 5 total / Tests: 29 passed, 29 total`; `tsc` clean.
- Mutation proof (in-place edit, restored via editor — no stash/checkout):
  with the `keys.push` line commented out, spec goes
  `Tests: 3 failed, 1 passed, 4 total`; restored → 4/4 green,
  `grep MUTATION-PROBE` clean.
- Self-caused incident (remediated): I reverted the whole service file with
  `git checkout -- <path>` while restoring the probe. Recovery: re-applied
  all six F1 edits from history, `tsc` clean, all 5 care suites green (29/29).
  Lesson (same as round 1): never `git checkout/stash` in a shared worktree;
  use editor-only probes.

### F4 — UTC-anchored list mirror (FIXED)
- Files: `backend/src/modules/care/care.service.ts`
  (`loadAvailabilityBatch` anchors on `riyadhParts`, `firstAvailableOnDay` /
  `firstAvailableSlot` / `hasAvailableSlotOnDay` / `batchNextAvailable` /
  `batchHasSlotsToday` take `durationMinutes = 30`, `AvailabilityBatch` +
  `firstAvailableOnDay` exported for tests); new spec
  `backend/src/modules/care/care-riyadh-mirror.p15.spec.ts` (3 tests).
- Midnight case pinned at `Date.now() = 2026-06-01T21:30Z` (= 00:30 Riyadh
  06-02): `dayStrs[0] === '2026-06-02'` and the appointments range opens at
  `2026-06-02T00:00:00.000Z`. Duration case: 09:00–09:45 window, 60-min
  appointment → null (09:00 fits a 30-min step but not a 60-min stay);
  booked-09:00 in a 09:00–10:30 window → 09:30.
- Real tails: new spec `Tests: 3 passed, 3 total`; neighbours
  `schedule-ramadan + care-pagination-guard` 13/13,
  `doctor-list-perf + public-discovery + slot-listing-buffer` 12/12
  (doctor-list-perf green — run outside its known 22:45–24:00Z flake window);
  `tsc` clean.
- Mutation proofs (editor-only, restored): UTC-anchor revert →
  `1 failed, 2 passed` (dayStrs[0] back to 06-01); hardcoded 30-min step →
  `1 failed, 2 passed` (60-min returns 09:00); `grep MUTATION-PROBE` clean.

### F8 — chat rapid-tap race (FIXED)

- Files: `backend/src/modules/chat/chat.service.ts` (`sendMessage` keeps the
  `findOne` fast path, wraps `create` in a 11000 catch that re-reads the
  triple `(client_message_id, thread_id, sender_id)` and returns the winner);
  new spec `backend/src/modules/chat/chat-dedup-race.p15.spec.ts` (2 tests).
- Atomicity source: the schema's existing UNIQUE sparse index on
  `client_message_id` (same protocol as the payments 11000-loser-shares-winner
  path — deliberately NOT a findOneAndUpdate rewrite, so the
  `chat.contract.spec.ts` create-payload assertions stay exactly as written).
  Loser never reaches the thread-metadata update (pinned: `updateOne` ×1).
- Real tails: new spec + `chat.contract + booking-thread + lj06`
  `Test Suites: 4 passed, 4 total / Tests: 15 passed, 15 total`; `tsc` clean.
- Mutation proof (editor-only, restored): winner re-read forced to miss →
  `1 failed, 1 passed` (loser rejects raw E11000); restored → green,
  `grep MUTATION-PROBE` clean.

### F9 — 15.12 kill switches: absent-default + seeding + 6 wired consumers (FIXED)

- Absent-default (`backend/src/modules/feature-flags/feature-flags.service.ts:
  isEnabled` now returns `boolean | null`, null when the row is absent — was
  `false`, which isKilled() misread as "explicitly disabled" so every switch
  fired pre-seeding). `ensureSeeded()` creates ONLY missing flags as
  `enabled:true` (never overwrites an admin choice), runs on `onModuleInit`
  (boot-safe: catches store outage, consumers fail open meanwhile);
  `KILL_SWITCH_FLAG_KEYS` = the 6 canonical keys. Also fixed
  `repositories/featureflag.repository.ts` to type against the module-local
  `{key, enabled}` schema (runtime model was already that; the import pointed
  at the legacy `{flagName, isEnabled}` shape). Helper
  (`common/killswitches/killswitches.helper.ts`) gains `connectionFlagSource`
  (reads the same `featureflags` collection, absent/error → null) and its
  stale fail-closed comments now state the corrected contract.
- Wiring (each fail-open on absent/error, each with a killed unit test):
  1. AI gateway (`modules/ai/ai-gateway.service.ts: generate()`): killed →
     `ServiceUnavailableException('ai_disabled_by_kill_switch')` before any
     provider call (no LLM, no billing).
  2. Recommendations (`modules/product-ranking/product-ranking.service.ts:
     getRankedDrugIds`): killed → deterministic `{drug_id: 1}` default list,
     no ZSet reads, no degraded hydration (Mongo fallback extracted to
     `mongoRanked`); R9 Redis-only path (`product-ranking-r9.service.ts`):
     killed → `{ids: [], total: 0}` (no local default source; empty beats a
     fabricated ranking).
  3. Nudges (`modules/engagement/engagement.controller.ts`): `trackEvent`
     still records the interest event but skips `queue.add`
     (`nudges_killed: true`); `processNudge` drops already-queued jobs.
  4. Live map (`modules/ops/ops.controller.ts: liveMap`): killed → static
     `{points: [], total: 0, live_map_killed: true}`, zero collection scans.
  5. Analytics ingestion (`modules/medicines/medicines.service.ts:
     trackSearch`): killed → accept-and-drop the `search_queries` write;
     search results unaffected, flag read stays off-path.
  6. Search suggestions (`medicines.service.ts: didYouMean`): killed →
     `{suggestion: null, alternatives: [], query}` with no pool reads.
- Specs: `modules/feature-flags/feature-flags-killswitch.p15.spec.ts`
  (5: keys, absent-null, isKilled×3 via the REAL service, seed-only-missing +
  never-overwrite, boot-safe init) and `modules/killswitch-consumers.p15.spec.ts`
  (12: killed + fail-open sides where cheap).
- Real tails: flags spec 5/5 + helper spec (8/8 in the 13-test joint run);
  consumers 12/12; neighbours — ai-gateway r21+purpose+fail-closed 8/8,
  product-ranking+r9+boosts+ops-alerts+ops-metrics 15/15,
  medicines×6 + ai.service×2 33/33; `tsc` clean.
- Mutation proofs (editor-only, restored): isEnabled back to false-on-absent
  → flags spec `2 failed, 3 passed`; gateway check neutered →
  consumers `1 failed, 11 passed`; `grep MUTATION-PROBE` clean.
- Live-toggle proof is another agent's journey (stated in the task): behaviour
  here is correct and testable per toggle.

## BLOCKED / DEFERRED lines (round 1, unchanged)

- `BLOCKED: live rapid-tap journey needs a running server
  (tools/live/run_gate.sh requires docker/Mongo/Redis, unavailable).`
- `BLOCKED: schemathesis fuzz run needs a live server + runner
  (pip install "schemathesis>=3"); harness provided and arg-checked.`
- `DEFERRED-OUT-OF-SCOPE: .github/ is owned by another agent — required
  workflow step runs backend/scripts/schemathesis_fuzz.sh --base-url
  <staging-url> --spec backend/openapi.json and fails on exit ≠ 0.`
- Nothing else was impossible; no other scope notes needed (all touched files
  are under `backend/`).
