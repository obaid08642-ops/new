# Provider DoctorOpsScreens: manual semantic review

## scope

تمت قراءة `src/screens/doctor/DoctorOpsScreens.tsx` كاملًا، 1–334، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. التعليق `live-verified APIs` في 1–5 ليس دليلًا مقبولًا بحد ذاته.

| ID | evidence | gap / defect | closure requirement |
|---|---|---|---|
| P-DOC-001 | 47–66 and 73–75 | leave UI validates only presence, not calendar date/time validity, start-before-end, future/past rules, overlap or existing locked bookings. It promises bookings are blocked. | backend must be authoritative for availability, conflicts, future reservations/rebooking, timezone and cancellation of leave. Client needs conflict/action-required states |
| P-DOC-002 | 140–161 | prescription templates parse arbitrary lines into `{med,dose}` and persist no product IDs, frequency/duration, contraindication or patient context | templates must be non-clinical drafts until bound to a clinician, formulary, patient allergies/contraindications and signed prescription issuance workflow |
| P-DOC-003 | 224–249 | saved diagnoses accept free text and arbitrary ICD values without catalog validation or clinical governance | use authoritative diagnosis taxonomy/versioning; enforce role, audit and distinguish personal aliases from diagnosis-of-record |
| P-DOC-004 | 269–329 | blacklist displays/unblocks patients but has no policy/appeal/cooldown/booking scope reasoning or static proof of relationship authorization | implement provider-scoped, auditable, policy-limited restriction with patient notice/appeal and server enforcement; do not use as unbounded clinical access control |
| P-DOC-005 | 39–45, 132–138, 216–222, 279–285 | API failures are converted to empty lists across critical operational lists | distinguish error/no data, retain prior data only safely, and provide retry/unauthorized state |

Every listed endpoint remains an anchor pending exact controller/DTO/state/ownership reconciliation and unauthorized/stranger/idempotency tests.
