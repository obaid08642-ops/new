# Phase 0B semantic evidence — requests.schema.ts

**Archive member:** `src/modules/provider/schemas/requests.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–155; full 155-line member covered.

Lines 5–32 define ProviderRequestType, ProviderRequestStatus, the explicit `PROVIDER_REQUEST_TRANSITIONS` map, and priority enum. The state map permits pending→accepted/rejected/cancelled, accepted→in_progress/completed/cancelled, and in_progress→completed/cancelled; terminal rejected/completed/cancelled have no outgoing transitions.

Lines 35–104 define timestamped `ProviderRequest` in `provider_requests`. It has unique UUID string `id`, optional provider_account_id, typed request type/status/priority, assignment state/strategy/timeout/attempted IDs, arbitrary patient location and match breakdown, denormalized patient object containing name/phone/age/gender/avatar, arbitrary required payload, derived summaries, scheduling, amount_total default 0 and currency default SAR, timeline/action logs, rejection/notes/timestamps, and seeded marker.

Lines 105–107 add indexes for provider/status/createdAt, provider/type/createdAt, and provider/scheduled_at. The indexes support provider-centric reads but no patient, assignment state, timeout, idempotency, or terminal uniqueness index is visible.

**State integrity:** An explicit transition map exists, but the schema does not enforce use of that map, atomic compare-and-set, version/revision, actor authorization, timestamp consistency, or append-only timeline/action logs. Assignment and request states are separate and no invariant links them. `seeded` is a cleanup marker, not a production exclusion mechanism.

**PII/truthfulness:** Patient PII is denormalized into every request. This improves rendering but creates stale-copy, excessive disclosure, retention and update-consistency risk. `payload` and `match_breakdown` are arbitrary objects and may contain unvalidated clinical or ranking data. Summary fields are derived but not protected from client/service drift.

**Financial:** amount_total defaults to 0 and currency defaults to SAR without visible nonnegative/ISO validation, source-of-truth/payment capture/refund/tax/insurance linkage, or immutable pricing snapshot. Consumers must not trust these fields without contract-specific checks.

Lines 109–137 define ProviderNotificationType and timestamped notification model. Notifications have UUID id, provider_account_id, typed type, Arabic/English titles/bodies, icon, related ID/type, read boolean and read_at, plus provider/read/createdAt index. No deduplication key, delivery channel/status, tenant, expiry, or read transition invariant is encoded.

Lines 139–155 define ProviderAvailabilityStatus and timestamped availability model. provider_account_id is unique/indexed, status defaults OFFLINE and allows online/offline/busy/accepting_orders, with online/offline timestamps and note. No heartbeat/version, actor, last-transition audit, status transition map, expiry, or multi-device conflict handling is encoded.

**Test implications:** enforce transition CAS/versioning and actor roles; PII minimization/redaction/staleness; payload/match schemas and size limits; assignment/request invariants; financial source/precision/currency/refund/insurance tests; timeline immutability; seed gating; notification recipient/dedup/read monotonicity; availability heartbeat/expiry/concurrency and multi-device tests. No tests executed during this semantic read.
