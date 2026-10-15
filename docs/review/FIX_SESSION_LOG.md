# Fix session log

One line per merged PR: date, PR, lines closed, counts left (`NEEDS_REVIEW_STATUS.md` total line).

| Date | PR | Closed | Left (open / closed-unverified) |
|---|---|---|---|
| 2026-10-15 | #1426 admin guards (insurance admin reads, page and route permissions) | admin-catalogue 0, 15; ops-monitoring 1-3, 11-13; providers 0-2; public-directories 4, 6, 9 | see next rows |
| 2026-10-15 | #1430 one commission config, VAT read as a percent | admin-finance 6-8 | |
| 2026-10-15 | #1431 provider owner decisions B21, B23, B25 | provider-journeys 2, 26, 31; issue 1138 | |
| 2026-10-15 | #1433 admin-approved medicines public, online-only badge, ask the pharmacies on web | journeys 14, 25, 71-73; admin-catalogue 23; issues 1080, 1081, 1034, 1082 | |
| 2026-10-15 | #1434-#1439 verified on main (patient, journeys, owner A items) | 71 lines verified; issue 1020 | 265 / 11 |
| 2026-10-15 | #1498 batch: #1448 #1450 #1451 #1452 #1453 #1455 #1456 #1458 #1460 #1461 #1462 #1465 #1466 #1467 #1469 #1470 #1474 #1482 (first part) #1494 | see each PR | 119 / 0 |

## Open PRs waiting for review (2026-10-15, after #1498)

Each has red on `main` and green on the branch in its body; main is merged into each, lines are set to `fixed #PR` in the PR.
Every open branch carries the live-gate login-throttle fix (#1502), so a sign-in 429 no longer fails `live`.

| PR | What | Lines / issues |
|---|---|---|
| #1464 | provider payouts: one balance, server minimum, open second approval | provider-journeys 18-20 |
| #1468 | owner questions 31-42 (docs) | question 40 is the same item as 30; batch-1b-web 2 was verified fixed on main |
| #1471 | B8 part 1: no fixed medical text | 3-app 6, 7; 5-app 14 |
| #1472 | Rx and online-only flags in every medicine list | rx-rules-app 0-3, 5 |
| #1473 | web notifications: switches honoured, web push | batch-0-web 9, 16; issues 438, 445 |
| #1476 | web: one cancel/reschedule page, one payment step | journeys 7, 42 |
| #1477 | decision leftovers | issues 327, 329, 330, 337, 339 |
| #1478 | web home nursing booking | journeys 60, 63; tooling 0; 3-web 2; 4-web 1 |
| #1480 | lab result push opens the result | issue 338 |
| #1481 | one AI assistant endpoint | issue 326 |
| #1482 | ambulance leftovers: dead emergency data paths, retired role kept readable | issue 333; provider-journeys 23 |
| #1484 | app co-pay through capabilities and intent | issues 820, 832, 848 |
| #1485 | SFDA price review | issue 331 |
| #1486 | open lines verified on main | issues 1042, 1043, 1057, 422, 568, 569 |
| #1487 | offers wait never endless | issues 332, 1011 |
| #1489 | password reset by link; notification routes; one API base URL | issues 435, 416, 410, 411 |
| #1490, #1495, #1496 | family: book for a member; invite/scan/join; caregiver medicines | 684; 693, 688, 694, 499; journeys 67, 68 |
| #1491 | public search; Google popup; onboarding | issues 439, 430, 436, 437 |
| #1493 | provider proposals reach an admin page | provider-journeys 28; 1169 |
| #1499 | pharmacy prices order lines from the national catalogue (CodeQL: string-only query values) | provider-journeys 1, 4 |
| #1500 | compare a medicine with its alternatives | batch-1a-web 8 and checked lines |
| #1501 | lines checked on main | 2-app 0, batch-0-runtime 7, final-pass-2 0-3, admin-ops-monitoring 4, admin-journeys 14 |
| #1502 | live gate waits out the login throttle | tooling |
| #1503 | doctor photos reach patients | 2-web 3, 2-app 13; issues 401, 395 |
| #1504 | provider side: role guards, template use, tariffs | provider-admin-ish 2, provider-shared 2, provider-doctor 2, provider-facility 6, provider-journeys 33 |
| #1505 | admin catalogue: controlled flag, flag history, price review queue; provider jobs inbox | admin-catalogue 18-20; final-pass 2, 3; provider-lab 0-2 checked |
| #1507 | web offline page | journeys 77; issue 1086 |
| #1508 | Rx and online-only facts in every web list | rx-rules-web 1-6, app 4; issue 329 |
| #1511 | a cancellation says what comes back; a home visit goes to a saved address | journeys 44, 29; issues 1053, 1038 |
| #1512 | manual pharmacy request (quantity, box photo), unchecked price, refund rule before cancelling | journeys 74, 75, 8, 66; batch-0-app 12; issues 1083, 1084, 1075, 420 |
| #1513 | nearest free doctor, registered hospitals' pages, nursing prescription flag, article text, dead helpers | 2-app 10, 2-web 10, 12-web 12, 4-app 3, 10-web 2, 5-web 9; issues 643, 742, 682 |
| #1514 | pregnancy week catalogue and "Read this week" | 8-app 0, 8-web 3; issues 849, 861 |
| #1515 | web perf: byte budgets pass (LCP needs owner question 43) | issue 426; 427 in part |
| #1516 | prescription pickup or delivery; connected AI assistants in settings | journeys 23, ac-1-agent-oauth 1; issue 1032 |
| #1517 | admin urgent alerts (rules, evaluator, inbox, e-mail) | admin-ops-monitoring 14; issue 1235 |
| #1518 | home visit: the doctor sets off (EN_ROUTE was unmapped) and shares the position | 2-app 3; issue 385 |
| #1520 | pharmacy insurance decision inline; the insurance queue was always empty | provider-journeys 22 |

## Next

- Live runs, PR when green: web call (2-web 9 / 407; LiveKit pinned to 1.10.1, the version that serves the client's
  /rtc/v1 path, and the doctor's page served by a real loopback server); admin kill switches and emergency maintenance
  (`fix/admin-kill-switches`: issues 955, 995, admin-system 10).
- Owner questions added on #1468: 43 (LCP: root loading screen, theme script, inline CSS and the CSP), 44 (accept the
  consent and feature pages on the shared kits without boards: ac-1-agent-oauth 0, seo-feature-pages 0).
- Left open for OC-A (D-30, insurance first): 2-web 12, 3-app 0, 3-web 3, journeys 9, 24, batch-1a-app 8.
- Production note for the build session: the website's livekit-client (2.22) signals on /rtc/v1; the LiveKit server
  behind wss://live.nabd.plus must be a release that serves it (1.10.1 works; 1.8.4 falls back and re-connects every
  ~15 s).
- Queue rule: one queue at a time, each waiting on the previous one's PID (killing a queue another waits on starts the
  next one early, and two queues replace each other's backend); a worktree needs its own node_modules (`cp -al`).
