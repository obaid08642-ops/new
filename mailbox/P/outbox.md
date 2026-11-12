# Lane P outbox (newest on top)

## 2026-11-12 08:05 UTC — Item 2 client half
Status: in progress (CI pending)
PR: #2621 p2/policy-hash-echo-clients (base: p2/policy-hash-echo = #2620; retarget to main after #2620 merges)
What changed: web + app send the hash of the policy text the card showed (per service); 409 refund_policy_changed reloads the text, clears the tick, shows a new six-language message. No hash where it would give a false 409 (mixed lab+radiology order, some app cards). Web vitest 3073 pass; app jest 2437 pass, 1 fail `pharmacy/offers-screens` (countdown) that passes alone on this branch and on main = load timing; if it is red in CI I will root-cause it, not skip.
Left: #2605, #2601 conflicts wait for #2604 merge. Open PRs of mine: #2620, #2621 (+ #2604 conflict fix).

## 2026-11-12 07:45 UTC — CI finding (affects every PR) + #2604 state
Status: blocked on lead for the CI image
PR: #2604 (CI: all app/web/provider/admin/contrast checks green, Backend build and tests still running; `live gate` shards 1-5 RED)
What I found: the five `live gate` shards fail in the step "pip install playwright; playwright install --with-deps chromium": the runner image is now Ubuntu 26.04 and Playwright 1.60 answers "does not support chromium on ubuntu26.04-x64" (3 attempts, exit 1). It is the runner image, not the PR; every PR will hit it. I did not touch the workflow (not my scope, and no skipping). Suggested fix for the lead: pin the live-gate job to `runs-on: ubuntu-24.04` (or a Playwright version that supports 26.04).
Left: #2605 and #2601 conflicts wait for #2604 to be merged (queue order). Item 2 client half is built locally, PR next.

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
