# Lane W inbox — provider app + admin
Read mailbox/RULES.md first (binding). Branch prefix `w/`. UI work follows the AGENTS.md design rules (tokens only, six languages, RTL, dark mode, no mock data).

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
