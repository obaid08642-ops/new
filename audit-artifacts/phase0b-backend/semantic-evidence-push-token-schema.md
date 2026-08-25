# Phase 0B semantic evidence — PushToken schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/push-token.schema.ts:1–15`

`PushToken` is a timestamped Mongoose schema with generated unique ID, required indexed `user_id`, required globally unique token, provider enum (`expo`, `fcm`, `apns`) defaulting to `expo`, optional device ID/platform, active defaulting to true and `last_seen_at` defaulting to `Date.now` (`4–13`). The schema factory creates the model (`15`).

The user index and provider enum provide basic lookup/type intent. The push token is stored as a raw required string with global uniqueness but no hashing/encryption, length/content bound, provider-token format validation, secret redaction or access projection (`8–9`). Provider and platform are not cross-validated, and optional `device_id` has no uniqueness or user/device relationship policy (`9–11`).

`active` and `last_seen_at` provide minimal lifecycle fields but no revocation reason/actor, expiry/TTL, stale-token cleanup, feedback-loop handling, logout/device replacement semantics, concurrent upsert/idempotency or notification delivery audit (`12–13`). No compound user/device/provider uniqueness, tenant scope, consent/privacy retention or cross-user denial is visible. No code was changed and no build/test/application operation was performed during this read.
