# تدقيق ربط تطبيق المزود — المرحلة 7 (2026-08-31)
المنهج: قياس بنمط axios الصحيح (client.ts + ProviderApi) — وليس fetch/apiFetch.

## النتيجة النهائية
- 39 شاشة مربوطة بالباكند فعلياً.
- 6 شاشات صفر-API — كلها عرضية مشروعة بالتصميم: DoctorHeader/QueueList/StatsRow/UrgentRequests (مكوّنات تتغذى props من DoctorDashboard الذي يجلب /calls/provider/*)، LiveKitRoomProvider (غلاف مكالمات)، ProviderHome (حاوية).
- التسجيل: السبع تخصصات تستخدم معالج ProviderApi (start→login→uploadFile→step2→step3) — مربوطة فعلاً، ووحدة backend/src/modules/provider-onboarding موجودة.
- الداشبوردات الأربع: lab=27, nursing=36, ambulance=9, facility=37 استدعاء axios.
- BlueprintScreens: 27 استخدام axios — كود حي.
## الحكم: لا إعادة ربط عمياء مطلوبة. التأكيد النهائي الوظيفي عبر CI.
