# منصة نبض — Phase 19: حكم الجاهزية النهائي المقيد بالأدلة

**تاريخ الحكم:** 2026-08-19
**المستودع والفرع الوحيدان:** `obaid08642-ops/new` — `manus/on-live-reconciliation`
**رأس الفرع المتحقق:** `821435a46fb60d01e1982f8165bb183a82fc045b`، مطابق للرأس البعيد وقت الفحص.
**أرشيف Backend الحالي:** `nabdah-backend.zip` — SHA-256 `0010b9f7c52cc8e0b75c769ff327b8b343b5943c43b36e8d90fbb303164ce9a1`.
**الحكم:** **NO-GO — لا نشر خادم، لا رفع متاجر، ولا تفعيل للعقود الحساسة.**

> هذا حكم جاهزية، لا حكم على جودة الجهد المصدرّي. اجتازت إصلاحات وطبقات اختبار مهمة، لكن الدليل المطلوب للإطلاق يشمل نشر المراجع وSandbox E2E والبنى الموقعة والأجهزة الحقيقية والقبول البشري؛ وهذه لا تزال غير مكتملة أو محجوبة. [1] [2] [3]

## ملخص القرار

| بوابة إلزامية | النتيجة | الأثر على الإطلاق |
|---|---|---|
| سلامة Git والأرشيف | PASS | الفرع الصحيح نظيف والرأس البعيد مطابق؛ archive SHA موثق |
| بوابات Backend المصدرية | PASS تقني | آخر بوابة كاملة: 67 suites / 389 tests؛ لا تثبت النشر أو E2E |
| بوابة Provider | PASS تقني | 30/30، وتشمل عقود الوصفة واللغات والـRTL/feedback |
| بوابة Patient | PASS تقني محدود | 22 suites / 56 tests وtypecheck؛ لا تثبت native runtime أو قبولاً بشرياً |
| Phase 16 Sandbox E2E | FIX/PARTIAL/BLOCKED | أدلة BOLA جزئية وإصلاحات مصدرية مهمة؛ لا matrix lifecycle كاملة على المرشح الجديد |
| Phase 17 signed/device | BLOCKED | لا APK/AAB/IPA موقعة أو device farm أو هاتفين حقيقيين |
| Phase 18 locale/accessibility | TECHNICAL PASS / HUMAN BLOCKED | catalog والاختبارات تمر؛ لا sign-off بشري أو اختبار native accessibility |
| الدفع/Moyasar | BLOCKED | لا تفعيل test-safe مفوض؛ يمنع lifecycle مالي أو refund حقيقي |
| legal/consent/SOS/location/AI/PHI | BLOCKED | تبقى العقود الحساسة fail-closed بانتظار اعتماد المالك/القانون/المنتج |

## ما أُثبت في هذه الجولة

ثبتت بعض حدود الملكية الحية بحسابات Sandbox فقط: Unified Booking وLab Booking وRadiology Booking أعادت owner access مقابل إخفاء foreign، كما أعاد مسار التمريض Doctor HTTP 403 وNursing HTTP 200 بعد إصلاح P0 المنشور. لا توسع هذه النتائج إلى ادعاء BOLA شامل لكل mutation أو report أو prescription. [2]

كما اكتشفت الجولة الحية عيوباً لم تكن البوابات المصدرية وحدها كافية لكشفها. كان إنشاء الاستشارة النقدية يحفظ موعداً `PENDING` ثم يعيد HTTP 403 بسبب actor داخلي غير مخول في auto-confirm؛ أصلح المصدر وأضيف regression، لكن الإصلاح لا يزال يحتاج نشر مراجع وإعادة اختبار حي. كذلك عرضت قائمة نتائج المختبر تقريراً مخبأ للمالك لا يمكن فتحه؛ أصلح fallback المملوك source-level مع اختبارات owner/foreign، ويحتاج إعادة اختبار حي. [4] [5]

يتضمن مرشح Backend الحالي أيضاً مسار الدواء اليدوي المقيد بالمراجعة، وربط الوصفة بموعد `IN_PROGRESS`، وطابور مراجعة الصيدلية، وتقوية BOLA للمسارات المعدِّلة، وإصلاح تطبيع Hospital Provider role. جميعها موثقة ومختبرة مصدرّياً، لكن لا يجوز نسبها للبيئة الحالية قبل أن يثبت المراجع نشر SHA المرشح نفسه. [6] [7]

## موانع GO غير القابلة للتجاوز

| الأولوية | المانع | المالك المطلوب | شرط الإغلاق |
|---|---|---|---|
| P0 | المرشح الحالي لم ينشر بموافقة مراجع | Reviewer/DevOps | backup/rollback وSHA منشور وreadiness/logs ثم smoke/BOLA حي |
| P0 | lifecycle/BOLA غير مكتملان للـPrescription/Pharmacy/Lab/Radiology/Nursing/Hospital/Admin | Reviewer/QA/Owners | fixtures Sandbox مملوكة قابلة للتنظيف مع before/after/cleanup لكل صف |
| P0 | لا signed native artifacts أو أجهزة حقيقية | Release/Apple/Android/QA | AAB/APK وIPA/TestFlight موقعة، device farm، Android+iOS evidence |
| P0 | Moyasar غير مفعل test-safe | Owner/Finance/DevOps | intent/webhook/idempotency/refund lifecycle Sandbox فقط |
| P0 | legal/product approvals غائبة لعقود حساسة | Owner/Legal/Product | موافقات مكتوبة وعقود server-authoritative واختبارات التشغيل |
| P1 | القبول البشري للغات والإتاحة غير مكتمل | Locale/Clinical/UX/Accessibility reviewers | sign-off ست لغات وشاشات حرجة وnative accessibility evidence |
| P1 | provider intake وAdmin RBAC محجوبان بغياب fixtures/2FA مفوض | Owner/QA/Admin reviewer | isolated fixtures وstep-up/OTP مفوض وسجل تدقيق |

## إجراءات الإغلاق بالترتيب

1. يراجع Reviewer/DevOps مرشح `nabdah-backend.zip` بالبصمة أعلاه، ويقدم backup/rollback وطلب نشر صريح. لا ينفذ agent النشر تلقائياً.
2. بعد إثبات SHA المنشور، تعاد اختبارات Sandbox للـcash auto-confirm، وHospital staff، وLab embedded report، ومسار الوصفة اليدوية وبديل الصيدلية، مع تسجيل الحالة قبل/بعد والتنظيف.
3. ينشأ أو يربط المالك fixtures معزولة للـpharmacy، lab، radiology، nursing، hospital، provider intake وAdmin RBAC؛ لا تستخدم بيانات أو دفعات حقيقية.
4. يوفر مالك الإصدار صلاحيات EAS/Android/Apple وجهازين أو farm؛ عندها فقط تنفذ Phase 17 native matrix.
5. يكمل مراجعون بشريون قبول AR/EN/UR/HI/BN/FIL، RTL/LTR، accessibility وUX على builds موقعة، ثم تعاد الاختبارات لأي إصلاح.
6. يعاد حكم Phase 19 من البداية بعد توافر الأدلة، ولا يتحول إلى GO بقبول جزئي أو شفهي.

## حدود التنفيذ والحوكمة

لم ينفذ أي نشر خادم أو دفع أو تغيير في حسابات غير Sandbox أو بيانات مرضى حقيقية. ظلت جميع commits على `manus/on-live-reconciliation`، ولم يدفع شيء إلى `main`. هذا التقرير لا يطلب أو يفترض تفويض نشر؛ هو يسجل فقط أن المرشح جاهز لمراجعة النشر، لا للإطلاق.

## References

[1]: `NABDAH_AGENT_TRANSITION_OPEN_WORK_AND_REMAINING_PHASES_20260819.md` "الخطة الحاكمة ومعايير Phases 16–19"
[2]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "مصفوفة Phase 16 والأدلة الحية والموانع"
[3]: `NABDAH_PHASE17_NATIVE_BUILD_AND_DEVICE_BLOCKERS_20260819.md` "موانع التوقيع والأجهزة"
[4]: `NABDAH_PHASE16_CONSULTATION_CASH_AUTOCONFIRM_P0_REMEDIATION_20260819.md` "P0 الاستشارة النقدية"
[5]: `NABDAH_PHASE16_LAB_EMBEDDED_REPORT_CONTRACT_REMEDIATION_20260819.md` "إصلاح الوصول للتقرير المخبأ"
[6]: `NABDAH_PHASE16_PRESCRIPTION_CONTRACT_AND_BOLA_REMEDIATION_20260819.md` "عقد الوصفة اليدوية وBOLA"
[7]: `NABDAH_PHASE16_HOSPITAL_PROVIDER_ROLE_REMEDIATION_20260819.md` "تطبيع Hospital Provider role"
[8]: `NABDAH_PHASE18_LOCALE_ACCESSIBILITY_TECHNICAL_ACCEPTANCE_20260819.md` "القبول التقني للغات والإتاحة"
