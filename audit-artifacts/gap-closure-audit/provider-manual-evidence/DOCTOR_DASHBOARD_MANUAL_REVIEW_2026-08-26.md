# Provider DoctorDashboard: manual semantic review

## Scope

تمت قراءة `src/screens/doctor/DoctorDashboard.tsx` كاملًا، lines 1–4301، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. هذه مراجعة مصدر الواجهة؛ جميع requests الموجودة تظل `STATIC_MATCHED_PARTIAL` حتى reconciliation مع backend/controller/service/state/RBAC/PHI/ledger.

## Confirmed defects and incomplete paths

| ID | evidence | finding | required closure |
|---|---|---|---|
| P-DOC-001 | 171–187 | socket auth takes token from client `user` state and joins room by `user.id` | verified server socket auth, provider-role/organization room authorization, token lifecycle and audit are required |
| P-DOC-002 | 295–323 | consultation payment UI permits cash-clinic request unpaid at accept; this conflicts with approved cash/card-before-confirmation rule for consultations | enforce authoritative booking/payment state before acceptance; no UI-derived payment rule |
| P-DOC-003 | 377–419 | insurance gatekeeper exposes national ID/DOB and lets provider enter approval status, coverage, co-pay and code | insurer/provider decision contract, PHI access controls/audit, state transition, patient notification/payment then confirmation required |
| P-DOC-004 | 446–466 | Schedule shows three demo appointments when API fails | remove fabricated patients/appointments and show retryable failure/empty state |
| P-DOC-005 | 554–607 | appointment detail fabricates age, insurer, fee, complaint and AI triage content | load authorized appointment/clinical data or render unavailable; AI content needs approved grounded clinical system and disclosure |
| P-DOC-006 | 624–845 | live consultation has fixed patient chat, fixed EHR/allergy, pseudo-video and local home-location distance; any failed end call still announces success and exits | integrate booking-scoped short-lived call token, real chat/EHR, visit presence/geofence policy, signed clinical completion and error/retry state |
| P-DOC-007 | 851–1123 | e-prescription allows arbitrary medicine text, local templates and only a generic interaction warning; duration text is parsed with `parseInt` and defaults to 7 days | authoritative formulary, dose/duration structure, interaction/allergy checks, prescriber authorization, prescription state/audit; no arbitrary/unreviewed drug or silent duration coercion |
| P-DOC-008 | 1129–1224 | sick leave announces issue/QR/SMS success even when API fails | remove fallback success; issue only from authorized government/clinical contract with verifiable signed document and audit |
| P-DOC-009 | 1242–1246, 1317–1346 | referral tracking begins with fabricated referrals and new referral is locally synthesized after POST | server-scoped referral status/recipient capacity/consent/notification and exact care handoff required |
| P-DOC-010 | 1359–1449 | lab/radiology/nursing selection is from local constants and posts raw patient/items to three booking endpoints without source-of-truth provider, availability, price, insurer, patient consent or order state | distinct diagnostic/home-care order contracts with clinical order authority, service selection and payment/insurance state required |
| P-DOC-011 | 1457–1758 | PatientFile displays fixed sensitive clinical profile/history and stores VIP/block/tags/private notes entirely locally | remove static PHI; implement relationship-based EHR access, purpose/audit, immutable/attributed notes, and authorized block policy |
| P-DOC-012 | 1763–1820 | no-show fees, waitlist, reminders and history are hardcoded/local, including unsupported 40% claim | product policy plus server schedule/notification/fee/refund state and evidence required |
| P-DOC-013 | 1835–1849, 1870–1874 | wallet failure falls back to fabricated balances/transactions and fixed 15% commission/suspension claim | ledger-authoritative balance/commission/hold/payment state; outage must not display invented finance data |
| P-DOC-014 | 1916–1954 and 1976–1979 | chat failure falls back to fake patient messages; send ignores failure and video CTA is only toast | booking/thread membership, delivery acknowledgement/error, retention/PHI controls and call contract required |
| P-DOC-015 | 2092–2124 | facility name, permission/pricing lock and unlink success are mock/local | organization membership/RBAC/exit approval must be server-owned and audited |
| P-DOC-016 | 2234–2351 | insurance claim uses hardcoded companies/plans and generates random policy/member IDs, always submits `APPROVED` and 80% coverage from client | remove client-created insurer facts; insurer decision/reference and claim/co-pay ledger must be authoritative |
| P-DOC-017 | 2359–2455 | medical report claims MOH-verified QR/digital signature without source evidence | report issuance needs signer credential, versioned content, authorized patient/booking relation, signature/verification and legal retention contract |
| P-DOC-018 | 2580–2675 and 2682–2770 | calendar sync and availability pulse only toggle local state but claim external synchronization, immediate public availability and 65% performance | OAuth consent/token/revocation, booking capacity synchronizer, availability state and substantiated claims required |
| P-DOC-019 | 2777–2835, 3101–3282 | professional network, subscription plans and statistics are static/local; calls/connect/report export do not perform their claimed actions | keep disabled or implement consented network/subscription/finance/report contracts; remove artificial metrics and export success |
| P-DOC-020 | 2873–3019 | service add maps free-text name to one of five types and discards name/descriptions; toggle/edit POSTs capability state without reconciliation | product capability model, approved provider/service/pricing workflow, validation/idempotency and availability/booking propagation required |
| P-DOC-021 | 3287–3635 | availability, vacation, insurance and exceptions start static, have duplicate insurance block, are local until generic delta save | single source of truth with conflict/slot-locking, facility ownership, insurer network applicability and admin effective-date approval |
| P-DOC-022 | 3637–3751 and 3756–3794 | profile image ID is not PATCHed; clinic-image UI/static map/location/coverage fee actions are non-functional local surfaces | approved profile/media/location capability contracts; geographic consent and server validation required |
| P-DOC-023 | 3799–4055 | duplicate local Insurance/Certificates/Media screens contain static insurers/certificates, simulated upload, Unsplash images and fake photo add/remove | delete/replace duplicate demo implementations with shared real settings; no public/mock external media or fabricated credential status |
| P-DOC-024 | 4062–4208 | waiting-room and pre-visit chat use client paths but seeded message/attachment; must establish booking relation and PHI controls | verify controllers/RBAC/check-in/no-show state, real attachment storage/scan/access and a time-window rule server-side |
| P-DOC-025 | 4214–4301 | inbound reports are explicitly simulated with named patients and external `example.com` report/DICOM URLs | confirmed critical PHI/demo defect: remove simulation/external links and implement patient/doctor relationship-checked signed report/DICOM access |

## Cross-journey conclusion

Doctor operations are not an executable clinical/financial journey. The file exposes treatment, prescriptions, sickness leave, reports, diagnostic orders, insurance, finance, calls and PHI without a single reconciled state machine. It must not be represented as production-ready until these confirmed items and their backend/data contracts are closed.
