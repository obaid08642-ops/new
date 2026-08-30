# سجل تغييرات فرع chore/prod-hardening — Nabd Plus

تاريخ بدء الفرع: 2026-08-30
قاعدة الفرع: main @ 75e0a34d
رابط الفرع: https://github.com/obaid08642-ops/new/tree/chore/prod-hardening
رابط الـPR: https://github.com/obaid08642-ops/new/pull/new/chore/prod-hardening

## الـcommits

### a42519ba — ci: cover provider and admin applications
- إضافة job مستقل لـ Provider App في CI (npm ci --legacy-peer-deps + typecheck + tests).
- إضافة job مستقل لـ Admin Dashboard في CI (npm ci + typecheck + production build).
- إصلاح نص رسالة الحوكمة في شاشة المحادثات الصيدلانية (Provider) لتطابق عقد الاختبار.
- التحقق: Provider typecheck PASS، 12 اختباراً ناجحاً، Admin build PASS (48 صفحة).

### db826159 — docs: define verifiable implementation plan
- إضافة IMPLEMENTATION_PLAN.md: خطة تنفيذ مرحلية من 10 بنود مع معايير قبول لكل بند.

### 396ceca5 — test(pharmacy): align legacy dispatch and quote audit rules
- توحيد DispatchService القديم إلى ladder القياسي 3→5→8 كم بدلاً من 3→7→10→15.
- إضافة dispatch.service.spec.ts للاختبار على ladder.
- إضافة اختبار partial availability (عنصر متاح + عنصر غير متاح في عرض واحد).
- إضافة اختبار price override audit (سجل تدقيق لتعديل السعر على مستوى العرض).
- التحقق: 3 suites / 12 اختباراً ناجحة، typecheck PASS، nest build PASS.

### c1547384 — feat(patient): allow public-first app launch
- فتح Patient Mobile على التصفح العام بدل إجبار المستخدم على شاشة Welcome/Login عند الإقلاع.
- الحفاظ على جلسات المستخدم المسجل والضيف؛ حدود الجلسة تُفرض عند العمليات الحساسة.
- التحقق: typecheck PASS، 37 suites / 84 اختباراً ناجحاً.


### (جديد) — test(backend): chunked jest runner to fix full-suite OOM
- إضافة scripts/run-tests-chunked.mjs: تشغيل 106 suites في 5 دفعات منفصلة بذاكرة نظيفة لكل دفعة.
- تغيير npm test ليستخدم المشغّل المجزّأ بدل تشغيل Jest مباشرة (كان يفشل بـ JavaScript heap OOM).
- الحفاظ على test:boot وtest:enterprise كما هما.
- التحقق: 106/106 suites — 561/561 tests — PASS على 5/5 chunks (113 ثانية).


### (جديد) — docs: patient mobile screen/API matrix (243 routes)
- إضافة docs/patient-mobile-screen-matrix.md مولّداً آلياً من الكود.
- 243 ملف route: 200 شاشة حقيقية + 43 redirect alias تراثي.
- 214 مسار API فريد في Mobile؛ 204 منها لها controller مطابق في Backend؛ 10 بلا مطابق (تحتاج تحقق).
- مؤشر خطر: 181 شاشة بـ @ts-nocheck (خارج typecheck) و97 شاشة بلا API call — تُراجع في مرحلة parity.


### (جديد) — feat(backend): medical programs endpoints + remove fake fallback
- بناء وحدة `medical-programs` حقيقية: GET /medical/programs/active و POST /medical/programs/complete-session مع JwtAuthGuard + idempotency + تخزين Mongo (collection: medical_program_enrollments).
- إغلاق الفجوتين المثبتتين في المصفوفة (2/2).
- حذف FALLBACK_PROGRAMS الوهمية من شاشة `programs/active.tsx` — الحالة الفارغة الآن حقيقية بدل بيانات مصنوعة.
- التحقق: 3 اختبارات وحدة جديدة PASS + typecheck PASS.


### (جديد) — docs: no-API screen classification + Web↔Mobile parity matrix
- تصنيف 54 شاشة بلا API مباشر: 3 قانونية static، 4 تخزين محلي، 47 تحتاج مراجعة route-level.
- إضافة docs/patient-web-parity-matrix.md: 85 route ويب مقابل 200 شاشة موبايل؛ تغطية تقريبية 25%؛ 103 فجوة.


### (جديد) — chore(patient): remove remaining fabricated fallbacks (filters, map)
- حذف FALLBACK_CATEGORIES/FALLBACK_FORMS من `pharmacy/filters.tsx` — الفلاتر تأتي الآن من `/medicines/filters` فقط؛ عند الفشل تظهر قوائم فارغة لا خيارات مصنوعة.
- تحييد FALLBACK_PROVIDERS في `map/index.tsx` إلى قائمة فارغة — الخريطة لا تعرض مزودين وهميين قبل استجابة الخادم.
- privacy/terms تُركت: محتوى قانوني افتراضي (ليست بيانات وهمية) وتجلب سياسة الخادم أولاً.
- التحقق: Patient Mobile typecheck PASS + 37 suites / 84 tests PASS.


### (جديد) — docs: corrected manual web-parity audit (replaces 25% auto estimate)
- اكتُشف أن المطابقة الآلية أساءت القراءة: Web لديه فعلاً doctors/specialties/صفحة الطبيب بنموذج حجز/appointments/chat/diagnostics/medicines/cart/offers/home-care/nursing/insurance/family/health/maternity/mental-health/nutrition/community/loyalty/notifications/articles/ai.
- التدقيق اليدوي المصحح: الفجوات الحقيقية ≈ 13 مجموعة (video-call، صفحات حالات الحجز، تتبع العينات، عروض الصيدلية المرئية، wallet، support tickets، settings، medication reminders، family detail، returns).
- الأولوية التالية: صفحات حالات الحجز/الدفع ثم عروض الصيدلية — تكمل رحلات قائمة لا ميزات جديدة.


### (جديد) — docs: booking-status web gap closed by existing appointment detail page
- التحقق اليدوي أثبت أن `appointments/[appointmentId]` تغطي: حالة الحجز، ConsultationPaymentAction (PENDING+card)، قرار التأمين ورابطه، الإلغاء بسبب، إعادة الجدولة، وCallTokenLauncher لمكالمات الفيديو.
- booking API يفرض idempotency (16–128 حرفاً) و401/403/404 واضحة وproxy آمناً إلى `/care/appointments`.
- فجوة "صفحات حالات الحجز" مغلقة دون كود جديد — تُحذف من قائمة الفجوات (13 → 12).


### (جديد) — docs: second manual parity pass (13 → 8 real web gaps)
- الإغلاق اليدوي الثاني أثبت وجود: support، settings، reminders، returns، offers/negotiation، prescriptions، orders tracking، programs، reports، profile، wishlist، search، dashboard — كلها موجودة في Web فعلاً.
- الفجوات الحقيقية المتبقية = 8: video-call Web، انتظار broadcast الصيدلية + العروض التراكمية، book-sample + sample-tracking، wallet، family member detail، delivery address manager، follow-up، share-report.


### (جديد) — feat(patient-web): wallet page (gap 4 of 8)
- بناء `/[locale]/wallet`: رصيد حقيقي من `/wallet/balance` + حركات من `/wallet/transactions` عبر BFF proxy الآمن (idempotency + 401/refresh).
- إضافة مفاتيح i18n للمحفظة (ar/en).
- إغلاق فجوة wallet من قائمة الـ8 — المتبقي 7.


### (جديد) — feat(patient-web): livekit video-call room (gap 1 of 8)
- بناء `/[locale]/consultations/video-call?appointmentId=…`: جلب بيانات LiveKit المؤقتة server-side (لا تُعرض في HTML مشترك) ثم غرفة فيديو حقيقية.
- مكوّن `video-room-client.tsx`: اتصال LiveKit فعلي + كاميرا/مايك + مغادرة + حالات connecting/live/ended.
- إضافة livekit-client إلى dependencies.
- إغلاق فجوة video-call من قائمة الـ7 — المتبقي 6.

## نتائج التحقق التراكمية
| المكوّن | النتيجة |
|---|---|
| Patient Mobile typecheck | PASS |
| Patient Mobile tests | 37/37 suites — 84/84 tests |
| Backend typecheck (tsc --noEmit) | PASS |
| Backend FULL test suite | PASS — 106 suites / 561 tests / 5 chunks |
| Backend build (nest build) | PASS |
| Backend focused pharmacy tests | 3/3 suites — 12/12 tests |
| Provider App typecheck + tests | PASS — 12/12 tests |
| Admin typecheck + production build | PASS — 48 صفحة |

## ملاحظات مفتوحة (لم تُغلق)
- ~~Full Backend Jest suite يفشل بـ heap OOM~~ — تم الإصلاح: chunked runner، 561/561 PASS.
- فروع قديمة (106) غير مدمجة في main — تحتاج integration review.
- Patient Web parity و Provider onboarding — مراحل قادمة في الخطة.
