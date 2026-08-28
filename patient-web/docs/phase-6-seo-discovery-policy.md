# سياسة الاكتشاف العام — SEO / AEO / GEO

## القرار التشغيلي

تقتصر الفهرسة الحالية على صفحتي البداية العامتين العربية والإنجليزية. تحمل الصفحة الرئيسية `WebSite` و`MedicalOrganization` و`MedicalWebPage` بخصائص اسم ورابط ولغة فقط؛ لا تضع عنواناً أو رقماً أو اعتماداً أو مراجعة أو ادعاءً طبياً لم يثبت في البيانات العامة. تُنشأ الإشارات الأساسية في HTML الخادمي عبر App Router، مع canonical ذاتي، وبدائل `ar` و`en` و`x-default`.

| السطح | حالة الفهرسة | الضابط |
|---|---|---|
| `/ar` و`/en` | مسموح | canonical ذاتي وhreflang متبادل وبيانات منظمة مطابقة للنص المرئي |
| `/[locale]/medicine-catalog` | `noindex, nofollow` | API العام يعيد كتالوجاً مختلطاً؛ لا يصح وسمه `Drug` أو إدراجه في sitemap |
| `/[locale]/medicines/[medicineId]` | `noindex, nofollow` | لا توجد علامة خلفية موثوقة تؤكد أن كل عنصر دواء منشور |
| المسارات الخاصة وAPI | محجوبة من الزحف + `noindex` ورابط دخول | robots ليس حاجز خصوصية؛ الحماية الفعلية هي الجلسة الخادمية والتفويض |

## سبب الحجب المؤقت للكتالوج

تحقق API العام من `GET /medicines` أعاد عناصر دوائية وغير دوائية في المجموعة نفسها، مثل مستلزمات أطفال ونظارات ومنتجات عناية. لذلك يقتصر الوسم على `WebPage` العام، ولا يستخدم `Drug` أو `MedicalWebPage` أو sitemap للتفاصيل حتى يوفر Backend على الأقل `entity_type` أو `is_medicine` و`is_published` بعقد موثق. لا تحل طبقة SEO محل تصنيف الكيان الخلفي، ولا تعالج البيانات المختلطة بتخمين من الاسم.

## AEO وGEO دون ادعاء مضمون

تساعد البنية الخادمة الواضحة والبيانات المنظمة المطابقة للصفحة والبدائل اللغوية محركات البحث وأنظمة الإجابة على فهم المحتوى، لكنها **لا تضمن** ترتيباً أو ظهوراً أو توصية. لا ينشر الموقع مراجعات أو تقييمات أو شهادات مستخدمين مصطنعة، ولا يضيف علامات تشخيص أو جرعة أو توافر أو سعر غير ظاهر ومتحقق. عند إتاحة المحتوى الطبي المنشور لاحقاً، يجب أن يتضمن مصدره ومراجعة دقته وتاريخ آخر تحديثه، وأن يحمل JSON-LD مطابقاً تماماً للنص الظاهر لا أكثر.

## قواعد التنفيذ والتحقق

| القاعدة | التنفيذ | التحقق |
|---|---|---|
| لا تعتمد خصوصية المسار على robots | `noindex` للجمهور الخاص، وجلسة وتفويض للبيانات | اختبار HTTP لمسارات `401` وSSR بلا توكن |
| canonical مطلق وذاتي | `NEXT_PUBLIC_SITE_ORIGIN` مع fallback موحد | فحص HTML للـcanonical قبل النشر |
| hreflang متبادل | `ar` و`en` و`x-default` لكل صفحة عامة مؤهلة | اختبار metadata وURL Inspection بعد النشر |
| sitemap محدود | صفحة عامة مؤهلة فقط؛ لا URL خاص أو كتالوج مختلط | اختبار `app/seo.test.ts` وطلب `/sitemap.xml` |
| بيانات منظمة صادقة | JSON-LD يصف المحتوى الظاهر فقط | Rich Results Test وSchema Validator عند النشر |

> لا يكفي `robots.txt` لإخفاء صفحة من نتائج البحث؛ توضح Google أن الحجب الحقيقي يحتاج `noindex` أو حماية وصول، وأن URL المحجوب قد يظل قابلاً للظهور إذا وُجدت روابط إليه. [1]

> لا تضمن البيانات المنظمة ظهور ميزة في النتائج؛ ويجب أن تمثل المحتوى الرئيسي والظاهر للمستخدمين ولا تكون مضللة. [2]

## مراجع

[1]: https://developers.google.com/search/docs/crawling-indexing/robots/intro "Google Search Central — Introduction to robots.txt"
[2]: https://developers.google.com/search/docs/appearance/structured-data/sd-policies "Google Search Central — General structured data guidelines"
[3]: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls "Google Search Central — Canonical URLs"
[4]: https://developers.google.com/search/docs/specialty/international/localized-versions "Google Search Central — Localized versions and hreflang"
[5]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview "Google Search Central — Sitemaps overview"
[6]: https://schema.org/Drug "Schema.org — Drug"
[7]: https://schema.org/MedicalWebPage "Schema.org — MedicalWebPage"
