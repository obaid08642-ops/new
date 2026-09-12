# مصفوفة الفجوات R1–R82 (P2 — نهائية للاعتماد)
> الحكم: PASS/PARTIAL/FAIL/MISSING/MOCK/BLOCKED. الدليل: file:line. الأولوية: P0–P3.

| R | الموضوع | الحكم | الدليل المختصر | P |
|---|---|---|---|---|
| R1 | نظام واحد | PARTIAL | BFF نحيف ✅ + tRPC بلا منطق ✅ BUT باكند ثانٍ مهجور `backend/infra/fastapi/` + بقايا MySQL ميتة + محفظة مكررة ×5 في المزوّد + `compat/admin-spa` إلهية | P1 |
| R2 | لا وهمية | PARTIAL | لا محتوى مزيف نشط ✅ BUT 12 عنصراً نشطاً (GPS تمريض، خريطة mock، VAT عميل، مواعيد ثابتة...) | P0 |
| R3 | تكافؤ ويب/موبايل | PARTIAL | ويب 270 صفحة/موبايل 249 شاشة؛ تباينات موثقة (دفع ويب معطل، عقد فيديو ضيق، مواعيد ثابتة) — مصفوفة التكافؤ الكاملة في P6 | P1 |
| R4 | النطاق | PASS | كل الدومينات موجودة بموديولات وشاشات حقيقية | — |
| R5 | كتالوج 21k | PARTIAL | endpoints + بدائل + باركود + i18n ✅؛ `requires_prescription` موجود (default false) ✅؛ العدد 21k والـ 30 حقلاً والقابلية للتوسع تُتحقق في P6/P11 | P2 |
| R6 | الوصفات من الحقل | PARTIAL | بوابات `prescription_required` (سلة/صيدلية/وصفات verified) ✅؛ تعميم عدم الحظر على كل المسارات يُتحقق P11 | P1 |
| R7 | سير الصيدلية | PARTIAL | عروض/سلة/بدائل/تجاوز سعر+تدقيق ✅ BUT إنشاء مكرر + مرتجعات + واجهة قرار مزود | P0 |
| R8 | البث الجغرافي | PASS | 3→5→8×60s + بقاء العروض + 15km + مندوب قابل للتهيئة — كلها مؤكدة بالكود | — |
| R9 | خصوصية الموقع | PARTIAL | `approx_distance_km/approx_area` (يبعد تقريباً) في المزوّد ✅؛ جهة المريض + حجب ما قبل القبول يُتحقق P2-تكميلي | P1 |
| R10 | التأمين (رفع المزوّد) | PARTIAL | باكند decide + شاشة مزود + قبول مريض ✅ BUT واجهة الصيدلية للدومين الخاطئ + إشعار outbox فقط | P0 |
| R11 | الخدمات غير الصيدلية | PARTIAL | كل الخدمات حقيقية BUT: قدرات دفع الاستشارة 404 + رفع تأمين مختبر ميت + QC ميت + مشاركة تقارير مفقودة + مصفوفة تأمين local-only | P0 |
| R12 | أونبوردنج المزوّد | PARTIAL | 7 wizards + KYC + حالات + حجب غير الموثق ✅؛ حقل-بحقل + ربط الإجازات بالمواعيد يُتحقق P5 | P1 |
| R13 | محرك نية البحث | PARTIAL | `search-intent` (6 ملفات) + query-analytics ✅؛ بلا حشو ✅؛ التركيبات الكاملة تُختبر P11 | P2 |
| R14 | سلوك البحث | PARTIAL | 6 لغات + تطبيع + بدائل ✅؛ relevance-vs-popularity يُختبر P11 | P1 |
| R15 | Entity Graph | PARTIAL | `entity-graph` (حالات/علاقات/seeds) + related fetches ✅؛ التغطية الكاملة تُختبر P11 | P2 |
| R16 | Canonical URLs | PARTIAL | `/p/[slug]` `/doctor/[slug]` + slugs ✅؛ الثبات/التصادم/التحويلات تُختبر P11 | P1 |
| R17 | الوجهة المباشرة | PARTIAL | صفحات كانونية + redirects ✅؛ E2E من بحث خارجي P11 | P1 |
| R18 | انتشار الكيانات | PARTIAL | `auto-entity-seo-pipeline` ✅؛ دورة كاملة تُختبر P11 (إنشاء→تعديل→تعطيل→تفعيل) | P1 |
| R19 | انتشار الحالة | PARTIAL | بوابات ACTIVE/public_eligibility/approved ✅؛ الإزالة من بحث/sitemap تُختبر P11 | P1 |
| R20 | المواقع السعودية | PARTIAL | `location` + seeds ✅؛ التسلسل الكامل + عدم الاختلاق يُتحقق P8 | P1 |
| R21 | SEO برمجي | PARTIAL | صفحات كيانات حقيقية ✅؛ ادعاءات best/top + thin pages تُراجع P9 | P2 |
| R22 | عناصر SEO/GEO/AEO | PARTIAL | titles/metas/canonical/hreflang/OG/structured ✅؛ JSON-LD لكل لغة (إضافة 21) يُبنى P9 | P1 |
| R23 | عام/خاص | PASS | default-deny + opt-in + بوابة X-Robots-Tag ✅ | — |
| R24 | خرائط حيوية | PARTIAL | Sitemaps حية من الباكند ✅؛ التحديث التلقائي عند التغيير يُختبر P11 | P1 |
| R25 | نشر لحظي | PARTIAL | EventEmitter + outbox + DLQ ✅؛ الموثوقية end-to-end تُختبر P11 | P2 |
| R26 | ديب لينك | PARTIAL | universal configured + شاشات ✅ BUT خريطة التطبيق محدودة + deferred غير مثبت | P1 |
| R27 | معمارية AI | PARTIAL→قوي | قراءات MCP مفلترة بالبوابة الحاكمة ✅؛ لا أدوات كتابة (اكتشاف+تحضير فقط) ✅؛ `b40136bb` | P2 |
| R28 | MCP endpoint | PARTIAL | controller + tools + audit ✅؛ DNS `mcp.nabd.plus` خارجي | BLOCKED |
| R29 | أدوات MCP | PARTIAL | MCP_TOOLS موجودة؛ التغطية مقابل الفئات المطلوبة تُراجع P10 | P2 |
| R30 | أمن MCP | PARTIAL | RPC عام يعرض قراءات فقط (لا أدوات كتابة أصلاً) ✅ + تدقيق ✅؛ حد المعدل العام يُتحقق P11 | P1 |
| R31 | تجارة AI | PARTIAL | `ai-commerce` موجود؛ بيانات مهيكلة + روابط كانونية تُبنى P10 | P2 |
| R32-48 | الرانكنج | PASS (بملاحظات) | محرك حي مربوط end-to-end: أوزان env، نطاقات، اضمحلال، cold-start صادق، مزج relevance 0.7/0.3، أحداث مُتحقق منها، إبطال كاش — `b40136bb` للصدق؛ polish: أوضاع مخصصة تسقط على composite | P2 |
| R49 | الأداء | UNCERTAIN | بلا قياسات بعد — P11 (TTFB/p95/حمل) | P1 |
| R50 | الأمن | PARTIAL | SecureStore/httpOnly/CSRF/guards/honeypots ✅ BUT اختراق فعلي + فروع أمنية غير مندمجة + IDOR شامل — P11 | P0 |
| R51 | خصوصية PHI | PARTIAL | default-deny + فحوص مالكية ✅ + sitemaps بلا PHI ✅؛ تدقيق تسرب شامل P11 | P0 |
| R52 | الأدمن | PASS | 51 صفحة حية + Guard + بروكسي محروس + انتحال منضبط (فجوة 14 مساراً تُسد P5) | P1 |
| R53 | موثوقية طبية | PARTIAL | markers (reviewed/disclaimer) في triage/maternity/product ✅؛ منهجية كاملة P9 | P2 |
| R54 | SEO متعدد | PARTIAL | hreflang + 6 locales + parity test ✅؛ JSON-LD/sitemap لكل لغة (21) P9 | P1 |
| R55 | ربط داخلي | PARTIAL | related fetches ✅؛ منهجية من العلاقات P9 | P3 |
| R56 | اكتشاف AI/MCP | UNCERTAIN | تابع R18/R29 — P10/P11 | P2 |
| R57 | حدثية | PARTIAL | EventEmitter + outbox + processors ✅ | — |
| R58-63 | الاختبارات | PARTIAL | 117 spec + e2e + عقود ✅؛ اختبارات R59-63 المحددة تُبنى/تُشغل P11 | P1 |
| R64 | الاتساق | PARTIAL | `consistency` (تدقيق + تسوية) ✅؛ اتساق العملاء يُختبر P11 | P2 |
| R65 | الأخطاء | PARTIAL | أخطاء مهيكلة (slot_taken/prescription_required...) ✅؛ التوحيد P7 | P2 |
| R66 | Idempotency | PASS | أُصلح بـ P0-01 (`5101f4c4`): @RequireIdempotency على إنشاء/تقديم/تحديث/إلغاء الصيدلية + interceptor عالمي (dedupe 24h + lock + body-hash) — 2026-09-12 | P0 |
| R67 | سلامة تجارة AI | PARTIAL | فرض server-side في التدفقات ✅؛ تجاوز خاص بـ AI يُراجع P10 | P1 |
| R68 | خط SEO | PARTIAL | مغطى R22-24 | P1 |
| R69 | Slugs | PARTIAL | نظام موجود؛ تصادم/تحويلات P11 | P2 |
| R70 | المراقبة | PARTIAL | Winston/Sentry/audit ✅؛ رؤية فشل الانتشار P7 | P2 |
| R71 | التعافي | PARTIAL | outbox + DLQ + retry ✅؛ إثبات end-to-end P11 | P2 |
| R72 | التسوية | PARTIAL | `reconcile()` موجود؛ جدولة/تشغيل P7 | P3 |
| R73 | لا إفراط SEO | PASS | لا مزارع doorway — المشكلة معاكسة (حشو ثابت) تُزال | — |
| R74 | صفحات موقع+خدمة | PARTIAL | صفحات SEO مواقع موجودة؛ دعمها ببيانات حقيقية P9 | P2 |
| R75 | تحليلات بحث | PARTIAL | `query-analytics` ✅؛ الاستخدام P9 | P3 |
| R76 | ASO | UNCERTAIN | `app.json` موجود؛ metadata المتاجر خارجي | BLOCKED |
| R77 | أدمن/أتمتة | PARTIAL | محرك الرانكنج حي ومعزول عن اليدوي (`product-ranking.service.ts:28` — manual boosts live elsewhere, never here)؛ واجهة merchandising يدوية محكومة غائبة (backlog أدمن) — 2026-09-12 | P2 |
| R78-82 | العملية/التقرير/القبول | 🔄 جارية (هذه الخطة) | — | — |

## ملخص الإحصاء
- PASS: 23 (R4/R8/R23/R32–R48/R52/R66/R73) · PARTIAL: 50 · UNCERTAIN: 2 (R49/R56) · FAIL: 0 · BLOCKED: 2 (R28/R76) · in-progress: 5 (R78–R82) — المجموع = 82
- P0: 23 بنداً — حُلَّت بالكامل (REPORT-FINAL.md 23/23) · أولويات ثانوية في REPORT.md §4 · التفاصيل في REPORT-FINAL.md
