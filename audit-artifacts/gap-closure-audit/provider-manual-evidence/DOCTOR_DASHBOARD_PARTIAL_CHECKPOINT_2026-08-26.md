# DoctorDashboard partial manual-review checkpoint — not complete

Read only lines 1–610 of `src/screens/doctor/DoctorDashboard.tsx`. **Do not mark PR-005 reviewed from this checkpoint.**

| evidence | finding to carry into final review |
|---|---|
| 171–187 | socket authentication takes a token from client `user` state and joins `user.id`; needs exact backend socket auth/room authorization reconciliation. |
| 189–257 | queue accept/reject/insurance actions are client route anchors; provider must not submit insurer decision/copy from free inputs without verified authorization, current state, insurer source, co-pay rule, idempotency/audit/notification. |
| 295–310 | UI uses literal colored/emoji type and payment badges; payment rule shows cash clinic unpaid despite approved product rule requiring Cash/Card before confirmation for consultations. |
| 377–419 | insurance gatekeeper exposes national ID/DOB and permits a provider-entered NPHIES status/coverage/copay/approval code. Must be server/insurer-authoritative with role/PHI/access auditing; free client decision is insufficient. |
| 446–466 | DoctorScheduleTab has confirmed demo fallback appointments when API fails. |
| 554–607 | Appointment detail fabricates age, insurance, fees, complaint and static AI triage. Start-consultation CTA has no visible state/ownership guard. |
| 1–125 | navigator exposes many imported Blueprint/Shared surfaces; their relevant evidence must be reconciled independently, not treated as safe because routes exist. |
