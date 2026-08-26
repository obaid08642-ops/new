# Patient Mobile: Active medical programs, attendance and rewards — manual review

## Scope boundary

This read-only source review covers the single Programs inventory route. It does not validate clinical-program enrollment, patient eligibility, plan/appointment ownership, clinician involvement, session attendance, reward eligibility, points-ledger effects, consent, data retention or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/programs/active.tsx` | Active program list, session completion, attendance/rebook CTA and milestone rewards |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-PROG-001 | `CONFIRMED_DEFECT` | `programs/active.tsx:13–27, 41–60, 124–175` | Empty or failed `/medical/programs/active` response is replaced with a fabricated intensive diabetes program, schedule, sessions, reward and care narrative. It is then rendered as a patient’s active clinical program. | Honest unavailable/empty/error states; authorized enrollment/program/schedule contract and clinical source/version/review. |
| PM-PROG-002 | `CONFIRMED_DEFECT` | `programs/active.tsx:62–91, 146–161, 177–203` | Session completion is patient-triggered and immediately accepts any truthy response as a new program list; attendance/reschedule CTA is only a local success alert. A local session-4 check announces a milestone reward without returned ledger/eligibility evidence. | Attendance/reschedule/session state machine with provider confirmation; idempotency/ownership/role enforcement; ledger-issued reward data and notification/reconciliation tests. |
| PM-PROG-003 | `STATIC_MATCHED_PARTIAL` | `programs/active.tsx:107–143, 177–203` | Progress and schedule are rendered from route data but calculated/displayed on the client. Static review cannot show that the program/session belongs to the patient, its clinical constraints, current schedule or progress semantics are authoritative. | Program/session DTO/schema and owner/clinician access controls; audit/event timeline and runtime testing. |

## Conclusion

The programs route contains confirmed fabricated fallback care data and local attendance/reward claims. It cannot be treated as an operational or clinical care-program flow. Manual source review is complete only for `app/programs/active.tsx`.
