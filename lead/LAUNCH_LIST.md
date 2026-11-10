# Launch list (frozen 2026-11-10; new ideas go to AFTER LAUNCH unless the owner says)
Tick [x] when merged. Counts are the owner progress number.

## X
- [ ] Web/app parity audit round 2: list what shipped since 11-09 on one side only and build the missing side (one PR each)
- [ ] PT-54 hide / show hidden on the orders centre rows (pharmacy, lab, radiology, nursing), web + app, six languages
- [ ] PT-03 family: book a consultation for a dependant with `family_member_id` on web + app (lab/radiology/nursing family booking waits for Z's DTO field)
- [ ] PT-30 location denied: app and web tests (message + manual entry) so the row can say COVERED
- [ ] Pharmacy return photo: scan state badge on the web return form, and a screen test for the app photo step
- [ ] Refund policy hash echo: send back the shown hash so the server can refuse a changed table (needs Z's field on every create body; owner/lead to confirm)
- [ ] Bundle margin: keep the Android bundle under budget on every app PR; one trim pass of dead strings when the margin falls under 30 KB

## Z
- [ ] Invoices review (postponed): numbering, credit notes, VAT lines, ZATCA fields, one pass over every service with fixes
- [ ] Payout and settlement pass: approval, execute, bank file, ledger totals against payouts, with a journey (PR #2599 has two fixes; journey still to do)
- [ ] PT-24 payment return from the gateway: journey for paid, failed and cancelled returns (link wiring is tested, the money side is not)
- [ ] PT-03 guardian books for a dependant: backend journey (booking subject, payment, refund to the payer) (PR #2598, waiting for CI)
- [ ] PT-54 hide a visit from history: check the backend side and cover it (PR #2600, waiting for CI)
- [ ] PT-08 row of SCENARIOS.md still says NOT COVERED: j_sick_leave covers it, update the row and counts (in PR #2598)
- [ ] Halala migration (R11): the remaining `*_halalas` read paths and the next phase of R11-money-integrity.md (PR #2608 closes a P1 gap; P2/P3 wait for the server gate numbers)
- [x] Credit note with invoice (decision 5): every refund goes through RefundExecutor, the payments card refund and one durable event, so one choke point writes it; asserted by j_refund_matrix and j_family_book_for_member (no code change needed)

## V
- [ ] Verify the mongod OOM fix on the server after run 114 deploys: 96p (indexes), 96n (kills stopped), 96j (cache); fix any further slow query found
- [ ] Admin jobs board: list and moderate (close/hide) jobs posted by facilities (POST recruitment/jobs), not only guest jobs
- [ ] Radiology slot capacity: same seat rule as labs (asked, no answer; default same rule)
- [ ] SCENARIOS.md PV/AD/SY rows not COVERED: AD-02 (reject/changes paths) and any PV row left PARTIAL, one journey each
- [ ] Server gate keeping a REJECTED or pending provider off other provider routes (G6 rest, owner said sign-in shows only the reason)
- [ ] DTO leftovers: test_prices/scan_prices typed number, nursing settings/delta shape, /hospital/staff declared twice (recheck on main first)
- [ ] Offers: insurance companies and classes instead of a boolean (decision 30)
- [ ] Gitleaks ignore fingerprints after the owner confirms the R2 token roll

## AFTER LAUNCH
- gap 13 subscriptions/ads
- gap 15 voice recorder
