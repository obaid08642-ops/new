# Provider FacilityDashboard: manual semantic review

## Scope

تمت قراءة `src/screens/facility/FacilityDashboard.tsx` كاملًا، lines 1–2472، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. وجود request في الواجهة لا يثبت backend/state/RBAC/PHI/payment closure؛ لذلك يعامل كـ`STATIC_MATCHED_PARTIAL` إلى reconciliation الخادمي.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| P-FAC-001 | 70–116, 2441–2472 | inbox يجلب الطلبات، لكن active tab ثابت فارغ وdetail يقبل أو يرفض مباشرة بلا عرض/سعر/مخزون/تأمين/دفع أو state-specific action | facility order state machine وقائمة active موثوقة؛ بحسب النوع يجب تطبيق عرض/قرار تأمين/co-pay/payment/fulfillment قبل confirmation |
| P-FAC-002 | 156–169, 314–333 | اختيار الفرع محلي ولا يمرر filter لأي request؛ يمكن أن يعرض بيانات فرع آخر | branch-scoped API and RBAC/ownership proof, with server-selected organization/branch scope |
| P-FAC-003 | 294–300, 360–404 | اسم المنشأة ثابت وCommand Center يعلن 3 ER، 2 OR، 14 طبيبًا ثابتة | source-of-truth identity and real operational metrics, or unavailable state; no invented operational facts |
| P-FAC-004 | 541–594, 679–706 | إدارة الكوادر لا تثبت scope/RBAC؛ زر edit يفتح add screen بالدور فقط ولا يعدّل الموظف المعني | staff lifecycle, organization scope, audit, suspend/delete safety, correct edit route and least-privilege policy |
| P-FAC-005 | 727–924 | sub-account creation يولد كلمة مرور client-side، يرسل `permissions:['read','write']` لكل دور، يهمل `scfhs`، ويعرض credential/password صراحة بعد الإنشاء | server-side invitation/password-set flow, role-specific permissions, license verification, one-time delivery, forced reset and audit; never display plaintext temporary password |
| P-FAC-006 | 202–203 vs 727–924 | navigator route `add_subaccount` يعرض `FacilityInvitationScreen`، بينما `AddSubAccountScreen` في الملف غير مربوط بهذا route | remove dead/duplicated onboarding or map one approved account-creation flow with a tested contract |
| P-FAC-007 | 929–1005, 1010–1102 | departments مشتقة من حقل staff وتعين أول عضو رئيسًا؛ shift edit/add مجرد toast وassign لا يحدد بديلًا | department ownership/head policy, shift create/edit/assignment with availability, conflict checks and audit |
| P-FAC-008 | 1107–1329 | admission يقبل patient ID حرًا، ويخزن admission-to-bed mapping في `Vault` المحلي كي يستطيع discharge | server authoritative admission/bed lock/transfer/discharge state, patient identity/consent, clinical/financial clearance and audit; no client cache as discharge authority |
| P-FAC-009 | 1335–1413 | unified schedule لا يستخدم `deptFilter` ويعرض queue بلا provider/resource/branch conflict reconciliation | branch/department/resource-aware schedule, conflict/lock rule and action paths required |
| P-FAC-010 | 1418–1579 | QR/manual check-in يستخرج آخر token من input حر ويعامل "Patient ID" كـappointment ID؛ لا دليل signature/expiry/single-use/relationship | signed expiring appointment QR, authorized manual lookup/identity confirmation, anti-replay and check-in audit/state transition |
| P-FAC-011 | 1584–1675 | claims hub يعرض queue حقيقية جزئيًا، لكن resubmit/details/new-claim كلها toasts | insurer reference/state/history/attachments/co-pay/ledger and authorized resubmission/appeal contracts |
| P-FAC-012 | 1680–1829 | financial ledger display has a real read shell, but PDF/Excel export claims progress by toast with no generated artifact/audit | scoped immutable ledger, reconciliation/period semantics and authorized audited report-export contract |
| P-FAC-013 | 1834–1904 | attendance claims GPS auto-registration without evidence in this path; monthly report only toast | trusted attendance/geofence/tamper policy, consent/privacy and server report export contract |
| P-FAC-014 | 1909–2059 | OR collision check is only client-side and rooms fixed `OR-1..3`; booking accepts raw patient/surgeon IDs without staff, consent, equipment, anaesthesia or server lock proof | server transactional room/resource/surgeon scheduling with authoritative collision lock, clinical readiness/consent and audit |
| P-FAC-015 | 2064–2144 | credential status is inferred from staff fields; document view/renew are toasts | verified license/malpractice documents, expiry job/alerts, renewal workflow, restriction of clinical work and audit |
| P-FAC-016 | 2149–2318 | facility identity and tariffs are static/client values; pricing uses generic delta, 2FA/device/password/audit rows only show generic success; legal/support rows all point to generic message | scoped facility configuration, price effective-date/approval, security device/2FA/password/audit operations, policy/legal routes and telemetry |
| P-FAC-017 | 2320–2421 | nursing dispatch sends client-supplied nurse name/phone and default `+966500000000`; no reservation/qualification/location/shift or race protection visible | authoritative eligible-provider assignment with capability, licensure, location/availability, booking lock, notification and audit |
| P-FAC-018 | 43–60, 228–244 | navigator exposes multiple Blueprint/Shared demo surfaces alongside high-risk facility operations | inventory/disposition every imported screen; disable/remove mock routes until real contracts exist; no facility dashboard claim may rely on these demos |

## Cross-journey conclusion

The Facility surface provides partial data-read shells for staff, beds, attendance, finance, queues, QR, and dispatch, but does not establish a safe facility operating model. It has direct confirm/discharge/assign actions that need a central organization/branch/role/state/ledger authority. It is not production-ready until these defects are closed with backend/data contracts and negative-path proof.
