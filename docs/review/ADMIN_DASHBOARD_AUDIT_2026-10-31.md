# Admin dashboard, end to end (session P2, 2026-10-31)

Method: static checks over the whole admin app, all run and passing. Nothing was clicked in a browser against a live backend, so a page that
renders but shows wrong numbers is outside this audit.

| Check | Result |
|---|---|
| Sidebar links (`AdminGuard.tsx`) | 66 links, 66 distinct, every one opens an existing page file (no 404) |
| Pages not in the menu | one: `/admin/order-detail` (old command-center order page) |
| API calls from admin pages | 225 calls, all reach a backend route with the same method (`tools/audit/admin_calls.py`; it fails on an unknown route or a wrong method, tried on a bad call) |
| Calls whose last segment is chosen at run time | every action they can build exists on the backend: providers (approve, reject, suspend, reactivate, request-changes, document approve/reject), nursing requests (assign, reassign, cancel), price reviews (update-catalogue, dismiss, warn, block, suspend, penalty), analytics sections, report tabs |
| Dead buttons (348 `<button>`s, parsed with the TypeScript compiler) | none: every one has a handler, or is a form submit |
| Dead links | one: a `href="#"` fallback in the dashboard's stuck-orders table |

## Fixed in this PR
1. **Two order detail pages merged into one.** The dashboard opened `/admin/order-detail` (read-only, command-center data) while the orders list opened `/admin/orders/:kind/:id` (timeline plus cancel, refund, compensate, reassign, SLA, note). The dashboard now opens the second; the old URL redirects to it so bookmarks work.
2. **Dead link removed.** The dashboard's "details" button no longer renders as `href="#"` when an order has no id.
3. **Guards so it stays true:** `admin/src/lib/sidebar-integrity.test.ts` (every link has a page, no link twice, no orphan page, no `#` link) and `tools/audit/admin_calls.py` as a step of the "Admin Dashboard typecheck and build" job.

## Needs a backend endpoint
None found: no admin page calls a route that does not exist. (The backend route `GET /admin/command-center/order/:kind/:id` is now unused by the admin app; I left it in place.)

## Duplicates that need an owner decision (not merged here)
These overlap in purpose but read different data or different endpoints, so merging them changes what an admin can do or see.
- **Three "live overview" pages:** `/admin/dashboard` (`command-center` v1), `/admin/command-center` (`command-center-v2`, ops, live map, stream) and `/admin/today` (`command-center-v2`, ops). Two read the same v2 endpoint.
- **Two pharmacy price review pages on two backend systems:** `/admin/pharmacy-price-review` (`pharmacy/price-review`, one resolve action) and `/admin/price-reviews` (`pharmacy/price-reviews`, six actions). Plus `/admin/price-override-audit` (price history).
- **Finance:** `/admin/finance-suite`, `/admin/payouts`, `/admin/financial-ledger` and `/admin/commissions` overlap (payout approval in two places, commission records read by two). Payouts belong to session F.
- **Two audit screens:** `/admin/audit-logs` (`audit`) and `/admin/logs` (`logs`, request logs) are different data under similar names; `/admin/provider-audits` is the provider profile-change queue despite its name.
- **Analytics:** `/admin/analytics` (tops) and `/admin/analytics-suite` (funnels, cohorts, NPS) are different content; only the labels are close.
- About 70 native `confirm()` / `prompt()` dialogs remain across these pages (a shared dialog would replace them).
