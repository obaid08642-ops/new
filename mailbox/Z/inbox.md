# Lane Z inbox — payments, booking, refunds, payouts (backend + journeys)
Read mailbox/RULES.md first (binding). Branch prefix `z/`. Money changes need tests.

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
