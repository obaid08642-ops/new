# Phase 0B semantic evidence — Admin command center

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin-command-center/admin-command-center.module.ts:2–175`

`AdminCommandCenterService` aggregates pharmacy, lab, radiology, nursing and consultation records through canonical schema models plus `AdminGovernanceService` and workflow state mapping (`admin-command-center.module.ts:23–35`). Live bookings query multiple collections over a seven-day window, normalize mixed fields/states, expose patient/provider IDs and totals, and cap each source at 40 then overall at 100 (`37–60`). Failed transactions return recent rollback events and stuck matching uses creation time as a proxy for age, limited to pharmacy/nursing (`62–77`). Provider live status groups all profiles without visible facility/tenant scoping (`79–84`).

Order detail accepts a kind/id, searches by id or tracking_id without visible tenant/role/assignment scope beyond controller admin metadata, loads patient name/phone/email and provider identity, returns address/items/history/payment and the complete raw document (`86–123`). This is a high-value PII and topology exposure surface even for admin users, with no explicit redaction or purpose-scoped projection. Snapshot concurrently invokes governance global summary/performance and all aggregations, with no visible consistency snapshot, timeout, partial-result status or source freshness (`125–143`).

Controller routes are JWT+ADMIN guarded, but route parameters and service operations have no visible DTO validation, pagination, audit command semantics or mutation/idempotency concerns because the surface is read-only (`147–154`). Module imports AdminGovernanceModule and registers seven models; no explicit exports are declared (`156–175`). No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: unscoped admin drill-down, raw document/PII return, mixed state/date truthfulness, capped incomplete aggregates, global provider status exposure and lack of freshness/partial-result semantics.
