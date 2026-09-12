# تحقق P8/P9/P10 (R20/R21-26/R54-56/R76 + باك لينك)
> فحص مباشر بالأدلة. الحالة: معظم البنية موجودة من عمل سابق (#146-148)؛ دورنا التحقق والتسجيل.

## R20 المواقع السعودية ✅ PASS
- `backend/src/modules/location/seeds/saudi-locations.data.ts`: 2157 مدخلاً بتسلسل country→region→city→district→sub_area + aliases + is_active (مثال: الوسطى→الرياض→الملقا/الياسمين/الصحافة). بلا اختلاق ظاهر.

## R21/R24 خرائط وSEO برمجي ✅ PARTIAL→قوي
- Sitemaps حية من الباكند (مؤكد wave-2a)؛ default-deny فهرسة؛ صفحات الكيانات حقيقية.

## R26 ديب لينك ✅ PARTIAL
- Universal/App Links configured (4 domains, autoVerify) + شمات التطبيق موجودة لكن محدودة التغطية (249 شاشة مقابل خريطة صغيرة) — توسيع الخريطة مجدول P10-تكميلي.
- Smart App Banners: تُعرض فقط عند وجود store IDs حقيقية (لا placeholdes) ✅ صادق.

## R54 hreflang ✅ PASS
- `app/[locale]/layout.tsx:33-37`: alternates لكل اللغات الست + x-default — مكتمل.

## R56 اكتشاف AI/MCP ✅ PARTIAL→قوي
- MCP يقرأ نفس مصدر الحقيقة + `.well-known` (ai-catalog/agent-card/mcp-server-card) معلن في metadata ✅.

## محرك الباك لينك ✅ PASS
- `provider-badge.controller.ts`: شارة embed بـ dofollow + بوابة حالة (suspended/pending → 404 per R19) + نصوص ar/en.
- Cite-This في articles + product pages (مؤكد wave-2a).

## JSON-LD الموضعي ✅ PASS
- صفحات الكيانات: JsonLd + howTo + speakable + locale-aware ✅.

## المتبقي (P10-تكميلي/P11)
- توسيع خريطة الدي لينك لتغطية الشاشات الحرجة + اختبارات E2E للروابط
- تحقق uzupełniający لأحجام sitemap بعد نمو الكيانات
