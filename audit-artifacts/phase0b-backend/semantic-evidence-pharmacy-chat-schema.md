# Phase 0B semantic evidence — Pharmacy chat schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/pharmacy-chat.schema.ts:1–29`

The file defines an embedded `ChatMessage` with generated ID, required sender ID and free-form sender role, optional text/image URL and a `Date.now` creation default (`5–14`). `PharmacyChatThread` is a timestamped `pharmacy_chat_threads` collection with generated ID, indexed order/patient/pharmacy IDs, an embedded messages array, `ACTIVE|READ_ONLY` status defaulting to `ACTIVE`, and `last_message_at` defaulting to `Date.now` (`16–29`).

The indexed participant/order identifiers and read-only status provide a basic persistence and lifecycle shape. However, sender role is a free-form string despite the comment, and no invariant proves sender membership in the patient, pharmacy or order; no cross-document ownership, tenant, pharmacy fulfillment or order-existence constraint is represented (`8–12,19–24`). There is no compound uniqueness for one thread per order/parties, nor a version/atomic append mechanism for concurrent messages.

Message text has no length, content, moderation, PII/PHI or encryption policy; image URL has no private-object ownership, content scan, expiry or retention policy (`10–12`). No message delivery/read/ack/idempotency/replay, attachment metadata, sender authorization, close actor/reason/time, TTL/DSAR/deletion or role-safe projection is represented. `Date.now` defaults do not establish authoritative time, ordering, inactivity timeout or retention enforcement (`12,25`). No code was changed and no build/test/application operation was performed during this read.
