# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/FULL_PRODUCTION_E2E_TRACEABILITY_20260817.md`
- **Member SHA-256:** `14147c2e08be0e430a611ece44b9ff51398b6a3c95f58d98afbefd736dba969a`
- **Line count:** 328
- **Read range:** `1-328`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | Patient | 249 route تحت `app/**/*.tsx`، و27 ملف API/client/services/hooks مرشحاً، و13 ملفاً مرشحاً للغة/الترجمة | `nabd_plus_patient_app.zip` و`DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md` |`
- `12: | Provider | 42 شاشة تحت `src/screens/**/*.tsx`، و12 ملف API/services/utils/hooks مرشحاً | `NabdProvider-provider.zip` و`DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md` |`
- `17: يُستخدم `patient.sandbox@nabd.plus` و`patient2.sandbox@nabd.plus` لاختبارات الملكية، وحساب sandbox الخاص بكل مزود لاختبار الطرف المقابل، وكلمة المرور `Sandbox@123`. لا يُستخدم أي حساب أو order أو appointment غير موسوم sandbox. كل mutation ي`
- `25: | PHARM-REJECT | الصيدلية — الرفض | route → reject → reassignment → accept من صيدلية أخرى أو fail-safe | pharmacy1، pharmacy2، patient | صيدليتان sandbox إن أمكن | Pending | يُملأ من live run |`
- `27: | PHARM-CANCEL | الصيدلية — الإلغاء | cancel before accept → after accept → after cart → after delivery transition | owner، provider، patient2 | orders في كل حالة أو تُنشأ sandbox | Pending | state/ledger |`
- `29: | CONSULT-CLINIC | استشارة عيادة | directory → doctor detail → slots → book → confirm → chat → visit → complete | patient، doctor، patient2 | doctor وslot مستقبليان | Pending | appointment before/after |`
- `30: | CONSULT-HOME | كشف منزلي | directory → home service → address → slot → book → provider accept → arrival → complete | patient، doctor/home provider، patient2 | عنوان sandbox ونطاق خدمة | Pending | location/state |`
- `31: | CONSULT-ONLINE | استشارة أونلاين | slot → book → confirm → chat window → initiate → ringing → accept → end | patient، doctor، patient2 | appointment online | Pending | call/session IDs |`
- `34: | LAB-BRANCH | مختبر — فرع | catalog → branch booking → confirm → sample collected → analyzing → result → report visible | patient، lab، patient2 | test and slot | Pending | sample/report before/after |`
- `38: | LAB-CHANGE | مختبر — تعديل | reschedule → reassign → cancel before/after collection | owner، provider، patient2 | booking at mutable states | Pending | state/authorization |`
- `39: | RADIO-BOOK | أشعة | catalog → branch/home booking → confirm → perform → images/report → patient access | patient، radiology، patient2 | service/slot | Pending | report/media metadata |`
- `41: | RADIO-CHANGE | أشعة — تعديل | reschedule → cancel before/after execution | owner، provider، patient2 | mutable appointment | Pending | state/403 |`
### backend_consumers_or_contracts
- `11: | Patient | 249 route تحت `app/**/*.tsx`، و27 ملف API/client/services/hooks مرشحاً، و13 ملفاً مرشحاً للغة/الترجمة | `nabd_plus_patient_app.zip` و`DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md` |`
- `12: | Provider | 42 شاشة تحت `src/screens/**/*.tsx`، و12 ملف API/services/utils/hooks مرشحاً | `NabdProvider-provider.zip` و`DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md` |`
- `33: | CONSULT-ORDERS | أوامر طبية داخل الاستشارة | prescription → medical order → lab/radiology referral → patient visibility | doctor، patient، lab/radiology | completed/active consultation | Pending | order linkage |`
- `38: | LAB-CHANGE | مختبر — تعديل | reschedule → reassign → cancel before/after collection | owner، provider، patient2 | booking at mutable states | Pending | state/authorization |`
- `43: | NURSING-NEG | تمريض سلبي | provider/patient cancel، no-show، reassignment، location denial | patient، nursing، patient2 | visit in each state | Pending | state/authorization |`
- `72: | patient.sandbox | `POST /auth/login` مع `identifier/password` | 201 | patient user id `0f278cf5-9917-473a-a9bc-c6dbed980834`; tokens حُجبت |`
- `73: | patient2.sandbox | `POST /auth/login` مع `identifier/password` | 201 | patient user id `p2-1786966982904`; tokens حُجبت |`
- `74: | doctor.sandbox | `POST /provider/auth/login` مع `email/password` | 201 | provider id `cdd84366-8710-4c9c-b4ff-72332383335f`, profile id `7210a983-9756-4682-ae68-dcc5978d4ab5`, type doctor |`
- `75: | lab.sandbox | `POST /provider/auth/login` مع `email/password` | 201 | provider id `a6becbef-fc66-4e2a-b07a-4e3402b982be`, type laboratory |`
- `76: | radiology/pharmacy/nursing/hospital | أول محاولة استخدمت identifier غير مطابق لعقد provider، ثم ظهرت 429 لبعضها | Pending | أُوقف الاستمرار احتراماً للـrate-limit؛ يجب إعادة المحاولة بعد النافذة باستخدام `email/password` |`
- `89: | create delivery | `POST /orders/create` | 201 | order `0800f7c8-e803-41d1-b9e8-08489331cc84`, total 20.8, cash, DELIVERY |`
- `90: | patient tracking | `GET /orders/:id/tracking` | 200 | state became `ESCALATED_TO_ADMIN`, reason `no-pharmacy-available` |`
### auth_ownership
- `13: | Backend | العقود الحية ونتائج الإصلاحات موثقة في سجلات المصالحة؛ كل نتيجة هنا ستربط بمسار backend وrole وstate transition | `nabdah-backend.zip` وسجلات `audit-artifacts` |`
- `27: | PHARM-CANCEL | الصيدلية — الإلغاء | cancel before accept → after accept → after cart → after delivery transition | owner، provider، patient2 | orders في كل حالة أو تُنشأ sandbox | Pending | state/ledger |`
- `31: | CONSULT-ONLINE | استشارة أونلاين | slot → book → confirm → chat window → initiate → ringing → accept → end | patient، doctor، patient2 | appointment online | Pending | call/session IDs |`
- `38: | LAB-CHANGE | مختبر — تعديل | reschedule → reassign → cancel before/after collection | owner، provider، patient2 | booking at mutable states | Pending | state/authorization |`
- `41: | RADIO-CHANGE | أشعة — تعديل | reschedule → cancel before/after execution | owner، provider، patient2 | mutable appointment | Pending | state/403 |`
- `43: | NURSING-NEG | تمريض سلبي | provider/patient cancel، no-show، reassignment، location denial | patient، nursing، patient2 | visit in each state | Pending | state/authorization |`
- `45: | HOSPITAL-STAFF | طاقم المستشفى | list → create/invite → update → delete → audit; hospital-admin vs ordinary provider | hospital-admin، provider، patient2 | UUID/string staff IDs | Pending | staff before/after |`
- `48: | SHARED-BOLA | الملكية | patient2 read/track/update/cancel/report for patient1 records; provider cross-owner attempts | patient1، patient2، providers، admin | records from scenarios | Pending | 403/404 + unchanged state |`
- `51: | SHARED-WALLET | المحفظة | balance/history/top-up/refund/withdrawal boundaries and idempotency; stop at Moyasar 502 | patient، admin/provider where applicable | wallet sandbox | Payment-blocked | 502 evidence |`
- `60: يجب أن يحتوي كل صف نهائي على request method/path، status، correlation ID، IDs الخاصة بالorder/appointment/sample/visit/session، الحالة قبل وبعد، actor والrole، screenshots أو logs عند الحاجة، وأي قفزة منطقية أو فشل. لا تُحفظ JWT أو OTP أو أ`
- `72: | patient.sandbox | `POST /auth/login` مع `identifier/password` | 201 | patient user id `0f278cf5-9917-473a-a9bc-c6dbed980834`; tokens حُجبت |`
- `73: | patient2.sandbox | `POST /auth/login` مع `identifier/password` | 201 | patient user id `p2-1786966982904`; tokens حُجبت |`
### state_transitions
- `13: | Backend | العقود الحية ونتائج الإصلاحات موثقة في سجلات المصالحة؛ كل نتيجة هنا ستربط بمسار backend وrole وstate transition | `nabdah-backend.zip` وسجلات `audit-artifacts` |`
- `17: يُستخدم `patient.sandbox@nabd.plus` و`patient2.sandbox@nabd.plus` لاختبارات الملكية، وحساب sandbox الخاص بكل مزود لاختبار الطرف المقابل، وكلمة المرور `Sandbox@123`. لا يُستخدم أي حساب أو order أو appointment غير موسوم sandbox. كل mutation ي`
- `23: | PHARM-DELIVERY | الصيدلية — توصيل | create → routing → pharmacy accept → cart → consent → payment boundary → tracking → delivered → history/reorder | patient، pharmacy، patient2، رفض/إعادة توجيه | دواء وكمية متاحان وorder جديد | Pending |`
- `24: | PHARM-PICKUP | الصيدلية — استلام | create pickup → routing → accept → preparation → ready → patient pickup → complete | patient، pharmacy، إلغاء قبل/بعد ready | pickup service متاح | Pending | يُملأ من live run |`
- `25: | PHARM-REJECT | الصيدلية — الرفض | route → reject → reassignment → accept من صيدلية أخرى أو fail-safe | pharmacy1، pharmacy2، patient | صيدليتان sandbox إن أمكن | Pending | يُملأ من live run |`
- `26: | PHARM-STOCK | الصيدلية — المخزون | availability → alternative/unavailable → substitution consent → completion | patient، pharmacy | عنصر متاح وعنصر غير متاح | Pending | inventory before/after |`
- `27: | PHARM-CANCEL | الصيدلية — الإلغاء | cancel before accept → after accept → after cart → after delivery transition | owner، provider، patient2 | orders في كل حالة أو تُنشأ sandbox | Pending | state/ledger |`
- `28: | PHARM-REORDER | الصيدلية — إعادة الطلب | completed order → reorder/refill → new order linkage → payment boundary | patient | order مكتمل sandbox | Pending | order IDs |`
- `29: | CONSULT-CLINIC | استشارة عيادة | directory → doctor detail → slots → book → confirm → chat → visit → complete | patient، doctor، patient2 | doctor وslot مستقبليان | Pending | appointment before/after |`
- `30: | CONSULT-HOME | كشف منزلي | directory → home service → address → slot → book → provider accept → arrival → complete | patient، doctor/home provider، patient2 | عنوان sandbox ونطاق خدمة | Pending | location/state |`
- `31: | CONSULT-ONLINE | استشارة أونلاين | slot → book → confirm → chat window → initiate → ringing → accept → end | patient، doctor، patient2 | appointment online | Pending | call/session IDs |`
- `32: | CONSULT-CALL-NEG | مكالمة سلبية | reject، no-show، disconnect/reconnect، end by either party | patient/doctor | appointment sandbox | Pending | call state |`
### payment_insurance_relevance
- `17: يُستخدم `patient.sandbox@nabd.plus` و`patient2.sandbox@nabd.plus` لاختبارات الملكية، وحساب sandbox الخاص بكل مزود لاختبار الطرف المقابل، وكلمة المرور `Sandbox@123`. لا يُستخدم أي حساب أو order أو appointment غير موسوم sandbox. كل mutation ي`
- `23: | PHARM-DELIVERY | الصيدلية — توصيل | create → routing → pharmacy accept → cart → consent → payment boundary → tracking → delivered → history/reorder | patient، pharmacy، patient2، رفض/إعادة توجيه | دواء وكمية متاحان وorder جديد | Pending |`
- `28: | PHARM-REORDER | الصيدلية — إعادة الطلب | completed order → reorder/refill → new order linkage → payment boundary | patient | order مكتمل sandbox | Pending | order IDs |`
- `35: | LAB-HOME | مختبر — منزلي | home request → provider accept → arrival/location → collected → analyzing → result | patient، lab/home collector | address and coverage | Pending | visit/sample/location |`
- `36: | LAB-INSURANCE | مختبر — تأمين | insurance request → approve/reject/partial → copay ratio → price/payment boundary | patient، lab/insurer workflow | insurance-eligible test | Pending | quote/status |`
- `37: | LAB-CASH | مختبر — cash opt-in | out-of-network disclosure → explicit cash consent → create or reject | patient، lab | service marked out-of-network | Pending | consent and order |`
- `40: | RADIO-INSURANCE | أشعة — تأمين | manual insurance approve/reject/partial → copay/payment boundary | patient، radiology | eligible order | Pending | quote/status |`
- `51: | SHARED-WALLET | المحفظة | balance/history/top-up/refund/withdrawal boundaries and idempotency; stop at Moyasar 502 | patient، admin/provider where applicable | wallet sandbox | Payment-blocked | 502 evidence |`
- `56: `Passed` تعني أن دورة الحياة كاملة نجحت مع دليل state transition. `Failed` تعني خللاً أو mismatch يحتاج إصلاحاً. `Security-blocked` تعني رفضاً مقصوداً ومثبتاً لعقد غير معتمد أو actor غير مالك. `Payment-blocked` تعني الوصول إلى 502 `payment_`
- `89: | create delivery | `POST /orders/create` | 201 | order `0800f7c8-e803-41d1-b9e8-08489331cc84`, total 20.8, cash, DELIVERY |`
- `104: | pickup create | 201, order `62039080-53eb-4ca2-8bac-69c2a7bb038f`, total 5.8, `PICKUP` | Passed creation only |`
- `112: `GET /care/doctors/7210a983-9756-4682-ae68-dcc5978d4ab5` أعاد 200. الملف يعلن `consultation_modes: [clinic, online]`، لكنه يعيد أيضاً `home_visit_supported: false` وحقول schedule فارغة و`accepts_cash: false` في care projection. على تاريخ مس`
### error_empty_loading_retry_cancel
- `23: | PHARM-DELIVERY | الصيدلية — توصيل | create → routing → pharmacy accept → cart → consent → payment boundary → tracking → delivered → history/reorder | patient، pharmacy، patient2، رفض/إعادة توجيه | دواء وكمية متاحان وorder جديد | Pending |`
- `24: | PHARM-PICKUP | الصيدلية — استلام | create pickup → routing → accept → preparation → ready → patient pickup → complete | patient، pharmacy، إلغاء قبل/بعد ready | pickup service متاح | Pending | يُملأ من live run |`
- `25: | PHARM-REJECT | الصيدلية — الرفض | route → reject → reassignment → accept من صيدلية أخرى أو fail-safe | pharmacy1، pharmacy2، patient | صيدليتان sandbox إن أمكن | Pending | يُملأ من live run |`
- `26: | PHARM-STOCK | الصيدلية — المخزون | availability → alternative/unavailable → substitution consent → completion | patient، pharmacy | عنصر متاح وعنصر غير متاح | Pending | inventory before/after |`
- `27: | PHARM-CANCEL | الصيدلية — الإلغاء | cancel before accept → after accept → after cart → after delivery transition | owner، provider، patient2 | orders في كل حالة أو تُنشأ sandbox | Pending | state/ledger |`
- `28: | PHARM-REORDER | الصيدلية — إعادة الطلب | completed order → reorder/refill → new order linkage → payment boundary | patient | order مكتمل sandbox | Pending | order IDs |`
- `29: | CONSULT-CLINIC | استشارة عيادة | directory → doctor detail → slots → book → confirm → chat → visit → complete | patient، doctor، patient2 | doctor وslot مستقبليان | Pending | appointment before/after |`
- `30: | CONSULT-HOME | كشف منزلي | directory → home service → address → slot → book → provider accept → arrival → complete | patient، doctor/home provider، patient2 | عنوان sandbox ونطاق خدمة | Pending | location/state |`
- `31: | CONSULT-ONLINE | استشارة أونلاين | slot → book → confirm → chat window → initiate → ringing → accept → end | patient، doctor، patient2 | appointment online | Pending | call/session IDs |`
- `32: | CONSULT-CALL-NEG | مكالمة سلبية | reject، no-show، disconnect/reconnect، end by either party | patient/doctor | appointment sandbox | Pending | call state |`
- `33: | CONSULT-ORDERS | أوامر طبية داخل الاستشارة | prescription → medical order → lab/radiology referral → patient visibility | doctor، patient، lab/radiology | completed/active consultation | Pending | order linkage |`
- `34: | LAB-BRANCH | مختبر — فرع | catalog → branch booking → confirm → sample collected → analyzing → result → report visible | patient، lab، patient2 | test and slot | Pending | sample/report before/after |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
