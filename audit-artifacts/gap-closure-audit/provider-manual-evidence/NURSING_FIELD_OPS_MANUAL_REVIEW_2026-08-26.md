# Provider NursingFieldOps: manual semantic review

## scope

تمت قراءة `src/screens/nursing/NursingFieldOps.tsx` كاملًا، 1–317، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

## confirmed defects

| ID | evidence | defect | required correction |
|---|---|---|---|
| P-NURSE-001 | lines 43–50 | distance is locally decremented every 3 seconds, not sourced from device GPS or server routing | remove simulation; use consented real location where legal, server-side visit/geofence policy and transparent unavailable/offline state |
| P-NURSE-002 | lines 89–95 | arrival uses fixed coordinates `24.71, 46.67`; distance gate relies on the simulated local value | false location verification; require signed/current device coordinates, server-side geofence/time validation, fallback/manual verification and audit |
| P-NURSE-003 | lines 218–221 | documentation-camera card has no actionable capture/upload handler | visible but missing clinical documentation capability; implement secure capture/encrypted upload/scanning/retention/consent or remove |
| P-NURSE-004 | lines 226–240 | signature is only a boolean set by tap; completion transmits `signature_base64: 'signed'` | false signature and non-repudiation failure; implement signature capture/consent/time/device provenance/hash and server validation, or do not claim signed completion |
| P-NURSE-005 | lines 187–243 | visit can complete with unvalidated/free-text vital values and empty clinical notes/recommendations; only fake signature gates it | patient-safety/data-quality gap; service-specific required observations, ranges/units, escalation triggers, clinician attestations and server validation required |
| P-NURSE-006 | lines 246–270 | emergency abort text promises visit stop and automatic full refund, but CTA only posts a reason to a generic state endpoint | unsupported financial/clinical claim; implement reviewed emergency state, escalation/dispatch, cancellation/refund policy, payment ledger and notification chain or remove promise |
| P-NURSE-007 | lines 53–62 and 156–170 | no-show countdown is local and resets on screen lifecycle; no checked-in timestamp, server deadline, evidence or patient notification | replace with server-authoritative timing/state and an auditable, policy-controlled no-show workflow |

## contract review obligations

`updateState` at lines 64–79 is only a client anchor. Every transition must be validated against an exact nursing visit controller/state machine with worker assignment, patient/visit ownership, minimum data, idempotency, offline/retry behavior, audit and security tests. The UI cannot supply authoritative refund, location, signature or clinical completion facts.
