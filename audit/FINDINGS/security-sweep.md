# مسح أمني ساكن R50/R51 (2026-09-13 — أدلة من الشجرة، ليس اختراقاً حياً)
> لا يغلق R50/R51 (يتطلبان مختبر اختراق حي) — يوثق ما تم التحقق منه ساكناً.

## أسرار (R50)
- صفر مفاتيح/أسرار ملصقة في الكود (grep: sk_live/sk_test/AKIA/xoxb/ghp_/mongodb+srv) ✅
- DSNs عبر env فقط (SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN / EXPO_PUBLIC_SENTRY_DSN) ✅
- بذرة الأدمن عبر env + تحذير تغيير كلمة المرور ✅ (`seed-admin.ts:40,60`)

## ملكية/IDOR (R50)
- نمط الحماية المطبق: role-gate + `assertBookingOwner` بعد كل جلب برقم (عينة: `labs.service.ts:379-381` registerSample، `:410-413` updateSampleStage) ✅
- تعميم شامل يحتاج مراجعة آلية لكل service (مجدول P11)

## خصوصية PHI (R51)
- صفر هواتف/هويات/إيميلات في sitemaps وllms.txt ✅
- تنقيح PII في سجلات التدقيق (`redactAuditValue/redactAuditBody` — `audit-log.interceptor.ts:29,51`) ✅
- تدقيق تسرب شامل (سجلات/تخزين/كاش) مجدول P11

## specs مضافة هذه الجولة (R58–R63 — منفذة محلياً)
- `top-queries.spec.ts` (5 ✅) · `seo-indexing.listener.spec.ts` · `apply-sponsored.spec.ts` (2 ✅)
