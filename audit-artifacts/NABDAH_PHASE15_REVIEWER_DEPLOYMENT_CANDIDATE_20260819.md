# منصة نبض — Phase 15: مرشح مراجعة ونشر مقيد

**المستودع والفرع:** `obaid08642-ops/new` — `manus/on-live-reconciliation`  
**Commit المرشح:** `3068a92ee421353379161210c255ce6e9ec7cab3`  
**الحكم الحالي:** **NO-GO / REVIEW-ONLY**. هذه الحزمة لا تتضمن نشرًا ولا تعتبر موافقة ضمنية على أي بيئة.

## مصدر المرشح والتغييرات

| الالتزام | النطاق |
|---|---|
| `9fdd99921023547080358858223f577c663a1b66` | احتواء الحقائق السريرية المحلية وتقوية عقد الوصفة بعلاقة موعد–طبيب–مريض وكتالوج دوائي معتمد. |
| `7483dddc849cc736c42c7fae01568333b7766812` | جرد Phase 13 لمسارات Backend ومستهلكات API وأفعال الواجهة مع تصنيف مصدر كل مرشح. |
| `3068a92ee421353379161210c255ce6e9ec7cab3` | إصلاح/احتواء عقود Provider القانونية والتمريضية والدردشة وانتهاء الصلاحية وملاحظات SOAP. |

> يقتصر الفرق على أدلة التدقيق وسجل `todo.md` وأرشيف Provider/Backend الحاكمين. لا يتضمن secrets أو JWT أو OTP أو بيانات مرضى أو تقارير صحية أو نشرًا إلى الخادم.

## بصمات الأرشيفات المرشحة

| الأرشيف | SHA-256 | سلامة ZIP |
|---|---|---|
| `nabdah-backend.zip` | `8c0d63fb0a74d530580b5841cd6c29dde6df2a2a9c2610588c1f802db69f991e` | PASS |
| `NabdProvider-provider.zip` | `a89fe6379ad2587a8eeff75c1e0a08368fefc3cbe6c935750996c2bc35188c40` | PASS |
| `nabd_plus_patient_app.zip` | `c58ecfd1140c304b9ffe392b0fd72f638a21ce3993252e40283041f68e80c643` | PASS |
| `web_admin_dashboard.zip` | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | PASS |

لا تحتوي الأرشيفات المعاد بناؤها على `node_modules` أو مخرجات `dist` أو `coverage` أو `.expo`.

## بوابات نظيفة

| المكوّن | التثبيت من القفل | الاختبار | البناء | تدقيق production dependencies | الحالة |
|---|---|---|---|---|---|
| Backend | PASS: `npm ci --ignore-scripts` | PASS: 67 suites / 377 tests | PASS: `nest build` | 28 moderate / 0 high / 0 critical | PASS مع تحذيرات fixtures/config فقط |
| Provider | PASS: `npm ci --ignore-scripts` | PASS: 30 tests | PASS: `tsc --noEmit` وExpo web export | 8 moderate / 16 high / 0 critical | PASS source gate؛ dependency blocker مفتوح |
| Patient | PASS: `npm ci --ignore-scripts` | PASS: 22 suites / 56 tests | PASS: Expo web export | 9 moderate / 10 high / 0 critical | PASS source gate؛ dependency blocker مفتوح |
| Admin | PASS: `npm ci --ignore-scripts` | لا suite معرفة | PASS: Next production build | 0 production vulnerabilities | **BLOCKED**: `npm run lint` يفشل بـ230 errors و34 warnings |

تحذيرات الاختبارات المعلنة، ومنها S3 غير المهيأ في fixtures وMoyasar webhook secret غير مضبوط، لا تعد نجاحًا تشغيليًا. واجهاتها تبقى fail-closed ولا يطلب هذا المرشح إعداد أي secret هنا.

## فحص migration/index

يعرض `NABDAH_PHASE15_MIGRATION_INDEX_PREFLIGHT_20260819.md` 301 مؤشر فهرسة مصدرية، ولا يرصد migration directory أو script تقليديًا. وظهر في الاختبارات تحذير Mongoose لفهارس مكررة؛ لا يجوز تعديل schema أو بناء index في الإنتاج من هذا الفحص. يلزم preflight مصرح به على Sandbox/backup قبل أي migration، ومقارنة `getIndexes()`، وقياس query plan، ونسخة backup قابلة للاستعادة.

## خطة rollback وpost-deploy المقترحة للمراجع

| المرحلة | الإجراء المقيد |
|---|---|
| قبل النشر | تحقق من commit وSHA، تأكيد backup قابل للاستعادة، وتأكيد config/secret references دون كشف القيم في Git أو الأدلة. |
| النشر | يقتصر على بيئة Sandbox يحددها المراجع، مع نشر artifact محدد لا `main` ولا commit بديل. |
| smoke read-only | health/liveness/readiness وauth-boundary ووسائط Media route فقط، بلا بيانات مرضى أو دفع أو إنشاء سجلات. |
| BOLA/E2E | حسابات Sandbox منفصلة للمريض/المزود/الصيدلية/الإدارة، وIDs مولدة للاختبار، مع تسجيل status/IDs/state/cleanup دون PII. |
| rollback | أوقف المرشح، أعد artifact السابق المحدد، وتحقق من health ثم من عدم تطبيق migration/index غير قابل للعكس. |
| قرار لاحق | يوقع المراجع PASS/FIX/BLOCKED لكل lifecycle؛ عدم الرد ليس موافقة. |

## طلبات الاعتماد المحجوبة

| الطرف المطلوب | المطلوب قبل الانتقال إلى Phase 16–19 |
|---|---|
| Reviewer/DevOps | اختيار Sandbox، تحديد commit/artifact، تأكيد backup/rollback، والسماح المنفصل بالنشر المرجعي. |
| Owner/Product/Legal | اعتماد Moyasar، النصوص والعقود القانونية، SOS/QR/consent/location، وسياسة AI/PHI. |
| أصحاب الحسابات | حسابات Sandbox وأدوار BOLA ومفاتيح test غير حساسة عبر قناة آمنة، لا عبر Git. |
| Mobile/Store | EAS/Apple/Android signing وdevice-farm/phone access؛ لا يمكن استبدال ذلك بـweb export. |

## قرار Phase 15

الحزمة مكتملة كمُرشح مراجعة قابل للتتبع وبخطة rollback، لكن لا تصبح قابلة للنشر قبل **موافقة مراجع صريحة**. يظل NO-GO بسبب lint الإدارة، dependency audits، غياب preflight قاعدة البيانات الحي، وغياب E2E Sandbox وبنى موقعة وقبول لغات واعتمادات المالك.
