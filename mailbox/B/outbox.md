# Lane B outbox (newest on top)

## 2026-11-12 06:51 UTC — P0 findings (5xx bursts) + PR #2623
Status: in progress
PR: #2623 (CI pending; `live gate` red on every PR = runner image Ubuntu 26.04/Playwright, lane P found it, not mine). #2617 #2618 #2619 CI: all green except live gate (same cause). I opened #2623 as 4th PR because the P0 order comes first.
Run 116 output: not available to me yet. From code: `/config` and `/modules` read Mongo on every request after the TTL with no single-flight and no time limit, so a slow mongod makes every waiting request pile up to the 5 s timeout (matches p95 5000 ms on /config, /modules, catch-all). `/modules` also failed OPEN on a DB error (all modules ON, cached): a switched-off module came back on in a blip. Fixed in #2623 (single-flight, stale-if-error, maxTimeMS).
Next: (4) one "unstable" digest mail per 6 h, (1) /p/[slug] stale-if-error in patient-web, (3) disk retention, (5) Cloudinary report.

## 2026-11-12 06:33 UTC — PRs #2617, #2618, #2619 open (cap of 3 reached)
Status: in progress
PR: #2617 credit notes cumulative cap + VAT residual; #2618 ZATCA TLV 255-byte guard; #2619 PT-24 money side of the return (paid/failed/cancelled, 5 tests). All CI pending. Local: billing 108-109 tests green, moyasar-return 5 green, tsc clean, dtolint 0.
Findings for the lead: (1) a cancelled/expired hosted checkout stays `initiated` (no `canceled` in the status map), the result page cannot tell it from pending: wording decision needed; (2) ZATCA credit-note QR carries negative total/VAT: confirm if positive wanted.
Queue 3 (halala R11): the P2/P3 steps and the 8 wallets.balance doubles need the server numbers. Plan (read-only first): run ops task 96i (halala counts, prints doubles / missing_shadow clean+unclean / shadow_disagree per collection.field), then `money-halala-backfill` dry run (default, writes nothing); wallets: wallet schema already dual-writes `balance_halalas`; the 8 historical rows get their shadow only by the backfill apply, which needs `MONEY_BACKFILL_CONFIRM=<db name>`. I will not apply anything; I need the 96i output from the lead to continue. Not blocked otherwise.
Queue 8 (row 4 verification): already written by lane Y into docs/review/PROVIDER_ADMIN_MERGE_MAP.md in #2615 (callers + permission differences), with a security finding on provision-sub-provider / branch-staff (hospitalId from the body is never compared with the caller's facility; no caller anywhere). I did not duplicate it.
Next when a slot frees: queue 5 (server gate for REJECTED/pending providers), then 6, 7.

## 2026-11-12 06:31 UTC — queue 1 + 2 (invoices)
Status: in progress
PR: #2617 (CI: pending) credit notes cumulative cap + VAT rounding residual (2 tests). #2613 and #2615 were green on the last CI run (2026-11-11) and are not behind main; waiting for the lead.
Invoice review so far (billing.module.ts): numbering is single-claim, per-series per-Riyadh-year counters, no gaps: OK. Credit notes: every refund path goes through event payment.refund.card: OK. Fixed in #2617: sum of notes could exceed the invoice; VAT rounding lost a halala over several partial refunds.
Left: TLV length byte over 255 bytes (seller name); question for lead: ZATCA credit-note QR currently carries negative total/VAT (tags 4,5); confirm whether positive values are wanted. Then queue 3 (halala R11 dry-run plan).

## 2026-11-12 06:28 UTC — session start
Status: in progress
Scheduled checks (hourly, 30 min apart, bound to this session): :17 = trig_01LH52Vsgg1tCCzAdYgHF22B, :47 = trig_01Q4hbUM6HXzbRLY9ZwdwDwj. Renew before any 7-day expiry.
Queue 1: #2613 and #2615 had all 32/33 check runs green (last run 2026-11-11); I will re-check mergeability against main.
Next: queue 2 (invoices review), starting with a read-only map of numbering, credit notes, VAT and ZATCA fields.
