# سجل تغييرات المرحلة M7 — الجودة الشاملة (الدفعة الأولى)
**التاريخ:** 24 يوليو 2026 · **النطاق:** nabdah-backend (اختبارات + إصلاحات إنتاجية + أداء)

---

## 1. الاختبارات — النتيجة النهائية

| المؤشر | قبل M7 | بعد M7 |
|---|---|---|
| الأجنحة | 20 (5 فاشلة) | **23 (صفر فاشل)** |
| الاختبارات | 113 (6 فاشلة) | **184 (صفر فاشل)** |
| tsc --noEmit | نظيف | نظيف |

### إصلاح المواصفات القديمة (خط الأساس)
- `auth.service.spec.ts`: mock لـ RedisService (أُضيف للكونستركتور في M0) + تصحيح assertion توكن convertGuest (صار كائن `{accessToken, refreshToken}`).
- `pharmacy-broadcast.service.spec.ts`: mock لـ RedisService + تصحيح مسار الاستيراد.
- `procurement.service.spec.ts`: معرفات ObjectId صالحة بدل نصوص وهمية + تحديث توقعات adminStartReview (صار guard بلا save في المواصفة الجديدة).

### اختبارات حرجة جديدة (65 اختبارًا)
1. **`insurance-engine/tests/insurance-flow.spec.ts` (26)** — BR-2 كاملًا:
   - decide: approve_full (copay=0) / approve_partial (copay = price×%) / reject (السبب إلزامي) / رفض القيم 0/سالبة/≥100 / مزود آخر ممنوع / admin مسموح / الطلب المُقرر مسبقًا ممنوع.
   - payCopay: APPROVED_FULL بلا دفع / COPAY_PENDING يتطلب payment_id / مريض غريب ممنوع / حالة خاطئة ممنوعة.
   - cancel: ممنوع بعد الدفع، مسموح قبله.
   - Quote (BR-1): القنوات العشرة online-only بلا clinic_pay / insurance أولًا عند الطلب / SAR افتراضي.
   - RefundService: نوافذ (>24س=100%، 4–24س=50%، <4س=0%، موعد فائت=0%)، حساب refund_amount، منع طلب مكرر.
2. **`billing/tests/billing-zatca.spec.ts`** — ZATCA Phase 1:
   - TLV QR يُفك لوسوم 1–5 بالترتيب، القيم صحيحة (بائع عربي UTF-8/رقم ضريبي/ISO/إجمالي/ضريبة)، بايت الطول = طول البايتات الفعلي للعربية، متجه مرجعي ASCII مطابق، استخراج VAT 15% الشامل (115→15، 100→13.04…).
   - صار `tlvQr` مُصدَّرًا من billing.module.ts.
3. **`care/tests/appointments-states.spec.ts` (13)** — آلة الحالات:
   - دورة مغلقة PENDING→CONFIRMED→CHECKED_IN→IN_PROGRESS→COMPLETED، الحالات النهائية بلا مخرج.
   - رفض التحولات غير الصالحة قبل الوصول لـ WorkflowEngine.
   - التحول الصالح: ختم confirmed_at + state_history + حدث `appointment.confirmed`.
   - الإلغاء: مريض >24س (100% للمصدر) / <24س (50% للمحفظة) / no-show (0%) / طبيب (100% + غرامة 50ر) / غريب ممنوع / admin مسموح.
   - reschedule: القديم RESCHEDULED + جديد CONFIRMED بنفس المدة + رفض ماضٍ قريب.

## 2. أخطاء إنتاجية حقيقية اكتُشفت وأُصلحت

| # | الخلل | الأثر الإنتاجي | الإصلاح |
|---|---|---|---|
| 1 | `require('pdfmake/js/printer')` | انهيار على لينكس (حساس لحالة الأحرف) عند توليد تقارير المختبر PDF | `pdfmake/js/Printer` في lab-pdf.service.ts |
| 2 | CarePlan/HomeCarePackage/MedicalSupplyRequest schemas مفقودة من home-care.schema.ts | فشل إقلاع الوحدة (forFeature بمخطط undefined) | أُضيفت المخططات الثلاثة كاملة |
| 3 | HomeCareBookingState غير مستورد في home-care.service | ReferenceError عند أول check-in ممرضة | أُضيف للاستيراد |
| 4 | check-in ينشئ تقريرًا بـ `home_care_order_id` وبلا booking_id المطلوب | فشل validation + سقوط حقول (GPS/أوقات) | booking_id+patient_id، وتوسيع مخطط NursingVisitReport (check_in/out_time, gps_lat/lng, completed_tasks, vitals_logged) |
| 5 | حقول حجز مفقودة من المخطط (service_id, patient_name/phone, service_name_en, notes, sessions_count) | سقوط صامت للبيانات عند الحفظ | أُضيفت لـ HomeCareBooking |

**القاسم المشترك:** كلها كانت مختبئة خلف `// @ts-nocheck` — الدليل العملي على أولوية إزالته.

## 3. الأداء (ER-10)
- فحص آلي لأنماط N+1 (await داخل حلقات): 30 نقطة، منها المزروعات مقبولة.
- **أُصلح:** `orders.service.createOrder` — الأدوية تُجلب دفعة واحدة `find({id:{$in}})` + Map بدل findOne لكل عنصر في أكثر مسار كتابة سخونة.
- **مقبول بمبرر موثق:** hasSlotsToday لكل طبيب (كسر مبكر بالحد)، expireStale (cron)، مطابقة $or في pharmacy-broadcast/shortage (إعادة تصميم مؤجلة).

## 4. استراتيجية @ts-nocheck (بدأت)
- 204 ملفات backend تحمل الراية؛ القرار: إزالة تدريجية موجهة بالحرجية لا big-bang.
- **الدفعة الأولى:** 6 ملفات home-care (service + 5 repositories) — صفر أخطاء TypeScript متبقية، وكشفت الخللين 3 و4 أعلاه.
- الترتيب القادم: auth ← notifications ← appointments ← labs/radiology ← billing.

## 5. التحقق
```
Test Suites: 23 passed, 23 total
Tests:       184 passed, 184 total
tsc --noEmit: 0 errors
```

## 6. التسليم
- فرع GitHub: `m7-quality` — **مؤجل: رصيد الدفع (token) غير متاح في جلسة الصندوق الحالية؛ يُرفع فور توفّره (المحتوى كامل في الزيب)**.
- زيب: `nabdah-backend-M7.zip`.
- الملفات المتغيرة: procurement.service.spec · auth.service.spec · pharmacy-broadcast.service.spec · insurance-flow.spec (جديد) · billing-zatca.spec (جديد) · appointments-states.spec (جديد) · lab-pdf.service · home-care.schema · home-care.service · repositories×5 · orders.service · billing.module.

---

# الملحق: الدفعة الثانية (24/07 مساءً) — صفر @ts-nocheck كلي + صفر موك إنتاجي

## أ) @ts-nocheck: 204 → 0 في الباك إند كاملًا
بعد الإزالة الشاملة ظهرت **109 أخطاء TypeScript حقيقية** أُصلحت جميعها. أبرز ما انكشف:
| # | الخلل | الأثر |
|---|---|---|
| 1 | app.module يستورد chat.controller غير الموجود + تكرار ProviderOpsModule | إقلاع/تسجيل |
| 2 | FCM مكسور: واجهة firebase-admin v11 مع v14 مثبّتة | كل push عبر FCM كان سيفشل |
| 3 | ROLE_PERMISSIONS ناقص 5 أدوار | صلاحيات فارغة لأدوار تشغيلية |
| 4 | حالات غير معرّفة في enums (Lab CREATED / Nursing PROVIDER_ASSIGNED+CANCELLED / Radiology SCHEDULED / RESULT_READY) | فشل validation عند الحفظ |
| 5 | family.getMemberHealth: this.connection غير موجود + memberId غير معرّف | انهيار مؤكد عند الاستدعاء |
| 6 | حقول مفقودة من مخططات (رسوم منزلية/مواصلات، phone_e164، business_name، حقول تقرير الزيارة) | سقوط صامت للبيانات |
| 7 | مستودعا ProviderAvailability يشيران لمخطط يتيم + account_id خاطئ | توفر المزود لا يعمل إطلاقًا |
| 8 | ServiceOwnership يفحص provider_account_id غير الموجود | كل مزود غير admin مرفوض دائمًا |
| 9 | مستودعات بأنواع Document خاطئة + distinct مفقود + 31 استيراد `any` مولّد + appointment.repository من extra.schemas | أنواع/إقلاع |
| 10 | ترتيب وسيطات ioredis SET NX/EX في قفل الحجز | القفل قد لا يُطبق |

## ب) صفر موك/بليس هولدر إنتاجي
1. محفظة الممرضة: لا أرصدة وهمية (1250/400/معاملة mock) — قيم حقيقية.
2. loyalty: لا بذر مكافآت وهمي — من DB فقط.
3. detectFraud: كشف حقيقي (velocity حجوزات/مدفوعات فاشلة) بدل تنبيهات مختلقة.
4. **حذف كنترولرين وهميين** (AIB2B + PharmacyReturns) كانا يطمسان Gemini الحقيقي وReturnsModule الحقيقي (استرداد محفظة فعلي).
5. LeaveRequests: مخطط + CRUD حقيقي بدل قائمة ثابتة.
6. radiology: referring_doctor_id حقيقي بدل 'APT-1234'.

## ج) سوكت المزود (NabdProvider)
- DoctorDashboard: `(user)?.token` فارغ غالبًا ← `auth:(cb)` مع Tokens.getAccess من Vault.
- PharmacyChatResponder: بلا auth إطلاقًا ← نفس الإصلاح. (المريض متوافق مسبقًا بمسارين.)

## د) أداء
- Sentry tracesSampleRate: 0.1 إنتاجي / 1.0 تطوير.
- GeoSpatial 2dsphere: **غير مُضاف عمدًا** — المواقع {lat,lng} مع haversine؛ التحويل لـ GeoJSON دين M8 موثق.

## هـ) البوابات النهائية (كلها خضراء)
```
tsc --noEmit : 0 errors (204 ts-nocheck محذوفة)
jest         : 184/184 (23 suites)
nest build   : success (dist/main.js)
```
الملفات: 205 محدثة + 4 جديدة (callsession.schema · callmetric.schema · leave-request.schema · اختبارات سابقة) — كلها تحقق md5.


---

# الملحق 2: الاختبار الحي E2E + رفع GitHub (24/07)
- بيئة حية داخل الصندوق: Mongo+Redis حقيقيان (in-memory binaries) + بناء إنتاجي — **16/16 مسارًا ذهبيًا PASS**.
- فجوات انكشفت وأُصلحت: تسجيل DoctorsModule · RolesGuard عالميًا + قاعدة /admin/* النظامية (21 كنترولرًا كان مكشوفًا) · استعادة تكامل المقالات في seo.service (فُقد من الماونت).
- بذر حي مثبت: 10 شركات تأمين + 3 مقالات (تظهر في sitemap وSEO meta).
- **الرفع:** فرع `m7-quality` مدفوع إلى github.com/obaid08642-ops/new بنجاح (الزيبات الأربعة + السجلات + السياق).
- وثيقة المتغيرات: `متغيرات_البيئة_المطلوبة.md` (مستخرجة من الكود: ~70 متغيرًا مصنفة إلزامي/ميزة/اختياري).

---

## ملحق 24/07 — الاختبار الحي الشامل (65/65) وإصلاحاته

### المنهج
بُنيت بيئة اختبار حقيقية داخلية (MongoDB + Redis حقيقيان + dist إنتاجية) وشُغّلت مصفوفة 65 سيناريو حيًا تغطي: كل أنواع الاستشارات × كل طرق الدفع، دورة التأمين كاملة، الصيدلية، التحاليل/الأشعة/التمريض، جهة المزود، لوحة الأدمن (بما فيها الحظر)، الإشعارات المجدولة، السوكيت بـ JWT، مكالمات LiveKit، SEO/GEO، ونوافذ الاسترداد.

**النتيجة النهائية: 65 ناجح / 0 فاشل / 0 متخطى** (الحزمة في `nabdah-backend/e2e/`).

### الملفات المعدلة في هذه الجلسة
| الملف | الإصلاح |
|---|---|
| `src/modules/auth/auth.service.ts` | تحصين NoSQL injection (assertString) + بديل OTP للتطوير |
| `src/common/enums.ts` | `PROVIDER_ROLES` + `isProviderRole()` |
| 13 ملفًا provider/pharmacy/custom-services | assertProvider ← isProviderRole |
| `src/modules/orders/dto/create-order.dto.ts` | decorators كاملة (كان كل الطلبات مرفوضة) |
| `src/modules/orders/orders.service.ts` + `src/schemas/order.schema.ts` | توحيد insurance_status (NONE/PENDING كبيرة) |
| `src/modules/patient-ux/patient-ux.module.ts` | نموذج `PatientUxRefund` (حل تصادم RefundRequest) |
| `src/modules/insurance-engine/insurance-engine.module.ts` | سبب الاسترداد إلزامي 400 بدل 500 |
| `src/modules/redis/redis.service.ts` | إعادة كتابة كاملة — بديل ذاكري مرن + `redisUrlFromEnv()` |
| `src/modules/push/push.module.ts` + `unified-bookings.service.ts` | توحيد قراءة بيئة Redis |
| `src/modules/socket/socket.gateway.ts` | **حذف** (بوابة ميتة بلا مصادقة) |
| `src/modules/notifications/notifications.service.ts` + controller | قبول title/body + 400 واضحة |
| `src/modules/admin/admin.controller.ts` | `GET /admin/users` + `POST /admin/users/:id/ban|unban` |
| `src/modules/seo/seo.service.ts` + controller | فلتر type:'doctor' في sitemap + **llms.txt** حي |
| 3 ملفات spec | مزامنة مع التغييرات (184/184 خضراء) |
| `e2e/` (جديد) | حزمة الاختبار الحي: boot.js + matrix.js + README |

### بوابات: tsc=0 · jest=184/184 · build=نجاح · E2E=65/65
