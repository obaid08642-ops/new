# Provider RadiologyDashboard: manual semantic review

## Scope

تمت قراءة `src/screens/radiology/RadiologyDashboard.tsx` كاملًا، lines 1–564، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. يحتوي الملف على read/action API shells لكن لا يثبت backend authorization, state transition, payment/insurance ledger, or medical/PACS governance.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| P-RAD-001 | 194–200, 269–287 | generic action helper posts arbitrary action to booking and UI exposes state changes without role/resource/transition proof | canonical booking state machine, role/organization ownership, optimistic concurrency and audit; actions must be enumerated and authorized server-side |
| P-RAD-002 | 269–273 | every `NEW_REQUEST` offers direct Cash confirmation and insurance request regardless of the actual payment/insurance context; cash confirmation PATCHes `CONFIRMED` without a payment-intent/payment-success check | cash/card payment-before-confirmation contract; insurance request only for eligible payer, then insurer/provider decision → co-pay ledger/payment → confirmation |
| P-RAD-003 | 202–207, 290–296 | provider enters approval code and co-pay amount from client; no coverage details/partial-reject decisions/payer reference or patient payment result is shown | insurer-authoritative decision with covered/uncovered items, claim reference, co-pay source/ledger and patient notification/payment completion before booking confirmation |
| P-RAD-004 | 255–264, 275–283 | pregnancy/pacemaker/metal/contrast warnings are display-only; check-in and start-scan are still permitted with no visible clinical clearance/prep/consent/override rule | safety gate requiring appropriate questionnaire, consent, clinician protocol/contraindication override, contrast readiness and traceable authorization before scanning |
| P-RAD-005 | 209–231, 298–320 | abort claims a refund ticket; reschedule creates a date by adding days on the client, with no available slot, machine/radiographer lock, patient acknowledgement or refund state | clinical abort/refund assessment and resource-aware rescheduling contract with patient communication, payment adjustment and audit |
| P-RAD-006 | 326–400 | report screen accepts arbitrary HTTPS PDF and PACS/DICOM URLs from user input; it is not an upload or signed-storage control, and no allowlist/ownership/expiry/PHI access check appears | authenticated secure report/DICOM storage, signed short-lived view links, malware/format checks, PACS authorization, report versioning and patient/doctor release policy; never accept arbitrary external PHI URLs |
| P-RAD-007 | 350–360, 398–400 | submit/review/publish calls can be invoked from the same UI without demonstrated radiologist assignment, dual review, electronic signature or immutable report state | attributed technologist/radiologist workflow, credential/role enforcement, report signature/version history and critical finding escalation |
| P-RAD-008 | 405–493 | catalog delta permits provider-entered cash price, duration, modality, risk flags and home portable ultrasound; edit is toast-only | admin-approved modality/equipment/staff/room eligibility, service catalog/pricing effective dates and clinically governed prep/risk definitions |
| P-RAD-009 | 496–542 | availability begins from static defaults and sends generic catalog delta; no machine/room/radiographer schedule, capacity, timezone/overlap or emergency policy evidence | resource-based slot service with locks, capacity and approved service hours; emergency availability cannot be a local switch |
| P-RAD-010 | 41–77, 544–563 | navigator imports general wallet/drug/insurance surfaces; settings is informational only and does not establish center profile/security/device/audit controls | disposition each imported surface and add scoped radiology organization/security/audit settings only under real contracts |

## Cross-journey conclusion

The radiology UI outlines a plausible clinical flow but does not safely enforce it. It can confirm cash bookings without payment proof, permits scan progression despite safety risk displays, permits provider-entered insurance decisions, and accepts arbitrary external report/DICOM URLs. This is a production blocker until contracts, medical safety gates and secure PHI storage/authorization are implemented and independently verified.
