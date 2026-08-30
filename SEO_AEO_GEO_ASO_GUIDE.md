# الدليل التقني الشامل للمطورين: تحسين محركات البحث، الذكاء الاصطناعي، ومتاجر التطبيقات (SEO / AEO / GEO / ASO Architecture)

هذا الدليل موجه لمهندسي البرمجيات (Frontend & Mobile Developers) لتطبيق أعلى معايير الأداء والظهور في المركز الأول عبر محركات البحث، روبوتات الذكاء الاصطناعي التوليدي، ومتاجر التطبيقات.

---

## 1. محركات الذكاء الاصطناعي والبحث التوليدي (GEO & AEO - Generative Engine Optimization)

لجعل محركات الذكاء الاصطناعي (مثل ChatGPT Search, Google Gemini Live, Perplexity, Claude) تُرشح وتقتبس صيدليتك كأول إجابة ومصدر شراء موثوق:

### أ. مخطط البيانات المنظمة (JSON-LD MedicalDrug & Product Schema)
يجب تضمين كود Schema.org في كل صفحة منتج داخل وسم `<head>` في الويب:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      "@id": "https://nabd.app/ar/p/{{slug}}#product",
      "name": "{{name_ar}}",
      "alternateName": {{search_aliases_json}},
      "sku": "{{sku}}",
      "gtin13": "{{barcode}}",
      "image": ["{{image_1}}", "{{image_2}}"],
      "description": "{{description_ar}}",
      "category": "{{main_category}} > {{sub_category}} > {{sub_sub_category}}",
      "offers": {
        "@type": "Offer",
        "price": "{{price}}",
        "priceCurrency": "SAR",
        "availability": "https://schema.org/InStock",
        "url": "https://nabd.app/ar/p/{{slug}}"
      }
    },
    {
      "@type": "MedicalDrug",
      "@id": "https://nabd.app/ar/p/{{slug}}#drug",
      "name": "{{official_name_ar}}",
      "activeIngredient": "{{active_ingredient}}",
      "dosageForm": "{{dosage_form}}",
      "strengthUnit": "{{strength}}",
      "warning": {{warnings_precautions_json}},
      "proprietaryName": "{{name_ar}}"
    }
  ]
}
</script>
```

### ب. هيكلة صفحات الأسئلة الشائعة الطبية (FAQPage Schema)
كل صفحة دواء يجب أن تحتوي على قسم Q&A منسق بـ `FAQPage Schema` للإجابة المباشرة (Direct Snippets):
* **س:** ما هي استخدامات {{name_ar}}؟ ← **ج:** {{indications_uses}}
* **س:** ما هي الجرعة وطريقة الاستخدام؟ ← **ج:** {{dosage_instructions}}
* **س:** ما هي موانع الاستعمال والتحذيرات؟ ← **ج:** {{warnings_precautions}}

---

## 2. تحسين محركات البحث العادية (Technical & On-Page SEO)

### أ. بنية الروابط (URL Architecture)
* **رابط المنتج**: `https://nabd.app/{lang}/p/{slug}` (مثال: `https://nabd.app/ar/p/panadol-extra-500mg-24-tablets`).
* **صفحات الفئات العنقودية (Topic Clusters)**:
  * المستوى 1: `https://nabd.app/{lang}/c/{main_category_slug}`
  * المستوى 2: `https://nabd.app/{lang}/c/{main_category_slug}/{sub_category_slug}`
  * المستوى 3: `https://nabd.app/{lang}/c/{main_category_slug}/{sub_category_slug}/{sub_sub_category_slug}`

### ب. الروابط المتعددة اللغات (Hreflang Tags)
لجميع اللغات الست في كل صفحة:
```html
<link rel="alternate" hreflang="ar" href="https://nabd.app/ar/p/{{slug_ar}}" />
<link rel="alternate" hreflang="en" href="https://nabd.app/en/p/{{slug_en}}" />
<link rel="alternate" hreflang="ur" href="https://nabd.app/ur/p/{{slug_ur}}" />
<link rel="alternate" hreflang="hi" href="https://nabd.app/hi/p/{{slug_hi}}" />
<link rel="alternate" hreflang="bn" href="https://nabd.app/bn/p/{{slug_bn}}" />
<link rel="alternate" hreflang="fil" href="https://nabd.app/fil/p/{{slug_fil}}" />
<link rel="alternate" hreflang="x-default" href="https://nabd.app/ar/p/{{slug_ar}}" />
```

### ج. سرعة الأداء ومؤشرات الويب الأساسية (Core Web Vitals)
* **LCP (Largest Contentful Paint)**: أقل من 1.2 ثانية عبر تحميل صور المنتجات بصيغة `WebP/AVIF` مع وضع خاصية `priority` أو `fetchpriority="high"` للصورة الرئيسية.
* **INP (Interaction to Next Paint)**: أقل من 50ms عبر تجنب معالجة JavaScript الثقيلة في مسار العرض الرئيسي.
* **SSR / SSG**: استخدام Server-Side Rendering مع Incremental Static Regeneration (ISR) في Next.js / Remix.

---

## 3. محرك البحث اللحظي الفوري داخل التطبيق والويب (In-App Search Architecture)

لتحقيق سرعة بحث أقل من 10ms واقتراحات ذكية لحظية (Search-as-you-type):

### أ. إعدادات الفهرسة في Typesense / Meilisearch / Algolia:
* **حقول البحث ذات الأولوية العالية (Searchable Fields with Weights)**:
  1. `name` (Weight: 10)
  2. `search_aliases` (Weight: 9) — *يحتوي على الاسم باللغة الأخرى والمادة الفعالة والاستخدام الأساسي*
  3. `active_ingredient` (Weight: 8)
  4. `barcode` & `sku` (Weight: 8)
  5. `brand` (Weight: 7)
  6. `sub_sub_category` (Weight: 5)
* **معالجة التسامح مع الأخطاء الإملائية (Typo Tolerance)**:
  * تفعيل التسامح مع خطأ حرف واحد للكلمات المكونة من 4-7 أحرف، وحرفين لما زاد عن 8 أحرف.
  * دعم توحيد الألف والياء في العربية (`أ/إ/ا → ا` و `ى/ي → ي` و `ة/ه → ه`).

---

## 4. تحسين متجر التطبيقات (ASO - App Store Optimization)

### أ. الفهرسة العميقة داخل النظام (CoreSpotlight & App Indexing)
* **على نظام iOS**: تفعيل `CoreSpotlight` و `NSUserActivity` لكل منتج يفتحه المستخدم، بحيث إذا بحث المستخدم في شاشة الآيفون الرئيسية (Spotlight Search) عن اسم الدواء أو المادة الفعالة، يظهر تطبيقك في النتيجة الأولى ويفتح صفحة الدواء مباشرة.
* **على نظام Android**: تفعيل `Android App Links` و `Google App Indexing`.

### ب. الكلمات المفتاحية في متجر التطبيقات:
* **عنوان التطبيق (App Title)**: `نبض | صيدلية أونلاين وتوصيل دواء` / `Nabd | Online Pharmacy & Medicine Delivery`
* **العنوان الفرعي (Subtitle)**: `أدوية، فيتامينات، مكملات، عناية وتجميل`
* **حقل الكلمات المفتاحية (Keyword Field 100 char)**: `صيدلية,دواء,بنادول,فيتامينات,عناية,بشرة,مكياج,أجهزة طبية,مكملات,pharmacy,medicine,vitamins`

---

## 5. بروتوكول الشراء عبر وكلاء الذكاء الاصطناعي (AI Commerce & Agentic Protocol)

لتمكين المساعدين الأذكياء (مثل Google Assistant / Siri / AI Shopping Agents) من تنفيذ عمليات الشراء مباشرة:
1. **توفير Open API Endpoint**:
   `GET /api/v1/products/search?q={query}`
   `GET /api/v1/products/{sku}`
2. **ملف `llms.txt`**: إنشاء ملف `https://nabd.app/llms.txt` لتعريف وكلاء الذكاء الاصطناعي بهيكلية الموقع وطريقة البحث عن الأصناف والأسعار المتاحة.
