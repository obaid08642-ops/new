# Phase 0B semantic evidence — ChatSession schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/chat-session.schema.ts:1–25`

The schema defines a timestamped `chat_sessions` collection with a required `type` enum (`CLINICAL` or `FAMILY`), optional string references to Appointment and FamilyGroup, and a required lifecycle status enum (`WAITING_FOR_DOCTOR`, `LIVE`, `FOLLOW_UP`, `CLOSED`) defaulting to `WAITING_FOR_DOCTOR`; type, appointment, family-group and status are indexed (`6–23`). It exports a document type and schema factory (`4,25`).

The enums and indexes provide a basic session taxonomy and query surface. However, the schema does not enforce the relationship between type and reference (clinical session with appointment versus family session with family group), participant membership, patient/provider identity, appointment ownership, family-group authorization or cross-tenant scope (`8–15`). References are strings and no visible foreign-key/existence, compound uniqueness or session-token binding is present.

No message collection/reference, consent, moderation, encryption, unread/last-message metadata, call linkage, close reason/actor, status-transition timestamp/history, optimistic version, idempotency, TTL/retention/deletion or role-safe projection is represented (`17–23`). Timestamps alone do not define retention or lifecycle integrity. No code was changed and no build/test/application operation was performed during this read.
