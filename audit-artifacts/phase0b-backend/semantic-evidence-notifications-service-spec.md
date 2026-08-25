# Phase 0B semantic evidence — NotificationsService ownership spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/notifications/notifications.service.spec.ts:1–28`

The spec constructs `NotificationsService` with a mocked model and placeholder collaborators (`5–14,23–25`). It verifies that `markRead` for a foreign/missing notification uses a filter combining notification ID with the caller's `user_id`, caller role or `all`, adds the caller ID to `read_by`, and raises `NotFoundException` when `matchedCount` is zero (`5–21`). It verifies a matched notification returns `{ ok: true }` (`23–27`).

This is a narrow mocked service test. It does not execute HTTP authentication/authorization, prove that role/all notifications are intended for the caller's tenant/facility or that a role match cannot disclose another organization's notification, test notification creation/content/recipient validation, delivery channel/authentication, read/unread idempotency, concurrent updates, model error mapping, pagination, retention/deletion, PII redaction, rate limits or audit provenance. The update assertion checks `$addToSet` but no read timestamp/device/event trace. No code was changed and no build/test/application operation was performed during this read.
