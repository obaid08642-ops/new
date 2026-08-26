# Provider FacilityPatientTrackerScreen: manual semantic review

## reviewed source

`src/screens/facility/FacilityPatientTrackerScreen.tsx`, lines 1–79, baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

| ID | evidence | defect / gap | closure requirement |
|---|---|---|---|
| P-FAC-007 | 15–18 | error response is indistinguishable from zero active patients | add loading/error/retry/authorization state; do not falsely reassure facility users |
| P-FAC-008 | 33–63 | UI discloses name, MRN, clinical status, location, attending and admission date without static evidence of care-team assignment or minimum-necessary scope | enforce encounter/facility/role access server-side, redact as needed, audit viewing and define break-glass policy |
| P-FAC-009 | 65–72 | Referral Log and Discharge Summary CTAs have no `onPress` behavior | confirmed missing capabilities; either wire to authorized record flows or remove/feature-flag them |
| P-FAC-010 | 25–28 | interface claims live monitoring but only loads once; no subscription, freshness timestamp, alarm/escalation or stale-data state | use a controlled real-time/event model or change the claim; include freshness and clinical escalation policy |
