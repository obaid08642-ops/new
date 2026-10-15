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
| #1481 | one AI assistant endpoint on web and app | issue 326 |
| #1482 | ambulance role and roster removed | issue 333 |
| #1484 | app co-pay through capabilities and intent | issues 820, 832, 848 |
| #1485 | SFDA price review: check runs for catalogue items, admin page, per-line warning | issue 331 |
| #1486 | open lines verified on main (journeys 33, 34, 48; tooling 8, 9) | issues 1042, 1043, 1057, 422, 568, 569 |
| #1487 | offers wait never endless; a broadcasting order is not "selected" | issues 332, 1011; journeys 2 |
| #1489 | password reset by link (30 min, phone-only reached); notification routes; one API base URL | issues 435, 416, 410, 411 |
| #1490 | book and pay a consultation for a family member (builds on fix/family-client) | issue 684 |
| #1491 | public search (approved medicines found); Google popup; onboarding reachable | issues 439, 430, 436, 437 |

| #1493 | provider proposals: admin review page, category, ownership | provider-journeys 28; issue 1169 |
| #1494 | web logging: water, mood (1-5), kicks, contractions, baby growth | 8-web 4, 6, 11; issues 862, 864, 869 |
| #1495 | family: invite QR, scan and join on the web (redirect caught /api/family/join), no-family state, date picker | 6-app 4, 9; 6-web 0; 1b-web 8 |
| #1496 | family: caregiver writes the member's reminders, sees missed doses | journeys 67, 68 |
| #1499 | pharmacy: new pharmacy prices lines from the national catalogue; partial allocation proof | provider-journeys 1, 4 |
| #1500 | web compare from the product page; compare reads approved medicines | 1a-web 8 + 8 checked lines |

Decision epics verified on main and closed with evidence: #322, #324, #325, #335, #336.

## Next

- Live gate harness: `fix/live-login-throttle` (AdminWeb and browser sign-ins wait out the per-IP login throttle);
  ported into the red PRs 1472, 1473, 1476, 1478, 1481, 1487, 1490 and the open branches.
- Lighthouse is red on every web PR and on merged PRs (#1430, #1433, #1443): base failure (budgets on /ar, /ar/c,
  /ar/consultations/doctors); the per-PR standing-down comment could not be posted from this session.
- Branches in red/green, PR when green: `fix/web-journeys-b` (journeys 44, 29; refund fields kept on the appointment),
  `fix/consult-rx-b2` (doctor photos 2-web#3, 2-app#13), `fix/web-manual-request` (journeys 74, 75, 8, 66; 420),
  `fix/consult-filters-b` (2-app#10, 2-web#10, 12-web#12, 4-app#3, 10-web#2, 5-web#9), `fix/admin-catalogue-lab`,
  `fix/rx-rules-fields`, `fix/patient-flows-c` (journeys 23 pickup, ac-1-agent-oauth#1), `fix/provider-side-b`,
  `fix/admin-urgent-alerts` (1235), `fix/doctor-home-position` (2-app#3), `fix/pregnancy-weeks` (849, 861).
- Owner questions added on #1468: 41 (provider-journeys 5, contract test pins a dead screen), 42 (nurse transport, 641).
- For other sessions: journeys 9, 24, insurance part of 23, provider-journeys 22, 3-app 0, 3-web 3, 1a-app 8 (D-30);
  admin kill switch / emergency maintenance 955, 995, admin-system 10 (Phase 14); seo-feature-pages 0 and
  ac-1-agent-oauth 0 need a board (design session); journeys 77 and tooling 12 wait on #1473.
- Queue rule: a queue waits on the previous one by PID (`ps aux | grep "bash -x queueN"`), never `pgrep -f`.
  Free disk before it fills: the mongo container stopped when the disk was full (restart: `docker start mongo`).
