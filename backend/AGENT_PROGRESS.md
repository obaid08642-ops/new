
## [P5.3c] F38 dead controllers deleted (2026-09-26)
- `payments/paymob.controller.ts` (`payments/paymob`) and `care/doctor-integration.controller.ts` (`provider/doctor-engine`): zero client/backend callers AND not registered in any module — pure dead code. Deleted; `paymob.service` kept (used via `paymob.module`). `tour.controller.ts` / `insurance.controller.ts` already gone. tsc 0.

## [P5.4] F41 auth aliases log deprecation (2026-09-26)
- Canonical `otp/request`, `otp/verify`, `password/reset` unchanged; legacy `send-otp`/`verify-otp`/`reset-password` already carried `Deprecation: true` headers — added `Logger.warn` on each alias call per plan ("aliases logging deprecation"). tsc 0.

## [P5.2] Collection dedup status (2026-09-26)
- Done via migrations (dry-run default, counts): dead drops (`2026-09-drop-dead-collections.ts`: labcenterbookings/radiologycenterbookings/providerdeltas/labcatalogs, drop-only-if-empty), auditlogs merge, survey dupes, catalog unify, provider-passwords unify.
- New: `2026-09-merge-doctor-appointments.ts` audit (counts by state/status, id-collision check, copy DISABLED behind mapping approval).
- STAGING-GATED (empty local DB, no mongod here): `doctor_appointments`→`appointments` copy (shapes differ: type/scheduled_at/state/fee vs service_type/slot_start/status/price — needs mapping + dual-write cutover); `pharmacy_orders`↔`orders` direction (governed broadcast engine writes pharmacy_orders; dashboards/finance/meds-agg read `orders`; writers of `orders` must be traced on staging before picking canonical and migrating readers); duplicate `Appointment` schema defs (`appointment.schema` + `extra.schemas`, differ by service_type/summary/visit_location vs mode — consolidate only with staging read verification).
- chats/notifications/audits: single `notifications` collection; chats are distinct-purpose collections (sessions/threads/messages/family); audits merged already (P6 viewer reads across the three live shapes).

## [P6.x-11] Global admin search (2026-09-26)
- Backend `GET /admin/search?q=` (admin-only, min 2 chars, max 100, escaped name regex + `$eq` id/phone, 20/group caps) across users/provider_profiles/orders/appointments. Nav entry added. Tests 2/2. tsc 0.

## [P6.x-15] Dispute SLA timers (2026-09-26)
- Backend list rows now carry `sla_due_at`/`sla_breached`/`sla_hours_left` (deadline from `system_configs` key `sla` → `dispute_hours`, fallback 48h). Disputes table gained an SLA column (overdue badge vs hours-left). tsc 0.

## [P6.x-13b] App force-update + per-app maintenance (2026-09-26)
- Public `/config` now includes `app_versions` (fail-open) from `system_configs` key `app_versions`; admin `GET/PUT admin/config/app-versions` (app-allowlisted keys, length caps, audited). config-portal gained an apps tab (min/latest/maintenance/messages per app). tsc 0.

## [P6.x-13c] Home content served + dead banners removed (2026-09-26)
- New public `GET /content/home` (enabled sections, position-ordered) backed by the admin-managed `home_curation` doc — banners/home sections are now actually served, not just editable.
- Deleted dead `AdminBannersController` (`banners` collection, zero readers) — home_curation is the canonical path. tsc 0.

## [P6.x-10b] Labs turnaround report (2026-09-26)
- `GET /admin/reports/labs-turnaround` (avg createdAt→updatedAt hours for REPORT_UPLOADED, by day, CSV). Consultations-by-status incl. NO_SHOW, nursing-by-state, pharmacy-by-state served by existing bookings/orders groupings. tsc 0.

## [P8] F70/F71/F73/F75 (2026-09-26)
- F70: family 404 → create-family CTA (new `/api/family/create` proxy + client button + 6-locale strings) instead of bare 404.
- F71: web search tries `POST /api/search/intent` (new public proxy) first — confident actionable intents navigate to canonical_path, else legacy results list.
- F73: draft `fulfillment` (delivery|pickup) + `payment_mode` (cash|insurance) end-to-end — backend DTO/schema/service, pickup broadcasts capped to 15 km, app checkout sends deliveryMode, web draft builder + selector. Web draft test updated.
- F75: OTP resend now calls `/auth/send-otp` with the same identifier (pending-disabled, timer reset, error shown).

## [P8] F74 diagnostics parent order (2026-09-26)
- New `diagnostic_orders` collection + `POST /unified-bookings/diagnostics/orders` (validated DTO): creates lab (grouped) + radiology children through the real booking flows, sums the single total, rolls back created children + marks parent FAILED on any child failure. Payments wired for pay-once: `diagnostics` kind in normalizeKind/KIND_TO_MODEL/modelFor + children projection on parent-paid. Web lab-only checkout untouched (no regression); mixed-cart UI + journey e2e staging-gated. Tests 3/3. tsc 0.
