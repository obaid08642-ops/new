# Phase 0B semantic evidence — notifications

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/notifications/notifications.service.ts:2–852`
- `src/modules/notifications/notifications.controller.ts:2–66`
- `src/schemas/notification.schema.ts:2–29`
- `src/modules/notifications/notifications.module.ts:2–29`
- `src/modules/notifications/repositories/notification.repository.ts:2–13`

## Semantic read

`notifications.service.ts:30–76` accepts raw/ad-hoc title/body, arbitrary params/action, optional role/user targeting and schedule, stores notification then emits and queues delivery. Queue jobs use notification id as job id and retry, but queue failure falls back to direct delivery. `:78–119` loads notification, sends push/SMS/WhatsApp/email, derives per-channel status, updates one document and throws only when all channels fail. Missing user channels can yield no channel status and `SENT`; partial per-channel retries are not explicitly coordinated beyond the outer job.

`:121–187` exposes aggregate delivery stats, broadcast delivery and push token routing. Push uses raw title/body keys as provider payload, reads `PushToken` through `db.model`, and role-targeted notifications use provider topics. `:190–239` uses Firebase/Expo, with missing FCM credentials returning false and Expo errors collapsed to false. `:242–278` delegates SMS to `sendOtp` and WhatsApp catches/logs errors without rethrowing; email injects title/body into HTML without visible escaping/sanitization.

`:280–314` lists notifications using `$or` for user, role and `all`, resolves i18n, exposes stored object fields/action/params and computes read state. Mark-read/all-read correctly filters by the same audience predicate but has no explicit idempotency key or durable read receipt metadata beyond `read_by`. `:316–468` registers many event listeners for service/order/appointment/homecare lifecycles and creates notifications using `any` payloads and hard-coded route patterns. `:471–592` resolves radiology IDs and handles lab lifecycle; `:594–646` handles radiology lifecycle. `:649–775` handles medical report, family, referral and loyalty/community events. `:779–852` handles AI triage, insurance, finance and payment events. No durable outbox/event deduplication or event idempotency key is shown; repeated event delivery can create duplicate notifications. Event payload identifiers and amounts are trusted for recipient, route and interpolation; critical PHI/finance values may enter params and push/email/SMS channels.

`notifications.controller.ts:7–15` applies JwtAuthGuard and lists for current user. `:22–34` registers tokens with only token-presence validation and forwards device/provider metadata. `:36–44` reads/read-all. `:46–64` exposes admin send/schedule/stats with `@Roles(ADMIN)` but accepts `body:any`; only scheduled_at presence is validated. Admin send can create raw text/action/params and arbitrary targeting. Route order places `:id/read` before `read-all`, so the literal path `read-all` may be interpreted as an id depending on framework route resolution.

`notification.schema.ts:6–29` stores optional user_id/role, required keys, arbitrary params/action, read_by, push flag, arbitrary delivery object, schedule and indexed status. It has only user/time and role/time indexes; no audience invariant, dedup/event key, expiry/retention, payload classification, immutable delivery history or field-level redaction policy.

`notifications.module.ts:13–29` registers Notification and queue plus SMS/Push modules; it does not register User/PushToken models in this module, consistent with service raw `db.model` lookups. The repository `notification.repository.ts:2–13` is a thin wrapper with no custom ownership, dedup or delivery logic.

## Findings candidates

The read supports: (1) arbitrary/raw admin notification payloads and role targeting with weak DTO validation; (2) duplicate notification risk from event retries/repeated lifecycle events without event dedup/outbox; (3) audience/role notification data and action/params exposure without classification/expiry/retention; (4) provider-channel leakage of PHI/amounts and HTML escaping concerns; (5) false SENT semantics when no channels are available or push config is absent; (6) route/action drift and hard-coded deep links; (7) token registration/device binding must be audited with PushService; (8) raw cross-module model lookups and schema boundaries; (9) read-all route collision risk.

No product code was changed and no tests/builds were executed during this semantic read.

## Push module dependency

`src/modules/push/push.module.ts:2–760` was read in full. It defines PushToken/PushLog/WebPushSubscription/PushEngagement schemas and a combined PushService/Controller/Module. `register` upserts by token and rewrites `user_id` from the current caller, with no proof of token possession or protection against token reassignment. Push delivery supports APNs/Expo/FCM/WebPush and BullMQ, but missing active tokens returns zero without a durable undeliverable status; provider failures are partly logged/counted and some errors are collapsed. `trackEngagement` accepts client event/data with only event enum validation. Booking/chat/call/payment/report event handlers trust `any` payloads and put names, message bodies, call identifiers and payment amounts into push data. Controller routes use raw bodies, expose a test notification with success-like text, return `{ok:true, public_key:null}` when VAPID is absent, and the admin campaign route returns a blocked message after accepting raw target fields. Module registers only its four push schemas and PushService.
