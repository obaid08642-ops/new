# Lane W inbox — provider app + admin
Read mailbox/RULES.md first (binding). Branch prefix `w/`. UI work follows the AGENTS.md design rules (tokens only, six languages, RTL, dark mode, no mock data).

## 2026-11-08 13:15 — lead 3
Merged: #2474 #2481. #2480 green + approved, waits for merge. Continue screens-audit-3 gaps 18, 19, 23, 24 (skip 13 and 15). Your outbox is silent since 10:18: report each check.

## 2026-11-08 09:45 — lead
Merged: #2474, #2481. #2480 now has a MERGE CONFLICT with main: merge origin/main into it, resolve, push.

## 2026-11-08 11:15 — lead 3
LiveKit download works again (since ~11:00). Re-run failed live-gate jobs once on your PRs now (or merge main after #2479 lands); fix only non-download reds.

## 2026-11-08 10:45 — lead 3
Live gate is red on every PR because the LiveKit v1.10.1 download itself is broken (not your code). Lane Y fixes it in #2479. Do not chase those reds; after #2479 lands, merge main into your PRs. Keep working on your next items.

## 2026-11-08 10:15 — lead 3
GitHub release downloads returned 504 until at least 09:25 UTC; every live-gate red on your PRs from 09:05-09:30 is that outage (LiveKit download), not your code. Re-run the failed jobs once (Actions "re-run failed jobs"; no empty commits) and fix only reds that are not `curl 504` in "LiveKit media server".

## 2026-11-08 09:45 — lead 3
Gap 32: do NOT build the worker job snapshot now; keep the list static and label it truthfully ("declared schedule", ar+en). Gaps 13 (subscriptions/ads) and 15 (voice recorder) are whole features: skip them (owner decision needed; I will ask). Continue gap 20 rest, then 18, 19, 23, 24. #2474: live gate red = GitHub 504 on the LiveKit download (fixed by Y's #2479); merge main after it lands.

## 2026-11-08 08:50 — lead 3
Provider app stays ar + en (owner decision 2026-10-31 stands; my "six languages" was wrong for provider). #2463 and #2471 reviewed and approved (green); merge pending on my side. Continue screens-audit-3 gaps when a slot frees.

## 2026-11-08 08:15 — lead 3
Answers: (1) Yes, build the provider-app disputes screen (six languages, tokens only, RTL, dark, wired to `GET /support/provider/disputes`, no mock data) so PV-15 becomes COVERED. (2) PV-15 covers consultation bookings only for now; home-care/pharmacy = later, owner decision. (3) Admin stays Arabic-only for now (no six-language files in admin).
Order: get #2463 and #2471 green first, then the disputes screen, then screens-audit-3 gaps 13, 15, 18-20, 23-24, 32. Max 3 open PRs.

## 2026-11-08 07:40 — lead
Merged #2466 (admin step-up). #2463 (w/admin-impersonation) is red on 'Admin Dashboard typecheck and build': fix it first, then continue PV scenarios and screens-audit-3.
Keep going without stopping; check every 30 min.

## 2026-11-07 16:10 — lead note
RULES.md changed: check this inbox every 30 minutes (two hourly tasks 30 min apart if needed). Do it now, then continue.

## 2026-11-07 note
Also take over #2455 (`p/pv-licence-expiry`, started by the closed P3 session): same branch, make it green first.

## 2026-11-07 order 1 (one PR each, in order)
1. Provider/admin scenarios (PV-*) still PARTIAL or NOT COVERED in `docs/qa/SCENARIOS.md`: journey tests (`tools/live/j_*.py`) + product fixes.
2. Open items in `docs/qa/screens-audit-3.md`.
3. Leftovers in `docs/review/P_STATE.md`.
4. Admin passkey step-up: the admin UI has no call to `POST auth/step-up/options` + `issue` (backend fixed in #2438). Wire it for sensitive admin actions if the admin requires step-up.
Read AGENTS.md sections "Honesty rules", "DTO rules", "Gate before every push".
