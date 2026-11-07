## 16:49 UTC 2026-11-07 — #2404 live gate red fixed; #2457 clean so far
Status: in progress
PR: #2404 (CI: was red on lighthouse + live gate shard 1/5; fix pushed e43a9972, re-running), #2457 (CI: no red, live gate shards 2/4/5 still running), #2456 (CI: not re-read this round; no red at 16:20)
What changed: root cause of #2404 shard 1 (j_pharmacy_tracking 7 fails, j_provider_scenarios 30 fails): the backend's admission control answered GET provider-moderation/pending and command-center with 503 server_shedding_load (+ Retry-After 3) on the loaded runner, so the admin never approved the new provider and every later step got 403 provider_approval_required. Journeys never honoured Retry-After. tools/live/lib.py Client.req now repeats GET/HEAD that get 503 server_busy/server_shedding_load, waiting retry_after_seconds, max 12 tries; then reports the 503 unchanged. No test skipped, no budget touched, backend unchanged. Note for lead: this likely affects every PR's shard 1 under load; the same lib.py change would help on main.
Left / blockers / questions: lighthouse red on #2404 is the known lane X script budget. Next: confirm shard 1 green, then R11 P2 round2 copies and PT-24.

## 16:19 UTC 2026-11-07 — order note: take over #2456
Status: in progress
PR: #2456 (CI: pending after push; no red seen), #2457 (CI: no red; Backend build and tests green incl. Mongo suites, others pending), #2404 (CI: pending)
What changed: #2456 f/refund-halalas-money was behind main; merged origin/main (clean), tsc clean, refund-executor.spec 3 passed, pushed 63ec9ed5.
Left / blockers / questions: waiting for CI on all three; next check at :47. After they are green: remaining round2 copies (R11 P2), then SCENARIOS (PT-24 payment return first).

## 16:01 UTC 2026-11-07 — order 1.2 (halala read paths)
Status: in progress
PR: #2457 (CI: pending), z/halala-reads. #2404: CI pending after merge, test+acceptance green so far.
What changed: Moyasar reconcile compares amount_halalas/refunded_amount_halalas (double only as fallback; loadLocal passes shadows); gateway refund body uses toHalalas(amount); pharmacy paid event uses stored amount_halalas else toHalalas. New spec case. tsc, nest build, dtolint 0, pure jest suites pass.
Left / blockers / questions: my sandbox cannot download MongoMemoryServer (403), so 4 Mongo-backed suites (finance-integrity, halala-backfill, coupon-rules, coupon-rx-abuse) run only in CI; I will fix any red. Next: remaining round2 copies (R11 P2 next step), then order 3 scenarios in docs/qa/SCENARIOS.md.

## 15:57 UTC 2026-11-07 — order 1.1 (#2404 take-over)
Status: in progress
PR: #2404 (CI: pending, no checks reported yet after push)
What changed: merged origin/main into f/gate-insurance-returns (clean, no conflicts), pushed 6e54f93e. Local: tsc --noEmit clean, jest src/modules/labs 18 suites/82 tests pass, dtolint exit 0.
Scheduled tasks: created two hourly tasks in this account (at :17 and :47), both fire into this session.
Left / blockers / questions: waiting for CI; expect only lighthouse red (lane X budget). Next: order 1.2 halala shadow read paths.

# Lane Z outbox
