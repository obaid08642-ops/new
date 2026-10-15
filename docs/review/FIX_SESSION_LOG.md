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

## Open PRs waiting for review (2026-10-15, after batches #1498, b and c #1519)

Each has red on `main` and green on the branch in its body. `main` was merged into each once; the needs-review lines are
set to `fixed #PR` in the PR.

| PR | What | Lines / issues |
|---|---|---|
| #1486 | open lines verified on main | journeys 33, 48; B0 422; maternity 568, 569 (journeys 34 stays owner question 39, as on main) |
| #1487 | offers wait never endless (live fixed: the journey wrote to an empty-named DB in CI) | issues 332, 1011 |
| #1491 | public search; Google popup; onboarding | issues 439, 430, 437 (436 stays owner question 32) |
| #1504 | provider side: role guards, template use, tariffs | provider lines 2, 2, 2, 6, journeys 33 |
| #1505 | admin catalogue (price reviews close through main's `/resolve` only) | admin-catalogue 18-20; final-pass 2, 3; provider-lab 0-2 |
| #1508 | Rx and online-only facts in every web list | rx-rules-web 1-6, app 4 |
| #1511 | a cancellation says what comes back; home visit to a saved address | journeys 44, 29 |
| #1512 | manual pharmacy request, unchecked price, refund rule | journeys 74, 75, 8, 66; issue 420 |
| #1513 | nearest free doctor, hospital pages, nursing Rx flag, article text | 2-app 10, 2-web 10, 12-web 12, 4-app 3, 10-web 2, 5-web 9 |
| #1514 | pregnancy week catalogue | 8-app 0, 8-web 3 |
| #1515 | web perf: byte budgets pass | issue 426 (427 = owner question 43) |
| #1516 | prescription pickup; connected AI assistants | journeys 23; ac-1-agent-oauth 1 |
| #1517 | admin urgent alerts; payable-booking helper fixed (rapid tap / killed payment really run) | issue 1235 |
| #1518 | home visit: doctor sets off (EN_ROUTE mapped) and shares position | issue 385 |
| #1520 | pharmacy insurance decision inline; insurance queue was always empty | provider-journeys 22 |
| #1521 | kill switches enforced, real emergency maintenance, flags with an effect | issues 955, 995; admin-system 10 |
| #1522 | web video call proven connected (LiveKit 1.10.1 in the gate) | issue 407 |
| #1523 | family combined (replaces #1490, #1495, #1496) | 684, 694, 693, 688; journeys 67, 68 |
| #1524 | app lists with real rows; My appointments draws time and specialty | issue 424 |
| #1526 | web offline banner; throttled-network browser half runs and measures | tooling 12 |
| #1468 | owner questions 31-44 (docs) | 43: LCP; 44: pages without boards |

## Next

- Left open for OC-A (D-30, insurance first): 2-web 12, 3-app 0, 3-web 3, journeys 9, 24, batch-1a-app 8.
- Waiting for the owner (#1468): questions 30-44.
- 40 `route:claude-fix` issues already fixed on main were closed with the evidence (PR or commit).
- Production note for the build session: the website's livekit-client (2.22) signals on /rtc/v1; the LiveKit server
  behind wss://live.nabd.plus must serve it (1.10.1 does; 1.8.4 falls back and re-connects every ~15 s).
- Merging main into a branch: the `run_gate.sh` list keeps main's order with the branch's journeys appended; needs-review
  files merge line by line (an owner-decision on main stays); `admin/tsconfig.tsbuildinfo` stays as on main.
