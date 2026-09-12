# جرد الداتا الوهمية (mock-data)
> grep إلزامي: mock/placeholder/fake/dummy/TODO/FIXME/hardcoded/lorem/sample + تتبع UI→API→DB لكل حالة.
> كل سطر: الملف:السطر | النوع | هل يظهر في الإنتاج؟ | القرار (إزالة/استبدال/عزل seed).

## نتائج P1-wave-1 (مسح grep شامل — يُحسم كل بند في P2)
**الخلاصة:** لا دكاترة/صيدليات/أسعار/طلبات/تقييمات مزيفة تُعرض كمحتوى إنتاجي. صفر `TODO:/FIXME:/HACK:`. الباقي أدناه:

### باكند — عناصر تستحق الحسم
- `modules/nphies/nphies.validator.ts:3` — mock validator (مقصود: لا تكامل حي — يُطابق المواصفة متى أُزيل أي ادعاء)
- `modules/insurance/insurance.module.ts:230` — فحص `base64_simulated_data` (يُتحقق: مسار اختبار أم إنتاج؟)
- `modules/device-trust/device-trust.module.ts:10,75,109,113` — placeholders صريحة و`not_configured` عند غياب المفاتيح (سلوك صادق = BLOCKED)
- `modules/webhooks/guards/livekit-webhook.guard.ts:12` — حارس ضد fake defaults ✅
- تعليقات إصلاح موثقة (تزيل شكوكاً): إزالة admin seeding من الإقلاع، إزالة hardcoding في Paymob، كتالوج تأمين ديناميكي، `compat/admin-spa` بلا mocks، تقارير من aggregations حقيقية
- Seeds: `provider-seed.service:60-61` (idempotent، موسومة) + `seed.service:59` (test data بتفعيل صريح) — يُتحقق من عدم تسربها للإنتاج

### تطبيق المريض — عناصر نشطة تستحق الحسم
- `src/guided-tour/engines/AnalyticsCollector.ts:24-25` — Simulate إرسال للباكند (console فقط؟ يُتحقق)
- `app/diagnostics/search.tsx:41` — static fallback (يُتحقق: يعرض بيانات قديمة كأنها حية؟)
- `app/loyalty/hub.tsx:20-22` — placeholders تعكس جدول نقاط الباكند (يُتحقق من عدم التضخيم)
- `app/programs/active.tsx:116` — Simulated progress bar (يُستبدل بحقيقي)
- `app/maternity/fetus-data.ts:175` — `DummyFetusRoute` تُرجع null (يُتحقق: مسار ميت؟)
- الباقي تعليقات إصلاح موثقة (monthly-report الملفقة سابقاً، فيديو token، ETA مزيف، تقييم لا يُحفظ، SOS مزيف، dummy token، اختبارات hardcoded...) — دليل تنظيف سابق ✅

### الويب — static fallback
- `lib/data/use-central-insurance.ts:7,11,31` — قائمة تأمين ثابتة كـ fallback (تُقارن مع الباكند الحي)
- `components-next/map-explorer-client.tsx:87` — fallback بلا تزييف ✅

### المزوّد — عناصر نشطة تستحق الحسم
- `src/components/ui.tsx:800` — خلفية Mocking a Map (تُستبدل بخريطة حقيقية أو تُزال)
- `src/screens/nursing/NursingFieldOps.tsx:24` — Simulated distance/GPS/signature/completion (حرج — يُستبدل بحقيقي)
- `src/screens/shared/SharedScreens.tsx:2684` — شاشة PREMIUM PLACEHOLDER قيد التطوير (تُكمل أو تُخفى)
- `src/screens/facility/FacilityDashboard.tsx:1565` — QR Scanner placeholder (يُكمل أو يُخفى)
- `src/screens/lab/LabDashboard.tsx:1035` — `SMP-2025-XXX` (قناع عرض؟ يُتحقق)

### الأدمن
- `pages/admin/dashboard.tsx:99` — تعليق Simulate مضلل لفظياً فقط؛ السطر التالي fetch حي ✅

### مستبعد (مشروع — ليس إنتاجياً)
- Backend specs: 1244 إصابة في 88 ملفاً · Web tests: 353 · App tests: 128 · i18n copy شرعي: 19 · `placeholder=` للحقول: مشروع
