# Phase 0B semantic evidence — Patient CRM tag schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/patient-crm-tag.schema.ts:1–36`

The schema stores provider_id and patient_id as required indexed strings, boolean VIP/favorite/blocked markers, optional blocked_reason, custom_tags and private_notes in `patient_crm_tags` with timestamps (`5–35`). A unique compound index enforces one record per provider/patient pair (`36`).

The provider/patient pair uniqueness is the primary integrity control, but no provider role/relationship, patient consent, active-provider/patient, facility/tenant scope or authority to mark VIP/favorite/block is declared (`10–14,16–26`). Boolean flags have no reason, actor, created/changed timestamp, expiration, review or transition semantics; `blocked_reason` is optional and unbounded (`16–26`). A blocked flag can therefore be set without a reason or appeal/review lifecycle.

custom_tags and private_notes are unbounded free-form string arrays. They can contain sensitive clinical, behavioral or stigmatizing content without taxonomy, size/content limits, PII/PHI classification, redaction, projection, encryption, access audit, consent, retention, deletion/DSAR or legal-hold controls (`28–32`). No distinction exists between provider-private notes, care-team notes and patient-visible content.

No immutable audit/version/CAS, idempotency, notification, moderation, abuse/rate-limit, soft-delete, correction or concurrent-update semantics are represented. The schema does not define blocked-contact enforcement, downstream communication suppression, risk escalation, or search/cache consistency. No live CRM-tag runtime, authorization, privacy, audit or index evidence is established by this source read. No code was changed and no build/test/application operation was performed during this read.
