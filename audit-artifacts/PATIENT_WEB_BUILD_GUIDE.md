# دليل بناء نسخة الويب من تطبيق المريض — Next.js
**منصة نبض | للمبرمج المسؤول عن الويب | أغسطس 2026**

> مرفق مع هذا الدليل: ملف `nabd-patient-api-openapi.json` — مواصفة OpenAPI 3 حقيقية مستخرجة آلياً من كود الباك إند المنشور (1234 مساراً). استورده مباشرة في Postman/Insomnia أو أي مولّد عملاء.

---

## 1. أساسيات الربط

| البند | القيمة |
|---|---|
| Base URL | `https://api.nabd.plus/api/v1` |
| البروتوكول | HTTPS فقط — كل الطلبات `application/json` إلا رفع الملفات |
| بيئة الاختبار | لا توجد بيئة staging — الاختبار على API الإنتاج **بحسابات Sandbox معزولة فقط** (انظر §6) |
| المصادقة | JWT Bearer في الهيدر: `Authorization: Bearer <accessToken>` |
| اللغة | المسارات تقبل query أو body حسب المواصفة؛ المحتوى الطبي ثنائي اللغة (ar/en) |

**ممنوعات مطلقة:** لا تلمس أي حساب غير sandbox، لا بيانات مرضى حقيقية، لا دفعات حقيقية. أي حساب تجريبي ينتهي بـ `.sandbox@nabd.plus`.

## 2. عقود المصادقة (الأهم)

### تسجيل الدخول
```
POST /auth/login
Body: { "identifier": "<email-or-phone>", "password": "..." }
Response 200: { "user": {...}, "token": { "accessToken": "...", "refreshToken": "..." } }
```

### التحقق بخطوتين (OTP)
- بعض التدفقات تعيد `requires_2fa: true` → أكمل عبر `POST /auth/login/verify-2fa`
- صلاحية OTP: **5 دقائق**

### التجديد والخروج
```
POST /auth/refresh        Body: { "refreshToken": "..." }
POST /auth/logout         Bearer required
```

### نمط مصادقة الويب المعتمد (مهم لـ Next.js)
- خزّن الـ access token في **الذاكرة أو httpOnly cookie** — ممنوع localStorage للتوكن في الويب (حماية XSS)
- نفّذ طبقة refresh تلقائية: عند 401 جرّب `/auth/refresh` مرة واحدة ثم أعد الطلب؛ عند فشل التجديد وجّه لصفحة الدخول
- كل الأخطاء تعيد الشكل الموحد: `{ "statusCode": n, "message": "...", "error": "..." }`

## 3. مجموعات الـ API الخاصة بتطبيق المريض

المصدر الكامل في ملف OpenAPI المرفق. هذه المجموعات التي يستهلكها تطبيق المريض فعلياً:

| المجموعة | البادئة | أمثلة |
|---|---|---|
| المصادقة والحساب | `/auth/*` (23 مساراً) | login, register, refresh, verify-2fa, forgot/reset password |
| الملف الطبي | `/medical-profile/*` | القياسات، الحساسية، الأمراض المزمنة |
| الأطباء والحجز | `/doctors/*`, `/care/*`, `/booking/*`, `/unified-bookings/*` | البحث عن طبيب، حجز موعد، تتبع الحجز |
| الاستشارات والمكالمات | `/consultations/*`, `/calls/*` | تفاصيل الاستشارة، الانضمام لمكالمة فيديو |
| الوصفات | `/prescriptions/*` | عرض وصفات المريض، رفع روشتة مصوّرة |
| الصيدلية | `/pharmacy/*`, `/cart/*`, `/medicines/*` | تصفح الأدوية، السلة، تتبع الطلب |
| المختبرات والأشعة | `/labs/*`, `/radiology/*` | حجز تحاليل/أشعة، تقارير PDF |
| التمريض المنزلي | `/home-care/*`, `/nursing/*` (الحجز من جانب المريض) | طلب زيارة منزلية |
| الطوارئ | `/emergency/*` | نداء استغاثة، أقرب منشأة |
| المحفظة والدفع | `/wallet/*`, `/payments/*`, `/moyasar/*` | الرصيد، الشحن، حالة الدفع |
| العائلة | `/family/*` | إضافة تابعين، الحجز لهم |
| الإشعارات | `/notifications/*`, `/push/*` | السجل، تسجيل توكن الجهاز |
| الذكاء الاصطناعي | `/ai/triage` (يستلزم Bearer) | الفرز الأولي للأعراض |
| الولاء والعروض | `/loyalty/*`, `/promotions/*` | النقاط والكوبونات |
| الدعم والمجتمع | `/support/*`, `/community/*` | التذاكر، المقالات |
| القانوني | `/legal/*` | السياسات، القبول |

**قواعد أمان يجب احترامها في الواجهة:**
- أي مورد لا تملكه يعيد **403 أو 404 عمداً** (إخفاء الوجود) — لا تعرض رسائل تكشف وجود بيانات
- لا تعرض أسعاراً أو بيانات من caches قديمة — كل شيء من السيرفر
- لا توجد بيانات وهمية في الإنتاج — إن وُجدت شاشة بلا API موثق في ملف OpenAPI فهي فجوة، اسأل قبل التخمين

## 4. عقود رفع الملفات

```
POST /media/presigned     → يعيد رفعاً مُوقّعاً (presigned URL) لمسار S3
POST /media/upload        → رفع مباشر multipart/form-data
DELETE /media/{key}       → حذف (المفتاح قد يحوي مسارات متداخلة a/b/c.pdf)
```
النمط المعتمد: اطلب presigned → ارفع الملف للرابط الموقّع مباشرة → مرّر الـ key في الطلب الوظيفي (مثل رفع روشتة `POST /prescriptions/upload`).

## 5. الوقت الحقيقي (Realtime) والفيديو

- **SSE/Realtime:** `GET /realtime/stream` + اشتراكات الحجوزات `/realtime/booking/{type}/{id}` — البث مسموح فقط للقنوات المدعومة؛ أي قناة عشوائية تُرفض (`unsupported_channel`)
- **مكالمات الفيديو (LiveKit):** عبر دورة `/calls/*`: initiate → join (يعيد توكن الغرفة) → webhook داخلي. التوكن يصدر من الباك إند فقط — لا تولّد شيئاً في العميل
- غرفة انتظار المواعيد تتطلب مشاركاً موثّقاً وحالة مفتوحة

## 6. حسابات Sandbox للاختبار (كلمة المرور الموحدة: `Sandbox@123`)

| الدور | الحساب | ملاحظات |
|---|---|---|
| مريض 1 (مالك) | `patient.sandbox@nabd.plus` | له طلبات موجودة |
| مريض 2 (غريب) | `patient2.sandbox@nabd.plus` | لاختبارات BOLA/الصلاحيات |
| مريض طبيب | `doctor.user.sandbox@nabd.plus` | — |

طلب اختبار جاهز: ID `91047ef2-ad36-422a-a184-629693e7c729` (مملوك لمريض 1، ملغي) — توقع 200 للمالك و403/404 للغريب.

---

## 7. قواعد البناء الأساسية لتطبيق الويب (Next.js)

### المعمارية
1. **Next.js App Router + TypeScript صارم** (`strict: true`) — لا `any` إلا بحدود
2. **فصل الطبقات:** `services/` (استدعاءات API عبر عميل axios/fetch موحد) ← `hooks/` ← مكونات العرض. ممنوع استدعاء API داخل المكونات مباشرة
3. **عميل API واحد** يضيف Bearer تلقائياً، يعالج 401/refresh، ويعيد الأخطاء بشكل موحد
4. **React Query (TanStack)** لكل البيانات القابلة للتخزين المؤقت + invalidation بعد كل mutation
5. **Server Components** للمحتوى العام (مقالات، أطباء، تسويق) وClient Components للتفاعل فقط
6. **Zod** للتحقق من كل form وكل response حرج — لا تثق بالمدخلات ولا بالشبكة
7. **بيئة:** `NEXT_PUBLIC_API_BASE_URL` فقط للعام؛ أي سر يبقى في السيرفر (Route Handlers)

### الترجمة والـ RTL (إلزامي)
8. `next-intl` أو `next-i18next` — **العربية هي الافتراضية**، الإنجليزية ثانوية
9. اتجاه `dir="rtl"` / `ltr"` على مستوى `<html>` حسب اللغة، مع خط عربي واضح (مثل IBM Plex Sans Arabic)
10. كل نص عبر مفاتيح ترجمة — ممنوع نصوص مثبتة في المكونات
11. روابط معلّمة باللغة: `/ar/...` و`/en/...` عبر i18n routing

### SEO / GEO / AEO / ASO
12. **Metadata API** لكل صفحة: title/description/canonical/`hreflang` ثنائي اللغة، OpenGraph + Twitter cards
13. **Structured Data (JSON-LD):** `MedicalWebPage`, `Physician`, `MedicalClinic`, `FAQPage`, `BreadcrumbList` — أساسي للظهور في إجابات الذكاء الاصطناعي (AEO) ومحركات البحث
14. **SSG/ISR** للصفحات العامة (الأطباء، التخصصات، المقالات) — لا تجعلها client-rendered
15. `sitemap.xml` و`robots.txt` ديناميكيان من Next.js، مع فصل اللغات
16. سرعة: صور `next/image`، خطوط `next/font`، حزم مقسّمة، Core Web Vitals خضراء (LCP < 2.5s)
17. **GEO/AEO:** محتوى المقالات والأسئلة الشائعة بصيغة سؤال/جواب مباشرة، عناوين H واضحة، وفقرات قصيرة قابلة للاقتباس من نماذج الذكاء الاصطناعي
18. **ASO:** الويب سيرتبط بالتطبيق — جهّز `apple-app-site-association` و`assetlinks.json` للروابط العميقة (Universal Links / App Links)

### الأمان والجودة
19. CSP + Helmet headers، ممنوع `dangerouslySetInnerHTML` إلا مع sanitization
20. لا أسرار في الكود أو الريبو — مفاتيح env فقط
21. اختبارات: Vitest للوحدات + Playwright لمسارات الدخول/الحجز/الدفع الحرجة
22. لا بيانات وهمية في أي مسار إنتاجي — skeleton loaders بدلاً منها

### قابلية التطور
23. مكونات design system موحدة (shadcn/ui + Tailwind مقترح) متوافقة مع RTL
24. feature flags للميزات التجريبية، وهيكل مجلدات بالميزة (`features/booking/...`)
25. كل شاشة تُبنى فقط على endpoints موثقة في ملف OpenAPI المرفق — أي فجوة تُسأل عنها، لا تُخمَّن

---

**جهة الاعتماد:** أي شاشة أو تدفق غير مغطى في OpenAPI أو هذا الدليل يُرفع للمراجعة قبل التنفيذ.
