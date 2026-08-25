# Phase 0B semantic evidence — Admin governance, kill switches and commissions

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin-governance/admin-governance.module.ts:2–366`

`AdminGovernanceService` normalizes five domains for provider performance, patient 360, entity trace and global summary (`admin-governance.module.ts:19–229`). Provider performance issues one or more booking queries per provider, computes rates from state history and uses a heuristic score; provider profile fields are returned with user/provider IDs and city/name. Patient 360 returns user data excluding only password hash, five domain histories, recent events and spend estimates; event/booking projections are broad and no field-level minimum PII contract is visible (`102–159`). Entity trace returns entity plus all matching events and state history, with entity type mapping and no visible caller/tenant scope (`161–183`). Global summary uses estimated/count queries and date windows but produces cross-domain totals from state aliases that may diverge by domain (`185–227`).

`AdminGovernanceController` is JWT+ADMIN guarded and exposes summary/performance/patient/trace routes (`233–242`). `KillSwitchesController` has only JWT guard, lazily creates default switches, and toggles a key from raw body without visible admin role, key existence error, reason requirement, idempotency, audit or current-state predicate (`244–286`). Default switches control chat, consultations, withdrawals, broadcasts, registrations, emergency, reviews and payments (`249–259`).

`CommissionsController` is JWT+ADMIN guarded but reads all profiles and queries each provider's domain bookings sequentially for a 30-day revenue total. Commission rates use profile value or hard-coded type defaults; revenue is summed from booking/order totals and earnings are rounded, with no visible ledger/refund/currency policy. Update accepts a raw commission number without visible range or audit (`288–343`). The module registers all models and controllers plus B2B/system config surfaces (`345–365`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: PII-heavy patient 360/trace, cross-tenant/entity scope risks, heuristic financial metrics, kill-switch control-plane authorization and race gaps, unbounded commission input, hard-coded defaults, and N+1/report consistency problems.
