# Provider DoctorUrgentRequests: manual semantic review

Reviewed `src/screens/doctor/components/DoctorUrgentRequests.tsx`, lines 1–108.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-DOC-014 | 21–68 | presentation delegates accept/decline to parent; no contract/state/SLA/identity evidence exists here | parent/backend must enforce doctor eligibility, appointment/urgent-request ownership, one-winner concurrency, timeout/reassign, decline reason and patient/admin notifications |
| P-DOC-015 | 46–49 | patient name and symptoms may be rendered from any passed object, with no indication of assignment or minimum-necessary disclosure | scope PHI to eligible urgent responder and audit access; use safe loading/error state |
| P-DOC-016 | 26 | zero requests produces no UI at all, without freshness or refresh state | parent must make operational availability/failure visible so no-responder states are not hidden |
