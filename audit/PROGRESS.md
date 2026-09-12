# سجل التقدم الحي — PROGRESS.md
> يُحدَّث بعد كل خطوة. الحالة: ⬜ لم تبدأ | 🔄 جارية | ✅ مكتملة | ⚠️ ناقص/يُستكمل | 🐞 تعارض/خطأ يُصلَّح

## P0 — التأسيس
- ✅ استنساخ الريبو (main @ `54c54e5f`) إلى `/Users/ahmedobaid/nabd-audit-work/new`
- ✅ التحقق من البنية: ملفات متتبعة 2839 (patient-web 1041 / backend 903 / patient-app 682 / admin 99 / provider-app 85 / docs 20 / packages 7)
- ✅ توثيق الـ stack: backend=NestJS11+Mongoose8+Redis/BullMQ | web=Next16+next-intl+tRPC+drizzle/mysql2 | patient-app=Expo57+router+Redux | provider=Expo54+react-navigation+zustand | admin=Next16+passkeys
- ✅ إنشاء البرانش `nabdah-plus/full-completion`
- ✅ نظام التوثيق (هذا المجلد) — أول commit `a1bc5e95` مرفوع على البرانش
- ✅ مراجعة بوابة P0: الاستنساخ/البنية/البراش/التوثيق/الرفع مكتملة. التشغيل المحلي الكامل مؤجل (قيد القرص ~3GB — تثبيت انتقائي في P1 عند الحاجة فقط)

## P1 — Discovery + الجرد الذري [🔄 جارية — wave-1 مكتملة]
- ✅ جرد الباكند: 116 موديول، 278 controller، 1602 route، MongoDB فقط، مصادقة OTP/2FA/passkey، كل النطاقات مؤكدة (صيدلية/تأمين/رانكنج/بحث/MCP/مدفوعات...) → `FINDINGS/backend-inventory.md`
- ✅ جرد المريض: 249 شاشة مؤكدة، 6 لغات، SecureStore فقط، خريطة ديب لينك محدودة (فجوة مرشحة)، LiveKit حقيقي + stub قديم → `FINDINGS/patient-app-inventory.md`
- ✅ مسح الداتا الوهمية: لا محتوى مزيف نشط؛ 12 عنصراً نشطاً تُحسم في P2 → `FINDINGS/mock-data.md`
- ⬜ التالي (wave-2): جرد الويب + المزوّد + الأدمن + التحقق من MySQL الويب + FASTAPI_BASE_URL + موديولات spec-only + عينة فروع agents
## P2 — مصفوفة الفجوات + التقرير الشامل [⬜] → بوابة اعتماد المالك
## P3–P13 — البناء [⬜] (تبدأ بعد أمر المالك)

## عناصر مراقبة خاصة
- [ ] التحقق: هل patient-web يستخدم MySQL منفصلة؟ (مخالفة R1 محتملة)
- [ ] حصر أي أثر تكامل NPHIES مباشر (stub/ادعاء) للإزالة
- [ ] فروع الـ agents الكثيرة (~150): مالذي دُمج في main ومالذي تُرك؟ (عينة)
- [ ] Expo drift: patient-app v57 مقابل provider-app v54
- [ ] قيد القرص (~3GB): تثبيت انتقائي فقط
