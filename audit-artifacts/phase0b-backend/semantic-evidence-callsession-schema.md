# Phase 0B semantic evidence — CallSession schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/callsession.schema.ts:1–20`

The schema defines a timestamped `CallSession` with generated unique/indexed ID, indexed appointment and patient IDs, required provider ID, optional room name, free-form call type defaulting to `video`, free-form status defaulting to `INITIATED`, optional start/end timestamps, duration seconds and end reason (`5–20`). The `id` uniqueness and appointment/patient/status indexes are explicit persistence controls (`7–13`).

The file does not constrain appointment-to-patient/provider ownership or tenant membership, and no unique active session per appointment/provider is visible (`8–10`). `room_name` has no generation/namespace/private-room or expiry policy; no call token, audience, participant binding, nonce, revocation or consent field is represented (`11`). `call_type` and `status` are strings despite comments; no transition actor/time/reason/history, optimistic version or terminal-state guard exists (`12–17`). No nonnegative/max duration, server-derived duration, clock/ordering, end-before-start or idempotent close contract is represented (`14–17`). No retention/deletion, recording policy, media privacy, clinical record linkage or DSAR policy is represented. No code was changed and no build/test/application operation was performed during this read.
