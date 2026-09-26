
## [P5.3c] F38 dead controllers deleted (2026-09-26)
- `payments/paymob.controller.ts` (`payments/paymob`) and `care/doctor-integration.controller.ts` (`provider/doctor-engine`): zero client/backend callers AND not registered in any module — pure dead code. Deleted; `paymob.service` kept (used via `paymob.module`). `tour.controller.ts` / `insurance.controller.ts` already gone. tsc 0.

## [P5.4] F41 auth aliases log deprecation (2026-09-26)
- Canonical `otp/request`, `otp/verify`, `password/reset` unchanged; legacy `send-otp`/`verify-otp`/`reset-password` already carried `Deprecation: true` headers — added `Logger.warn` on each alias call per plan ("aliases logging deprecation"). tsc 0.

## [P5.2] Collection dedup status (2026-09-26)
- Done via migrations (dry-run default, counts): dead drops (`2026-09-drop-dead-collections.ts`: labcenterbookings/radiologycenterbookings/providerdeltas/labcatalogs, drop-only-if-empty), auditlogs merge, survey dupes, catalog unify, provider-passwords unify.
- New: `2026-09-merge-doctor-appointments.ts` audit (counts by state/status, id-collision check, copy DISABLED behind mapping approval).
- STAGING-GATED (empty local DB, no mongod here): `doctor_appointments`→`appointments` copy (shapes differ: type/scheduled_at/state/fee vs service_type/slot_start/status/price — needs mapping + dual-write cutover); `pharmacy_orders`↔`orders` direction (governed broadcast engine writes pharmacy_orders; dashboards/finance/meds-agg read `orders`; writers of `orders` must be traced on staging before picking canonical and migrating readers); duplicate `Appointment` schema defs (`appointment.schema` + `extra.schemas`, differ by service_type/summary/visit_location vs mode — consolidate only with staging read verification).
- chats/notifications/audits: single `notifications` collection; chats are distinct-purpose collections (sessions/threads/messages/family); audits merged already (P6 viewer reads across the three live shapes).
