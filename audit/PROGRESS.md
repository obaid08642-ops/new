# سجل التقدم الحي — PROGRESS.md
> يُحدَّث بعد كل خطوة. الحالة: ⬜ لم تبدأ | 🔄 جارية | ✅ مكتملة | ⚠️ ناقص/يُستكمل | 🐞 تعارض/خطأ يُصلَّح

## P0 — التأسيس
- ✅ استنساخ الريبو (main @ `54c54e5f`) إلى `/Users/ahmedobaid/nabd-audit-work/new`
- ✅ التحقق من البنية: ملفات متتبعة 2839 (patient-web 1041 / backend 903 / patient-app 682 / admin 99 / provider-app 85 / docs 20 / packages 7)
- ✅ توثيق الـ stack: backend=NestJS11+Mongoose8+Redis/BullMQ | web=Next16+next-intl+tRPC+drizzle/mysql2 | patient-app=Expo57+router+Redux | provider=Expo54+react-navigation+zustand | admin=Next16+passkeys
- ✅ إنشاء البرانش `nabdah-plus/full-completion`
- ✅ نظام التوثيق (هذا المجلد) — أول commit `a1bc5e95` مرفوع على البرانش
- ✅ مراجعة بوابة P0: الاستنساخ/البنية/البراش/التوثيق/الرفع مكتملة. التشغيل المحلي الكامل مؤجل (قيد القرص ~3GB — تثبيت انتقائي في P1 عند الحاجة فقط)

## P1 — Discovery + الجرد الذري [🔄 جارية — wave-1 وwave-2 مكتملتان]
- ✅ wave-1: باكند (116 موديول/278 controller/1602 route/MongoDB فقط) + مريض (249 شاشة/6 لغات/SecureStore) + مسح وهمي (لا محتوى مزيف نشط)
- ✅ wave-2a الويب: 270 صفحة + 60 مسار BFF نحيف + **MySQL/drizzle = كود ميت (R1 مُبرَّأة — توصية الحذف P3)** + tRPC بلا منطق + i18n باختبار تكافؤ + SEO ثابت/حي + default-deny فهرسة + httpOnly → `FINDINGS/patient-web-inventory.md`
- ✅ wave-2b المزوّد/الأدمن: 8 أدوار + 7 wizards + **شاشة رفع رد التأمين موجودة** + مالية حقيقية (تكرار محفظة ×5) + أدمن 51 صفحة (Guard حقيقي/14 مساراً فقط + بروكسي محروس + انتحال منضبط) → `FINDINGS/provider-admin.md`
- ✅ wave-2c التحقق: FASTAPI=ميت لكن `infra/fastapi` باكند ثانٍ مهجور (قرار P3) + لا spec-only + لا stub صرف + **Seed تلقائي مشروط** (مرجع كل إقلاع بلا قاطع — بند P2) + **4 فروع agents غير مندمجة (منها إصلاحات أمنية!)** + shim فيديو ميت → `FINDINGS/verification-p1.md`
- ✅ wave-3 الرحلات الحرجة: صيدلية/استشارات/تشخيص E2E كاملة → `FINDINGS/journeys-critical.md` + سجل P0 من 20 بنداً
## P1 — مكتمل ميدانياً ✅ (بانتظار دمج نتائجه في P2 أدناه)
## P2 — مصفوفة الفجوات + التقرير الشامل [✅ مكتمل — بانتظار اعتماد المالك]
- ✅ `FINDINGS/gap-matrix.md`: الـ 82 متطلباً (PASS 6 / FAIL 1 / PARTIAL 60 / UNCERTAIN 6 / BLOCKED 3)
- ✅ `REPORT.md`: التقرير الشامل (23 بند P0 + أهم P1 + قائمة عدم-إعادة-البناء + قرارات D1–D8)
- ⏳ البوابة: أمر المالك لبدء البناء P3
## P3–P13 — البناء [⬜] (تبدأ بعد أمر المالك)

## عناصر مراقبة خاصة
- [ ] التحقق: هل patient-web يستخدم MySQL منفصلة؟ (مخالفة R1 محتملة)
- [ ] حصر أي أثر تكامل NPHIES مباشر (stub/ادعاء) للإزالة
- [ ] فروع الـ agents الكثيرة (~150): مالذي دُمج في main ومالذي تُرك؟ (عينة)
- [ ] Expo drift: patient-app v57 مقابل provider-app v54
- [ ] قيد القرص (~3GB): تثبيت انتقائي فقط
