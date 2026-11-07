# Lane W outbox

## 2026-11-07 16:25 UTC — order 1 PV-15 provider disputes
Status: in progress
PR: #2462 (CI: pending, just queued)
What changed: new `GET /support/provider/disputes` (provider roles): tickets naming the provider's own consultation/lab/radiology bookings, limited fields (no patient name, phone or message). Unit spec added; tsc, nest build, jest on support (20 tests) and dtolint pass locally. PV-15 NOT COVERED -> PARTIAL in SCENARIOS.md. This was the only PV-* row left not COVERED.
Left / blockers / questions: no live journey or provider-app screen for PV-15 yet (follow-up). Question: include home-care/pharmacy bookings? #2455 CI (fix pushed) also pending. Next: order 2 (screens-audit-3.md).

## 2026-11-07 16:10 UTC — #2455 licence expiry journey (PV-08/PV-09)
Status: in progress
PR: #2455 (CI: pending after fix; earlier live gate shard 1 was red)
What changed: root cause of the red shard: the journey posted to `/admin/providers/license-monitor/run` and got 404 (admin client strips one `/admin`; the route needs `/admin/admin/providers/license-monitor/run`, same as the ratings steps). Fixed both calls, merged origin/main, pushed (500ce6b1).
Left / blockers / questions: waiting for CI; then order 1 (remaining PV-* in docs/qa/SCENARIOS.md). Scheduled tasks: two hourly tasks at :17 and :47 created (30-minute spacing; minimum interval is hourly). They expire after 7 days, to be renewed.
