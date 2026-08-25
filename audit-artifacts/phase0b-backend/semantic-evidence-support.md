# Phase 0B semantic evidence — Support

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/support/support.service.ts:2–102`
- `src/modules/support/support.controller.ts:2–41`
- `src/modules/support/support.module.ts:2–17`
- `src/modules/support/repositories/supportrequest.repository.ts:2–13`
- `src/modules/support/repositories/patientsettings.repository.ts:2–13`
- `src/schemas/support.schema.ts:2–56`

`support.service.ts:17–54` creates and lists patient tickets, scopes detail/reply to owner or admin, but accepts raw subject/message/category/attachments/priority and stores user name/phone and an `any[]` thread. Replies append via read/array/write with no idempotency or CAS. `:57–70` exposes admin status/assignment updates with enum status validation but raw assigned_to and no admin audit/transition policy. `:73–89` exposes a second ticket query by `patient_id` and generic settings update with a small key whitelist but no value-level enum/type validation. `:91–102` returns hard-coded FAQ content and a feedback method that returns success without persisting or dispatching feedback.

`support.controller.ts:7–41` applies JwtAuthGuard, exposes duplicate create routes `/support/requests` and `/support/tickets`, owner ticket/detail/reply, admin list/update with roles, settings, FAQ and feedback. Mutation routes have no idempotency decorator and bodies are raw `any`/inline objects. `support.schema.ts:21–41` stores user PII, arbitrary attachments/thread arrays, status/priority/assignment and tracking_id with user/status indexes; no attachment schema, message bounds, retention, transition audit or event dedup. `:43–56` stores PatientSettings with string fields and client push token but no enum validators in schema.

`support.module.ts:9–17` registers the two models and constructor-only repository wrappers; repositories contain no additional ownership, validation, idempotency or transaction behavior.

## Findings candidates

The read supports: unvalidated support attachments/thread and PII exposure, duplicate route contracts, non-idempotent read/modify/write replies, weak admin transition/audit controls, feedback false success/no persistence, settings value validation gaps and missing retention/classification.

No product code was changed and no tests/builds were executed during this semantic read.
