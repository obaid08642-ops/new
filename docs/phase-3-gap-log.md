# سجل الفجوات وقرارات التصحيح — Web App المريض

| المعرّف | المجال | الوصف المثبت | الأثر | قرار الويب | الأولوية | حالة الإغلاق |
|---|---|---|---|---|---|---|
| G-AUTH-001 | الجلسة | fallback guest محلي بعد فشل الاستعادة ورمز `guest_token` مصدرّي. | إخفاء غياب الهوية الحقيقية. | لا نقل؛ guest فقط إذا أعاد الخادم جلسة guest صريحة، وإلا offline/error. | حرجة | مفتوح |
| G-I18N-001 | اللغة | فرض RTL في الجذر بلا اعتماد على locale. | كسر LTR ومشكلات وصولية. | `dir/lang` لكل document/route + tests للغتين. | عالية | مفتوح |
| G-DATA-001 | الصيدلية | تصنيفات fallback وأسعار افتراضية صفرية في العرض. | بيانات كتالوج/مالية مضللة. | skeleton/empty/error فقط إلى أن تصل بيانات حقيقية. | حرجة | مفتوح |
| G-DATA-002 | التشخيص | catch يعيد `data: []` عند فشل APIs. | error يظهر كعدم وجود عناصر. | Error state مع retry/trace؛ empty فقط بعد 200 حقيقي. | عالية | مفتوح |
| G-FLOW-001 | التشخيص | فلاتر في الواجهة بينما backend يدعم query params حقيقية. | تناقض بحث ونتائج. | map params للخادم وقياس contract tests؛ المتبقي gap. | عالية | مفتوح |
| G-DATA-003 | الاستشارات | قائمة تأمين ثابتة وfallback معرف طبيب `d1`. | حجز/فلترة قد يضلل المستخدم. | شركات/فئات من API؛ لا default entity id. | حرجة | مفتوح |
| G-ERROR-001 | متعدد | 24 catch صامتة مرشحة في مصدر المريض. | فشل غير قابل للفهم أو التشخيص. | لا ينقل؛ error taxonomy + observability في الويب. | عالية | مفتوح |
| G-TYPE-001 | الجودة | 227 ملفاً بإلغاء/تخفيف typing. | خطر انزلاق عقد API. | strict TS + runtime schemas للحدود الخارجية. | عالية | مفتوح |
| G-API-001 | التكامل | لا يوجد ملف OpenAPI/عقود تسليم مستقل حتى الآن. | استنتاجات قد تختلف عن بيئة الإنتاج. | مقارنة controllers + ملف API + اختبار staging قبل connect. | حرجة | مفتوح |
| G-CORS-001 | النشر | الإنتاج يحتاج `ALLOWED_ORIGINS`; نمط credential/token للويب غير محسوم. | فشل login/refresh أو تعريض tokens. | تأكيد domain/auth mode/CORS قبل المرحلة 4. | حرجة | مفتوح |
| G-FILE-001 | الملفات | شكل upload وS3/signed URL ومحددات MIME لم تثبت بعد. | خطر base64/FU أو تسرب وثائق. | عقد رفع صريح، scan/status، signed read، اختبارات authorization. | حرجة | مفتوح |
| G-RTC-001 | لحظي | namespaces/room tokens لـSocket/LiveKit لم تثبت للويب. | زر اتصال غير وظيفي أو وصول غير مصرح. | feature gate إلى أن يثبت العقد وE2E. | عالية | مفتوح |
| G-NATIVE-001 | تكافؤ منصة | camera/push/background reminders/secure store/native maps ليست تكافؤاً مباشراً. | وهم دعم capability. | browser capability + graceful unavailable، أو backend gap موثق. | عالية | مفتوح |
| G-SEO-001 | الاكتشاف | frontend template SPA؛ الصفحات العامة تحتاج HTML قابل فهرسة وقيود صحية. | عدم تحقق SEO/AEO أو تسرب خاص. | SSR/route policy قبل نشر عام؛ private routes `noindex`. | حرجة | مفتوح |
| G-TEST-001 | بوابة الجودة | suite الخلفية الكاملة توقفت بضغط ذاكرة قبل summary. | لا اعتماد كامل للعقود بعد. | rerun shards في بيئة كافية قبل اعتماد full integration. | متوسطة | مفتوح |
| G-MOBILE-001 | تطبيق المريض | `app/orders/index.tsx` كان يستدعي `/care/appointments/mine` غير الموجود؛ العقد الفعلي هو `GET /care/appointments`. | قد تفشل بطاقة/قائمة مواعيد الطلبات. | صحح إلى ثابت route موثق مع Jest/typecheck؛ يبقى تحقق Sandbox. | عالية | مصحح؛ Sandbox مطلوب |
| G-MOBILE-002 | تطبيق المريض | `app/map/index.tsx` كان يستدعي `/user/insurance` غير الموجود؛ العقد الفعلي هو `GET /users/me/insurance`. | قد تفشل قراءة التأمين في الخريطة/التوجيه. | صحح إلى ثابت route موثق مع Jest/typecheck؛ يبقى تحقق Sandbox. | عالية | مصحح؛ Sandbox مطلوب |
| G-OAPI-001 | توثيق الخلفية | المواصفة بلا `servers` وبلا security global/operation annotations كافية للحماية. | لا يمكن توليد/مراجعة عميل آمن من OpenAPI وحدها. | توثيق base URLs وbearer requirements وإعادة تصدير المواصفة. | عالية | مفتوح |
| G-OAPI-002 | توثيق الخلفية | DTOs وresponses غير مكتملة لعمليات حساسة ظاهرة مثل login/refresh. | خطر اختلاف typed client عن API runtime. | استكمال schemas وأخطاء موحدة وcontract tests قبل client generation. | عالية | مفتوح |
| G-DATA-004 | بيانات الاكتشاف | واجهة التخصصات العامة الحية أعادت تخصصات، لكن العينة الظاهرة كانت بعدّ مزودين `0`. | قد تصبح قائمة الأطباء/التخصصات في الويب فارغة، ولا يجوز ملؤها محلياً. | تحقق من نشر/حالة provider catalog واحتساب counts في Sandbox/البيانات المعتمدة؛ ويب يعرض empty state صريحاً إلى ذلك الحين. | عالية | مفتوح |

> لا يغلق أي بند بتغيير مظهري. يلزم دليل source/API واختبار نجاح وفشل، مع تحديث المصفوفة والـTODO قبل إغلاقه.
