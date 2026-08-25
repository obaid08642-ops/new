# Phase 0B semantic evidence — OutboundReferral schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/outbound-referral.schema.ts:1–33`

The timestamped `outbound_referrals` schema defines a unique generated ID, required indexed referrer_doctor_id and patient_id, required referral_code, runtime target_type enum `lab|radiology`, optional notes, string-array requested_tests defaulting empty, and status enum `pending|completed|expired` defaulting pending (`5–33`). A unique referral_code index is explicit (`32–33`).

No doctor-patient relationship, facility/tenant, patient consent, target-provider ownership or clinical authorization is represented (`10–20`). referral_code is opaque but has no entropy/format/expiry, one-time redemption, audience, revocation or enumeration protection policy (`16–17,28–33`). requested_tests is an unconstrained string array with no target-specific catalog IDs, allowlist, duplicate/order/size validation or clinical rationale (`25–26`). notes has no length, medical PII, access projection, encryption or retention controls (`22–23`). Status has no transition actor/time/reason/history, completion evidence, expiry timestamp, redemption identity, optimistic/CAS or idempotency semantics (`28–29`). No notification, audit correlation, safe patient-facing projection, deletion/anonymization or target-service reconciliation is represented. No code was changed and no build/test/application operation was performed during this read.
