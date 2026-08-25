# Phase 0B semantic evidence — LeaveRequest schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/leave-request.schema.ts:1–22`

The timestamped schema defines unique/indexed ID, required indexed facility and provider-account IDs, optional provider display name/type, a runtime type enum `vacation|emergency|sick|other`, required start/end dates, optional reason, a runtime status enum `pending|approved|rejected` defaulting pending, and decision actor/time/note fields (`5–22`). The facility/provider/status indexes provide basic query support (`7–9,16`).

No invariant requires `start_date < end_date`, timezone normalization, maximum duration, working-calendar policy, overlap prevention, duplicate-request idempotency or leave-balance reconciliation (`13–14`). Provider/facility identity has no visible organization/tenant, employment, branch or requester ownership integrity (`8–11`). `provider_name` is denormalized without snapshot/provenance policy (`10`). Status has no transition actor/reason/history, approver role separation, optimistic version, terminal protection or decision idempotency; decided_by/at/note are optional and not tied to approved/rejected (`16–19`). Type/provider_type/reason/note have no controlled length, encoding, PII/medical privacy, moderation or retention policy (`10–15,19`). No notification/audit, schedule conflict, coverage, emergency priority or deletion/anonymization policy is represented. No code was changed and no build/test/application operation was performed during this read.
