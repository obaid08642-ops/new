# مصفوفة traceability لحملة E2E الإنتاجية

**التاريخ:** 2026-08-17

> هذه الوثيقة جرد مصدرّي قبل التنفيذ الحي. لا تعني أن السيناريو Passed؛ كل نتيجة تحتاج دليلاً request/response وbefore/after من sandbox.

## نطاق المصدر

| التطبيق | الجرد المصدرّي | الدليل |
|---|---:|---|
| Patient | 249 route تحت `app/**/*.tsx`، و27 ملف API/client/services/hooks مرشحاً، و13 ملفاً مرشحاً للغة/الترجمة | `nabd_plus_patient_app.zip` و`DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md` |
| Provider | 42 شاشة تحت `src/screens/**/*.tsx`، و12 ملف API/services/utils/hooks مرشحاً | `NabdProvider-provider.zip` و`DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md` |
| Backend | العقود الحية ونتائج الإصلاحات موثقة في سجلات المصالحة؛ كل نتيجة هنا ستربط بمسار backend وrole وstate transition | `nabdah-backend.zip` وسجلات `audit-artifacts` |

## قواعد الاختبار

يُستخدم `patient.sandbox@nabd.plus` و`patient2.sandbox@nabd.plus` لاختبارات الملكية، وحساب sandbox الخاص بكل مزود لاختبار الطرف المقابل، وكلمة المرور `Sandbox@123`. لا يُستخدم أي حساب أو order أو appointment غير موسوم sandbox. كل mutation يجب أن يملك before/after state وcorrelation ID، ولا تُنفذ refunds أو عمليات مالية فعلية؛ payment gateway يتوقف عند 502 المتوقع إلى حين تفعيل Moyasar.

## مصفوفة السيناريوهات الكاملة

| ID | الخدمة/النطاق | دورة الحياة التي يجب اختبارها | actors/الفروع المطلوبة | الحالة الأولية المطلوبة | النتيجة | الدليل |
|---|---|---|---|---|---|---|
| PHARM-DELIVERY | الصيدلية — توصيل | create → routing → pharmacy accept → cart → consent → payment boundary → tracking → delivered → history/reorder | patient، pharmacy، patient2، رفض/إعادة توجيه | دواء وكمية متاحان وorder جديد | Pending | يُملأ من live run |
| PHARM-PICKUP | الصيدلية — استلام | create pickup → routing → accept → preparation → ready → patient pickup → complete | patient، pharmacy، إلغاء قبل/بعد ready | pickup service متاح | Pending | يُملأ من live run |
| PHARM-REJECT | الصيدلية — الرفض | route → reject → reassignment → accept من صيدلية أخرى أو fail-safe | pharmacy1، pharmacy2، patient | صيدليتان sandbox إن أمكن | Pending | يُملأ من live run |
| PHARM-STOCK | الصيدلية — المخزون | availability → alternative/unavailable → substitution consent → completion | patient، pharmacy | عنصر متاح وعنصر غير متاح | Pending | inventory before/after |
| PHARM-CANCEL | الصيدلية — الإلغاء | cancel before accept → after accept → after cart → after delivery transition | owner، provider، patient2 | orders في كل حالة أو تُنشأ sandbox | Pending | state/ledger |
| PHARM-REORDER | الصيدلية — إعادة الطلب | completed order → reorder/refill → new order linkage → payment boundary | patient | order مكتمل sandbox | Pending | order IDs |
| CONSULT-CLINIC | استشارة عيادة | directory → doctor detail → slots → book → confirm → chat → visit → complete | patient، doctor، patient2 | doctor وslot مستقبليان | Pending | appointment before/after |
| CONSULT-HOME | كشف منزلي | directory → home service → address → slot → book → provider accept → arrival → complete | patient، doctor/home provider، patient2 | عنوان sandbox ونطاق خدمة | Pending | location/state |
| CONSULT-ONLINE | استشارة أونلاين | slot → book → confirm → chat window → initiate → ringing → accept → end | patient، doctor، patient2 | appointment online | Pending | call/session IDs |
| CONSULT-CALL-NEG | مكالمة سلبية | reject، no-show، disconnect/reconnect، end by either party | patient/doctor | appointment sandbox | Pending | call state |
| CONSULT-ORDERS | أوامر طبية داخل الاستشارة | prescription → medical order → lab/radiology referral → patient visibility | doctor، patient، lab/radiology | completed/active consultation | Pending | order linkage |
| LAB-BRANCH | مختبر — فرع | catalog → branch booking → confirm → sample collected → analyzing → result → report visible | patient، lab، patient2 | test and slot | Pending | sample/report before/after |
| LAB-HOME | مختبر — منزلي | home request → provider accept → arrival/location → collected → analyzing → result | patient، lab/home collector | address and coverage | Pending | visit/sample/location |
| LAB-INSURANCE | مختبر — تأمين | insurance request → approve/reject/partial → copay ratio → price/payment boundary | patient، lab/insurer workflow | insurance-eligible test | Pending | quote/status |
| LAB-CASH | مختبر — cash opt-in | out-of-network disclosure → explicit cash consent → create or reject | patient، lab | service marked out-of-network | Pending | consent and order |
| LAB-CHANGE | مختبر — تعديل | reschedule → reassign → cancel before/after collection | owner، provider، patient2 | booking at mutable states | Pending | state/authorization |
| RADIO-BOOK | أشعة | catalog → branch/home booking → confirm → perform → images/report → patient access | patient، radiology، patient2 | service/slot | Pending | report/media metadata |
| RADIO-INSURANCE | أشعة — تأمين | manual insurance approve/reject/partial → copay/payment boundary | patient، radiology | eligible order | Pending | quote/status |
| RADIO-CHANGE | أشعة — تعديل | reschedule → cancel before/after execution | owner، provider، patient2 | mutable appointment | Pending | state/403 |
| NURSING-LIFE | تمريض منزلي | request → nurse accept → start visit → tracking → complete → rating | patient، nursing، patient2 | service/address/slot | Pending | visit/location/rating |
| NURSING-NEG | تمريض سلبي | provider/patient cancel، no-show، reassignment، location denial | patient، nursing، patient2 | visit in each state | Pending | state/authorization |
| HOSPITAL-BOOK | مستشفى | facility directory → service/doctor → booking → confirmation → patient history | patient، hospital، patient2 | facility and slot | Pending | appointment |
| HOSPITAL-STAFF | طاقم المستشفى | list → create/invite → update → delete → audit; hospital-admin vs ordinary provider | hospital-admin، provider، patient2 | UUID/string staff IDs | Pending | staff before/after |
| SHARED-NOTIFY | الإشعارات | each lifecycle event → notification creation → patient/provider inbox → read/deep link | actors for each service | notifications enabled | Pending | notification IDs |
| SHARED-HISTORY | السجل | every order/appointment/sample/visit status appears correctly in patient/provider history | patient/provider/patient2 | records from scenarios | Pending | list/detail snapshots |
| SHARED-BOLA | الملكية | patient2 read/track/update/cancel/report for patient1 records; provider cross-owner attempts | patient1، patient2، providers، admin | records from scenarios | Pending | 403/404 + unchanged state |
| SHARED-PROFILE | الملف والعناوين | view/edit profile → addresses → default address → invalid/unauthorized update | patient، patient2 | sandbox profile | Pending | before/after |
| SHARED-FAMILY | أفراد العائلة | add → edit → select in booking/order → remove; cross-account access denied | patient، patient2 | sandbox family member | Pending | IDs/403 |
| SHARED-WALLET | المحفظة | balance/history/top-up/refund/withdrawal boundaries and idempotency; stop at Moyasar 502 | patient، admin/provider where applicable | wallet sandbox | Payment-blocked | 502 evidence |
| SHARED-FAILCLOSED | SOS/QR/contracts | SOS and QR unapproved paths reject safely; consent/location/error registry remain non-activated | patient/provider/unknown | no activation | Security-blocked | 4xx/error code |

## حالات النتيجة المعتمدة

`Passed` تعني أن دورة الحياة كاملة نجحت مع دليل state transition. `Failed` تعني خللاً أو mismatch يحتاج إصلاحاً. `Security-blocked` تعني رفضاً مقصوداً ومثبتاً لعقد غير معتمد أو actor غير مالك. `Payment-blocked` تعني الوصول إلى 502 `payment_gateway_unavailable` المتوقع بسبب Moyasar. `Pending` تعني أن السيناريو لم يُنفذ بعد، ولا يجوز تحويله إلى Passed من خلال فحص endpoint منفرد.

## متطلبات كل evidence row

يجب أن يحتوي كل صف نهائي على request method/path، status، correlation ID، IDs الخاصة بالorder/appointment/sample/visit/session، الحالة قبل وبعد، actor والrole، screenshots أو logs عند الحاجة، وأي قفزة منطقية أو فشل. لا تُحفظ JWT أو OTP أو أسرار في التقرير.

## مراجع

1. `DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md` — جرد routes/screens المصدرية.
2. `NABDAH_PROJECT_REFERENCE.md` — المرجع المعماري والتشغيلي.
3. `POST_REMEDIATION_E2E_EXECUTION_PLAN.md` — خطة E2E والقيود السابقة.

## Sandbox identity bootstrap — 2026-08-17

| الحساب | الطلب | النتيجة | الدليل/الملاحظة |
|---|---|---|---|
| patient.sandbox | `POST /auth/login` مع `identifier/password` | 201 | patient user id `0f278cf5-9917-473a-a9bc-c6dbed980834`; tokens حُجبت |
| patient2.sandbox | `POST /auth/login` مع `identifier/password` | 201 | patient user id `p2-1786966982904`; tokens حُجبت |
| doctor.sandbox | `POST /provider/auth/login` مع `email/password` | 201 | provider id `cdd84366-8710-4c9c-b4ff-72332383335f`, profile id `7210a983-9756-4682-ae68-dcc5978d4ab5`, type doctor |
| lab.sandbox | `POST /provider/auth/login` مع `email/password` | 201 | provider id `a6becbef-fc66-4e2a-b07a-4e3402b982be`, type laboratory |
| radiology/pharmacy/nursing/hospital | أول محاولة استخدمت identifier غير مطابق لعقد provider، ثم ظهرت 429 لبعضها | Pending | أُوقف الاستمرار احتراماً للـrate-limit؛ يجب إعادة المحاولة بعد النافذة باستخدام `email/password` |

تمت مطابقة سبب 401 مصدرّياً: `ProviderAuthService.login` يعرّف input كـ`{ email, password }` ويبحث بالبريد، بينما محاولة التهيئة الأولى أرسلت `identifier`. لا يُعتبر هذا عيباً إنتاجياً قبل اختبار التطبيق الفعلي؛ لكنه contract mismatch يجب أن تغطيه مصفوفة provider E2E.

## Pharmacy catalog precondition — 2026-08-17

`GET /medicines?limit=5` أعاد HTTP 200. تم اختيار medicine sandbox candidate `101687` (Panadol Blue Paracetamol 500 Mg — 24 Tabs) لأنه `available_online=true` و`requires_prescription=false` وسعره الحي `5.8`. استجابة catalog أظهرت أيضاً أن حقول `aggregate_stock` و`pharmacies_count` قد تكون صفراً لبعض المنتجات رغم `available=true`، لذلك سيُتحقق من نتيجة routing/availability قبل اعتبار الطلب قابلاً للإتمام. لم تُستخدم صورة أو secret ولم تُنفذ mutation في هذه الخطوة.

## Pharmacy delivery lifecycle — first live run

| step | request | result | state/evidence |
|---|---|---:|---|
| cart clear/add/read | `/cart/clear`, `/cart/lines`, `/cart` | 200 | patient cart contained medicine `101687`, qty 1 |
| create delivery | `POST /orders/create` | 201 | order `0800f7c8-e803-41d1-b9e8-08489331cc84`, total 20.8, cash, DELIVERY |
| patient tracking | `GET /orders/:id/tracking` | 200 | state became `ESCALATED_TO_ADMIN`, reason `no-pharmacy-available` |
| pharmacy queue | `GET /orders/pharmacy/queue` | 403 | endpoint is not the provider app's active route; source order controller declares it after `GET :id`, so route-shadowing must be reviewed |
| pharmacy accept/preparing/ready | `POST /orders/:id/{accept,preparing,ready}` | 403 | not treated as workflow success; order had no allocation and provider app uses `/provider/pharmacy/...` routes instead |
| wrong-owner cancel | patient2 `POST /orders/:id/cancel` | 403 | `order_not_accessible`; state unchanged |
| owner cleanup | patient1 `POST /orders/:id/cancel` | 201 | final state `CANCELLED`; sandbox mutation cleaned |

**Classification:** `Failed/Blocked` for pharmacy end-to-end completion because production had no pharmacy available for the selected online medicine; `Passed` for cart creation, tracking response, BOLA rejection, and owner cleanup. This is not evidence that the full pharmacy flow is complete.

## Pharmacy branches — pickup/reorder

| step | result | classification |
|---|---:|---|
| `POST /orders/:cancelled/reorder` | recorded in `/tmp/e2e-pharmacy-branches.ndjson` | negative branch; source order was CANCELLED, no success claim |
| `POST /orders/:cancelled/reorder-partial` | recorded in `/tmp/e2e-pharmacy-branches.ndjson` | negative branch; no success claim |
| pickup create | 201, order `62039080-53eb-4ca2-8bac-69c2a7bb038f`, total 5.8, `PICKUP` | Passed creation only |
| pickup detail/tracking | 200; state `ESCALATED_TO_ADMIN`, reason `no-pharmacy-available` | Blocked by production availability |
| pickup cleanup | 201; final state `CANCELLED` | Passed cleanup |

Active pharmacy provider routes were also checked without mutation: `/provider/profile` 200, `/provider/pharmacy/allocations` 200 with `[]`, `/provider/pharmacy/broadcasts` 200 with `[]`, and `/provider/inventory/low-stock-alerts` 200 with `[]`. This confirms the sandbox pharmacy is authenticated and has no current allocations, but it does not prove an accept/prepare/deliver lifecycle.

## Consultation discovery and slot preconditions — 2026-08-17

`GET /care/doctors/7210a983-9756-4682-ae68-dcc5978d4ab5` أعاد 200. الملف يعلن `consultation_modes: [clinic, online]`، لكنه يعيد أيضاً `home_visit_supported: false` وحقول schedule فارغة و`accepts_cash: false` في care projection. على تاريخ مستقبلي `2026-08-19`: clinic slots أعادت 200 مع 16 فتحة متاحة، video أعاد 200 مع `slots: []` و`reason: service_not_supported`، وhome أعاد 200 مع `slots: []` و`reason: service_not_supported`.

**Finding CONSULT-CONTRACT-001:** واجهة/بيانات الدليل تعلن online، بينما عقد slots يستخدم `video` ويعيد unsupported؛ home غير مدعوم فعلياً لهذا الحساب. يجب عدم اعتبار online/home Passed قبل مواءمة service-type أو توفير مزود sandbox يدعمها. هذه ملاحظة contract/live-data وليست mutation.

## Clinic consultation lifecycle — first live run

Appointment `053e2c8c-cc42-4b89-afc5-83a0eff87125` was created by patient sandbox with doctor `7210a983-9756-4682-ae68-dcc5978d4ab5`, `service_type=clinic`, slot `2026-08-19T09:00:00.000Z`, cash, total 115. Create returned 201 and auto-transitioned PENDING→CONFIRMED. Patient GET returned 200; patient check-in returned 200 and transitioned CONFIRMED→CHECKED_IN. Patient list returned 200.

Doctor GET/start/complete returned 403. Diagnosis evidence: provider login JWT has `sub/id=cdd84366-8710-4c9c-b4ff-72332383335f`, `role=provider`, `provider_type=doctor`; appointment stores `doctor_id=7210a983-9756-4682-ae68-dcc5978d4ab5` and `doctor_user_id=7c80f2eb-b169-47b2-b058-503d2a5545f1`. `AppointmentsService.one` and transition authorization compare `doctor_user_id` directly to `user.id`, while provider JWT represents the account/profile identity. **Finding CONSULT-CONTRACT-002 (P1): provider doctor cannot read/start/complete appointments created for the same doctor profile through the production provider login contract.** Appointment remains sandbox `CHECKED_IN` pending cleanup/fix validation; no payment was attempted.

## Consultation provider identity remediation — source patch

The doctor provider contract was repaired in the authoritative backend archive. `AppointmentsService` now resolves the doctor profile by its canonical profile id and considers only the authenticated provider's `id`, `account_id`, `provider_id`, or `provider_profile_id` when matching the profile's `id`, `user_id`, or `account_id`; strangers remain denied. The same helper is used for appointment read, list, state transitions, cancellation, and SOAP finish.

Evidence: appointment regression **14/14** passed; backend full gate **30 suites / 235 tests** passed; Nest build passed. Patch is packaged in the backend archive and awaits deployment before live doctor GET/start/complete recheck. No production source was claimed fixed until that redeploy is confirmed.
