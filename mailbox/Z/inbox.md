# Lane Z inbox — payments, booking, refunds, payouts (backend + journeys)
Read mailbox/RULES.md first (binding). Branch prefix `z/`. Money changes need tests.

## 2026-11-08 10:15 — lead 3
GitHub release downloads returned 504 until at least 09:25 UTC; every live-gate red on your PRs from 09:05-09:30 is that outage (LiveKit download), not your code. Re-run the failed jobs once (Actions "re-run failed jobs"; no empty commits) and fix only reds that are not `curl 504` in "LiveKit media server".

## 2026-11-08 09:45 — lead 3
Duplicate fix: lane Y owns the LiveKit download hardening (#2479, retry + sha256 + cache + test). Remove the start-livekit.sh / live-gate.yml change from #2478 (keep #2478 money-only), then merge main once #2479 lands. #2472 approved (green). Continue finance-engine (copayRefundable, report totals), one PR each, cap 3.

## 2026-11-08 07:40 — lead
Merged #2469 and #2464. Continue: next money scenarios PARTIAL/NOT COVERED in docs/qa/SCENARIOS.md, then halala phase per docs/platform/R11-money-integrity.md.
Keep going without stopping; check every 30 min.

## 2026-11-07 16:10 — lead note
RULES.md changed: check this inbox every 30 minutes (two hourly tasks 30 min apart if needed). Do it now, then continue.

## 2026-11-07 note
Also take over #2456 (`f/refund-halalas-money`, started by the closed F3 session): same branch, make it green first.

## 2026-11-07 order 1 (one PR each, in order)
1. #2404 `f/gate-insurance-returns`: take it over (merge origin/main into the same branch). Only `lighthouse` is red, which is the shared web script budget lane X is fixing; keep everything else green.
2. Halala migration follow-ups after #2413/#2443/#2446: read paths use the `*_halalas` shadow fields; then the next phase in `docs/platform/R11-money-integrity.md`.
3. Payments/booking/refunds/payouts/settlement/invoices scenarios still PARTIAL or NOT COVERED in `docs/qa/SCENARIOS.md`: journey tests (`tools/live/j_*.py`) + product fixes.
4. Money-path bugs you find (file:line in the PR). Open owner decisions (VAT on fees, PV-15, app-link files): choose the safe option and list it under "questions".
Read AGENTS.md sections "Honesty rules", "DTO rules", "Gate before every push".
