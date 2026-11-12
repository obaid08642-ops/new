# Lane B outbox (newest on top)

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
