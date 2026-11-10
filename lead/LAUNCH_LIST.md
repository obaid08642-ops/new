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
- [ ] Halala migration (R11): the remaining `*_halalas` read paths and the next phase of R11-money-integrity.md
- [ ] Credit note with invoice (decision 5): confirm every cancel path of every service writes it (matrix asserts it for the paths it covers)

## V
- [ ] Verify the mongod OOM fix on the server after run 114 deploys: 96p (indexes), 96n (kills stopped), 96j (cache); fix any further slow query found
- [ ] G1/G2 lab, radiology and nursing "My services and prices" screen in the provider app (radiology and nursing slot/price rules, nursing registration stops sending price 0)
- [ ] Radiology slot capacity: same seat rule as labs (asked, no answer yet; default same rule)
- [ ] G3 nursing booking mode shown in the nurse inbox and in the admin nursing catalogue
- [ ] G4/G5 scanned lab result upload through /storage; radiology clean-scan check and two-person release
- [ ] G7 licence expiry stored and enforced for pharmacy, hospital, lab, radiology, nursing; suspension reaches the account (needs owner decision G6/G7)
- [ ] G6 rejected provider cannot log in (owner decision pending); resubmit path stays /provider-onboarding/submit
- [ ] G8 admin screen: provider service offers view
- [ ] G9 admin screen: refund policy
- [ ] Admin facility members and invitations view (no endpoint yet) plus invitation cancel route
- [ ] Admin licence-expiry list endpoint and screen; bank-account reject endpoint
- [ ] Admin job moderation (close/hide) for guest jobs; recruitment status-transition rule
- [ ] DTO fixes: test_prices/scan_prices typed number, nursing settings/delta shape, /hospital/staff declared twice
- [ ] Offers: insurance companies and classes instead of a boolean (decision 30)
- [ ] SCENARIOS.md PV/AD/SY rows not COVERED: AD-02 (reject/changes paths) and any PV row left PARTIAL, one journey each
- [ ] Pharmacy offer stale SFDA price text in the app and manual mapping UI for unmapped lines
- [ ] Gitleaks ignore fingerprints after the owner confirms the R2 token roll

## AFTER LAUNCH
- gap 13 subscriptions/ads
- gap 15 voice recorder
