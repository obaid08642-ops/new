# Phase 0B semantic evidence — Analytics module

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/analytics/analytics.module.ts:2–149`

`AdminAnalyticsService` reads raw collections for search queries, orders, appointments, push engagements, chat messages and users and exposes top-searched terms, ordered medicines, doctors, pharmacies, services and an overview (`analytics.module.ts:2–118`). Top methods accept caller-provided limits from the controller with no visible positive/max validation; aggregation uses raw names/IDs, order totals/item prices and appointment statuses. Revenue and volume metrics do not visibly scope currency, refunds, payment status, tenant or date period (`18–67`).

Overview counts all users/orders/appointments/carts, defines conversion as completed orders divided by all carts, cancellation from mixed status vocabularies, and active-user signals as created records across operational/activity collections rather than authenticated product activity (`69–116`). Retention uses orders only, groups by `$week` without explicit year/timezone handling, and labels the result as cross-product activity. Queries can be expensive and return no metric provenance/confidence.

The controller is JWT+ADMIN guarded and provides overview/top routes, but passes `parseInt` values directly and has no visible range rejection (`120–143`). Module boundary contains only controller/service and no visible cache, report snapshot, tenant/currency policy, or audit interceptor (`145–149`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: unbounded/invalid analytics limits, raw PII/identifier exposure, misleading financial/conversion truth, incomplete activity/retention semantics, mixed status vocabularies and expensive unscoped aggregation.
