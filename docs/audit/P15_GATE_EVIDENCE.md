# Phase 15 — gate evidence (local only, NOT pushed)

Orchestrator-run checks on `p15-integrate` (tip `efad20d`, base `f0551ec`).
No `git push` was performed anywhere in this session (owner instruction).

## Checks run by the orchestrator (real output)

1. `cd backend && node node_modules/typescript/bin/tsc --noEmit` → exit 0, no output (clean).
2. `cd backend && node node_modules/jest/bin/jest.js --silent --runInBand circuit-breaker idempotency`
   → `Test Suites: 5 passed, 5 total` / `Tests: 21 passed, 21 total`.
   (Note: this repo's jest binary accepts positional patterns; `--testPathPattern`
   is rejected as replaced by `--testPathPatterns`, and bare `npx jest` resolves a
   wrong cached copy. Agents were told accordingly.)
3. Merges: 6/6 merged into `p15-integrate` with zero conflicts
   (`4f73e2f`, `9edb3f3`, `4a61b05`, `1b8baa0`, `434939e`, `efad20d`).
   Total vs base: **254 files, +26917/−2179**.
4. Scope audit per branch (`git diff --name-only f0551ec..<branch>`): every
   branch touched only its assigned directories
   (app→patient-app, prov→provider-app, web→patient-web, backend→backend,
   admin→admin, gates→tools/.github/docs-audit-notes).

## Baseline reds confirmed by the orchestrator (pre-existing, NOT Phase 15)

- `backend/src/modules/events/auto-entity-seo-pipeline.spec.ts` Scenario 20
  FAILS (sitemap lacks the expected pharmacy URL). Tracked as Round 10 item 11.
- `patient-app`: `react-native-localize` TurboModule unmocked breaks suites
  importing `AppContext` (pre-existing; one slice fixed its own import chain).
- `provider-app`: `OtpModal.test.tsx` cold-cache 5 s timeout (reproduced on
  unmodified baseline; environment flake, untouched).

## Environment BLOCKEDs (machine has no docker, no codex CLI)

- `tools/live/run_gate.sh` and all live journeys: cannot run
  (needs Mongo replica set + Redis + moto + SMTP sink + fake Moyasar).
- Live Sentry send (owner DSN), device-farm run (paid service, no account),
  test OTA 5%+rollback (Expo account), Schemathesis live fuzz (needs server),
  ≥99.5% crash-free (target, not measurable locally).

## Independent review (3 fresh-context reviewers, read-only, vs origin/main)

Full reports are with the orchestrator. Verdicts per plan task:

| Task | Verdict | Hardest finding |
|---|---|---|
| 15.1 one API client | PARTIAL | `Request.signal` dropped (`patient-web/lib/api/net/client.ts:129-147`); locale catalogue only ar/en; provider client is a same-path semantic replacement (merge risk) |
| 15.2 no double actions | PARTIAL | **FAIL:** buffer-overlap bookings are check-then-act (`appointments.service.ts:231-248` vs exact-start unique index); **FAIL:** legacy idempotency replay skips body-hash (`interceptor.ts:101-102`) |
| 15.3 optimistic UI | PARTIAL | **Fail-open default:** any unlisted/typo'd kind renders false success (`patient-web/lib/api/optimistic.ts:39,79`; `patient-app/src/utils/optimistic.ts:43-47`) |
| 15.4 weak network | PARTIAL | **Data loss:** `patient-app …/offline/outbox.ts:205-230` drops the entry when the online send throws; upload resume has no production transport; throttled journey's replay step is SKIP |
| 15.5 boundaries+Sentry | PARTIAL | patient-web has 1 segment boundary + global, not per-segment; live send BLOCKED everywhere (mock-only) |
| 15.6 schemathesis | PARTIAL | Never run + CI job lives in another slice (present, exact CLI match); NaN fix covers `GET /medicines` only (8+ bare `parseInt` remain in same controller) |
| 15.7 breakers | **PASS** | Q81 fix sound (args-driven); adjacent pre-existing wrong URL (`payments.module.ts:206` `/refund` singular) wrapped but unnoticed |
| 15.9 clocks/tz | PARTIAL | **FAIL:** `care.service.ts:369-380` list mirror is UTC-anchored, diverges from the Riyadh engine near midnight; zero client code in patient-app/provider-app |
| 15.10 devices | PARTIAL | patient-app has no min-OS gate; `DeviceGate` flashes false rejection on cold start; farm runner exits 0 on empty matrix; browser CI targets production API |
| 15.11 chaos | PARTIAL | `gate_run.sh` drops `j_payments`; re-verify `in (…, None)` is vacuous; 500s count as "graceful"; SMS/LiveKit drills cannot fail |
| 15.12 OTA/flags | PARTIAL | **Kill-switch baseline runs AFTER the upserts that create the rows** (`j_killswitches.py:67-85`) → passes by construction, no working tripwire; admin save-guard bypassed in wiring; no `updates.channel` in eas.json |
| Gate-P15 journeys | PARTIAL | 15.1→15.2 header match verified; chat rapid-tap has a findOne-then-insert race; throttled core SKIP |
| Coherence | PARTIAL | Sentry uses 4 different release schemes; 15.4 replay UNPROVEN; absent-flag fix NOT PRESENT + masked |

Main-vs-branch: textual merge `origin/main ↔ efad20d` is CLEAN (0 markers,
disjoint hunks); no filename collisions; no endpoint-contract breaks; no
duplicated helpers. Merge risks: provider-app client semantic replacement;
`run_gate.sh` / `gate_run.sh` / `fake_moyasar.py` same-file edits;
`GET /moyasar/payments/me` absent on main (gate slice not self-contained).

## Implementer notes (in-tree)

- `patient-app/P15_NOTES.md`, `provider-app/P15_NOTES.md`,
  `patient-web/P15_NOTES.md`, `backend/P15_NOTES.md`, `admin/P15_NOTES.md`,
  `docs/audit/P15_GATES_NOTES.md` — per-task changes, real command tails,
  mutation proofs, BLOCKED/DEFERRED lines.
