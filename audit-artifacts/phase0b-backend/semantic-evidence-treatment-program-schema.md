# Phase 0B semantic evidence — TreatmentProgram schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/treatment-program.schema.ts:1–29`

The timestamped `treatment_programs` schema defines a unique ID, required indexed patientId, runtime programType enum `diabetes|hypertension|pregnancy`, runtime status enum `active|completed` defaulting active, string-array completedSteps defaulting empty, and required indexed nextSchedule (`7–29`). A unique compound patientId/programType index prevents multiple programs of one type for a patient (`29`).

No provider/clinician owner, enrollment consent, organization/tenant, diagnosis/evidence provenance or care-plan version is represented (`12–25`). completedSteps is an unconstrained string array without a program-specific step allowlist, ordering, duplicate prevention, authorization, completion actor/time/evidence or atomic progression semantics (`21–22`). Status has no transition history, completion requirements, actor, timestamp, optimistic version or terminal protection (`18–19`). nextSchedule has no timezone, recurrence, past/future bounds, reminder/acknowledgment or schedule mutation provenance (`24–25`). No clinical safety rules, alert/escalation, missed-step state, adherence evidence, notification idempotency, PII/PHI minimization, retention/deletion or access projection policy is represented. No code was changed and no build/test/application operation was performed during this read.
