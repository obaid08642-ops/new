# Phase 0B semantic evidence — ReturnRequest (return-request schema)

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/return-request.schema.ts:1–19`

This separate `return_requests` schema defines generated ID, indexed order/patient/pharmacy identifiers, required reason, optional photo URL, status enum (`PENDING|APPROVED|REJECTED`) defaulting to `PENDING`, and optional rejection reason (`5–15`). It exports a document type and schema factory (`18–19`).

Indexed identity fields and a fail-closed-looking pending default provide basic persistence intent. However, no cross-document check proves that the order belongs to the patient, the pharmacy fulfilled it, or the return is eligible; there is no item/quantity/condition field, delivery/completion date or return window (`8–11`). `photo_url` is an opaque string with no private-object/ownership/content/retention policy, while reason and rejection reason have no length, content, PII/PHI or moderation constraints (`11–15`).

Status has an enum but no transition actor, review reason/timestamp, optimistic version, refund linkage, inventory/restock outcome, appeal or audit trail (`13–15`). No currency/amount/refund method, idempotency/deduplication, transaction, attachment scan, soft-delete/TTL or role-specific projection policy is visible. There is no compound uniqueness index for order/item/patient or operational status/time selection. No code was changed and no build/test/application operation was performed during this read.
