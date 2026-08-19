# منصة نبض — Phase 16: إصلاح P0 لتأكيد استشارة cash تلقائياً

**التاريخ:** 2026-08-19
**الفرع:** `manus/on-live-reconciliation`
**الحكم:** **FIX في المصدر — يتطلب نشر مرشح جديد بتفويض مستقل وإعادة اختبار حي.**

## الدليل الحي

أنشئ fixture واحد فقط بحساب Patient Sandbox مع Doctor Sandbox موثق، من نوع `clinic` و`payment_method: cash` وفي وقت مستقبلي وعلى حد 15 دقيقة. لم ترسل أعراض أو بيانات طبية، واستعملت ملاحظة تشغيلية غير سريرية موسومة للتنظيف.

كانت نتيجة `POST /care/appointments` **HTTP 403**، لكن قراءة قائمة المريض أثبتت أن الموعد قد حُفظ بالفعل في `PENDING`. لا يجوز اعتبار ذلك فشلاً آمناً: العميل يرى رفضاً بينما يبقى مورد حي يمكن أن يحجز slot أو يربك lifecycle.

قبل التنظيف، اختبر المورد نفسه read-only بين حسابي Sandbox. أعاد المالك HTTP 200، وأعاد المريض الآخر HTTP 403. ألغى المالك فقط fixture الموسوم عبر `PATCH /care/appointments/:id/cancel`، فأعاد HTTP 200 وحالة `CANCELLED`. لم تنفذ أي عملية دفع أو استرداد حقيقي؛ ظل `payment_status` معلقاً كما هو في fixture النقدي.

| الجزء | النتيجة | الدلالة |
|---|---|---|
| إنشاء clinic/cash | HTTP 403 مع persistence `PENDING` | **P0**: partial persistence بعد رد فشل |
| قراءة المالك | HTTP 200 | وصول المالك للمورد الموسوم |
| قراءة المريض الآخر | HTTP 403 | BOLA PASS لهذا المورد قراءةً |
| إلغاء المالك | HTTP 200 ثم `CANCELLED` | cleanup تم على المورد الذي أنشئ في هذه الجولة فقط |

لا تحفظ هذه الوثيقة identifier أو JWT أو PII أو تفاصيل slot قابلة للتعريف.

## السبب المصدرّي

ينشئ `AppointmentsService.create` الموعد ثم يستدعي:

```ts
transition(appt.id, APPT_STATES.CONFIRMED, { id: 'system', role: 'system' }, ...)
```

لأن cash وinsurance يجب أن يؤكدا تلقائياً. غير أن `transition` كانت تستدعي `assertAppointmentAccess` لكل actor، وتقبل المريض أو الطبيب المالك أو الإدارة فقط. actor الداخلي `system` لا يطابق أياً منها، فترمي `ForbiddenException` بعد حفظ الموعد وقبل الرد الناجح.

## المعالجة الضيقة

أضيف شرط داخلي صريح في `transition`:

```ts
const isInternalSystemTransition = actor?.id === 'system' && actor?.role === 'system';
if (!isInternalSystemTransition) await this.assertAppointmentAccess(appt, actor);
```

لا يوسع ذلك وصول API للمستخدمين، لأن `system` ليس role تصدره جلسة مستخدم ويمرر داخلياً من الخدمة فقط. تبقى جميع الانتقالات الخارجية خاضعة لـ`assertAppointmentAccess` وstate machine القائمة.

## أدلة المصدر والمرشح

| البوابة | النتيجة |
|---|---|
| اختبار `appointments-states` | PASS — 15 اختباراً، منها تأكيد داخلي PENDING → CONFIRMED |
| Backend build | PASS — `nest build` |
| Backend regression الكامل | PASS — 67 suites / 389 tests في المرشح الأحدث الذي يضم إصلاح التقرير المخبأ أيضاً |
| سلامة ZIP | PASS — استبعد `node_modules` و`dist` و`coverage` و`.env` |
| `nabdah-backend.zip` SHA-256 | `0010b9f7c52cc8e0b75c769ff327b8b343b5943c43b36e8d90fbb303164ce9a1` |

## إعادة الاختبار الحي المطلوبة بعد النشر

بعد نشر SHA المرشح بتفويض Reviewer/DevOps منفصل، ينشأ fixture clinic/cash موسوم جديد. المتوقع HTTP 201 مع حالة `CONFIRMED` لا `PENDING`. بعد ذلك يختبر بالترتيب `check-in → start → complete` بين actors المصرح لهم، ويختبر BOLA للمريض الآخر، ثم يلغي/يؤرشف fixture فقط إذا سمحت الحالة والعقد. لا تُختبر وصفة جديدة على هذا الموعد قبل نشر مرشح الوصفات اليدوية نفسه وتأكيد SHA المنشور.

## References

[1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Phase 16 الحي"
[2]: `../../nabdah_execution/backend/src/modules/care/appointments.service.ts` "إنشاء وانتقال حالات الاستشارة"
[3]: `../../nabdah_execution/backend/src/modules/care/tests/appointments-states.spec.ts` "اختبارات آلة حالات الاستشارة"
