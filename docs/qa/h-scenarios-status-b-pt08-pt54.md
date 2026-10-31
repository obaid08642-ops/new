# H scenarios, status B: PT-08 and PT-54

| ID | Scenario | Status after | Evidence | Notes |
|---|---|---|---|---|
| PT-08 | Sick leave request and report | PARTIAL | `patient-app/src/__tests__/consult/sick-leave-read.test.ts` (new, 5 tests); `src/__tests__/consult/appointment-outcomes-screen.test.tsx` "draws sick leave and reports..." and `appointment-tabs-outcomes.test.ts` (existing) | Report: viewed in the app. Request: absent in app and backend |
| PT-54 | Patient hides or unhides a visit from history | GAP | none (feature absent) | No hide/archive in the appointments UI and no hidden/archived flag in the backend appointment schema or care module |

## PT-08
What exists:
- Patient app can SEE a sick leave a doctor issued: `src/utils/appointmentOutcomes.ts` (`readOutcomes`, `sick_leaves_and_certificates` with `certificate_kind: 'sick_leave'`), drawn by `src/components/consult/AppointmentSections.tsx:366-408` (days, start, end, "new" tag), opens `/reports/view-report`, and marks the outcomes seen via PATCH `/care/appointments/:id/outcomes/seen`.
- Backend issuing is doctor-side only: POST `/provider/.../:id/sick-leave` (`backend/src/modules/provider/provider.controllers.ts:370`, `IssueSickLeaveDto`), creating a report with `sick_leave {start_date,end_date,duration_days}`, a `verify_url`, and the event `sick_leave.issued`. Provider app has `SickLeaveScreen.tsx`.
- No patient-side request: grep for sick/leave/certificate in `patient-app/app` and the backend finds no patient endpoint to ask for a sick leave. So "request" is a GAP in both; nothing was built.

Tested (new): dates and days read as sent; missing dates or days stay null (nothing computed); a leave without details is still a row; rows without id dropped; non-sick certificates separated; `is_new` only on a real `true`. Existing tests cover the screen row, the new tag, the seen call and opening the report.

Fixed: nothing needed. Backend gaps: no patient request endpoint; the `verify_url` returned to the doctor is not used by the patient app (not checked whether the report view shows it). Proposal for the reviewer (not built): a "request a sick leave" entry on a completed visit that opens the visit chat or sends a request to the doctor; needs a backend endpoint and a board first.

Not verified: the report view screen (`app/reports/view-report.tsx`) for a sick leave beyond the navigation; live backend.

## PT-54
Searched `hide|archive|dismiss|hidden` in the appointments components and the orders list: no action to hide a visit. Backend: `appointment.schema.ts` has no hidden/archived field and the care module has no endpoint for it (only `*.spec.ts` mention the word, unrelated). Nothing built, per the rule "build only if the backend already supports it". Proposal: a per-patient `hidden_by_patient` flag plus PATCH, then a "hide" action on the history list and a "show hidden" filter; backend first.

Not verified: other lists (orders center) for a hide action beyond the grep above.
