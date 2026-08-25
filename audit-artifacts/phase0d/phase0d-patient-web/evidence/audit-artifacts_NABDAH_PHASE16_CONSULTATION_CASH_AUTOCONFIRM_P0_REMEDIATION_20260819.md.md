# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE16_CONSULTATION_CASH_AUTOCONFIRM_P0_REMEDIATION_20260819.md`
- **Member SHA-256:** `76084ff478527b5f63e3a4f7086ed8b17abd712523524bd31b5bc1eeb44e3743`
- **Line count:** 63
- **Read range:** `1-63`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: قبل التنظيف، اختبر المورد نفسه read-only بين حسابي Sandbox. أعاد المالك HTTP 200، وأعاد المريض الآخر HTTP 403. ألغى المالك فقط fixture الموسوم عبر `PATCH /care/appointments/:id/cancel`، فأعاد HTTP 200 وحالة `CANCELLED`. لم تنفذ أي عملية دفع`
- `20: | إلغاء المالك | HTTP 200 ثم `CANCELLED` | cleanup تم على المورد الذي أنشئ في هذه الجولة فقط |`
- `61: [1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Phase 16 الحي"`
### backend_consumers_or_contracts
- `11: كانت نتيجة `POST /care/appointments` **HTTP 403**، لكن قراءة قائمة المريض أثبتت أن الموعد قد حُفظ بالفعل في `PENDING`. لا يجوز اعتبار ذلك فشلاً آمناً: العميل يرى رفضاً بينما يبقى مورد حي يمكن أن يحجز slot أو يربك lifecycle.`
- `13: قبل التنظيف، اختبر المورد نفسه read-only بين حسابي Sandbox. أعاد المالك HTTP 200، وأعاد المريض الآخر HTTP 403. ألغى المالك فقط fixture الموسوم عبر `PATCH /care/appointments/:id/cancel`، فأعاد HTTP 200 وحالة `CANCELLED`. لم تنفذ أي عملية دفع`
- `62: [2]: `../../nabdah_execution/backend/src/modules/care/appointments.service.ts` "إنشاء وانتقال حالات الاستشارة"`
- `63: [3]: `../../nabdah_execution/backend/src/modules/care/tests/appointments-states.spec.ts` "اختبارات آلة حالات الاستشارة"`
### auth_ownership
- `29: transition(appt.id, APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, ...)`
- `39: const isInternalSystemTransition = actor?.id === 'system' && actor?.role === 'system';`
- `43: لا يوسع ذلك وصول API للمستخدمين، لأن `system` ليس role تصدره جلسة مستخدم ويمرر داخلياً من الخدمة فقط. تبقى جميع الانتقالات الخارجية خاضعة لـ`assertAppointmentAccess` وstate machine القائمة.`
### state_transitions
- `11: كانت نتيجة `POST /care/appointments` **HTTP 403**، لكن قراءة قائمة المريض أثبتت أن الموعد قد حُفظ بالفعل في `PENDING`. لا يجوز اعتبار ذلك فشلاً آمناً: العميل يرى رفضاً بينما يبقى مورد حي يمكن أن يحجز slot أو يربك lifecycle.`
- `13: قبل التنظيف، اختبر المورد نفسه read-only بين حسابي Sandbox. أعاد المالك HTTP 200، وأعاد المريض الآخر HTTP 403. ألغى المالك فقط fixture الموسوم عبر `PATCH /care/appointments/:id/cancel`، فأعاد HTTP 200 وحالة `CANCELLED`. لم تنفذ أي عملية دفع`
- `17: | إنشاء clinic/cash | HTTP 403 مع persistence `PENDING` | **P0**: partial persistence بعد رد فشل |`
- `20: | إلغاء المالك | HTTP 200 ثم `CANCELLED` | cleanup تم على المورد الذي أنشئ في هذه الجولة فقط |`
- `29: transition(appt.id, APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, ...)`
- `43: لا يوسع ذلك وصول API للمستخدمين، لأن `system` ليس role تصدره جلسة مستخدم ويمرر داخلياً من الخدمة فقط. تبقى جميع الانتقالات الخارجية خاضعة لـ`assertAppointmentAccess` وstate machine القائمة.`
- `49: | اختبار `appointments-states` | PASS — 15 اختباراً، منها تأكيد داخلي PENDING → CONFIRMED |`
- `57: بعد نشر SHA المرشح بتفويض Reviewer/DevOps منفصل، ينشأ fixture clinic/cash موسوم جديد. المتوقع HTTP 201 مع حالة `CONFIRMED` لا `PENDING`. بعد ذلك يختبر بالترتيب `check-in → start → complete` بين actors المصرح لهم، ويختبر BOLA للمريض الآخر، ث`
- `63: [3]: `../../nabdah_execution/backend/src/modules/care/tests/appointments-states.spec.ts` "اختبارات آلة حالات الاستشارة"`
### payment_insurance_relevance
- `1: # منصة نبض — Phase 16: إصلاح P0 لتأكيد استشارة cash تلقائياً`
- `9: أنشئ fixture واحد فقط بحساب Patient Sandbox مع Doctor Sandbox موثق، من نوع `clinic` و`payment_method: cash` وفي وقت مستقبلي وعلى حد 15 دقيقة. لم ترسل أعراض أو بيانات طبية، واستعملت ملاحظة تشغيلية غير سريرية موسومة للتنظيف.`
- `13: قبل التنظيف، اختبر المورد نفسه read-only بين حسابي Sandbox. أعاد المالك HTTP 200، وأعاد المريض الآخر HTTP 403. ألغى المالك فقط fixture الموسوم عبر `PATCH /care/appointments/:id/cancel`، فأعاد HTTP 200 وحالة `CANCELLED`. لم تنفذ أي عملية دفع`
- `17: | إنشاء clinic/cash | HTTP 403 مع persistence `PENDING` | **P0**: partial persistence بعد رد فشل |`
- `32: لأن cash وinsurance يجب أن يؤكدا تلقائياً. غير أن `transition` كانت تستدعي `assertAppointmentAccess` لكل actor، وتقبل المريض أو الطبيب المالك أو الإدارة فقط. actor الداخلي `system` لا يطابق أياً منها، فترمي `ForbiddenException` بعد حفظ المو`
- `52: | سلامة ZIP | PASS — استبعد `node_modules` و`dist` و`coverage` و`.env` |`
- `57: بعد نشر SHA المرشح بتفويض Reviewer/DevOps منفصل، ينشأ fixture clinic/cash موسوم جديد. المتوقع HTTP 201 مع حالة `CONFIRMED` لا `PENDING`. بعد ذلك يختبر بالترتيب `check-in → start → complete` بين actors المصرح لهم، ويختبر BOLA للمريض الآخر، ث`
### error_empty_loading_retry_cancel
- `11: كانت نتيجة `POST /care/appointments` **HTTP 403**، لكن قراءة قائمة المريض أثبتت أن الموعد قد حُفظ بالفعل في `PENDING`. لا يجوز اعتبار ذلك فشلاً آمناً: العميل يرى رفضاً بينما يبقى مورد حي يمكن أن يحجز slot أو يربك lifecycle.`
- `13: قبل التنظيف، اختبر المورد نفسه read-only بين حسابي Sandbox. أعاد المالك HTTP 200، وأعاد المريض الآخر HTTP 403. ألغى المالك فقط fixture الموسوم عبر `PATCH /care/appointments/:id/cancel`، فأعاد HTTP 200 وحالة `CANCELLED`. لم تنفذ أي عملية دفع`
- `17: | إنشاء clinic/cash | HTTP 403 مع persistence `PENDING` | **P0**: partial persistence بعد رد فشل |`
- `20: | إلغاء المالك | HTTP 200 ثم `CANCELLED` | cleanup تم على المورد الذي أنشئ في هذه الجولة فقط |`
- `49: | اختبار `appointments-states` | PASS — 15 اختباراً، منها تأكيد داخلي PENDING → CONFIRMED |`
- `57: بعد نشر SHA المرشح بتفويض Reviewer/DevOps منفصل، ينشأ fixture clinic/cash موسوم جديد. المتوقع HTTP 201 مع حالة `CONFIRMED` لا `PENDING`. بعد ذلك يختبر بالترتيب `check-in → start → complete` بين actors المصرح لهم، ويختبر BOLA للمريض الآخر، ث`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
