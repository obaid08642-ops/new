# مرجع نظام التصميم Premium — نبض بلس

## مرجع Apple الرسمي

يعتمد التوجيه البصري على **استلهام مبادئ** Apple Human Interface Guidelines، لا على نسخ الهوية التجارية أو أصول Apple. يحدد HIG مجالات التصميم التأسيسية، ومنها إمكانية الوصول والأيقونات واللون والتخطيط والمواد والطباعة.[1]

| قرار نبض بلس | التطبيق المقترح | الأساس المرجعي |
|---|---|---|
| أيقونات الواجهة | أيقونات Vector أحادية المفهوم، متسقة في السمك والمنظور والحجم البصري، مع `aria-label` عندما لا يكفي النص. | توصي Apple بأيقونات بسيطة ومعروفة ومتسقة في الوزن والتفصيل، وبصيغة Vector مثل SVG للأصول المخصصة.[2] |
| المادة والعمق | سطح محتوى أبيض أو شبه شفاف للبطاقات، واستخدام glass محدود فقط للتنقل أو الضوابط الأعلى أولوية؛ لا glass كثيف داخل كل بطاقة. | تميز Apple بين مادة التحكم والتنقل وطبقة المحتوى، وتحذر من الإفراط في glass في طبقة المحتوى.[3] |
| الحركة | انتقالات opacity وtransform قصيرة وهادفة، مع `prefers-reduced-motion`، وعدم إبطاء الإجراءات المتكررة. | توصي Apple بأن تكون الحركة هادفة وقصيرة وغير مهيمنة، وأن تكون اختيارية أو قابلة للتقليل.[4] |
| الوصول | تباين قابل للقراءة، حلقة focus واضحة، حجم لمس مناسب، ونص لا يعتمد على اللون وحده. | تضع Apple إمكانية الوصول ضمن أساسيات التصميم.[1] |

## حدود العلامة

لا تستخدم الواجهة شعار Apple أو SF Symbols أو أجهزة Apple مقلدة. تستخدم نبض بلس لغة بصرية مستقلة: **تركواز طبي هادئ، أزرق معلوماتي، كهرماني للتنبيه، رمادي دافئ للطبقات، وخط Cairo**، مع أيقونات Lucide Vector المتاحة في المشروع ومكتبة أصول مخصصة عند الحاجة.

## SEO وAEO وGEO — قرارات الاكتشاف الآمن

تؤكد إرشادات Google أن أسس SEO نفسها هي الأساس للظهور في تجارب البحث التوليدية؛ لا توجد صيغة «AEO/GEO» خاصة أو ضمان ظهور أو ترتيب.[5] [6] لذلك تركز نبض بلس على الصفحات العامة المؤهلة فقط: محتوى أصلي مفيد ومراجع، HTML قابل للزحف، تجربة جهاز ممتازة، روابط داخلية واضحة، وبيانات منظمة تطابق النص المرئي.[5] [6]

| القرار | التطبيق في نبض بلس | الحد الأمني |
|---|---|---|
| البيانات المنظمة | JSON-LD دقيق ومحدود للصفحة الرئيسية والكيانات العامة بعد تثبيت عقد النشر، مع اختبار يطابق البيانات النص المرئي. | لا JSON-LD لصفحات المريض أو بيانات الفحص أو مسارات خاصة؛ لا `Drug` لكتالوج مختلط. |
| المحتوى | أدلة عامة أصلية يراجعها مختصو المنتج/الطب عند توفر مصدر موثوق، بعناوين واضحة ولغة محلية كاملة. | لا محتوى علاجي مولد بكميات، ولا توصيات أو نتائج تشخيصية أو ادعاءات مبالغ فيها. |
| تعدد اللغات | تتبادل النسخ الست كل روابط `hreflang` بما فيها النسخة نفسها، مع `x-default` للغة غير المدعومة. | لا يعلن مسار خاص بديلاً لغوياً أو عاماً، ولا يخلط نسخة template مترجمة مع محتوى طبي غير مترجم. |
| التحكم في المعاينة | تظل المسارات الخاصة `noindex` و`nosnippet` عند الحاجة؛ وتبقى تفاصيل الكتالوج المختلط `noindex` حتى عقد النشر والتصنيف. | لا تستخدم SEO أو AEO لتجاوز خصوصية الجلسة أو إتاحة محتوى مريض للزواحف. |
| القياس | يربط Search Console وقياس تجربة الصفحة والتحويلات بعد النشر؛ تُعامل التقارير كمؤشرات لا كوعود ترتيب. | لا تستخدم أدوات تدّعي الوصول إلى أنظمة ترتيب داخلية أو تشتري إشارات/إشارات ذكر غير أصيلة. |

> يجب أن تصف البيانات المنظمة المحتوى الظاهر في الصفحة نفسها؛ لا تُنشأ صفحة فارغة للـJSON-LD ولا يوصف محتوى غير مرئي للمستخدم.[7]

## المراجع

[1] [Apple Human Interface Guidelines — Design](https://developer.apple.com/design/human-interface-guidelines)

[2] [Apple Human Interface Guidelines — Icons](https://developer.apple.com/design/human-interface-guidelines/icons)

[3] [Apple Human Interface Guidelines — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

[4] [Apple Human Interface Guidelines — Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

[5] [Google Search Central — Optimizing your website for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

[6] [Google Search Central — AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)

[7] [Google Search Central — Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

[8] [Google Search Central — Tell Google about localized versions of your page](https://developers.google.com/search/docs/specialty/international/localized-versions)
