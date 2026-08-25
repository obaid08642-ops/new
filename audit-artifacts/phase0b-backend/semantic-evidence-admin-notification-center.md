# Phase 0B semantic evidence — Admin notification center

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin-notification-center/admin-notification-center.module.ts:2–422`

The module defines campaigns, segment resolution, broadcasts, scheduled campaigns, appointment reminders, cart/order retargeting and delivery analytics (`admin-notification-center.module.ts:2–14,30–49`). Campaign validation bounds title/body, restricts segment patterns and performs basic deep-link route checks, but stores deep-link params as arbitrary objects and uses a body confirmation flag for broad audiences (`67–90`). Segment resolution reads up to 100,000 user IDs for all/providers/role segments and single-user lookup, with no consent/suppression/tenant/notification-preference policy visible (`93–131`).

Campaign IDs use timestamp/random strings; creation inserts directly. Sending transitions to `sending`, resolves the audience, queues notifications sequentially, then marks sent with `failed:0`; concurrent senders and partial queue failures are not claimed/idempotent, and the persisted `sent` count means queued rather than delivered (`134–213`). Cancel uses a status predicate but no audit/reason. Scheduler loads up to 10 due campaigns without claim/lease and calls send, allowing concurrent scheduler duplication (`231–242`).

Appointment reminders query fixed one-hour window/statuses, resolve doctors one-by-one, queue notifications and then mark sent; no atomic claim, delivery confirmation, timezone/patient preference or retry semantics are visible (`244–281`). Retargeting scans legacy `carts` and orders in bounded batches, sends messages with visible emoji/text and marks records after queueing without claim/deduplication or consent/marketing policy (`283–330`). Analytics derives delivery/open/CTR from raw logs/engagements without campaign/tenant/consent/freshness or denominator validation (`332–364`). Controller is JWT+ADMIN metadata; campaigns/broadcast/send/cancel/retarget mutations lack visible idempotency or approval/audit; module imports only PushModule (`367–422`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: broad audience/PII and consent gaps, unsafe deep-link params, campaign send races/false delivery truth, scheduler/reminder/retarget duplicate sends, sequential load, raw analytics and missing mutation idempotency/audit.
