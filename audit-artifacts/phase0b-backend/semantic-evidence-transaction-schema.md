# Phase 0B semantic evidence — transaction.schema.ts

**Archive member:** `src/schemas/transaction.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–46; full 46-line member covered.

Lines 2–5 import Document/uuid and define TransactionDocument. Lines 7–30 define a timestamped Transaction schema. It stores generated unique id (9), required booking_kind and indexed booking_id (10–11), patient_id (12), amount (13), default SAR currency (14), gateway enum stripe/tap/moyasar (15), default card method (16), indexed lifecycle status including initiating/pending/authorized/paid/failed/refunded/partially_refunded/cancelled (17), optional idempotency_key and gateway intent/charge references (18–20), client_secret and checkout_url (21–22), webhook_payload object (23), failure/refund fields and paid/refunded timestamps (24–28).

Lines 31–46 define indexes. There is a booking lookup index (31). A positive partial unique index permits at most one active gateway intent for a booking while status is initiating/pending/authorized (35–38). A positive unique partial index binds patient/booking/idempotency key when the key is a string (39–42). A positive unique partial index prevents duplicate `(gateway, gateway_intent_id)` references (43–46).

**Audit judgment:** The schema contains materially stronger transaction integrity than the simpler legacy financial schemas: active-intent, idempotency-key and gateway-reference uniqueness are explicit. Remaining gaps are unrestricted booking_kind/method, no amount finite/nonnegative/precision or currency allowlist constraints, patient_id/booking ownership not schema-enforced, client_secret and raw webhook_payload storage without visible retention/access/redaction policy, no immutable event/actor/audit or state-version field, no provider event ID/timestamp uniqueness, no refund operation linkage/remaining refundable invariant, and no explicit transaction-level settlement/reconciliation state. The comment requires duplicate-active-intent preflight before deployment; existing data/index rollout is therefore a deployment dependency.

No product code was changed and no tests were executed during this semantic read.
