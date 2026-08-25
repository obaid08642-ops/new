# Phase 0B semantic evidence — Maternity schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/maternity.schema.ts:1–114`

The file defines nested Checkup, KickLog, ContractionLog and InfantGrowthLog schemas plus a timestamped MaternityProfile (`4–114`). Checkup requires week/name and defaults done false (`6–18`). KickLog stores ObjectId id, required count/duration_seconds and date default (`20–34`). ContractionLog stores ObjectId id, required interval/duration_seconds and date (`36–50`). InfantGrowthLog stores ObjectId id, required month, optional weight/height/head circumference and date (`52–72`). MaternityProfile has unique required patient_id, pregnancy flag, due/period dates, cycle metadata/current week and arrays of those nested logs (`74–113`).

Required/default/unique/nested schema declarations exist, but dates, week/month/current_week/cycle_length, count, intervals, duration and growth measures have no numeric/date ranges, units beyond field names, chronology or cross-field invariants (`8–15,25–32,41–48,57–70,79–110`). There is no validation that due_date follows last_period_date, prev_period_date precedes last_period_date, current_week matches dates, cycle length is physiologic, pregnancy state matches profile dates, or infant month and measurements are age-consistent (`79–98,103–110`). `date` defaults to application clock without timezone/source-clock semantics (`31–32,47–48,69–70`).

The nested logs are embedded under a patient profile, but the schema alone provides no consent/delegation scope, caregiver/guardian policy, tenant/facility boundary, audit actor or source provenance (`76–110`). Pregnancy and infant growth data are sensitive health/child data; there is no projection, field-level privacy/encryption, retention/deletion/legal-hold or DSAR lifecycle represented (`79–110`).

No unique event idempotency/duplicate prevention, append-only immutability, CAS/version, bounded array strategy, transaction/rollback or concurrent update protection is represented for log writes (`22–32,38–48,54–70,100–110`). No clinical safety state exists for abnormal kick/contraction thresholds, alert escalation, clinician review, emergency guidance acknowledgement or corrections; `done` is only a boolean (`8–15`). Checkup name/week are free-form and there is no catalog/version/source for clinical recommendations (`8–15`).

No soft delete or correction provenance exists for logs, no notification delivery/ack/retry status, no data quality/import metadata, and no live runtime/test evidence is established by this source read. No code was changed and no build/test/application operation was performed during this read.
