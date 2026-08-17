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

## E2E remediation checkpoint

CONSULT-CONTRACT-002 was patched and pushed on `manus/on-live-reconciliation` as commit `d0bd477`. The patch is source/build/test verified but is **not marked live-verified** until production deploy and a new sandbox clinic appointment prove doctor GET/start/complete. Pharmacy and clinic evidence above remains preserved; all created orders/appointments were cancelled by their patient owners after testing.

## Pharmacy route remediation

`GET /orders/pharmacy/queue` returned 403 during the first live run while the active provider app correctly uses `/provider/pharmacy/allocations` (which returned 200 with an empty list). Source inspection found the legacy static route declared after `GET :id`; it was moved before the wildcard in `OrdersController` to prevent route shadowing. Combined backend gate after this change: **30 suites / 235 tests**, build passed. This remains pending live recheck after deployment; no claim of production closure is made yet.

## Consultation mode creation checks

Using patient sandbox and future slots, `POST /care/appointments` with `service_type=video` and card returned HTTP 400 `doctor does not support service_type=video`; `service_type=home` with insurance and a sandbox Riyadh location returned HTTP 400 `doctor does not support service_type=home`. No appointment IDs were created. This confirms the live contract gap: the doctor projection advertises online in its consultation modes, while the appointment backend contract accepts `video` and this sandbox doctor is not configured for it; home care is not enabled for this doctor. These are BLOCKED/contract findings, not Passed flows.

## Laboratory facility lifecycle — live sandbox run

Catalog `GET /labs/services` returned 200 with 69 services. Selected real CBC service `2f227444-b928-40ee-8308-8cc8cc3ac9fb` (45 SAR, home eligible). `compatible-providers` returned 200 with zero rows, so the existing sandbox laboratory account/profile was used explicitly from its live provider identity: account `a6becbef-fc66-4e2a-b07a-4e3402b982be`, facility profile `b5a68ef0-9e58-424e-a88e-ae99f046c2f0`; no fabricated id was used.

Booking `76166cc4-7c29-4762-944b-c7c9de45bb15` / tracking `LAB-2608-459A8` was created by patient sandbox with facility/cash at HTTP 201 and read by patient at 200. Provider inbox returned 200 and contained the booking. General `PATCH /labs/bookings/:id/state` with `CONFIRMED` returned 403 `admin/lab only`, although provider inbox, technician assignment, sample registration, sample stages, and report upload all worked: assign 201, register sample 201 (`62b5cb45-cb78-4801-929d-00f40a375693`), analyzing 200, result_ready 200, report 201, patient final read 200 with state REPORTED and full history.

**Finding LAB-CONTRACT-001 (P1):** `LabsService.transition` checks `user.role` against `admin/lab/hospital`, while production provider JWT is `role=provider`, `provider_type=laboratory`; it should use the already-established `getEffectiveRoles(user)` helper. The booking reached REPORTED through sample pipeline without using the blocked generic transition. Terminal REPORTED sandbox data is retained as documented evidence; no payment was attempted.

## Laboratory transition remediation

`LabsService.transition` now authorizes through `getEffectiveRoles(user)`, aligning `role=provider` plus `provider_type=laboratory` with the existing provider inbox/sample/report paths while retaining provider ownership checks. Regression: labs suite **8/8** passed. Full backend gate: **30 suites / 236 tests** passed and build passed. The production booking `76166cc4-7c29-4762-944b-c7c9de45bb15` remains evidence of the pre-deploy 403 and final REPORTED pipeline; live recheck of generic transition is pending deployment.

## Laboratory booking access remediation

`LAB-ACCESS-002` was fixed fail-closed. Reschedule and emergency now require the patient owner, assigned lab/hospital provider, or admin; GPS updates require the assigned provider/admin; tracking reads require patient owner, assigned provider, or admin. A stranger cannot mutate or read a booking by id alone. Regression: labs suite **11/11** passed; full backend **30 suites / 239 tests** passed; build passed. Production BOLA recheck for these four routes is pending deployment; no live unauthorized mutation was attempted after the finding.


## Radiology live lifecycle and access remediation — 2026-08-17

### دورة حياة الأشعة المنفذة بحسابات sandbox

تم تنفيذ دورة واحدة كاملة على الإنتاج عبر origin المباشر (`api.nabd.plus` مع resolve إلى `57.131.133.208`) باستخدام `patient.sandbox` و`patient2.sandbox` و`radiology.sandbox` فقط. أُنشئ booking أشعة داخل المركز بمعرف `be7b0b06-73bc-4cdd-8a7c-1dba320da4c7` وبيانات scan تجريبية غير مرتبطة بمستخدم حقيقي. النتائج: الإنشاء `201`، قراءة المالك `200`، قراءة patient2 للمعرف نفسه `404`، قائمة المريض `200`، قائمة المزوّد `200`، قبول المزوّد `200`، تخصيص الجهاز `200`، رفع التقرير `201`، وقراءة التقرير النهائية للمالك `200`. الحالة النهائية المرصودة `REPORT_UPLOADED` مع metadata للصور والتقرير في الاستجابة. الدليل التفصيلي المختصر محفوظ في `/tmp/e2e-radiology-lifecycle.ndjson`، ويجب نقله إلى مجلد artifacts عند تجهيز حزمة الأدلة النهائية إذا كان خالياً من أي token.

### اكتشاف أمني قبل الإصلاح

أثبت الاختبار السلبي أن حساب patient كان يستطيع قبل نشر patch قراءة `provider/queue` و`wallet` و`catalog` و`inventory` بحالة `200`، وأن patient2 استطاع استدعاء `finalize-scan/:id` بحالة `201`، كما استطاع patient استدعاء `allocate-machine/:id` بحالة `200` على booking sandbox. هذا كان **RAD-ACCESS-001، خطورة عالية**: مسارات مزوّد الأشعة لم تكن محمية بعقد دور/ملكية، وعمليات mutation كانت قابلة للتنفيذ بواسطة هوية غير مزوّدة. لم تُستخدم بيانات غير sandbox ولم تُجرَ أي mutation خارج booking الاختباري.

### المعالجة المصدرية

أُعيدت حماية `RadiologyProviderController` في المصدر الحاكم: `JwtAuthGuard` و`Roles(RADIOLOGY, ADMIN, SUPER_ADMIN)` على مستوى controller، تحقق من الحساب المعيّن قبل `respond` و`allocate-machine` و`finalize-scan`، عزل queue إلى الطلبات pending أو الطلبات المعيّنة للمركز الحالي، عزل wallet/inventory عن `provider_id` القادم من العميل، منع تعديل catalog العام إلا للأدمن مع allowlist للحقول، ومنع إنشاء inventory مع قبول `provider_id` من body. كما عولج قبول UUID العام أو Mongo `_id` في mutation paths، وأصبح report يتطلب `reportText` و`pdfUrl` غير فارغين.

أضيف regression test بثلاث حالات: عدم إعادة حجز مركز آخر في queue، رفض finalize لمركز غريب، ورفض allocate من caller غير مزوّد. النتيجة المستقلة `3/3`، ثم `tsc --noEmit` وNest build ناجحان، ومجموعة backend الكاملة أصبحت **31 suite / 242 test ناجحة**. الإصلاح مصنف **SOURCE FIX / DEPLOY-RECHECK** ولا يُغلق تشغيلياً قبل نشره وإعادة اختبار patient/provider/foreign-provider على الإنتاج.

### حدود دورة الأشعة الحالية

لم تُغلق بعد متغيرات الزيارة المنزلية، الرفض وإعادة الإسناد، إعادة الجدولة، التأمين approve/reject/partial، cash opt-in، cancel/no-show، مراجعة التقرير واعتماده، إشعارات كل انتقال، وربط الصور/التقرير بسياسة storage فعلية. تبقى هذه البنود `Pending` حتى ينفذ كل منها بحسابات sandbox ويثبت before/after وnotification IDs و403/404 للهوية الغريبة. لا يُفهم نجاح دورة center الحالية على أنه اكتمال كل عقد الأشعة.


## Nursing / home-care live preflight and source remediation — 2026-08-17

### النتيجة الحية المتاحة

تمت قراءة catalog التمريض الحي بحساب patient sandbox وأعاد `200` مع service id حقيقي `ef35bff2-28a7-405e-ae0f-aa917388f776`. شُغّل `POST /unified-bookings/nursing-broadcast` بموعد مستقبلي وموقع sandbox داخل الرياض و`auto_book=true`; أعاد `201`، لكن `providers: []` و`booking: null`. لذلك لم تُنشأ زيارة وهمية ولم تُجرَ mutations بديلة. لا تُعد هذه النتيجة دورة حياة كاملة؛ هي إثبات أن endpoint الحي يعمل وأن المانع الحالي هو عدم وجود مزود matching متاح في نطاق الاختبار.

### اكتشافات المصدر

كان `NursingController` يسمح سابقاً بقراءة visits اعتماداً على `provider_id` من query، وقراءة visit/tracking بالمعرف فقط، وتنفيذ respond/transit/arrive/start-care/no-show/emergency/complete دون فحص actor أو assignment. كما كان progress notes يقبل `patient_id` وبدون booking إلزامي، و`HomeCareTrackingController` لا يفرض JWT، ويقبل patient coordinates من العميل بدلاً من موقع الحجز، ويولّد fallback ObjectIds عند غياب bookingId/nurseId في طلب المستلزمات. هذه سطوح **NURSING-ACCESS-001 / NURSING-PLACEHOLDER-001** عالية الخطورة مصدرّياً، ولم نكرر mutation القديم على الإنتاج لأن ذلك كان سينشئ سجل supply orphan غير مرتبط بحجز sandbox.

### المعالجة المصدرية

أضيفت قرارات ownership موحدة في `NursingController`: المريض يرى سجلاته فقط، والمزوّد يرى الزيارة المعيّنة له فقط، وadmin له صلاحية الإدارة؛ قبول الطلب غير المعيّن يربطه بالمزوّد المصادق عليه، وكل state mutation لاحق يتطلب assignment. أُلزم notes بوجود booking حقيقي ومطابقة patient/booking، ومنع provider_id من توسيع queue. أضيفت حماية JWT إلى tracking controller، وربط geofence بإحداثيات الحجز المخزنة، وتحديث GPS على الحجز بعد نجاح التحقق، وإزالة جميع fallback identifiers من supplies مع ربط nurse بالحساب المخزن.

أضيفت regression tests للـtracking والـcontroller: **6/6** حالات ownership/geofence/supply/state-history، ثم full backend **33 suites / 248 tests** مع `tsc --noEmit` وNest build ناجحين. التصنيف **SOURCE FIX / LIVE BLOCKED BY PROVIDER AVAILABILITY / DEPLOY-RECHECK**.

### ما لم يُغلق

تبقى دورة nursing الحية كاملة معلقة إلى أن يظهر مزود sandbox matching: accept/reject، transit، arrival، start-care، complete، tracking، notes، supplies، cancel، no-show، emergency، notifications، وBOLA بين patient1/patient2 ومزوّد غريب. كما يلزم إعادة نشر patch ثم اختبار المسارات السلبية على الإنتاج قبل اعتبار المعالجة تشغيلية.


## Hospitals / staff live matrix and source remediation — 2026-08-17

### القراءة الحية قبل النشر

باستخدام حساب hospital sandbox فقط، أعادت `GET /hospital/invitations` و`GET /hospital/invitations/inbox` الحالة `200` مع قوائم فارغة. أما `GET /hospital/branches` و`/departments` و`/staff` و`/appointments` و`/wallet` فأعادت `500 Internal server error`. لم تُجرَ أي mutation على الإنتاج. محاولة القراءة بحساب patient sandbox انتهت بـ`401 Invalid token` في هذه الجولة، ولم تُستخدم لتجاوز المصادقة.

### السبب الجذري

كان `HospitalService` يحوّل `user.id` إلى `new Types.ObjectId()` مباشرة رغم أن هوية الحساب في JWT هي UUID؛ كما كان `onboardDoctor` و`updateAppointmentStatus` يستخدمان `_id`/ObjectId مباشرة، مع عدم تمرير CurrentUser إلى service للتحقق من الدور والنطاق. هذا يفسر 500 في جميع مسارات القراءة التي احتاجت hospital lookup، ويخلق خطر mutation خارج منشأة الطبيب في status update.

### المعالجة المصدرية

أضيف حل UUID آمن إلى `_id` الحقيقي من User model، مع رفض `hospital_user_not_found` بدلاً من CastError. أضيفت RBAC صريحة لأدوار hospital/hospital_admin/branch_admin/receptionist/finance/admin، مع منع receptionist/finance من الكتابة. أصبحت staff fields user/branch/department تتحقق من المراجع بدلاً من قبول raw body، وأصبح appointment status محصوراً في حالات معروفة ومربوطاً بأطباء affiliated مع المنشأة نفسها. مرّر controller CurrentUser إلى جميع عمليات الخدمة، ولم تعد hospital scope أو role افتراضاً ضمنياً.

أضيفت regression tests **3/3**، ثم full backend **34 suites / 251 tests** مع `tsc --noEmit` وNest build ناجحين. التصنيف: **SOURCE FIX / LIVE PRE-DEPLOY FAILURE / DEPLOY-RECHECK**.

### المتبقي

بعد نشر patch يجب إعادة تشغيل مصفوفة القراءة والتأكد من زوال 500، ثم اختبار staff add، branch/department creation، doctor onboarding، appointment status، wallet، invitation create/respond، مع hospital-admin مقابل provider عادي وpatient غريب. لا يُعلن إغلاق البند قبل evidence حي بعد النشر.


## Shared services — notifications, wallet, family — 2026-08-17

### القراءة الحية

بجلسة patient sandbox جديدة، أعادت notifications الحالة `200` مع إشعارات حقيقية مرتبطة بنتيجة مختبر وحالات delivery موثقة (`SMS SENT` و`push FAILED` ضمن السجل)، لا بيانات mock. أعادت wallet balance/transactions/spending/cards الحالات `200` مع رصيد صفر ومعاملات وبطاقات فارغة حقيقية. بقيت عمليات topup/confirm/transfer خارج mutation في هذه الجولة لأنها تعتمد على بوابة الدفع أو ledger مالي ويجب اختبارها بعد عقد payment/idempotency.

### Family lifecycle

أنشأ patient1 مجموعة sandbox بالحالة `201`، أنشأ invite بالحالة `201`، وانضم patient2 بالحالة `201`. قراءة members أعادت `200`. قبل منح الصلاحية، محاولة قراءة member records أعادت `403`، وبعد إزالة العضو من قبل المالك أعادت العملية `200`. لم تُستخدم بيانات غير sandbox.

### العيب المكتشف والإصلاح

أعاد endpoint منح permissions `404 Member not found` رغم أن mutation كان قد نجح فعلياً؛ السبب أن `FamilyService` كان يفسر غياب `matchedCount` و`nMatched` من بعض نتائج Mongo كأنه `0`. تم إصلاحه بحيث لا يُرفض إلا عند قيمة صفر صريحة، مع إبقاء الحالة الحقيقية غير الموجودة fail-closed. أضيفت regression coverage للحالتين، ثم full backend **34 suites / 253 tests** مع `tsc --noEmit` وNest build ناجحين.

### حدود الإغلاق

يجب بعد النشر إعادة اختبار grant/relation/calendar/permission-request، وإثبات عزل wallet/card/topup بين حسابين، وتسجيل read/register-token وadmin delivery-stats، ثم ربط كل حدث من دورات الخدمات بإشعار فعلي. النتيجة الحالية **SOURCE FIX / LIVE PARTIAL / DEPLOY-RECHECK**.


## Notifications ownership — 2026-08-17

أثبتت القراءة الحية أن `GET /notifications` يعرض سجلات حقيقية مرتبطة بخدمات sandbox، بما في ذلك حالة delivery متعددة القنوات. أثناء مراجعة المصدر ظهر أن `POST /notifications/:id/read` كان يحدّث أي notification بالـid دون قيد user/role، وهو BOLA يسمح لمستخدم مصادق بتغيير سجل مستخدم آخر.

تم إصلاح `NotificationsService.markRead` ليستخدم شرطاً مركباً `{ id, $or: [{ user_id }, { role }, { role: 'all' }] }`، وليعيد `notification_not_found` عند عدم وجود تطابق. أضيف اختباران regression، وأصبح full backend **35 suites / 255 tests** مع tsc/build ناجحين. لم تُنفذ mutation foreign على الإنتاج؛ يلزم بعد نشر patch إثبات patient2 لا يستطيع تعليم إشعار patient1 كمقروء، مع استمرار owner/role/all الصحيح.


## Wallet safe negative matrix — 2026-08-17

نفّذ patient2 sandbox قراءة topup غير موجود فأعاد `404 topup_not_found`. محاولة حذف card بمعرف غير موجود أعادت `200` مع قائمة بطاقات فارغة، أي no-op دون لمس بطاقة أخرى. محاولة تحويل `1` إلى patient1 من محفظة رصيدها صفر أعادت `400 insufficient_balance`. لم يُنشأ payment intent، ولم تُضاف بطاقة، ولم يُنفذ تحويل مالي حقيقي.

يبقى المسار المالي الكامل معلقاً على تفعيل Moyasar التجاري: topup intent/confirm، webhook، refund، idempotency، وإثبات ledger قبل/بعد. التصنيف **SAFE NEGATIVE PASS / PAYMENT GATEWAY BLOCKED**.


## BookingOps shared contract — 2026-08-17

أظهر فحص المصدر أن `GET /booking/flow/invoice/:type/:id` و`payment` كانا patient-scoped للقراءة، لكن `POST /booking/flow/payment/:type/:id/mark` كان يقبل provider/admin role ثم يحدث أي booking بالـid دون تحقق من الإسناد. كما كانت `listAttachments` و`getAttachment` لا تتحققان من صاحب الحجز قبل عرض metadata، رغم أن addAttachment كان يتحقق جزئياً.

تمت المعالجة بإضافة ownership-aware entity lookup للمريض والمزوّد المعيّن وadmin، وتطبيع provider/provider_type، وتقييد markPayment بـassigned provider أو admin مع status payload صريح ونتيجة update مؤكدة. أصبحت list/get attachments تتحقق من booking access قبل الإرجاع، مع عدم عرض base64 في القائمة. أضيفت **4/4** regression tests، وأصبح full backend **36 suites / 259 tests** مع tsc/build ناجحين.

لم تُنفذ mutation production على booking غير مناسب. التصنيف **SOURCE FIX / DEPLOY-RECHECK**؛ يلزم بعد النشر إثبات foreign invoice/payment/attachment = 403/404، وبقاء assigned provider/admin workflows ناجحة دون تسريب base64.


## Unified booking read contract — 2026-08-17

في probe حي على radiology sandbox id قديم، أعاد `GET /unified-bookings/radiology/:id` حالة `200` بجسم فارغ للمريض المالك ولحساب patient2، بدلاً من عقد واضح يميز record غير الموجود/غير المملوك. كما أعادت مسارات `booking/flow/status` و`timeline` في نفس probe `404`، ما يشير إلى أن النسخة المنشورة لا تتطابق بالكامل مع source snapshot الحالي أو أن التسجيل الفعلي للموديول مختلف؛ لا يُستنتج من ذلك نجاح lifecycle.

تم إصلاح `UnifiedBookingsService.getOne` ليستخدم patient ownership ثم يرمي `404 booking_not_found` عند نتيجة null، مع regression **2/2**. أصبحت البوابة المحلية **37 suites / 261 tests** مع tsc/build ناجحين. التصنيف **SOURCE FIX / LIVE VERSION RECONCILIATION REQUIRED**، ويجب بعد نشر نسخة موحدة إعادة الاختبار على booking sandbox موجود فعلياً قبل الإغلاق.


### Current live reconciliation probe

استُخرجت قائمة حقيقية من `GET /unified-bookings/mine` للمريض sandbox؛ تضمنت lab booking `76166cc4-7c29-4762-944b-c7c9de45bb15` بحالة `REPORTED/COMPLETED`. `GET /unified-bookings/lab/:id` أعاد `200` وبيانات الحجز كاملة للمالك patient1، لكنه أعاد `200` بجسم فارغ لـpatient2 قبل نشر patch `72fe83e`. هذا يؤكد أن الإصلاح المصدرّي لم يُنشر بعد، وأن live BOLA/contract recheck يجب أن يعاد بعد النشر ويتوقع `404 booking_not_found` للغريب.


## BookingFlow provider visibility — 2026-08-17

أظهر فحص المصدر أن `BookingFlowService.fetchEntity` كان patient-only باستثناء admin، ما يجعل مزوداً معيناً غير قادر على status/timeline/retry من العقد الموحد حتى لو كان مرتبطاً بالحجز. تم توحيد ownership ليشمل provider_account_id/provider_id/doctor_user_id/pharmacy_id مع دعم provider_type normalization، مع إبقاء المزود غير المعيّن fail-closed، وتوسيع admin resolve إلى admin/super_admin فقط.

أضيفت regression **2/2**، وأصبح full backend **38 suites / 263 tests** مع tsc/build ناجحين. في الإنتاج الحالي أعادت `booking/flow/status` و`timeline` الحالة `404` على probe سابق، ولذلك يصنف البند **SOURCE FIX / LIVE ROUTE-VERSION RECONCILIATION** ولا يُغلق قبل اختبار booking sandbox assigned بعد النشر.


## HomeCareCompat legacy contract — 2026-08-17

كشف تدقيق الطبقة التوافقية القديمة `/home-care/*` أن إنشاء الحجز كان يسمح بـservice_name/price/provider_id من العميل، وأن queue التمريض وavailability كانا قابلين للوصول من حسابات مصادق عليها دون تحقق كافٍ. كما كانت transitions وGPS وcare-plans وinventory تقبل booking ids دون ربط كامل بالمريض أو المزود المعيّن، وكان inventory غير المرتبط بحجز يعيد نجاحاً دون سجل حقيقي.

تمت المعالجة بإلزام patient وservice_id فعال من catalog واستخدام سعر catalog فقط، ومنع provider impersonation، وقصر queue/availability على nursing provider/admin، وإضافة state graph للانتقالات، وربط GPS/care plans/inventory بالحجز والتعيين مع إزالة fallback orphan ack. أضيفت **3/3** regression tests، وأصبح full backend **39 suites / 266 tests** مع tsc/build ناجحين.

لم تُنفذ زيارة تمريض وهمية على الإنتاج؛ preflight السابق أعاد providers فارغة. التصنيف **SOURCE FIX / LIVE PROVIDER BLOCKED / DEPLOY-RECHECK**.


## NursingController financial/state contract — 2026-08-17

كشف الفحص الإضافي أن دفتر محفظة الممرض كان يستخدم fallback ثابتاً بقيمة **150** عند غياب `service_fee`، ما يخلق أرباحاً وهمية. كما كانت بعض انتقالات الحالة لا تتحقق من الحالة السابقة، وكان emergency-abort يعلن إرجاع المبلغ مع تخزين `refunded_amount` قبل وجود settlement مالي، وGPS يقبل إحداثيات غير صالحة قد تتجاوز geofence عبر NaN.

تمت المعالجة باشتقاق المبلغ من الحقول الحقيقية فقط (`service_fee` ثم `total_price/total/price` وإلا صفر)، وحصر wallet في nursing provider/admin، وإلزام إحداثيات صحيحة، وتثبيت انتقالات ARRIVED→CARE_IN_PROGRESS وCARE_IN_PROGRESS→COMPLETED، وإلزام emergency بسبب وحالة صحيحة مع `refund_status=pending_finance_review` و`refunded_amount=0` حتى تتم مراجعة finance الفعلية. أضيفت **6/6** regression tests، وأصبح full backend **39 suites / 269 tests** مع tsc/build ناجحين.

التصنيف **SOURCE FIX / DEPLOY-RECHECK**؛ لا تزال دورة التمريض الحية الكاملة معلّقة بسبب عدم وجود provider matching في sandbox.
