# Phase 0B semantic evidence — provider-notifications.service.ts

**Archive member:** `src/modules/provider/services/provider-notifications.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–55; full 55-line member covered.

Lines 2–14 import the provider notification schema/repository, define provider-role assertion, and inject the repository. Lines 16–26 list notifications scoped by provider account, optionally filter unread, cap limit at 200, paginate, and return items, total and unread count. Lines 28–34 mark one notification read using provider ID scope and save a timestamp. Lines 36–40 mark all unread notifications read using a provider-scoped bulk update. Lines 42–54 define `createSystem`, accepting provider account ID and notification fields from internal callers and creating directly.

**Security/ownership:** list, markRead and markAllRead enforce recognized provider role and provider account scoping. `createSystem` has no caller context, provider existence/tenant validation, field allowlist, or authorization in this member; it trusts internal callers and arbitrary related IDs/types.

**Integrity/reliability:** markRead is read-modify-save without CAS but is effectively repeat-safe after success; markAllRead is bulk and has no audit/idempotency event. `createSystem` has no dedupe/event ID/outbox/retry or transaction linkage, so repeated upstream events can create duplicates and failures can diverge from source state.

**Privacy/truthfulness:** notification bodies and related IDs are accepted from callers without redaction, size bounds, localization validation or target-resource access proof. This service does not prove that a notification reflects a successful source mutation or that its related resource is visible to the provider.

**State transitions:** unread -> read with `read_at`; system create -> unread/default model state. No retention/archive/delete policy is visible.

**Price/payment/insurance source:** none visible.

**Test implications:** require provider owner/stranger/unauth tests, internal caller authorization, related-resource authorization, duplicate/event-id tests, concurrent mark-read semantics, bulk audit, outbox/retry, retention, payload size/redaction and notification-to-source truthfulness tests. No tests executed during this semantic read.
