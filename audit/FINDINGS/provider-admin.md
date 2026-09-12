# بطاقات الجرد — المزوّد (provider-app) + الأدمن
> المزوّد: 56 شاشة فقط مقابل 56+ موديول provider في الباكند — فرضية فجوة تُثبت/تُنفى بالكود.
> الأدمن: ~50 صفحة (مالية/payouts/مخزون/مزودين/RBAC/audit-logs...).

# الجرد — المزوّد (provider-app) + الأدمن
> المصدر: فحص مباشر (P1-wave-2b). فرضية "56 شاشة ناقصة" **مُبرَّأة جزئياً**: الفعلي 41 شاشة + مقدمات، لكن البنية مضمّنة (شاشات داخل ملفات).

## المزوّد — 8 أدوار (طبيب/صيدلية/مختبر/أشعة/تمريض/منشأة/إسعاف + مشترك)
- **45 ملف tsx (41 شاشة + 4 مقدمات)** + 7 wizards تسجيل (ملف لكل نوع) + KYC عبر `POST /provider-onboarding/{start|step2|step3|submit}` + رفع رخص (`POST /storage/upload`) + جمع `acceptedInsurance[]` في كل wizard.
- **رفع رد التأمين موجود ✅**: `shared/InsuranceRequestsScreen.tsx` (queue عبر `GET /insurance/requests/provider/queue` + قرار `POST /:id/decide`: approve_full/approve_partial مع copay 1-99/reject مع سبب) — يُطابق المواصفة المعتمدة (يُتحقق E2E في P11).
- **المالية حقيقية**: `WithdrawalWorkflow` (حد 100 SAR + `idempotency_key` + حساب بنكي معتمد) + شاشات محفظة — **ملاحظة: منطق المحفظة مكرر في 5 مواضع** (مشترك/تمريض/طبيب/blueprint/منشأة/صيدلية) — مرشح توحيد P3/P5.
- الطلبات: صيدلية broadcast (قبول كامل/جزئي/رفض) + مرافق + طبيب + مختبر (QC/reject) — إسعاف بلا accept صريح (يُحسم P2).
- التوفر متفائل (`toggle-instant`) + تقاويم/جدولة لكل دور + إعدادات (تأمين/shifts/تنبيهات).
- API: `api/client.ts` (JWT + X-Device-ID/X-Request-ID + 401 يمسح التوكن) — لكن `services/HttpClient.ts` بديل بهاردكود `api.nabdahplus.com` بلا مصادقة (يُحسم: ميت أم مستخدم؟).
- Push عبر Firebase (FCM أولاً) + Expo fallback — لا `google-services.json` في src (يُتحقق من EAS config).
- لا ملف zustand store تحت src (الحالة عبر context — يُتحقق من اكتماله).

## الأدمن — 51 صفحة، دفاع حقيقي مع فجوة
- **AdminGuard فحص حقيقي** (session عبر BFF + 401/403 → login) لكن `ROUTE_PERMISSIONS` تغطي 14 مساراً فقط — صفحات (provider-moderation/users/payouts/sos...) تعتمد على RBAC الباكند وحده (يُتحقق من الباكند في P2).
- **بروكسي `api/admin/[...path].ts` محروس** (مصادقة + CSRF للكتابة + خريطة مسارات مغلقة) — التفويض الدقيق على NestJS (يُتحقق).
- **انتحال الهوية منضبط**: 15 دقيقة، read-only، سبب إلزامي، غير-أدمن فقط، التوكن لا يعود للعميل.
- الصفحات الثلاث الكبرى (dashboard/users/provider-moderation) كلها fetch حي — لا بيانات ثابتة.
- دخول: كلمة سر + 2FA + passkey (WebAuthn) + public محدود (OTP/reset فقط).
