# Phase 0B semantic evidence — Family chat compatibility spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/compat/compat-family-chat.spec.ts:1–40`

The spec constructs `FamilyChatController` with mocked `family_groups` and message collections. It rejects a user with no active canonical membership before reading messages, and for a member it verifies that lookup excludes deleted groups, matches owner/member membership, uses the returned canonical group ID for message reads, and uses that same group ID plus sender ID/text for a message write (`9–38`).

These assertions provide focused evidence for membership-gated access and avoiding a caller-supplied arbitrary family ID. The controller and database connection are used directly with `any` mocks; Nest guards, session authenticity, role/family relationship validation, database indexes and real query semantics are not proven (`5–16,19–38`).

No unauthenticated/stranger/removed-member race, multiple-family ambiguity, tenant scope, message DTO/type/length/HTML/link validation, attachment/media privacy, rate limit, spam/moderation, idempotency/replay, edit/delete/audit, notification/realtime delivery, encryption/retention or live family-chat behavior is tested. No code was changed and no test/build/application operation was performed during this read.
