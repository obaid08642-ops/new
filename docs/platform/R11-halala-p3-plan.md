# R11 halala P3: plan (document only, no writes)

Status: plan for the owner. Nothing in this document is run by an agent; every step that writes data needs the owner's approval first.

P2 (reads on the integer `*_halalas` shadows, with a per-field fallback to the double) is on main. P3 stops writing the doubles. It starts only when the gate below is met.

## 0. Gate (numbers from the server, read-only)
Run `tools/ops/tasks/96i-halala-counts.sh` (dry, counts only). P3 may start when the TOTAL line shows:
- `unclean=0` (or each unclean row was resolved by finance: the tool never rounds silently);
- `shadow_disagree=0`;
- `missing_shadow` is 0, or every missing shadow is in a collection the backfill (step 1) covers.

The invariant checker (`finance-integrity`) shows zero `ledger_amount_unclean` and zero `payment_shadow_mismatch` findings for 7 consecutive daily runs.

## 1. Backfill the missing shadows (owner approves the apply)
1. Dry run: `money-halala-backfill` without apply prints counts per collection.field; compare with the 96i numbers (same totals).
2. Owner approval, then apply with `MONEY_BACKFILL_CONFIRM=<db name>` (ledger needs `--include-ledger`). One collection at a time, off-peak, after a fresh backup (`96-mongodump-check.sh` shows the last good dump).
3. Re-run 96i: `missing_shadow` must be 0 and `shadow_disagree` 0. If not, stop and report; do not retry blindly.

## 2. Stop writing the doubles (code, small PRs, one collection per PR)
Order, lowest risk first: ledger entries, transactions, moyasar payments, order refund figures, appointments / bookings prices, then the provider revenue aggregates.
For each PR: every writer sets only `<field>_halalas` (through `toHalalas`); the double is no longer set; readers already prefer the shadow (P2). A test per writer proves the double is not written and the shadow is. A rollback is one revert (the doubles stay in old rows and the P2 readers still fall back to them).
Wallet balances (the 8 `wallets.balance` doubles): dry-run plan only, owner approves any write; per the owner no wallet credit exists for refunds, so these are the provider / legacy balances.

## 3. Hold, then drop (after one full release cycle)
After one release cycle with zero findings (invariant checker, 96i `shadow_disagree=0`, no reconciliation drift), the doubles are removed from the schemas and from existing rows (`$unset`, owner approval, backup first, one collection at a time). Until then they stay as a rollback path.

## 4. What stops the plan
Any non-zero `shadow_disagree`, `unclean`, or reconciliation difference. Report the collection.field and the count (never the values) to the lead; fix the writer, not the data.
