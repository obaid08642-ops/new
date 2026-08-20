# منصة نبض — تحديث Phase 19 بعد إعادة الاختبار والإصلاحات

**التاريخ:** 2026-08-20
**الفرع الوحيد:** `manus/on-live-reconciliation`
**رأس Git وقت التوثيق:** `a2774c4e03ed1af29712e8a0e929f73b2fa3cf3d`
**الحكم:** **NO-GO مستمر، مع تقدم مصدرّي وحي مثبت.**

## ما أُغلق أو أُثبت الآن

| المجال | النتيجة |
|---|---|
| cash auto-confirm للاستشارة | PASS حي: 201 و`CONFIRMED`، BOLA owner 200/foreign 403، ثم cancel 200 |
| تقرير المختبر المخبأ | PASS حي: owner 200 وforeign 404 |
| Hospital RBAC boundary | PASS جزئي: Doctor 403؛ Hospital لم يعد 403 لكنه أعاد 404 لغياب facility fixture |
| P0 هوية Doctor والوصفة | FIX source: موعد وصل إلى start حياً، وكشف 404 لإنشاء الوصفة؛ الإصلاح اجتاز 67 suites/390 tests ثم أدرج في archive |
| Provider self-profile | FIX source: عيب 200 body فارغ كشف حياً؛ الإصلاح اجتاز 68 suites/393 tests ثم أدرج في archive |
| Provider EAS config | FIX source: أضيف profiles متوازية وProvider 30/30 PASS؛ لا build أو signing مدعى |
| تحصين الكتالوج العام | FIX source: eligibility/review/provenance fail-closed، projection/event idempotent، وترشيح public/SEO/services؛ Backend 70 suites/401 tests ثم توسعت البوابة إلى 72/406 |
| اللغات والفهارس | FIX source: ست لغات مؤكدة وvalidator للنشر العام؛ أزيل تعريف LabResult المكرر فقط، ولا حذف physical index؛ Backend 72 suites/406 tests + build |

## ما يستطيع الوكيل إكماله فوراً

يستطيع الوكيل إعادة اختبارات Sandbox فور نشر archive المراجع، وتشغيل دورة الوصفة اليدوية حتى archive/complete، اختبار BOLA السلبي، ثم فحص وإصلاح أي عيب مصدرّي يظهر. كما يستطيع متابعة دورات الحياة لكل مجال متى وفرت حسابات Sandbox fixtures مملوكة قابلة للتنظيف، وتحليل build/device logs عند توفير artifacts أو صلاحية EAS، ودمج ملاحظات مراجعي اللغات والإتاحة وإعادة البوابات.

## ما يتطلب المالك أو المراجع ولا يمكن تجاوزُه

| المانع | الحد الفاصل |
|---|---|
| نشر المرشح الحالي | يملك Reviewer/DevOps وحده تفويض backup/rollback وdeploy؛ لا ينفذ الوكيل النشر |
| مفاتيح/حسابات Android وApple/EAS | لا يجوز إنشاء signing أو IPA/AAB production من دون ملكيتها الرسمية |
| الأجهزة وdevice farm | لا بد من وصول فعلي أو artifacts/logs موثقة لاختبار native runtime |
| قبول لغوي/سريري/قانوني | لا يحل محل المراجع البشري أو legal/product sign-off اختبار آلي |
| Moyasar والعقود الحساسة | يلزم activation test-safe وموافقة مكتوبة قبل أي payment/consent/location/SOS/AI/PHI test |
| Admin 2FA وprovider intake fixtures | يلزم step-up/OTP مفوض وfixtures معزولة لاستخدامها وتنظيفها |

## المرشح التالي المطلوب نشره

| artifact | SHA-256 | نطاقه |
|---|---|---|
| `nabdah-backend.zip` | `c6cd33a0fce83147f9de8b16836767c01d7132425a0a46eeef60c5df3dc17f6f` | المرشح التراكمي: إصلاحات P0 السابقة، عقود OpenAPI، حوكمة الكتالوج/public projection، واللغات/فهرس LabResult؛ لم يُنشر |
| `nabdah-provider.zip` | `d81fbd14c1d9daedee18fd17679898b1f6ef06dd4c67810206fe14ee502b70e5` | `eas.json` محايد لتطبيق Provider؛ لا signing أو submit |

## الشرط المباشر لخفض NO-GO

ينخفض NO-GO فقط عندما ينشر المراجع Backend archive أعلاه مع rollback وSHA مثبت، ثم تنجح دورة الوصفة اليدوية وحوكمة الكتالوج حياً بحسابات Sandbox، وتتوفر أدلة native signed/device والقبول البشري والموافقات الخارجية. حتى ذلك الحين، جميع الإصلاحات الجديدة **مرشح مراجعة، وليست دليلاً على إنتاج جاهز**.

## References

[1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "نتائج Phase 16 الحية"
[2]: `NABDAH_PHASE16_PRESCRIPTION_DOCTOR_IDENTITY_P0_REMEDIATION_20260820.md` "P0 الوصفة"
[3]: `NABDAH_PHASE16_PROVIDER_SELF_PROFILE_IDENTITY_REMEDIATION_20260820.md` "ملف المزود"
[4]: `NABDAH_PHASE17_NATIVE_BUILD_AND_DEVICE_BLOCKERS_20260819.md` "البنى والأجهزة"
[5]: `NABDAH_OWNER_REVIEWER_NEXT_ACTIONS_20260820.md` "حزمة التنفيذ للمالك والمراجع"
