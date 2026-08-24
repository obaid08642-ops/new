# Semantic evidence — Backend home-care compatibility and nursing ops

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:21–226` defines a JWT-guarded `/home-care` compatibility controller. Catalog services support active/category filtering (`:32–43`); providers expose approved nursing profiles with limited fields (`:45–57`). Patient booking requires patient role, service, and scheduled_at, derives price/name/duration from the server service record, stores address/payment/state history, and emits booking-created (`:74–95`).

`GET /home-care/bookings/my` is role-sensitive and returns patient-owned or provider-owned records (`:98–101`). Nursing queue and transitions are guarded by admin/provider predicates. Respond, assign, check-in, GPS, visit-report, care-plan, availability and inventory request routes are present (`:103–225`). Access checks include patient ownership, assigned provider, admin, and provider role. GPS requires numeric lat/lng and assigned provider (`:162–167`); visit reports persist vitals, clinical notes, procedures, medication, supplies, recommendations and follow-up (`:170–180`).

The state machine allows provider assignment from NEW_REQUEST, arrival from assignment/accepted/en-route, care progress from arrival, completion from care progress/arrival, and cancellation from active states (`:116–138`). Every transition appends state history and attempts an event emission; emitter failures are swallowed. The accepted-state comment indicates the implementation deliberately maps nurse acceptance to `PROVIDER_ASSIGNED` and decline to `CANCELLED` (`:141–149`), requiring product confirmation.

Static nursing checklists and supplies are returned by `provider/nursing/checklist` and `/supplies` (`:228–272`). These are operational reference data, not patient mocks, but must be versioned/owned if used clinically.

Chat aliases provide provider channels, message reads, and three send conventions (`:274–308`). They are JWT-guarded but do not show idempotency, attachment handling, content moderation, rate limiting or explicit participant ownership in this controller; those properties must be verified in ChatService and tests.

## Cross-layer gaps

1. Mobile Nursing filters/search and Web home-care pages must map to these routes and state transitions.
2. The booking route is JWT-guarded, so any guest UI path must be reconciled.
3. Payment/insurance, quote, idempotency, cancellation/refund and provider assignment race behavior are not established by this module.
4. Event durability is not established because emitter errors are swallowed.
5. Chat aliases need participant/PHI/moderation/rate-limit and idempotency evidence.
6. Care-plan and clinical-report permissions require audit and retention review.

No Phase 0 remediation was made.
