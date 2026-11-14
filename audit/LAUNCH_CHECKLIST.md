# قائمة الإطلاق للإنتاج (Launch Checklist)
> الترتيب إلزامي. البنود البرمجية مكتملة على هذا البرانش؛ الباقي مراجعة + قيم خارجية + نشر.

## 1) المراجعة والدمج (المراجع)
- [x] مراجعة PR (فرع `nabdah-plus/full-completion` → `main`) كوميت بكوميت — تم: الفرع غير موجود؛ main يحمل الدمج وعمليات النشر 97-117
- [x] CI أخضر: backend build+tests، shared-contracts، patient-web، policy guards — تم: يدمج المراجع PRs خضراء فقط؛ المُشغِّل ثُبِّت على ubuntu-24.04 (#2626)
- [x] الدمج في main (squash أو merge حسب سياسة الفريق) — تم
- [ ] وسم إصدار (tag) ما قبل الإنتاج — إجراء المالك/المراجع: لا يوجد وسم إصدار (الوسوم الحالية 5 وسوم بيانات فقط)

## 2) الأسرار والبيئة (BLOCKED — قيم حقيقية من المالك)
- [ ] `MONGO_URL`, `DB_NAME`, `JWT_SECRET` (32+), `REDIS_URL`, `ALLOWED_ORIGINS`, `NODE_ENV=production` — إجراء الخادم (تحقق فقط): الإقلاع يرفض نقص المتغيرات و JWT أقصر من 32 (backend/src/config/env.validation.ts:5-8)؛ القائمة deploy/.env.production.example
- [ ] المدفوعات: `MOYASAR_*` (+ بدائل PayTabs/Paymob/Tap/Stripe إن وجدت) — مفاتيح المالك: deploy/.env.production.example و docs/payments/MOYASAR_GO_LIVE.md
- [ ] الإشعارات: FCM/Firebase، واتساب (Infobip)، SMTP/Resend — مفاتيح المالك: Firebase/Infobip/Resend في deploy/.env.production.example + أسرار GitHub (OPS_ALERT_EMAIL, MAIL_FROM, RESEND_API_KEY)
- [ ] المكالمات: `LIVEKIT_API_KEY/SECRET` + COTURN — إجراء الخادم: LiveKit/COTURN ذاتيا الاستضافة (deploy/coturn, tools/live/start-livekit.sh)؛ المفاتيح تُولَّد على الخادم
- [ ] التخزين: S3/R2 + `GEMINI_API_KEY` + `SENTRY_DSN` — مفاتيح المالك: متغيرات S3/Gemini/Sentry في deploy/.env.production.example؛ تدوير رمز R2 معلّق
- [ ] الويب: `NABD_API_BASE_URL`, `NEXT_PUBLIC_SITE_ORIGIN`, Google OAuth — مالك: عميل Google OAuth؛ باقي المتغيرات في patient-web/.env.production.example
- [ ] سلامة الأجهزة: Play Integrity + APNS/App Attest (وإلا يعمل المسار المتدهور الصادق) — الكود تم: المسار المتدهور الصادق في backend/src/modules/device-trust؛ مفاتيح APNs/App Attest عند المالك
- [ ] **إبطال توكن GitHub المؤقت المكشوف أثناء العمل وإصدار بديل** — إجراء المالك: لا يمكن التحقق من المستودع

## 3) DNS والنطاقات
- [x] `api.nabd.plus` → الباكند، `nabd.plus` → الويب، `mcp.nabd.plus` → MCP — تم/خادم: deploy/DNS-RECORDS.md و deploy/nginx/conf.d/mcp.conf والموقع يعمل منذ 11-03؛ تحقق من سجل mcp وشهادته
- [ ] التحقق من `.well-known` (assetlinks + apple-app-site-association) بأدوات Apple/Google — إجراء المالك: المسارات موجودة (patient-web/app/.well-known) لكن AASA يرفض حتى يُضبط APPLE_TEAM_ID وassetlinks يحتاج SHA-256 توقيع Play
- [ ] اختبار E2E انتقال web→app برابط مباشر — إجراء المالك: مغطى بوحدات (PT-38)؛ تسليم نظام التشغيل الحقيقي على جهاز فقط (SCENARIOS PT-24)

## 4) المتاجر (EAS)
- [ ] Apple Team ID + Bundle ID + Signing، Google package + SHA-256 — إجراء المالك: معرفات الحزمة جاهزة (patient-app/app.json)؛ Team ID والتوقيع وSHA حسابات المالك
- [ ] Metadata المتاجر باللغات الست + سياسة الخصوصية (بيانات صحية) + إجابات مراجعة Apple الصحية — الوثائق تمت: docs/aso/listings.md (6 لغات)، docs/compliance/STORE_DECLARATIONS.md، صفحة الخصوصية؛ المالك يلصقها في المتاجر
- [ ] بناء EAS production + اختبار TestFlight/Internal أولاً — إجراء المالك: patient-app/eas.json فيه production؛ يحتاج حسابات المتاجر

## 5) تحقق ما بعد النشر (Staging أولاً)
- [ ] رحلات الدفع/الحجز/الصيدلية E2E حقيقية (كاش + بطاقة sandbox + تأمين) — تم في CI (171 رحلة tools/live ضد مويصر مزيف)؛ تشغيل sandbox حقيقي يحتاج مفاتيح المالك
- [ ] إشعارات Push + مكالمة LiveKit حقيقية + Webhook مويصر — تم في CI (j_lab_result_push, j_web_call, j_payment_webhook)؛ الأجهزة/المفاتيح الحقيقية عند المالك والخادم
- [ ] مراقبة Sentry + تنبيهات + نسخ احتياطي DB — الكود تم (instrument.ts, ops/prometheus/nabd-alerts.yml, uptime-alert.yml, dr-drill.yml, استرجاع النسخ SY-05)؛ DSN وبريد التنبيه عند المالك

## 6) ما بعد الإطلاق
- [ ] مراقبة p95 + معدلات الفشل + طابور outbox/DLQ أول أسبوعين — p95 وأخطاء الدفع: تنبيهات ClassP95High/PaymentErrorRatio؛ outbox/DLQ: مقاييس وتنبيهات وrunbook في #2640 (docs/runbooks/event-dead-letter.md)
- [ ] Backlog الـ P2/P3 (رانكنج/ديب لينك/ديزاين) حسب الأولوية — يُتابع في lead/LAUNCH_LIST.md (بعد الإطلاق)
