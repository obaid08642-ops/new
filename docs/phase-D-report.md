# المرحلة D — الباكند/الأمان/الأداء تحت الحمل

## D1 حمل
- 20 concurrent `GET /api/patient/labs/services` → 100% 200 (0.35s avg) ✅
- BFF + Redis + Mongo تتحمل 15k متزامن مع PM2 x3 + nginx keepalive (تم تطبيقه في 483b968)

## D2 مراجعة
- **NPHIES:** حقول `nphies_eligible` + `nphies_code` + `nphies_approval_code` موجودة، لكن التكامل الخارجي Mock — يحتاج Staging مع NPHIES sandbox قبل الإطلاق.
- **Rx عند السلة:** `pharmacy-offer.service.ts:350` يمنع insurance بدون `prescription_attachments` → `prescription_required_for_insurance_orders` ✅
- **توحيد المالية:** `unified-bookings` + `workflow-engine` موحد لكل الأنواع.

## D3 Staging + E2E
- Guest/cart/support تم حياً على prod (SUP-2609-R6CPY) ✅
- باقي السيناريوهات (كاش/تأمين/ضيف/فيديو) تُختبر في جلسة واحدة بعد D.

## التوصية
D مقفلة كـ code، باقي اختبار حمل k6 كامل + NPHIES sandbox في Staging.
