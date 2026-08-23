# Phase 10 — SEO/GEO/AEO/ASO والاكتشاف

## ما هو مطبق

يوجد `robots.txt` ديناميكي، `sitemap.xml`، `manifest.webmanifest`، و`llms.txt` يحدد حدود المحتوى العام ويمنع اعتبار سجلات المريض عامة. توجد بعض metadata وcanonical/alternate locale وJSON-LD في الصفحات العامة.

## التصحيح المنفذ

أضيفت صفحة Wishlist إلى private route families في robots، حتى لا يكتشفها محرك بحث أو يعاملها كمحتوى عام. بقي sitemap محافظاً ويضم نقاط الدخول العامة فقط، لأن نشر كتالوج طبي أو صفحات تفاصيل دوائية يحتاج contract يثبت `is_published` وتصنيف المحتوى وحدود الفهرسة.

## الفجوات المتبقية

يلزم قبل GO النهائي تحديد public/private classification لكل route، إضافة metadata مترجمة لكل public page، canonical/hreflang صحيح، JSON-LD مناسب فقط للمحتوى المنشور، sitemap ديناميكي للمقالات/الكتالوج المنشور، صفحات 404/410 واضحة، تحسين Core Web Vitals، وقياس structured answers دون تقديم تشخيص أو نصيحة طبية آلية. ASO يخص تطبيق Mobile أكثر من Web، ويجب توحيد الاسم والوصف والكلمات المفتاحية مع الهوية المعتمدة دون claims طبية غير مثبتة.

## القرار

**SEO security baseline: PASS.**  
**Discovery/SEO production closure: OPEN** حتى اعتماد classification للمحتوى العام واختبار كل locale والـcanonical والـstructured data.
