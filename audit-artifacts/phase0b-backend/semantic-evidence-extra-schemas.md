# Phase 0B semantic evidence — Extra schemas

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:** `src/schemas/extra.schemas.ts:1–93`

The file defines MedicationPlan, MedicationDose, Appointment, HealthRecord and AIInteraction (`6–93`). MedicationPlan stores patient_id, optional prescription/medicine IDs, Arabic medicine name, dose/frequency/times/day, duration, instructions, start/end dates and active (`7–24`). MedicationDose stores plan/patient IDs, scheduled_at, enum state, taken/notified timestamps and notes (`26–39`). Appointment stores patient/doctor IDs and denormalized identity, enum mode/status, string date/time, optional price/channels/prescription and notes (`41–63`). HealthRecord stores patient_id, free-form record_type, arbitrary Object data, recorded_at/by and attachment strings (`65–77`). AIInteraction stores optional user_id, free-form required kind, input, arbitrary output, model, latency and flagged (`79–92`).

Medication data has no validation that plan patient matches prescription/medicine owner, that plan_id/patient_id match on doses, or that dates/frequency/times/duration/dose are physiologically and semantically consistent (`9–21,28–36`). No timezone, recurrence expansion, adherence correction provenance, dose-state transition, missed-dose safety, medication interaction/allergy check, prescriber authorization or notification delivery state is represented (`14–21,31–36`). Embedded/related writes have no idempotency, duplicate scheduling, CAS/version or atomicity declaration.

Appointment `date` and `time` are unconstrained strings; there is no timezone/slot/provider availability, unique booking, ownership/tenant/facility, mode-channel invariant or status transition contract (`44–60`). Price is an unqualified number with no currency, quote/source, insurance/payment/refund or immutable snapshot (`56`). Patient/doctor names, phones, notes and channels are denormalized/free-form and can expose PII or communication secrets (`46–60`).

HealthRecord `record_type` is free-form despite a comment allowlist, and `data` is arbitrary Object; attachments are raw strings. This permits schema drift, unvalidated clinical values, excess collection and unsafe attachment handling (`68–75`). There is no source provenance, clinician authorisation, interpretation/result status, consent/delegation, tenant boundary, retention/legal hold, correction audit or field-level privacy represented (`69–74`).

AIInteraction `kind` is free-form despite a comment, input/output are unconstrained and output is `any`, while user_id is optional. Prompts and outputs may contain health/identity data with no minimization, consent, model/provider/policy version, retention, redaction, access audit, safety review, prompt-injection provenance or human escalation control (`81–89`). No token/cost, structured outcome, refusal/safety result or linkage to source record exists.

Across all models, IDs are plain strings without referential/tenant constraints and no soft-delete or deletion lifecycle is represented (`9–21,28–36,44–60,68–89`). No live index migration/runtime, medication adherence, appointment lifecycle, health-record access, AI logging or safety evidence is established during this source read. No code was changed and no build/test/application operation was performed during this read.
