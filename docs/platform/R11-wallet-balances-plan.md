# R11: the 8 `wallets.balance` doubles: dry-run plan (nothing is written; the owner approves any write)

Lead order 2026-11-12: "halala migration R11, the 8 wallets.balance doubles: dry-run plan only, owner approves any write."
Status of the field: `wallets.balance` is a SAR double with an integer shadow `balance_halalas` (`halalaShadowPlugin(WalletSchema, ['balance'])`, R11 P1 dual write). The 8 rows are the ones the P1 gate reports as doubles without a clean shadow (task 96i, line `wallets.balance`: `doubles=8 missing_shadow=… (clean=… unclean=…)`).

## Why this is not just a backfill
The owner decision of 2026-11-09 ("NO WALLET": the wallet stays removed, no credit or balance system) means a wallet balance above zero is **money the platform owes a patient**, not a number to migrate. So there are two different questions for the 8 rows, and only the first is a halala question:
1. **Shadow:** does each balance have a clean integer shadow? (96i answers; `clean` rows are backfilled by `money-halala-backfill`, `unclean` rows are never rounded silently.)
2. **Owed money:** is the balance zero? A non-zero balance needs a decision from the owner (refund to the original payment method, or keep until the patient claims it) BEFORE any wallet code or collection is removed.

## Steps (each one read-only until step 5)
1. Run ops task `96i` (read-only counts). Record, for `wallets.balance`: doubles, missing_shadow clean / unclean, shadow_disagree. Expect doubles = 8.
2. Run the backfill dry run (no `--apply`): `node dist/scripts/money-halala-backfill.js` in the backend container. It lists counts per collection.field and the unclean rows (by count and `_id` prefix only, never a value). Expect `wallets.balance` clean = 8 when every balance has at most 2 decimals.
3. Counts-only wallet question for the owner (a small read-only script, not written yet): how many of the 8 have `balance > 0`, their total in SAR (one number), the age of the last wallet transaction per row (months, not dates). No user id, no name.
4. Owner decides per case: (a) all zero -> nothing owed, go to 5; (b) some owed -> refund each to the original payment method through `RefundExecutor` (so a credit note is issued with the invoice, decision 5), then set the balance to 0 through the same ledger path (wallet-ledger idempotent entries, never a hand `$set`).
5. Only after 1 to 4 and the owner's written approval: `MONEY_BACKFILL_CONFIRM=<database name> node dist/scripts/money-halala-backfill.js --apply` for the clean rows (writes `balance_halalas` only; the original double is untouched). Re-run 96i: `shadow_disagree` must be 0 and `missing_shadow` for `wallets.balance` must be 0.
6. P2/P3 for wallets: the wallet is a removed feature, so the plan is to drop the collection's readers with the feature (not to switch them to halalas). Nothing else reads `wallets.balance` as money today except `wallet-ledger.ts` (the idempotent ledger; its balance is a projection).

## What is NOT done here
No write, no script run, no server access. Steps 1 and 2 are the lead's ops runs; step 3 needs a small read-only script that I will write when the owner wants the numbers; steps 4 and 5 need the owner.

## Remaining read paths of other collections (P2)
The other P2 items (readers switching from the double to `*_halalas`) are tracked in `R11-money-integrity.md`; none of them is started in this PR because the gate numbers of step 1 (and the TOTAL line of 96i) are not in the repo yet. Moving a reader before its shadow is proven complete would change money behaviour without the cross-check, which is exactly what that document forbids.
