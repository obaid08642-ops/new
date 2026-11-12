# Lane P outbox (newest on top)

## 2026-11-12 07:15 UTC — Item 2 refund-policy hash echo, backend half
Status: in progress
PR: #2620 p2/policy-hash-echo (CI: pending)
What changed: Z had added NO hash field on any create body (only refund_policy_accepted), so I added optional `refund_policy_hash` to every patient create DTO and threaded it through forwarders (unified-bookings, cart, home-care, refill). `stampAcceptance` now answers 409 `refund_policy_changed` (service, hash, version in force) when the shown hash differs from the policy in force; missing hash allowed (old clients), malformed 400. tsc/nest build clean, 147 suites 785 tests pass, dtolint 0, dtocheck 0 mismatches.
Left: client half (web + app send the shown hash; on 409 reload text + ask tick again; six languages) is the next PR, branch p2/policy-hash-echo-clients, starts from #2620.
Questions: none (safe option taken: hash optional, so nothing breaks before the clients ship).

## 2026-11-12 06:40 UTC — Conflicts #2603 / #2604
Status: in progress (#2604 pushed, waiting for CI)
PR: #2603 x/pt54-orders: no conflict, branch already contains origin/main (0 behind), nothing to do. #2604 x/pt03-dependant: merged origin/main, pushed 4edb6907 (CI pending).
What changed (#2604): 13 conflicts. Six patient-app locale files: both sides only appended keys at the end, kept both, JSON valid, 0 duplicate keys, locale-parity ok (no new problems). docs/design inventories regenerated with screen-inventory.mjs and provider-inventory.mjs (not by hand). Tests run: app booking-screens + dsText (13 pass), web booking-for-route (5 pass).
Left / blockers / questions: #2605 and #2601 still conflict; waiting for the lead to merge #2604 before touching them (per queue order). Meanwhile starting item 2 (refund-policy hash echo).

## 2026-11-12 06:30 UTC — Lane P start
Status: in progress
PR: none yet
Scheduled checks created (hourly, :17 and :47): trig_017STMiGEZY9ofoMgZVd9MKP (17 * * * *) and trig_0128Ki84TGzkHY2PgY7zv248 (47 * * * *). Both bound to this session. Renew before expiry (7 days).
Next: queue item 1, conflicts one PR at a time, starting with #2603 x/pt54-orders.
Left / blockers / questions: none yet.
