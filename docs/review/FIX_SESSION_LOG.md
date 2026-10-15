# Fix session log

One line per merged PR: date, PR, lines closed, counts left (`NEEDS_REVIEW_STATUS.md` total line).

| Date | PR | Closed | Left (open / closed-unverified) |
|---|---|---|---|
| 2026-10-15 | #1426 admin guards (insurance admin reads, page and route permissions) | admin-catalogue 0, 15; ops-monitoring 1-3, 11-13; providers 0-2; public-directories 4, 6, 9 | see next rows |
| 2026-10-15 | #1430 one commission config, VAT read as a percent | admin-finance 6-8 | |
| 2026-10-15 | #1431 provider owner decisions B21, B23, B25 | provider-journeys 2, 26, 31; issue 1138 | |
| 2026-10-15 | #1433 admin-approved medicines public, online-only badge, ask the pharmacies on web | journeys 14, 25, 71-73; admin-catalogue 23; issues 1080, 1081, 1034, 1082 | |
| 2026-10-15 | #1434-#1439 verified on main (patient, journeys, owner A items) | 71 lines verified; issue 1020 | 265 / 11 |

## Next

- Open: #1441 (pharmacy payment evidence race). This PR: issue 412 and the other 10 closed-unverified lines.
- Pushing next: web owner decisions (B12, B18, B27, 2-web#7), admin authority (no ungoverned impersonation),
  money overrides (no manual paid/refunded status).
- Then: the route:claude-fix issues and open lines by priority (security, money and orders, dead ends, missing
  screens, the rest).
