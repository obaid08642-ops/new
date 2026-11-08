# F3 state (payments, booking, refunds, payouts)
Updated 2026-11-07.

## Open PRs
- #2404 f/gate-insurance-returns: main merged in; every check green except `lighthouse` (shared web budget, fixed by another lane).
- f/refund-halalas-money: R11 P2 step 1, `reserveRefund` uses `money.ts toHalalas` instead of its local `cents` (see PR).

## Next
1. R11 P2: remaining local rounding copies (`round2`, `Math.round(x*100)` e.g. payments.module.ts:448) -> `money.ts`; then read paths on `*_halalas` shadows (ledger, invoices, refunds, wallet are dual-written).
2. P1 still open: orders and bookings dual write.
3. docs/qa/SCENARIOS.md payments/booking/refund/payout/settlement/invoice rows still PARTIAL / NOT COVERED -> tools/live/j_*.py.

## Blockers / questions
- docs/review/LEAD_NOTES.md was not found on branch mailbox (only lead/LEAD_STATE.md and mailbox/*); no answers read.
- Owner decisions (VAT on fees, PV-15, app-link files): not touched this run; safe default when reached = keep current behaviour, no new fee VAT.
