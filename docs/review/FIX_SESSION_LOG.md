# Fix session log

One line per merged PR: date, PR, lines closed, counts left (`NEEDS_REVIEW_STATUS.md` total line).

| Date | PR | Closed | Left (open / closed-unverified) |
|---|---|---|---|
| 2026-10-15 | #1426 admin guards (insurance admin reads, page and route permissions) | admin-catalogue 0, 15; ops-monitoring 1-3, 11-13; providers 0-2; public-directories 4, 6, 9 | see next rows |
| 2026-10-15 | #1430 one commission config, VAT read as a percent | admin-finance 6-8 | |
| 2026-10-15 | #1431 provider owner decisions B21, B23, B25 | provider-journeys 2, 26, 31; issue 1138 | |
| 2026-10-15 | #1433 admin-approved medicines public, online-only badge, ask the pharmacies on web | journeys 14, 25, 71-73; admin-catalogue 23; issues 1080, 1081, 1034, 1082 | |
| 2026-10-15 | #1434-#1439 verified on main (patient, journeys, owner A items) | 71 lines verified; issue 1020 | 265 / 11 |

## Open PRs waiting for review (2026-10-15)

Each has red on `main` and green on the branch in its body; lines are set to `fixed #PR` in the PR itself.

| PR | What | Lines / issues |
|---|---|---|
| #1448 | closed-unverified lines verified; social login journey; question 30 | 11 closed-unverified; issues 412, 479 |
| #1450 | admin authority: no ungoverned impersonation, force-* permissions | admin-system |
| #1451, #1452 | open lines already fixed on main, verified | 25 lines |
| #1453 | money overrides: no manual paid/refunded status | admin-finance |
| #1455 | web owner decisions B12, B18, B27, 2-web#7 | 6 lines; issues 405, 679, 851, 866, 1046 |
| #1456 | Rx substitute stays inside the prescription | issue 1440 |
| #1458 | web dashboard: no row to the removed chat list | journeys 38, 39, 83 |
| #1460 | pharmacy QR encodes its real public page | provider-shared 1; issue 1198 |
| #1461 | admin problem orders (stuck, failed payment, SLA, refund) | admin-ops-monitoring 15; issue 1236 |
| #1462 | sign-up: current consents, OTP not sent, existing address | batch-0-web 3, 5; batch-0-app 5 |
| #1464 | provider payouts: one balance, server minimum, open second approval | provider-journeys 18-20 |
| #1465 | nursing visit steps and radiology reminders reach the patient | new bug (no listener) |
| #1466 | sign-out revokes the session | batch-0-web 11; issue 440 |
| #1467 | web payment result verifies any payment, opens its booking | journeys 46, 78; batch-1d-web 9 |
| #1468 | owner questions 31-39 (docs) | 9 lines to owner-decision |
| #1469 | public services feed: approved providers only, real price and insurers | 13-web 6, 7 |
| #1470 | diagnostics: lab report opens, one booking path | journeys 49, 50, 54, 59 |
| #1471 | B8 part 1: no fixed medical text | 3-app 6, 7; 5-app 14 |
| #1472 | Rx and online-only flags in every medicine list | rx-rules-app 0-3, 5 |
| #1473 | web notifications: switches honoured, web push | batch-0-web 9, 16; issues 438, 445 |
| #1474 | provider app cleanup (dead screens, location, signature, review note) | provider-journeys 5, 13, 21, 24, 25, 29, 30, 32 |
| #1476 | web: one cancel/reschedule page, one payment step | journeys 7, 42 |
| #1477 | decision leftovers: online-only card, Rx note, the cart's prescription, nearby filters, crisis strings | issues 327, 329, 330, 337, 339 |
| #1478 | web home nursing booking; nurses' hours give slots (root cause); one nursing list | journeys 60, 63; tooling 0; 3-web 2; 4-web 1 |
| #1480 | lab result push opens the result, with "discuss with a doctor" | issue 338 |

Decision epics verified on main and closed with evidence: #322, #324, #325, #335, #336.

## Next

- In red/green now (worktrees `ow`, `ai`, `amb`, `sfda`): offers waiting never endless (issue 332, includes a fix: a
  broadcasting order was drawn as "selected"); one AI assistant endpoint on web and app (326); ambulance role removed (333);
  SFDA price review page and per-line warning (331). Open each PR when its green run passes.
- Then: B8 part 2 (six-language preparation editors), journeys 77 (offline page, after #1473), provider-journeys 28, and the
  route:claude-fix issues still open (list in the session notes: maternity/mood/water b8, insurance b7, family b6, b0 login
  and notifications, admin 1235, journeys 1011-1086).
- Disk: the session allowance filled once (Mongo stopped). Old queue databases and finished worktrees were removed; keep
  removing `.next`/`dist` of worktrees whose PRs are open.
