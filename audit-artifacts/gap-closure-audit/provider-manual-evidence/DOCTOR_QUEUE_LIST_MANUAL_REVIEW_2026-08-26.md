# Provider DoctorQueueList: manual semantic review

Reviewed `src/screens/doctor/components/DoctorQueueList.tsx`, lines 1–106.

| ID | evidence | gap | closure requirement |
|---|---|---|---|
| P-DOC-006 | 26–34 | empty component says no appointments without an error/refresh/freshness input; it cannot distinguish a failed parent query from an empty queue | parent queue contract must supply loading/error/freshness and authorized date/timezone scope |
| P-DOC-007 | 52–69 | any appointment passed to the component can be selected, while component renders patient name and status | parent/backend must establish doctor/organization/appointment assignment and server-side ownership on subsequent detail/mutations |
| P-DOC-008 | 57–65 | missing scheduled time becomes `Now`, and unknown statuses collapse to Scheduled | avoid fabricated temporal/state labels; use explicit unknown/invalid state and server canonical status mapping |
