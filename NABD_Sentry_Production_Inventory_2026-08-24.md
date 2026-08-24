# جرد أخطاء Sentry الإنتاجية — 24 أغسطس 2026

> مصدر الجرد: مشروع `nabdplus/react-native`، فلتر `is:unresolved environment:production`، 30 يومًا. لا يعني وجود الإصلاح في الفرع أن الحاوية الإنتاجية تعمل به؛ ربط الإصدار/الـrelease والتحقق بعد النشر مطلوبان قبل إغلاق أي قضية.

## أعطال البنية والحجب

| القضية | الحالة | الدليل | التصنيف الأولي | الإجراء المطلوب |
|---|---|---|---|---|
| REACT-NATIVE-J | Mongo DNS | `POST /auth/guest`، 2 events، 23 أغسطس | **P0 — INFRA/BLOCKED** | تصحيح `MONGO_URL` في حاوية API إلى URI قابل للحل من الشبكة، وإضافة startup/readiness fail-closed. لا يمكن للكود وحده إصلاح DNS أو قاعدة بيانات مفقودة. |
| REACT-NATIVE-A | Redis MISCONF RDB disk persistence | `GET /api/*`، 5 events، 17 أغسطس | **P0 — INFRA/BLOCKED** | تحرير مساحة/صلاحيات volume Redis وإصلاح RDB persistence ثم إعادة تشغيل Redis والتحقق من `INFO persistence`; لا يجوز علاج ذلك بتعطيل writes أو fallback per-process في إنتاج متعدد النسخ. |
| REACT-NATIVE-B | Moyasar live account inactive | `POST /payments/intent/*`، 5 events | **P0 — PSP/BLOCKED** | تفعيل الحساب الحي أو استبدال مفتاحه بمفتاح حساب حي مفعل، أو تعطيل card على الخادم والواجهة صراحةً. |
| REACT-NATIVE-C | payment gateway unavailable | `POST /payments/intent/*`، 2 events | **P0 — PSP/BLOCKED** | مرتبط بـB؛ يلزم منع إعلان card ناجح قبل PSP readiness sandbox/live. |

## أخطاء كود/عقود يجب إصلاحها

| القضية | culprit | التصنيف الأولي | مصدر مرجح في الفرع |
|---|---|---|---|
| REACT-NATIVE-2 | `POST /calls/provider/no-show` | **P1 — data contract / historical invalid record** | `modules/livekit/livekit.service.ts`; حفظ وثيقة موعد قديمة فيها `service_type=consultation` يشغل validation. يلزم انتقال ذري متحقق وإصلاح بيانات محدود. |
| REACT-NATIVE-8 وREACT-NATIVE-7 | pharmacy allocation delivered/confirm | **P1 — undefined collection field** | تتبع provider pharmacy allocation service/controller واختبارات confirm/delivered. |
| REACT-NATIVE-4 | lab booking QC | **P1 — Mongo update shape** | تتبع `provider/ops/lab/bookings/:id/qc/:action` واختبار update atomic. |
| REACT-NATIVE-3 | `c.expire is not a function` | **P1 — Redis fallback compatibility** | يظهر أن الفرع يحتوي shim لـ`expire`؛ يلزم إثبات أن الإصدار المطبق يتضمنه وعدم إغلاق القضية قبل release. |
| REACT-NATIVE-5 | radiology upload report | **P1 — undefined array** | تتبع `upload-report` وتهيئة reports/history قبل `push`. |
| REACT-NATIVE-6 | maternity contractions | **P1 — DTO/schema mismatch** | اشتقاق/إلزام `interval_seconds` خادميًا مع اختبار input valid. |
| REACT-NATIVE-9/G/F/E/D | hospital staff/wallet/appointments/departments/branches | **P1 — ObjectId vs UUID** | حماية parsing وتحديد business id versus Mongo `_id` قبل الاستعلام. |
| REACT-NATIVE-H | media route path-to-regexp | **P1 — route syntax/runtime mismatch** | تثبيت صيغة wildcard المتوافقة مع Express/Nest version واختبار boot. |
| REACT-NATIVE-1 | Sentry test crash | **P2 — test telemetry hygiene** | تأكيد أنه crash test متعمد وعزله إلى non-production أو إيقافه. |

## دليل مباشر من تفاصيل Sentry

- REACT-NATIVE-J: running API حاول resolve hostname `mongodb` داخل حاوية، وفشل أثناء `AuthService.guest` عند `userModel.findOne`. هذا ليس خطأ request من المريض؛ إنه إعداد runtime أو network/compose service discovery.
- REACT-NATIVE-A: Redis أعاد `MISCONF` لأن snapshot RDB لا يمكن كتابته. الرسالة تدل على volume/disk/permissions في Redis ويجب علاجها على الخادم، لا إخفاؤها في التطبيق.
- REACT-NATIVE-B: `MoyasarAdapter.createIntent` تلقى `Entity not activated to use live account`. المفتاح موجود لكنه لا يملك صلاحية live؛ أي card/Apple Pay/Mada لا يجوز عرضها كخدمة تعمل حتى التصحيح والتحقق.
- REACT-NATIVE-2: آخر occurrence 17 أغسطس، وكتب validation أن `service_type=consultation` لا يطابق enum موعد `clinic|video|home`. يجب عدم افتراض أن الخطأ مختفٍ من source فقط، إذ قد توجد سجلات تاريخية معطوبة.

## تحقق حي لاحق

في **24 أغسطس 2026، 12:41 UTC**، أعاد `https://api.nabd.plus/api/v1/health/readiness` حالة `ok` مع MongoDB وRedis في `up`. كما أن استعلام Sentry لأحداث `environment:production level:error` خلال آخر 24 ساعة لم يرجع نتائج. هذا يثبت التعافي اللحظي فقط؛ لا يكشف إعداد DNS أو volume Redis، ولا يثبت أن الإصدار الحي يتضمن تغييرات هذا الفرع أو أن PSP صار مفعلًا.

## قاعدة الاعتماد

لا تُغلق أي قضية Sentry ولا تُحدّث حالتها من خلال الأداة حتى: إصلاح مصدر/تهيئة محدد، اختبار انحدار، نشر متحكم به بعد موافقة المستخدم، ثم مراقبة فترة خالية من التكرار في release محدد.
