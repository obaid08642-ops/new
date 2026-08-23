# تقرير جاهزية الإطلاق — Nabd Plus Patient Web

## النطاق

هذا التقرير يلخص التنفيذ الفعلي على الفرع `agent/web-complete-v2-20260822` بعد تشغيل الشرائح المتاحة بعقود حقيقية، مراجعة Mobile defects، اختبارات security، SEO، وcontract journeys. لا يمثل التقرير اعتماداً للنشر ولا يستبدل إثبات staging أو Sandbox.

## ما تم إغلاقه

| المجال | الحالة | الدليل |
|---|---|---|
| Baseline وbranch discipline | مكتمل محلياً ومدفوع | Phase 1 baseline report |
| Auth/OTP وsession boundaries | مطبق ومختبر | httpOnly exchange cookie، bounded errors، منع token body، Auth tests |
| Consultation mutations | مطبق ومختبر محلياً | book/cancel/reschedule/call-token/payment-intent، idempotency وbounded errors |
| Pharmacy/Orders | مطبق ومختبر محلياً | cart lines، server-authoritative checkout، reorder/cancel |
| Radiology | list/detail read surfaces مثبتة | live proof لـ`_id`، 200 للموجود و404 لغير الموجود |
| Nursing read surface | GET-only | allowlist وparser وserver wrapper |
| Mobile defect guards | مطبق | لا guest token أو offline session أو analytics/realtime stub في Web runtime |
| Design/motion baseline | guarded | tokens، focus-visible، reduced-motion، page transitions |
| Production dependency tree | لا high/critical في production audit | low advisory واحدة فقط؛ dev advisories ما زالت موثقة |
| SEO/public discovery | جزئي مكتمل | home وarticle listings في sitemap، metadata وhreflang، llms.txt |

## البوابات الخضراء

البوابة الأخيرة أثبتت **138 ملف اختبار ناجحاً و277 اختباراً ناجحاً مع 23 متخطياً**، وTypeScript ناجح، وNext production build ناجح. آخر رأس بعيد مطابق للرأس المحلي هو:

```text
LOCAL_HEAD=6a4c0ef2cbadcc3165c40ec4d49769a430f0a672
REMOTE_HEAD=6a4c0ef2cbadcc3165c40ec4d49769a430f0a672
```

## Blockers تمنع إعلان 100% أو GO غير مشروط

1. لم تُنفذ Sandbox owner/stranger/unauth/replay في هذه الجولة لأن `NABD_API_BASE_URL` وحسابات Sandbox المعتمدة غير موجودة في البيئة. لذلك لم يُثبت إنشاء حجز أو طلب حقيقي ثم إلغاؤه، ولم تُثبت مسارات الملكية والـreplay خارج mocks.
2. Docker غير متاح في sandbox، ولذلك لم يُنفذ Docker build/start/healthcheck أو standalone runtime check. يلزم تنفيذها على CI أو host النشر.
3. لا توجد GitHub workflow في checkout الحالي؛ CI/CD وSBOM وcontainer scan وrollback وobservability production تحتاج إعداداً وتشغيلاً على بيئة النشر.
4. تفاصيل Article body مخفية في Web، لذلك بقيت Article Detail noindex ولم يُضف JSON-LD يوحي بمحتوى غير ظاهر.
5. IndexNow lifecycle غير موجود: لا يوجد key/config أو event hook server-side، لذلك بقي deferred ولم يُرسل ping مصطنع.
6. Nursing UI، Home-care booking/tracking الكامل، بعض mutations الصحية المتقدمة، Nutrition hub، Loyalty summary، وميزات realtime/analytics المتقدمة لا تُعلن Done بلا DTO وعقد/fixture فعلي.
7. visual regression الحقيقي عبر browsers واللغات الست، accessibility audit آلي، load testing، وstaging-to-production proof لم تُنفذ من هذا sandbox.
8. `pnpm audit` العام ما زال يعرض advisories لأدوات dev/transitive، رغم أن production-only audit لا يعرض high/critical. يجب إغلاق toolchain policy في CI قبل GO النهائي.

## الحكم

> **NO-GO للإطلاق الإنتاجي الكامل حالياً، مع تقدم Code-Ready مشروط.**

الكود والاختبارات المحلية والـbuild في حالة جيدة، لكن لا يمكن وصف المشروع بأنه جاهز 100% للاستخدام العام قبل إغلاق Sandbox/staging، Docker runtime، CI/SBOM، الاختبارات البصرية والإتاحة، وإكمال أو اعتماد قائمة الميزات المحجوبة. لا توجد بيانات runtime وهمية مضافة في هذه الدفعة؛ الميزات غير المثبتة بقيت Blocked/Deferred بدلاً من fallback أو fake success.

## شروط التحويل إلى GO

يلزم تنفيذ Sandbox الرسمي بالحسابات المعتمدة فقط مع cleanup، إثبات owner/stranger/unauth وidempotency replay، تشغيل Docker build/start وhealthcheck، إضافة CI وSBOM وscan وrollback، إكمال visual/accessibility/performance gates، ثم إعادة تشغيل full regression وbuild وتوثيق الرأس البعيد النهائي. بعد ذلك فقط يمكن إصدار قرار GO مستقل ومحدود النطاق.
