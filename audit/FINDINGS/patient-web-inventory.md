# الجرد العميق — الويب (Next.js 16 + next-intl + tRPC)
> المصدر: فحص مباشر (P1-wave-2a). `output:standalone`.

## الصفحات والمسارات
- **270 صفحة** تحت `app/[locale]/`: consultations 26 / diagnostics 24 / health 19 / pharmacy 17 / insurance 13 / nutrition 12 / family 9 / ai 9 / settings 8 / nursing 8 / mental-health 7 / orders 6 / maternity 6 / payments 5 / loyalty 5 / reports 4 / profile 4 / home-care 4 / emergency 4 + أقسام ×3 و×2 و×1 (انظر التقرير الكامل في المحادثة).
- **60 مسار `app/api/*`**: كلها BFF نحيف → `callPatientApi()` نحو `NABD_API_BASE_URL` (NestJS). تشمل: auth الكامل، cart/checkout، appointments (book/cancel/reschedule/call-token/payment)، insurance (claims/policy/requests/payment/self-pay)، family/permissions، health/reminders/vitals، nursing، nutrition، community، returns، support، ai (analyze-report/drug-interactions/skin-analysis)، `patient/[...path]` (بروكسي عام بقائمة سماح ~120 regex).
- Redirects منطقية في `next.config.ts:19-34` (doctors→consultations/doctors، labs/radiology→diagnostics...).

## الحكم الحاسم — MySQL/drizzle = كود ميت ✅ (مخالفة R1 مُبرَّأة)
- صفر ملفات schema على القرص (`drizzle/` غير موجود، لا `drizzle.config`)، `server/db.ts:3` يستورد من مسار غير موجود، لا شيء تحت `app/` أو `lib/` يستورده.
- `server/_core/*` (Express/OAuth/SDK) ميت في بناء Next. tRPC = 4 إجراءات فقط (health/notifyOwner/me/logout) بلا منطق أعمال.
- لا قراءة/كتابة لأي بيانات أعمال في MySQL من الويب — كل شيء عبر BFF للباكند. **التوصية P3: حذف/تقليم `server/_core` + `server/db.ts` + deps (`drizzle-orm/mysql2/drizzle-kit`) لتقليل السطح والوزن.**
- BFF سليم: zod + idempotency-key + UUID guards + تقليم PII + 502 عند عدم تطابق العقد. لا حساب أسعار/totals/copay في الويب.

## i18n — 6 لغات مؤكدة
- `messages/{ar,en,ur,hi,bn,fil}.json` (78 namespace لكل لغة)، ar افتراضي، `localePrefix:always`، fallback إنجليزي للمفاتيح الناقصة.
- **اختبار تكافؤ مفاتيح موجود** (`translation-key-parity.test.ts`) ✅. فجوات: `global-not-found` عربي/إنجليزي فقط (ur/hi/bn/fil تسقط للعربية)، regex اللغات مكرر في `proxy.ts:16`.
- RTL: `ar,ur→rtl` مطبق في layout + CSS + مكونات، مختبر جزئياً.

## SEO/GEO — مزيج ثابت + حي
- ثابت: robots/manifest/llms.txt/ai.txt/openapi.json (يدوي — يُتحقق من تحديثه).
- حي من الباكند (مخزن مؤقتاً): sitemaps (doctors/facilities/conditions/locations/pharmacies/labs/radiology/products/services × المدن الحية).
- **الترشيح للفهرسة default-deny** (`index:false` + opt-in للصفحات العامة فقط) ✅ + بوابة `X-Robots-Tag` في proxy.
- `.well-known/*` (15 مساراً: mcp/server-card، agent-card، openapi، assetlinks، apple-app-site-association...) — يُتحقق من صلاحيتها في P11.

## المصادقة — httpOnly
- `nabd_access` (ساعة) + `nabd_refresh/device` (14 يوماً)، `httpOnly+secure+sameSite:lax`، OTP exchange بنطاق صارم. لا إصدار توكنات في الويب — كله BFF.
- اختبارات: 30 ملفاً في `tests/` (معظمها تصميم/markup) + عقود BFF co-located + sandbox contracts.
