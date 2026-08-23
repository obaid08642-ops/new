# Phase 6 — المجالات المتقدمة والمحجوبة

## نطاق الفحص

تمت مراجعة ملفات Mobile وأفعالها للمجالات AI، الطوارئ/SOS، المجتمع، الولاء، الأمومة، الصحة النفسية، التغذية، الصوت، المحفظة، الأجهزة القابلة للارتداء، الدعم، المرتجعات والمراجعات، ثم مقارنتها بصفحات Web الحالية والعقود التي أمكن اختبارها دون جلسة.

## النتيجة العامة

توجد في Mobile شاشات كثيرة لا يقابلها Web route مستقل حالياً. بعضها قد يكون feature غير منشور بعقد backend، وبعضها حساس طبياً أو مالياً ولا يجوز تنفيذه اعتماداً على UI Mobile أو mock. لذلك صنفتها كـ`Blocked-on-contract` أو `Needs clinical/financial approval` بدلاً من إنشاء مسارات شكلية.

| المجال | حالة Web الحالية | القرار |
|---|---|---|
| AI diagnosis/triage/skin analysis/prescription translator | لا توجد صفحات Web مقابلة | محجوب حتى عقد AI، privacy/consent، auditability، وclinical safety |
| Emergency/SOS | لا توجد رحلة Web كاملة | محجوب حتى عقد طوارئ وتشغيل/حوكمة وموقع/اتصال آمن |
| Community posts/vote/comment | لا توجد صفحات Web | محجوب حتى moderation، abuse controls، ownership وmutation contracts |
| Loyalty/rewards | لا توجد صفحات Web | محجوب حتى ledger/reward contract مالي واضح |
| Maternity | لا توجد صفحات Web | محجوب حتى clinical state contract ومراجعة سلامة |
| Nutrition plans | لا توجد صفحات Web | محجوب حتى AI/clinical plan contract ومصادر البيانات |
| Wallet/transfers/cards | لا توجد صفحات Web | محجوب حتى payment/ledger/KYC وreconciliation contracts |
| Wearables/voice | لا توجد صفحات Web | محجوب حتى device/consent/realtime contracts |
| Support tickets | لا توجد صفحة Web كاملة | محجوب حتى ticket lifecycle وPII/attachment policy |
| Returns | لا توجد صفحة Web كاملة | route live محتمل، لكن يحتاج payload، evidence upload، refund policy وidempotency |
| Mental health | بعض صفحات القراءة موجودة | القراءة محمية؛ mutations والميزات العلاجية تحتاج safety review |
| Reviews/ratings | لا توجد رحلة Web مكتملة | محجوب حتى anti-abuse وownership/booking linkage |

## قواعد عدم التفعيل

لا تُعتبر شاشات Mobile التي تستعمل `apiFetch` دليلاً على أن العقد صالح للإنتاج؛ Mobile نفسه قد يحتوي guest fallback أو optimistic/local state. لا يُضاف route Web أو زر mutation حتى تثبت ضربة method/path الحية، DTO، authentication، ownership، rate limit، idempotency عند اللزوم، وسلوك الخطأ. الميزات الطبية الحساسة تحتاج أيضاً consent، provenance، human escalation، وعدم تقديم تشخيص مصطنع.

## بوابة الخروج

Phase 6 يمر كـ**risk classification PASS** عندما تُسجل كل feature المتقدمة في registry مع مالك العقد، الاعتمادية، مستوى الخطورة، وحالة التنفيذ. لا يمر كـfull parity؛ الإغلاق الفعلي ينتقل إلى Phase 7 بعد نشر العقود الحية واعتماد المتطلبات الطبية/المالية.

## الأدلة

- `phase6-advanced-gap-inventory.txt`
- `PHASE2_MOBILE_WEB_PARITY_MATRIX.tsv`
- ملفات فجوات Phase 2–5 في `audit-artifacts/`

## الحكم

**لا توجد بيانات production mock أُضيفت.**  
**لا توجد ادعاءات تنفيذ لميزات AI/financial/clinical غير متعاقدة.**  
**Full Mobile parity ما زال NO-GO حتى نشر العقود وإغلاق الرحلات ذات الصلة.**


## Live contract re-check for Phase 7

أعيد فحص عدد من المسارات المتقدمة دون جلسة. المسارات التي أعادت 401 موجودة ومحميّة، لكنها لا تُفعّل تلقائياً قبل DTO/ownership/replay/Sandbox. المسارات التي أعادت 404 لا يُبنى لها Web route.

| Method | Path | Status | قرار |
|---|---|---:|---|
| GET | `/community/posts` | 401 | عقد محمي يحتاج read slice وmoderation policy |
| GET | `/community/posts/{id}` | 401 | عقد محمي يحتاج owner/public classification |
| POST | `/community/posts` | 401 | mutation محتمل؛ يحتاج DTO/idempotency/moderation |
| POST | `/community/posts/{id}/vote` | 404 | لا يُعتمد؛ المسار غير منشور بهذا الشكل |
| POST | `/community/posts/{id}/comment` | 401 | mutation يحتاج abuse/ownership controls |
| GET | `/loyalty/rewards` | 401 | عقد محمي؛ يحتاج ledger/reward semantics |
| GET | `/wallet/balance` | 401 | عقد مالي محمي؛ يحتاج reconciliation وKYC policy |
| GET | `/wallet/transactions` | 401 | عقد مالي محمي؛ يحتاج pagination/audit |
| GET | `/maternity/dashboard` | 404 | لا يُبنى route حتى نشر العقد |
| GET | `/nutrition/plan` | 404 | لا يُبنى route حتى نشر العقد |
| POST | `/ai/triage` | 401 | عقد حساس؛ يحتاج consent/clinical safety/escalation |
| POST | `/mental-health/mood` | 401 | عقد صحي؛ يحتاج privacy and safety review |
| POST | `/pharmacy/returns` | 401 | عقد موجود؛ يحتاج payload/evidence/refund/idempotency |
| GET | `/support/tickets` | 401 | عقد محمي؛ يحتاج ticket lifecycle وPII policy |

الدليل الخام محفوظ في `phase7-live-advanced-probe.tsv`. النتيجة لا تعني أن كل 401 feature جاهزة؛ إنها تثبت فقط existence/protection للـmethod/path المختبر.
