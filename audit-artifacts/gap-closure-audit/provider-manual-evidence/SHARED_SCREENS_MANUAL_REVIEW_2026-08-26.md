# Provider SharedScreens: manual semantic review

## Scope

تمت قراءة `src/screens/shared/SharedScreens.tsx` كاملًا، lines 1–3098، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. الملف يحتوي أسطحًا مستقلة متعددة؛ وجود مسار HTTP لا يثبت role/ownership/state/financial or PHI completion.

## Confirmed local/demo/missing behavior

| ID | evidence | finding | required closure |
|---|---|---|---|
| P-SH-001 | 145–175 | ChatRoom converts message-load failure to two hardcoded patient/doctor messages; send appends locally then silently swallows POST failure | remove demo fallback, use server IDs/delivery/error/retry states and exact thread membership authorization |
| P-SH-002 | 193–198, 233–269 | audio/video, voice and all attachment types only show toasts; no call/attachment action exists | remove/blocked state or implement secure call-token and attachment contracts with PHI policy |
| P-SH-003 | 301–302 | notification read and mark-all changes local state only | server read-state mutation with ownership, idempotency, notification event audit and refresh |
| P-SH-004 | 362–374, 394–404 | Support Center renders hardcoded tickets and FAQ, including payment/results claims | retrieve scoped tickets/knowledge content from backend; no fabricated service data or SLA claims |
| P-SH-005 | 452–499 | DeviceManagement uses a static device list, local 2FA/biometric toggles and fake removal/logout | implement authenticated device/session inventory, real 2FA enrollment/challenge, revocation and audit; biometric local preference must not imply account protection |
| P-SH-006 | 509–513 | tutorial makes unqualified E2E-encryption/2FA claims | remove until architecture and product truth substantiate these claims |
| P-SH-007 | 557–590 | Wearables has fixed connected devices and vitals and Connect only shows a toast | remove demo clinical readings or implement consented vendor OAuth/device binding, data provenance, patient linkage, retention and clinical safety handling |
| P-SH-008 | 604–624, 643–669 | MedicalReferenceLib has static drugs, interaction advice and ICD content | replace with an authoritative licensed clinical source/version/medical-review workflow or restrict/remove; no static clinical decision content |
| P-SH-009 | 678–749 | MaskedCall is a local timer with no telephony/session/access/audit path | explicit blocked state until a provider/patient/booking-scoped masked-call contract exists |
| P-SH-010 | 792–862 | StatisticsReports falls back to fake KPIs `4200/28/4.7/12`, uses static monthly bars and export buttons only toast | remove fallback/static chart/export success; use ledger-defined metrics and real authorized export jobs |
| P-SH-011 | 914–921 | review auto-reply setting is local only and claims enabled/disabled | persist a policy-controlled setting server-side or hide it; add moderation/rate/consent rules |
| P-SH-012 | 1396–1424, 1523–1548 | job application CV control merely sets boolean true; no document picker/upload occurs | confirmed fake upload; require a stored CV/document ID, candidate ownership/credential checks and employer scoped disclosure |
| P-SH-013 | 1363–1393 | job-post mutation sends `status: published` from client and does not distinguish facility verification/moderation lifecycle | server must own status/publication, employer eligibility, content moderation, audit and applicant privacy |
| P-SH-014 | 1329–1353 | ATS inbox iterates jobs by `facility_id=user.id`, skips any inaccessible job silently | reconcile organization ID/role and provide explicit authorization/error states; do not hide access failure as an empty inbox |
| P-SH-015 | 1577–1579 | CV download is only a success toast; WhatsApp opens direct applicant phone | implement approved document download and controlled communications/consent or remove CTAs |
| P-SH-016 | 1802–1815 | nearest/recent filters only set state and close sheet; no sort execution | confirmed non-functional filter |
| P-SH-017 | 1962–1988 | unauthenticated fallback can upload a drug suggestion image; authenticated path requests `public_read` storage | reconcile public upload access, abuse controls, content scan, reviewer ownership and privacy/license policy before this remains enabled |
| P-SH-018 | 2495–2516, 2541–2548 | insurance copay accepts any three digit number and sends provider-supplied values via delta | validate 0–100 and resolve exact backend insurer/network/co-pay authority, effective date and approval decision before patient use |
| P-SH-019 | 2814–2851 | MediaConfig optimistically removes/adds images even though it says the delta takes effect only after admin approval; cards display camera icon rather than `img.url` | show pending requested vs approved media separately, render signed image, and prove moderation/storage/access lifecycle |
| P-SH-020 | 2932–2951 | wallet load failures only warn console then leave default financial zeros | distinguish financial outage/authorization from zero balance; reconcile ledger/settlement/commission source and scope |
| P-SH-021 | 3051–3059 | Face ID setting is a local vault flag, no biometric enrollment or auth challenge | label as device preference only or implement OS authentication and server session protection policy |

## Static-matched partial surfaces needing backend reconciliation

`WithdrawalWorkflow` (970–1235), `CertificatesConfigScreen` (2579–2772), `ProviderWalletScreen` (2923–3012), reviews reply mutation (879–897), drug catalog readers/suggestions (1999–2270), and insurance delta (2457–2574) contain real-looking client requests, but this read proves neither controller route, ownership, state transition, audit, financial ledger, moderation, nor notifications. They remain `STATIC_MATCHED_PARTIAL` / `RUNTIME_REQUIRED`, not complete features.

`QRCodeSystem` (755–777) is correctly explicit that it is blocked; it must remain blocked until consented QR verification contract is approved.
