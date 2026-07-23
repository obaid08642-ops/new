# سجل تغييرات المرحلة M0 — التأسيس وإطفاء الحرائق

**التاريخ:** 23 يوليو 2026 · **الحالة:** مكتملة ومُتحقق منها بالبناء ✅
**إثبات الجودة:** الباك إند `tsc --noEmit` = صفر أخطاء + `nest build` ناجح · لوحة الأدمن `next build` ناجح ويظهر مسار `/login`

---

## المشاريع المعدّلة

### 1️⃣ nabdah-backend (10 تعديلات)

| المهمة | الملف | التغيير |
|---|---|---|
| M0-01 | `src/modules/auth/auth.service.ts` | حذف `seedAdmin()` من constructor نهائيًا (كان يزرع `Admin@123` / `+966500000000` عند كل إقلاع) |
| M0-01 | `src/scripts/seed-admin.ts` | **جديد** — سكربت زرع أدمن آمن: يقرأ البيانات من البيئة، كلمة مرور 12+ حرفًا، idempotent |
| M0-02 | `src/modules/auth/auth.module.ts` | فشل الإقلاع في الإنتاج إذا غاب `JWT_SECRET` أو قصر عن 32 حرفًا (كان الافتراضي `'change-me'`); مدة التوكن الافتراضية 1h بدل 7d |
| M0-03 | `src/modules/auth/auth.service.ts` | OTP من `Map` بالذاكرة → **Redis بمهلة 5 دقائق** + حد 5 محاولات تحقق + استهلاك الرمز بعد النجاح |
| M0-03 | `src/modules/redis/redis.service.ts` | إضافة دالة `ttl(key)` المساندة |
| — | 7 ملفات خدمات | رفع جولات bcrypt من 8 إلى **12** (auth, providers, provider-onboarding, simulated-features, seeds) |
| M0-04 | **17 كنترولر** في admin-web-core, care, home-care, hospital, labs, pharmacy, providers, radiology | إزالة `api/v1` المكررة من `@Controller()` — كانت المسارات تُسجّل على `/api/v1/api/v1/...` (غير قابلة للوصول). **أُعيد إحياء: مسارات مالية الأدمن، الحوكمة، الإعدادات، system-health، محافظ المستشفى/المعمل/الأشعة، اعتماد المزودين، محرك الطبيب** |
| M0-05 | `src/modules/payments/paymob.service.ts` | إكمال تحقق HMAC: قراءة الحقول من `payload.obj` (المكان الصحيح)، رفض غياب التوقيع، مقارنة `timingSafeEqual` ضد هجمات التوقيت |
| M0-06 | `.env`, `.env.development` | **حُذفا من المشروع** — + `.gitignore` جديد يمنع أي `.env` مستقبلًا + خطوة `gitleaks` إلزامية في CI قبل البناء |
| M0-07 | `src/main.ts` | `MongoMemoryServer`: يُرفض كليًا في الإنتاج (throw) + استيراد كسول ليبقى dev/test فقط |

### 2️⃣ NabdProvider (3 تعديلات)

| المهمة | الملف | التغيير |
|---|---|---|
| M0-09 | `index.ts` | **جديد** — نقطة دخول صريحة `registerRootComponent(App)` |
| M0-09 | `package.json` | `main`: `node_modules/expo/AppEntry.js` ← `index.ts` |
| M0-10 | تنظيف | حذف مجلد `{src` المشوّه و`__MACOSX` و`.DS_Store` من الأرشيف |

### 3️⃣ Napd-admin/web-admin (3 تعديلات)

| المهمة | الملف | التغيير |
|---|---|---|
| M0-11 | `src/pages/login.tsx` | **جديد** — شاشة دخول الأدمن الكاملة: بيانات اعتماد ← تحقق ثنائي OTP (يدعم `requires_2fa` الإلزامي للأدمن في الباك إند) ← تخزين الجلسة ← توجيه للوحة |
| M0-11 | `src/pages/index.tsx` | استبدال قالب Next.js الافتراضي بتوجيه ذكي: موثّق ← `/admin/dashboard`، غير موثّق ← `/login` |
| M0-12 | (موثّق) | توحيد مفاتيح الجلسة: `admin_token` / `admin_refresh_token` / `admin_role` / `admin_user` — والعميل يعتمد `NEXT_PUBLIC_API_URL` (الافتراضي `localhost:8002` الصحيح بدل 3000 الخاطئ في التطبيق القديم) |

### 4️⃣ الجذر المشترك

| الملف | الغرض |
|---|---|
| `ENVIRONMENTS.md` | دليل البيئات الثلاث (dev/staging/prod): تشغيل الباك إند، لوحة الأدمن، التطبيقين بـ Expo Go، زرع الأدمن، القواعد الصارمة الجديدة |

---

## ما الذي تحقّق عمليًا؟

| الفحص | النتيجة |
|---|---|
| بقاء أي `@Controller('api/v1...` | **صفر** (كان 17) |
| بقاء bcrypt بـ 8 جولات خارج الاختبارات | **صفر** (كان 12 موضعًا) |
| بقاء مراجع `seedAdmin`/`this.otps` | **صفر** |
| `tsc --noEmit` للباك إند كاملًا (602 ملف) | ✅ صفر أخطاء |
| `nest build` | ✅ ناجح — `dist/main.js` |
| `next build` للوحة الأدمن | ✅ ناجح — 15 مسارًا منها `/login` |

## ما لم يُنجز بعد (ضمن M0 الأصلية — منقول للمرحلة التالية)
- M0-06 (الجزء الخاص بمستودع GitHub): تنقية `.env` من **تاريخ Git** للمستودع الأصلي تحتاج `git filter-repo` على نسختك — أنصح به عند الرفع.

**المرحلة التالية عند إشارتك: M1 — التوصيل الفعلي لتطبيق المريض (حذف طبقة الـ Mock وربط 157 شاشة بالباك إند الحقيقي).**
