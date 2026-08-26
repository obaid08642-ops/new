# Provider DoctorHeader: manual semantic review

Reviewed `src/screens/doctor/components/DoctorHeader.tsx`, lines 1–79.

| ID | evidence | defect | closure |
|---|---|---|---|
| P-DOC-009 | 22–29 | when user data is absent, UI fabricates a named doctor and specialty | render anonymous/error loading state, never a plausible false provider identity |
| P-DOC-010 | 34 | online status defaults to true when `user.isOnline` is absent | do not claim availability by default; source status from an authorized presence/capacity contract and expose failures |
| P-DOC-011 | 34–40 | toggle/settings links are UI anchors only; no visible role or approval gating | backend must enforce approved provider/organization scope for availability and settings mutations |
