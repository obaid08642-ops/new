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
