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

---
## Runbook addendum (2026-11-16, lane B): exact steps, rollback, the numbers I need

Everything below is a plan. Nothing here writes data; each write step names who approves it.

### A. The numbers request (read-only, no approval needed beyond running the existing task)
Run `tools/ops/tasks/96i-halala-counts.sh` once and paste these lines on the lead's report (counts only, no values):
1. every `halala-counts: <collection>.<field> doubles=N missing_shadow=N (clean=N unclean=N) shadow_present=N shadow_disagree=N` line;
2. the `TOTAL` line.
How I read them:
| what the output shows | meaning | next step |
|---|---|---|
| `unclean=0`, `shadow_disagree=0`, `missing_shadow=0` | shadows complete and consistent | gate met: go to step C (owner approves) |
| `missing_shadow>0`, `unclean=0`, `shadow_disagree=0` | shadows only missing | step B (backfill), then re-run 96i |
| `unclean>0` | a stored amount is not a clean 2-decimal SAR value (e.g. 12.345) | finance decides each row; the tool never rounds. No backfill of those rows, no P3 |
| `shadow_disagree>0` | a shadow differs from its double: a writer bug | stop; I find the writer from the collection.field; fix the writer, not the data |

### B. Backfill (a write; owner approves, one collection at a time)
1. **Backup first**: `96-mongodump-check.sh` shows a good last dump, newer than today's 03:00 (the `.gz.gpg` size ~146-150 MB on 2026-11-16).
2. Dry run of the writer: `node dist/scripts/money-halala-backfill.js` (no `--apply`): its PLAN counts must equal the 96i `missing_shadow` figures. If they differ, stop.
3. Apply: `MONEY_BACKFILL_CONFIRM=<db name> node dist/scripts/money-halala-backfill.js --apply` (`--include-ledger` only after the owner agrees: the ledger is append-only by convention; the backfill only ADDS the derived field). It writes in batches of 500, sets the shadow only where it does not exist (`$exists:false` in the filter, so a re-run changes nothing) and skips unclean values. Run it off-peak (not 03:00-05:00), one collection per run.
4. Re-run 96i: `missing_shadow=0`, `shadow_disagree=0`.
**Status 2026-11-17: P3 is APPROVED by the owner (before launch; no real data exists now). The writer task exists: `tools/ops/tasks/98s-halala-backfill.sh`** (PR "R11 P3 (2/3)"), on the 98r pattern: every write variable is EMPTY in the repo and is set in the file by the reviewer for ONE owner-approved run. Order of runs (each is a separate ops run):
1. `96i-halala-counts.sh` (read-only): paste the TOTAL line; gates: `unclean=0`, `shadow_disagree=0` (else stop, section A table).
2. `98s` with everything empty = dry run: it checks the gates (backend up and below 80 % memory, today's nightly dump present and at least 50 MB, not 03:00-05:00 UTC) and prints the PLAN as counts; `to_fill` must equal the 96i `missing_shadow` of that collection.
3. `98s` with `APPLY=yes COLLECTION=<one name> CONFIRM=<same name>` (and `INCLUDE_LEDGER=yes` only for platformledgerentries after the owner agrees): prints `RUN_ID <uuid>`; keep that id.
4. `96i` again: `missing_shadow=0`, `shadow_disagree=0` for that collection. Next collection: back to step 2.
**Rollback of B (exact, before step C/D reaches the collection)**: `98s` with `ROLLBACK_RUN=<run id>` (dry run: counts what it would unset), then `ROLLBACK_RUN=<run id> APPLY=yes CONFIRM=<run id>`: removes exactly the shadows that run wrote (the run log `money_backfill_runs` holds the row ids), and only on rows whose double is still there. A restore from the step-1 dump stays the last resort.
**Rollback of B**: nothing to undo for correctness: the doubles are untouched and the P2 readers prefer the shadow but fall back to the double. The backfill leaves no marker, so backfilled shadows cannot be told from app-written ones (they are equal by construction, `shadow_disagree=0`). A real undo is a restore from the step-1 dump, which is why that dump comes first.

### C. Stop writing the doubles (code; no data writes; one collection per PR)
Order as section 2. For each PR: the writer sets only `<field>_halalas`; the test proves the double is absent and the shadow present. **Release rule**: one collection per release, and after each release read 96i + the nightly invariant check for 3 days before the next PR.
**Rollback of C**: revert the PR. Rows written meanwhile have the shadow only; every reader (P2) already handles a row with the shadow and no double, so a revert does not break them; the revert writes the double again for new rows. Rows written between the deploy and the revert stay shadow-only and the double is simply absent: acceptable for P2 readers, but any reader NOT yet on P2 would see a missing double: the list of those readers is the first thing to produce (grep `\.amount\b`-style reads on the collections of the PR) and is part of each PR's body.

### D. Hold, then drop (owner approves; backup first)
As section 3. Dropping the doubles (`$unset`) has no code rollback: only the restore from the pre-drop dump. So D happens only after a full release cycle with zero findings, one collection at a time, and the dump of that day is verified restorable (`restore-drill.sh`, not only the size).

### E. Gates that stop everything (report the collection.field and counts, never values)
Any `shadow_disagree>0`, `unclean>0`, a reconciliation difference, or a failed nightly invariant (`ledger_amount_unclean`, `payment_shadow_mismatch`).

### F. What I need from the owner
1. Approve this plan (A-E), or change it.
2. Say whether the ledger (`--include-ledger`) may be backfilled.
3. Name the person who decides the `unclean` rows if any appear (finance/accountant).
