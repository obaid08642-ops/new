# Phase 2 Patient — vital-sign contract and clinical-safety gap

## Confirmed Patient-to-Backend mismatches

| Patient behavior | Backend contract | Result |
|---|---|---|
| Sends `type: sugar` | Backend accepts `glucose` | Sugar logs are rejected as `invalid type` |
| Sends `type: heart` | Backend accepts `heart_rate` | Heart-rate logs are rejected as `invalid type` |
| For blood pressure sends `systolic` and `diastolic` without `value` | Backend requires `data.value` and stores a primary `value` plus optional `value_secondary` | Blood-pressure logs are rejected as `value required` |
| Sends `recorded_at` | Backend reads `measured_at` | Chosen/recorded timestamp is ignored by the current contract |
| Renders recent result fields as `r.val`, `r.time`, `r.status`, and `r.statusColor` | Backend returns persisted fields including `value` and `measured_at`, not these presentation fields | Recent-reading content and status treatment are not contract-aligned |

## Confirmed clinical-truthfulness defects

| Surface | Finding | Required disposition |
|---|---|---|
| Patient summary badge | Uses `avg < 130` to label every vital normal/high, including glucose, heart rate, and weight | **P0 clinical-safety FIX — do not apply blood-pressure thresholds to unrelated vital types; use type/context-aware, reviewed ranges or show neutral “recorded” status** |
| Backend vital validation | Validates only type and presence of `value`; nonnumeric or implausible values are stored as strings | **P0 data-integrity FIX — validate numeric format, finite value, type-specific bounded ranges, BP secondary value, unit, and measurement context; retain a governed out-of-range policy** |
| Backend summary | Marks stored heart rate, glucose, and pressure as `طبيعي` without evaluating the value | **P0 clinical-truthfulness FIX — return neutral raw readings or reviewed, context-aware interpretation; never label unassessed data normal** |
| Input UX | Patient enables save with only `value1`; BP diastolic can be absent and values are not checked for numeric/range validity before submission | **FIX — require and validate appropriate fields before submit, preserve decimal support, and present medical disclaimer/escalation guidance without diagnosis** |
| Chart status | Bar color uses `val > 130` for every vital type | **FIX — use type-appropriate neutral visualization or a reviewed configuration, and never communicate false clinical severity through color** |

## Positive control

Backend ownership is patient-scoped (`patient_id: user.id`) for vital read/write operations. This does not compensate for the broken type/payload contract or incorrect clinical labels.

## Decision

Vital entry and interpretation are **P0 FIX/BLOCKED** for clinical truthfulness. The flow must be corrected end to end, covered with unit/API tests, and verified with sandbox records for BP, glucose, weight, and heart rate before release.
