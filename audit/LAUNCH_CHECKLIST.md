# قائمة الإطلاق للإنتاج (Launch Checklist)
> الترتيب إلزامي. البنود البرمجية مكتملة على هذا البرانش؛ الباقي مراجعة + قيم خارجية + نشر.

## 1) المراجعة والدمج (المراجع)
- [ ] مراجعة PR (فرع `nabdah-plus/full-completion` → `main`) كوميت بكوميت
- [ ] CI أخضر: backend build+tests، shared-contracts، patient-web، policy guards
- [ ] الدمج في main (squash أو merge حسب سياسة الفريق)
- [ ] وسم إصدار (tag) ما قبل الإنتاج

## 2) الأسرار والبيئة (BLOCKED — قيم حقيقية من المالك)
- [ ] `MONGO_URL`, `DB_NAME`, `JWT_SECRET` (32+), `REDIS_URL`, `ALLOWED_ORIGINS`, `NODE_ENV=production`
- [ ] المدفوعات: `MOYASAR_*` (+ بدائل PayTabs/Paymob/Tap/Stripe إن وجدت)
- [ ] الإشعارات: FCM/Firebase، SMS (Infobip/Unifonic/Taqnyat)، SMTP/Resend
- [ ] المكالمات: `LIVEKIT_API_KEY/SECRET` + COTURN
- [ ] التخزين: S3/R2 + `GEMINI_API_KEY` + `SENTRY_DSN`
- [ ] الويب: `NABD_API_BASE_URL`, `NEXT_PUBLIC_SITE_ORIGIN`, Google OAuth
- [ ] سلامة الأجهزة: Play Integrity + APNS/App Attest (وإلا يعمل المسار المتدهور الصادق)
- [ ] **إبطال توكن GitHub المؤقت المكشوف أثناء العمل وإصدار بديل**

## 3) DNS والنطاقات
- [ ] `api.nabd.plus` → الباكند، `nabd.plus` → الويب، `mcp.nabd.plus` → MCP
- [ ] التحقق من `.well-known` (assetlinks + apple-app-site-association) بأدوات Apple/Google
- [ ] اختبار E2E انتقال web→app برابط مباشر

## 4) المتاجر (EAS)
- [ ] Apple Team ID + Bundle ID + Signing، Google package + SHA-256
- [ ] Metadata المتاجر باللغات الست + سياسة الخصوصية (بيانات صحية) + إجابات مراجعة Apple الصحية
- [ ] بناء EAS production + اختبار TestFlight/Internal أولاً

## 5) تحقق ما بعد النشر (Staging أولاً)
- [ ] رحلات الدفع/الحجز/الصيدلية E2E حقيقية (كاش + بطاقة sandbox + تأمين)
- [ ] إشعارات Push + مكالمة LiveKit حقيقية + Webhook مويصر
- [ ] مراقبة Sentry + تنبيهات + نسخ احتياطي DB

## 6) ما بعد الإطلاق
- [ ] مراقبة p95 + معدلات الفشل + طابور outbox/DLQ أول أسبوعين
- [ ] Backlog الـ P2/P3 (رانكنج/ديب لينك/ديزاين) حسب الأولوية
