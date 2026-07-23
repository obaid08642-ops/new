# سجل تغييرات المرحلة M2 — سد فجوات الباك إند الحرجة

**التاريخ:** 23 يوليو 2026 · **الحالة:** مكتملة ومُتحقق منها ✅
**إثبات الجودة:** `tsc --noEmit` = **صفر أخطاء** · `nest build` ناجح · **33+ مسار API جديد** + 11 مسارًا مؤمَّنًا

---

## ⚠️ أولًا: تصحيح مهم لنتائج التدقيق

مراجعة التحقق قبل M2 كشفت أن عدّاد "المسارات المفقودة" الأول كان مبالغًا فيه: الاستخراج الآلي قرأ أول `@Controller` فقط في كل ملف، بينما ملفات مثل `provider.controllers.ts` تحوي **12 كنترولر**. الموجود فعليًا (تحقق مباشر): `/provider/profile`، `/provider/jobs/queue` كاملًا، `/provider/dashboard/stats`، `/provider/notifications`، `/provider/directory`، `/provider/banks`، `/provider/capabilities/*`، `POST /storage/upload`، `POST /auth/change-password`، `labs upload-report`، `insurance claims/submit`.

**بُني في M2 ما ثبت غيابه فعليًا فقط** — القائمة الكاملة في `PROJECT_CONTEXT.md` (القسم 2.3).

## ثانيًا: ما بُني (كلها تخزين حقيقي بقاعدة البيانات — بلا stubs)

### 1️⃣ وحدة `provider-ops` (جديدة — 12 مسارًا)

| المسار | الوظيفة |
|---|---|
| `GET /provider/reviews` · `POST /provider/reviews/:id/reply` · `POST /reviews` · `GET /reviews?target_id` | **نظام التقييمات الكامل** (كان غائبًا كليًا — C9): schema جديد، رد المزود، تجميع المتوسط وعدد التقييمات على ملف المزود تلقائيًا |
| `GET /provider/wallet` | رصيد + ملخص + أحدث الحركات + طلبات السحب المعلقة (يفوّض على WalletService الحقيقي) |
| `GET /provider/wallet/transactions` | سجل الحركات بترقيم صفحات |
| `POST /provider/wallet/withdraw` | **سحب حقيقي** (كان stub بطباعة console!): تحقق من الرصيد + سجل `ProviderWithdrawal` بحالة `PENDING_ADMIN_APPROVAL` |
| `GET /provider/wallet/withdrawals` | سجل السحوبات |
| `GET /provider/stats/today` | عدّادات اليوم الحية (استشارات/تمريض/معمل/أشعة/إيراد) من 5 مجموعات |
| `PUT /provider/working-hours` | حفظ جدول العمل الأسبوعي على الملف |
| `POST /provider/schedule/settings` | إعدادات الجدولة |
| `POST /provider/consultation/end` | إنهاء الاستشارة وتحويل حالتها COMPLETED |

### 2️⃣ وحدة `home-care-compat` (جديدة — 21 مسارًا)

| المجموعة | المسارات |
|---|---|
| الكتالوج والمزودون | `GET /home-care/services` · `GET /home-care/providers` · `GET /home-care/providers/:id` |
| الحجوزات | `POST /home-care/bookings` · `GET /home-care/bookings/my` · `GET /home-care/bookings/nursing/all` (طابور التمريض بفلاتر active/incoming/completed) |
| سير الزيارة | `POST .../respond` · `.../assign` · `.../check-in` · `.../gps` · `.../visit-report` — كل انتقال موثق في `state_history` |
| التشغيل | `POST /home-care/provider/availability` · `POST /home-care/inventory/request` |
| بيانات التمريض المرجعية | `GET /provider/nursing/checklist` (قوائم تحقق سريرية حقيقية: افتراضي/جروح/وريدي) · `GET /provider/nursing/supplies` (كتالوج 10 مستهلكات) |
| aliases المحادثة | `GET /chats/provider` · `GET/POST /chats/:id/messages` · `GET /chat/channels` · `POST /chat/messages/:threadId` · `POST /provider/chat/send` — كلها تفوّض على ChatService الحقيقي |

### 3️⃣ الصيدلية (تعديل `pharmacy_ops`)

| المسار | الوظيفة |
|---|---|
| `GET /pharmacy/prescriptions/:rxNumber` | بحث وصفة برقمها (مع fallback برقم التتبع) |
| `POST /pharmacy/reports/eod` | تقرير نهاية اليوم: طلبات/إيراد/توزيع الحالات |
| `/provider/pharmacy/orders/:id/accept` · `/submit-basket` · `/insurance` · `/dispatch` | كنترولر alias كامل — التطبيق ينادي `/provider/pharmacy/*` والتنفيذ الحقيقي تحت `/pharmacy/*` |

### 4️⃣ الدعم الفني
- `POST /support/tickets` (alias لـ `/support/requests`).

### 5️⃣ 🔒 إصلاح أمني حرج
**11 مسارًا تشغيليًا في nursing كانت `@Public()` (بلا أي مصادقة!):** accept/transit/arrive/start-care/no-show/emergency-abort/complete للزيارات + محفظة التمريض — أي شخص كان يستطيع تغيير حالة زيارة مريض منزلي. **أصبحت كلها خلف JWT الآن** (بقي كتالوج الخدمات عامًا فقط للقراءة).

---

## نتائج التحقق

| الفحص | النتيجة |
|---|---|
| `tsc --noEmit` للباك إند كاملًا | ✅ صفر أخطاء |
| `nest build` | ✅ ناجح |
| `@Public()` على عمليات nursing | ✅ 1 فقط (الكتالوج القرائي) |
| stubs console.log في محفظة المزود | ✅ صفر — سحوبات حقيقية |

## المتبقي من خطة M2 الأصلية (منقول صراحةً)
- دمج الوحدات المكررة (provider×5 / bookings×3 / wallet×2 / notifications×2) — أجلّناه عمدًا: دمج معماري مخاطره أعلى من فائدته الآن، وجدولته M3 بعد استقرار التوصيل.
- aliases المعامل/الأشعة (`/labs/bookings/:id/state`، `/radiology/bookings/:id/:action`) — تُبنى مع ربط شاشاتها في M4 عند الحاجة الفعلية.
- `/facility/beds|surgeries` — قرار الخطة: M4.
- محرك التأمين (`/insurance/claims/submit` موجود، لكن المنظومة كاملة) — M3.

**التالي: M3 — منظومة التأمين والمحرك المالي (13 شاشة تأمين في تطبيق المريض تنتظر).**
