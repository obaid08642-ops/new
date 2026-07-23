# 🧠 ملف السياق المرجعي — مشروع منصة نبضة بلس
> **الغرض:** مرجع دائم يُقرأ أول كل جلسة عمل ويُحدَّث آخرها. يمنع نسيان أي وصف أو إصلاح أو قرار.
> **آخر تحديث:** 23 يوليو 2026 — بعد اكتمال M0 + M1 + M2 + M3 (كلها مرفوعة على GitHub ومُتحقق منها ببناء أخضر).

---

## 1. المشاريع ومواقعها

| المشروع | مسار العمل (حيث تُجرى التعديلات) | التقنية |
|---|---|---|
| الباك إند | `/mnt/agents/output/projects/nabdah-backend` | NestJS 10 + MongoDB/Mongoose + Redis/BullMQ + Socket.io + LiveKit |
| تطبيق المريض | `/mnt/agents/output/projects/nabd_plus` | Expo RN 54 + expo-router + Redux Toolkit |
| تطبيق المزود | `/mnt/agents/output/projects/NabdProvider` | Expo RN + React Navigation + Axios |
| لوحة الأدمن | `/mnt/agents/output/projects/Napd-admin/web-admin` (المعتمدة) + `Napd-admin/frontend` (CRA — قرار أرشفتها M0) | Next.js 13 |

**المستودع:** `github.com/obaid08642-ops/new` — الفروع:
- `main` = الأصل (لا يُمسّ)
- `m0-fixes` = حزمة M0 ✅ مرفوعة
- `m1-patient-integration` = حزمة M1 ✅ مرفوعة (مبنية على m0-fixes)
- الرفع يتم بزيبات محدّثة + ملفات CHANGELOG على كل فرع. التوكن يُطلب من المستخدم عند كل دفعة رفع (لا يُخزَّن في أي ملف إطلاقًا).

**قواعد عمل مثبتة:**
- البناء/الفحص يتم في `/tmp` (النسخ على القرص المحلي) لأن `npm install` على `/mnt/agents` بطيء وينقطع — ثم تُنقل النتائج.
- `/tmp` يُمسح بين الجلسات — كل شيء مهم يبقى في `/mnt/agents/output`.
- الحذر من rsync: `rsync src dest/` مع dest غير موجود ينشئ التداخل الصحيح؛ حدث تداخل `nabd_plus/nabd plus` سابقًا وأُصلح.
- التحقق من أي ملف مخفي (`.gitignore`) بعد العمليات — فُقد مرة وأُعيد إنشاؤه.

---

## 2. ملخص نتائج التدقيق الأصلي (مُصحَّح بعد مراجعة التحقق)

### 2.1 النتائج الحرجة المؤكدة (لم تتغير)
| الكود | النتيجة | حالة الإصلاح |
|---|---|---|
| C1 | تطبيق المريض: `utils/api.ts` Mock كامل — 157/239 شاشة بلا شبكة، بما فيها الدخول | ✅ **أُصلح M1** |
| C2 | 17 كنترولر ببادئة مزدوجة `/api/v1/api/v1` | ✅ **أُصلح M0** |
| C3 | زرع أدمن ثابت `Admin@123` عند الإقلاع | ✅ **أُصلح M0** |
| C5 | منظومة التأمين شبه معدومة (مسار واحد) | ⏳ مجدولة M3 |
| C6 | لا شاشة دخول أدمن + index قالب افتراضي | ✅ **أُصلح M0** |
| C7 | عقود الفيديو/الطوارئ/المحادثة منقطعة | ✅ **أُصلح M1** (+مسار `emergency/my/active` جديد) |
| C8 | OTP في Map بالذاكرة | ✅ **أُصلح M0** (Redis) |
| C9 | لا APIs تقييمات إطلاقًا | ⏳ **M2 — قيد البناء** |
| C10 | ازدواج Moyasar/Paymob + HMAC ناقص | ✅ HMAC أُكمل M0 · حسم البوابة الواحدة قرار معلّق |

### 2.2 ⚠️ تصحيح مهم لأرقام التدقيق (اكتُشف في مراجعة M2)
**منهجية الاستخراج الأولى كانت تقرأ أول `@Controller` فقط في كل ملف** — وملف `provider/provider.controllers.ts` يحوي **12 كنترولر**! لذلك كانت أرقام "المسارات المفقودة" مبالغًا فيها. الموجود فعليًا (تم التحقق بالقراءة المباشرة):
- `GET/PATCH /provider/profile` ✅ موجود
- `GET /provider/jobs/queue` ✅ موجود (ProviderJobsController كامل: accept/reject/start/complete/insurance)
- `GET /provider/dashboard/stats` + `dashboard/recent` ✅ موجود
- `GET /provider/notifications` ✅ موجود (+ read/read-all)
- `GET /provider/directory`, `GET /provider/banks` ✅ موجود
- `GET /provider/wallet` (withdraw فقط حاليًا — stub بطباعة console!) ⚠️ جزئي
- `provider/capabilities/*` (pharmacy/lab/radiology/doctor-sessions/home-care) ✅ موجود
- `provider/zones`, `provider/schedule-slots`, `provider/score`, `provider/requests` ✅ موجود
- `POST /auth/change-password` ✅ موجود (users.controller)
- `provider/settings/delta` ✅ موجود
- `labs upload-report`, `insurance claims/submit` ✅ موجودان
- `nursing/visits/:id/*` (respond/transit/arrive/start-care/no-show/emergency-abort/complete) ✅ موجود — لكن كلها `@Public()` (⚠️ ثغرة: بلا مصادقة!)

### 2.3 القائمة النهائية للفجوات الحقيقية (أساس بناء M2)
بعد فحص الوجود دفعة واحدة (23/07):

| المسار | الحالة | قرار M2 |
|---|---|---|
| `GET /provider/stats/today` | **MISSING** | بناء |
| `GET /provider/reviews` + `POST /provider/reviews/:id/reply` | **MISSING كليًا** | بناء نظام تقييمات (schema+service+controller) + تجميع متوسط على ProviderProfile |
| `GET /provider/wallet` (balance+summary) و`/wallet/transactions` | wallet module له `/wallet/balance` `/wallet/transactions` عامة | إضافة مسارات provider-scoped تفوض على WalletService + تحويل withdraw من stub لحقيقي |
| `POST /storage/upload` | **MISSING** | بناء (S3 presigned موجود backend — تعريضه) |
| `POST /support/tickets` | **MISSING** (support له /requests) | alias أو مسار جديد يفوض على SupportService |
| `PUT /provider/working-hours` | **MISSING** | بناء على ProviderProfile |
| `POST /provider/schedule/settings` | **MISSING** | بناء |
| `POST /provider/consultation/end` | **MISSING** | بناء (ينهي جلسة + يحدث الحالة + يفوض على care/livekit) |
| `POST /pharmacy/reports/eod` | **MISSING** | بناء تقرير نهاية اليوم |
| `GET /pharmacy/prescriptions/:rxNumber` | **MISSING** | بناء بحث وصفة برقمها |
| `/provider/pharmacy/orders/:id/*` (accept/insurance/submit-basket/dispatch) و`/provider/pharmacy/returns*` | pharmacy_ops لها `/pharmacy/orders/:id/*` | alias controller يفوض على PharmacyOpsService |
| `/home-care/services`, `/home-care/providers(/:id)`, `POST /home-care/bookings`, `/home-care/bookings/nursing/all`, `bookings/:id/respond|check-in|gps|visit-report|assign`, `/home-care/inventory/request`, `/home-care/provider/availability` | home-care module قاعدته `nursing` وبمسارات مختلفة + `@Public` | compat controller `/home-care` يفوض على خدمات nursing + **إضافة مصادقة** |
| `GET /provider/nursing/checklist`, `/provider/nursing/supplies` | **MISSING** | بناء (قوائم تحقق ومستهلكات من كتالوج) |
| `GET /nursing/jobs/active`, `POST /nursing/notes`, `POST /nursing/coverage/verify-gps` | جزئي | استكمال |
| aliases المحادثة: `/chat/channels`, `/chats/provider`, `/chats/:id/messages`, `/chat/messages/:id`, `POST /provider/chat/send` | chat له `/chat/threads/*` | alias controller يفوض على ChatService |
| `/labs/bookings/:id/state|emergency|reassign` | تحقق لاحق | alias عند الحاجة |
| `/radiology/bookings/:id/:action` | تحقق لاحق | alias عند الحاجة |
| `/facility/beds/*`, `/facility/surgeries/*`, `/provider/facility/*` (shifts/subaccounts/calendar/audit-logs/patients) | facility-ops module موجود جزئيًا | **مؤجل لـ M4** (قرار الخطة) — لكن إن وُجد وقت: stubs حقيقية بقاعدة |
| `/approval-workflow/requests` POST | module موجود — تحقق من المسار الدقيق | alias عند الحاجة |
| `GET /medicines` | medicines module (19 مسارًا) — تحقق | غالبًا موجود |
| `GET /provider/profile/image/status` + `POST /provider/profile/image/upload` | profile/image موجود في provider.controllers — تحقق من الاكتمال | استكمال عند الحاجة |

---

## 3. سجل الإنجازات (ما نُفذ فعليًا ومُتحقق منه)

### ✅ M0 — التأسيس وإطفاء الحرائق (مكتملة، مرفوعة على فرع m0-fixes)
| المهمة | الملفات | التحقق |
|---|---|---|
| حذف زرع الأدمن + سكربت آمن | `auth/auth.service.ts` (حذف seedAdmin) · `src/scripts/seed-admin.ts` (جديد) | grep seedAdmin = 0 |
| JWT fail-fast + 1h | `auth/auth.module.ts` | FATAL موجود |
| OTP→Redis + حد 5 محاولات + ttl() | `auth/auth.service.ts` · `redis/redis.service.ts` | Map = 0 |
| bcrypt 8→12 | 7 ملفات خدمات | `, 8)` = 0 خارج specs |
| إصلاح 17 كنترولر api/v1 | admin-web-core, care, home-care, hospital, labs, pharmacy, providers, radiology | `@Controller('api/v1` = 0 |
| Paymob HMAC كامل (obj + timingSafeEqual) | `payments/paymob.service.ts` | موجود |
| حذف .env + .gitignore + gitleaks CI | `.gitignore` · `.github/workflows/ci.yml` | ⚠️ .gitignore فُقد مرة وأُعيد — تحقق دائمًا |
| حماية الإنتاج من MongoMemoryServer | `src/main.ts` | throw في production |
| نقطة دخول المزود | `NabdProvider/index.ts` (جديد) + package.json main | ✓ |
| شاشة دخول الأدمن 2FA + توجيه الجذر | `web-admin/src/pages/login.tsx` · `index.tsx` (جديدان) | next build أظهر /login |
| دليل البيئات | `ENVIRONMENTS.md` | ✓ |
| **إثبات:** tsc backend = 0 أخطاء · nest build ✓ · next build ✓ |

### ✅ M3 — التأمين والمحرك المالي (backend مكتمل، فرع m3-insurance-finance، tsc=0 + build ✓)
**وحدة `insurance-engine` جديدة (24 مسارًا، 4 مخططات جديدة):**
- **Quote (BR-1):** `GET /bookings/quote?service_type&channel&price&with_insurance` ← يعيد `allowed_methods` (online دائمًا · clinic_pay للعيادة فقط · insurance عند الطلب) — الواجهة لا تقرر طرق الدفع بعد الآن.
- **التأمين (BR-2 كاملًا):** `GET /insurance/companies` (مع سكربت زرع 10 شركات سعودية) · `POST /insurance/save-policy` · `GET /insurance/my-policy` · `GET /insurance/coverage-check` · `GET /insurance/benefits-summary` · `POST /insurance/requests` (يرفض NO_INSURANCE_POLICY ليعيد التطبيق توجيهه لإضافة الوثيقة) · `GET requests/my` · `GET requests/:id` · `POST requests/:id/cancel` · **قرار المزود:** `GET requests/provider/queue` · `POST requests/:id/decide` (approve_full / approve_partial{copay_percent 1-99} / reject{reason إلزامي} — يحسب copay_amount تلقائيًا) · **copay:** `POST requests/:id/pay-copay` (لا تبدأ الخدمة إلا بعد COPAY_PAID) · aliases: `/patient/pay-copay` · `/insurance/payment-confirm` · `/home-care/insurance/verify` · أحداث: insurance.requested/decided/copay.paid (للإشعارات/WS).
- **الاسترداد:** `POST /refunds/request` (نوافذ: >24س=100% · 4-24س=50% · <4س/غياب=0% — idempotent لكل حجز) · `GET /refunds/my` · `GET /refunds/policy-preview` · أدمن: `GET /admin/finance/refunds/queue` · `POST /admin/finance/refunds/:id/decide`.
- **العمولات/الأستاذ:** `POST /finance/ledger/accrue` (idempotent لكل طلب — نسب افتراضية: استشارة 15% · صيدلية 10% · معمل/أشعة/عيادة 12% · منزلي/تمريض/طبيعي 18%) · `GET /finance/ledger/provider/summary` · `GET /admin/finance/ledger/summary`.
**المتبقي من M3:** ربط الشاشات (copay/approval-pending/claim-tracking + شاشة قرار المزود) في M4 · تنفيذ الاسترداد الفعلي عبر moyasar.refundPayment عند APPROVED (يحتاج payment_id الحقيقي — موثق) · ربط accrue بأحداث الدفع الفعلية.

### ✅ M2 — سد فجوات الباك إند (مكتملة، فرع m2-backend-apis، tsc=0 + nest build ✓)
**وحدتان جديدتان + تعديل 4 وحدات قائمة:**
1. **`modules/provider-ops/`** (جديدة): نظام التقييمات الكامل (ProviderReview schema + create/list/reply + تجميع متوسط على الملف) ← `GET /provider/reviews` · `POST /provider/reviews/:id/reply` · `POST /reviews` · `GET /reviews?target_id` — محفظة المزود الحقيقية `GET /provider/wallet` (رصيد+ملخص) · `/wallet/transactions` · `/wallet/withdraw` (حقيقي بمجموعة ProviderWithdrawal وحالة PENDING_ADMIN_APPROVAL — كان stub!) · `/wallet/withdrawals` — `GET /provider/stats/today` (عدّادات حية من 5 مجموعات) — `PUT /provider/working-hours` · `POST /provider/schedule/settings` · `POST /provider/consultation/end`.
2. **`modules/home-care-compat/`** (جديدة): `/home-care/services|providers|providers/:id|bookings` · `bookings/my` · `bookings/nursing/all` · انتقالات `respond|assign|check-in|gps|visit-report` (state_history موثق) · `provider/availability` · `inventory/request` — `/provider/nursing/checklist|supplies` (بيانات سريرية مرجعية حقيقية) — aliases المحادثة: `/chats/provider` · `/chats/:id/messages` GET/POST · `/chat/channels` · `/chat/messages/:threadId` · `/provider/chat/send` (تفوض على ChatService الحقيقي).
3. **`pharmacy_ops`**: `GET /pharmacy/prescriptions/:rxNumber` · `POST /pharmacy/reports/eod` · كنترولر alias كامل `/provider/pharmacy/orders/:id/accept|submit-basket|insurance|dispatch`.
4. **`support`**: alias `POST /support/tickets`.
5. **🔒 أمن:** إزالة `@Public()` من **11 مسارًا** تشغيليًا في nursing (visits/respond/transit/arrive/start-care/no-show/emergency-abort/complete/wallet) — كانت مفتوحة بلا مصادقة! بقي catalog فقط عامًا.
**اكتشافات M2 المهمة:** `storage/upload` و`change-password` و`provider/profile` و`/provider/jobs/queue` و`dashboard/stats` و`notifications` و`capabilities/*` موجودة أصلًا (إيجابيات كاذبة في عدّ التدقيق الأول — السبب موثق في 2.2).

### ✅ M1 — التوصيل الفعلي للمريض (مكتملة، مرفوعة على فرع m1-patient-integration)
| المهمة | الملفات | ملاحظات |
|---|---|---|
| **utils/api.ts أُعيد كتابته** — عميل حقيقي (JWT آمن، تطبيع أخطاء عربي، مسح الجلسة عند 401، storeAuthSession) | `nabd_plus/utils/api.ts` | يرث Retry/Offline من HttpClient |
| العناوين ENV-driven | `src/services/HttpClient.ts` · `src/constants/index.ts` | `EXPO_PUBLIC_API_URL` + `/api/v1` (أصلح خطأ `/v1`) |
| إصلاح الدخول/OTP/الاجتماعي | `(auth)/login.tsx` · `register.tsx` · `otp.tsx` | accessToken الصحيح · لا dummy tokens · يقبل `{ok:true}` |
| عقد الفيديو LiveKit | `consultations/video-call.tsx` | `/calls/initiate` ← `/calls/:id/join` · لا session_token مزيف |
| عقد الطوارئ | `emergency/sos-active.tsx` + **backend: `GET /emergency/my/active`** (emergency.controller/service) | أول مسار SOS للمريض |
| عقد المحادثة | `consultations/chat-with-doctor.tsx` · `pharmacy/chat-with-pharmacist.tsx` | `/chat/threads/direct` و`/chat/threads/booking` ثم messages |
| روابط مكسورة | `health/actionable-order.tsx` (/labs→/diagnostics/search) · `search/index.tsx` (product→product-detail) | ✓ |
| مكوّن الحالات الموحّد | `src/components/ScreenStates.tsx` (جديد) | مفاتيح الثيم المختصرة bg/s/t/t2/t3/p/cr/cs · أيقونات document/error/refresh |
| **إثبات:** tsc تطبيق المريض (488 ملفًا) = 0 أخطاء · backend = 0 أخطاء |

---

## 4. العقود والقرارات المعتمدة (لا تُغيَّر بلا سبب)

1. **الدفع:** Moyasar هو البوابة (Paymob خلف Feature Flag — حسم نهائي مع المستخدم لاحقًا).
2. **الأدمن:** web-admin (Next.js) هو الوحيد — `Napd-admin/frontend` (CRA) مؤرشفة.
3. **الفيديو:** `POST /calls/initiate {appointmentId, call_type}` ← `POST /calls/:sessionId/join` ← `{token, server_url}`.
4. **الطوارئ:** `POST /emergency/trigger` · `GET /emergency/my/active` (مريض) · الباقي أدمن.
5. **المحادثة:** `/chat/threads` فقط — direct: `{other_user_id}` · booking: `{booking_id, booking_kind}` · رسائل: `GET/POST /chat/threads/:id/messages {content}`.
6. **الدخول:** `POST /auth/login {phone|identifier, password}` ← `{user, token:{accessToken, refreshToken}}` · الأدمن يعيد `requires_2fa` ثم `/auth/login/verify-2fa {identifier, code}`.
7. **OTP:** `POST /auth/verify-otp {email|phone, code}` ← `{ok:true}`.
8. **تخزين التوكن (مريض):** SecureStore ثم AsyncStorage · مفاتيح `STORAGE_KEYS.AUTH_TOKEN` (`@nabdah_auth_token`) + `REFRESH_TOKEN` + `USER_DATA`.
9. **جلسة الأدمن:** `admin_token` / `admin_refresh_token` / `admin_role` / `admin_user` · baseURL من `NEXT_PUBLIC_API_URL` (افتراضي :8002).
10. **الاستجابات:** الشاشات تقرأ الجسم الخام (res.data | مصفوفة | res.token) — apiFetch يعيد الجسم كما هو. توحيد `{data,meta,error}` عبر Interceptor مؤجل كتحسين لاحق.
11. **الثيم (مريض):** مفاتيح مختصرة `bg, s, t, t2, t3, bd, p (أساسي), cr (خطر), cs (خطر فاتح), gr (نجاح)` — لا semantic names.
12. **ممنوعات دائمة:** لا dummy/fallback tokens · لا setTimeout mock · لا بيانات ثابتة كبديل عن الخطأ (اعرض حالة خطأ + زر إعادة) · لا .env في Git · لا MemoryMongo في الإنتاج · لا `@Public()` على عمليات تشغيلية (نمذجة nursing الحالية تخالف — تُصلح).

---

## 4ب. القواعد التجارية المقررة من المالك (BR) — ملزمة لكل البناء القادم

> مصدرها: مستند "Additional Audit Requirements" + توجيهات المالك الصوتية (23/07). هذه القواعد **تتفوق على أي افتراض سابق** وأي تغيير فيها يُسجَّل هنا أولًا.

### BR-1 قواعد الدفع حسب نوع الخدمة وقناة التقديم (Payment Matrix)
| القناة | الدفع المسموح |
|---|---|
| استشارة أونلاين (نصية) / فيديو / صوتية | **دفع إلكتروني فقط** — ممنوع الكاش |
| زيارة منزلية (طبيب/تمريض/أشعة/معمل منزلي/علاج طبيعي) | **دفع إلكتروني فقط** |
| توصيل أدوية/مستلزمات | **دفع إلكتروني فقط** |
| حجز عيادة (In-Clinic) | دفع إلكتروني **أو** الدفع في العيادة (خياران) |
| التأمين | يحكم التدفق بالكامل (BR-2) ويستبدل قواعد الكاش أعلاه |

**قاعدة التنفيذ:** شاشة الدفع تُبنى من `payment_options` التي يحسبها الباك إند لكل حجز (لا تُقرر في الواجهة) — endpoint موحد: `GET /bookings/quote?service_type&channel` يعيد `{price, allowed_methods:[online, clinic_pay], insurance_applicable}`.

### BR-2 تدفق التأمين المعتمد (يدوي من المزود — بلا تكامل شركات حاليًا)
1. المريض يختار "تأمين" ← النظام يفحص وجود وثيقة في ملفه.
2. **لا وثيقة:** توجيه لإكمال ملف التأمين (شاشة add-policy الموجودة): إدخال يدوي (شركة + فئة/خطة + رقم عضوية) + رفع صورة البطاقة — ثم العودة تلقائيًا لنقطة الانقطاع في التدفق (deep-return).
3. إرسال طلب الخدمة بحالة `INSURANCE_PENDING` + شاشة "تم رفع الطلب — بانتظار الموافقة".
4. المزود يستقبل الطلب ببيانات التأمين ← يبتّ يدويًا: **قبول كلي / قبول جزئي (مع نسبة تحمل المريض %) / رفض (مع سبب)**.
5. إشعار فوري للمريض بالقرار ← عند قبول كلي/جزئي: شاشة copay بالمبلغ المطلوب منه فقط.
6. المريض يدفع الـ copay إلكترونيًا ← إشعار فوري للمزود بإتمام الدفع ← **الخدمة لا تبدأ إلا بعد اكتمال الدفع**.
7. الرفض: عرض السبب + خيار التحويل لدفع ذاتي (كاش حسب BR-1) بضغطة واحدة.

### BR-3 الشاشات الختامية لكل قناة (مطلوبة في كل تدفق)
- **عيادة:** تأكيد الحجز + موقع العيادة على الخريطة + رقم تواصل + (خيار محادثة) + رمز/باركود الحجز.
- **منزلي:** تتبع حي للمزود على الخريطة + ETA + رقم تواصل + حالة الرحلة (في الطريق/وصل/بدأ).
- **أونلاين/فيديو:** غرفة انتظار + عدّاد + انضمام + انتهاء ← تقييم.
- **تأمين:** شاشة انتظار الموافقة (BR-2.3) ثم copay.

### BR-4 سيناريوهات إلزامية الاكتمال E2E (لا تُسلَّم الخدمة بدونها)
كاش · تأمين (قبول كلي/جزئي/رفض) · أونلاين · فيديو · صوتي · عيادة · منزلي · صيدلية · معامل · أشعة · تمريض · علاج طبيعي · تغذية · نفسية · إسعاف · رفع وصفة · أدوية تتطلب وصفة · متابعة · إعادة جدولة · إلغاء · استرداد · تتبع توصيل.

### BR-5 منطق السوق الصيدلاني (Marketplace)
اكتشاف موقع المريض ← بث الطلب للصيدليات القريبة ← توسيع النطاق تدريجيًا عند عدم القبول ← مهلة قبول ← قبول كلي/جزئي ← اقتراح بدائل ← موافقة المريض على البدائل ← تأكيد نهائي بالسعر النهائي ← دفع إلكتروني ← إشعار الصيدلية بعد الدفع ← تحضير ← تتبع ← تقييم. **ترتيب الصيدليات:** مسافة، نسبة توفر الأصناف، توفر بدائل، قدرة/زمن توصيل، تقييم، سرعة استجابة — خوارزمية موزونة (التفصيل في تقرير السيناريوهات §6).

### BR-6 تعدد اللغات (i18n)
تطبيق المريض يُجهَّز لـ **5 لغات** (ar أساسية + en + 3 لاحقًا): كل نص ظاهر للمستخدم عبر مفاتيح ترجمة — ممنوع نصوص حرفية جديدة. RTL/LTR تلقائي. (المزود والأدمن: ar/en الآن، الباقي لاحقًا).

### BR-7 الصلاحيات (RBAC)
مصفوفة صلاحيات صريحة: لكل دور (patient/provider-per-type/admin-per-role) قائمة قدرات، وتُفرض في Guards الباك إند + تخفي الواجهة ما لا يملكه المستخدم. عزل البيانات: المزود لا يرى إلا عملياته، المريض إلا بياناته، الفرع إلا فرعه.

### BR-8 معيار "اكتمال الشاشة" لكل شاشة جديدة أو معدلة
حالات: Loading/Empty/Error/Success عبر `<ScreenState>` · تأكيد قبل أي إجراء مالي/إلغاء · شاشة نجاح/فشل · ربط حقيقي بلا fallback ثابت · نصوص عبر i18n · توافق الثيم والـ RTL.

---

## 5. خطة المراحل وحالتها

| المرحلة | المحتوى | الحالة |
|---|---|---|
| M0 | تأسيس وإطفاء | ✅ مكتملة ومرفوعة |
| M1 | توصيل المريض | ✅ مكتملة ومرفوعة (الفحص tsc أخضر) |
| M2 | سد فجوات API + نظام التقييمات + تأمين nursing | ✅ **مكتملة** — 33+ مسارًا جديدًا (فرع m2-backend-apis) |
| M3 | التأمين (BR-2) + المحرك المالي + الاسترداد + quote | ✅ **مكتملة backend** (فرع m3-insurance-finance) — الربط بالشاشات في M4 |
| M4 | التدفقات الممتدة (أشعة للمريض، إسعاف+سائق، مستشفيات/facility، علاج طبيعي، نفسية، تغذية، أمومة، توصيل) | ⏳ |
| M5 | صفحات الأدمن الـ 14 المفقودة (backend جاهز لأغلبها) | ⏳ |
| M6 | أمن وامتثال (نفاذ/NPHIES/ZATCA/pen-test) | ⏳ |
| M7 | جودة: 60% تغطية حرجة · 10 E2E ذهبية · CI للأربعة · صفر @ts-nocheck حرج · أداء | ⏳ |
| M8 | إطلاق تدريجي (pilot ← مدينة ← عام) | ⏳ |

**متبقٍ من M1 (يُستكمل بالتوازي):** تعميم `<ScreenState>` على بقية الشاشات (الأولوية: قوائم المواعيد/الطلبات/النتائج).

---

## 6. معلومات تشغيلية سريعة

- **فحص الباك إند:** `rsync` إلى `/tmp/build-be` ← `npm install --legacy-peer-deps` ← `npx tsc --noEmit` (يتجاوز 667 حزمة، ~4 دقائق).
- **فحص المريض:** `/tmp/build-patient` ← نفس الأسلوب (488 ملفًا).
- **زرع الأدمن:** `ADMIN_PHONE=.. ADMIN_EMAIL=.. ADMIN_PASSWORD=.. MONGO_URL=.. npx ts-node src/scripts/seed-admin.ts`.
- **بورتات:** backend 8002 · web-admin 3000 · Expo 8081.
- **التسليم كل مرحلة:** تحديث هذا الملف + CHANGELOG_Mn.md + زيبات المشاريع المتغيرة + فرع GitHub جديد.

## 6ب. المستندات المرجعية للمشروع (تُقرأ عند الحاجة)
| المستند | المحتوى |
|---|---|
| `تقرير_التدقيق_الشامل_منصة_نبضة_بلس.md` | التدقيق الأصلي (20 قسمًا) — انتبه: أرقام "المفقود" فيه مبالغة جزئيًا، المرجع المصحح هنا في 2.2/2.3 |
| `خطة_البناء_الكاملة_منصة_نبضة_بلس.md` | الخطة M0→M8 الأصلية (نطاقها مُحدَّث بالملحق) |
| `تقرير_السيناريوهات_والشاشات_الناقصة.md` | **ملحق 23/07:** مصفوفة سيناريو-بسيناريو/شاشة-بشاشة + مواصفات كل شاشة مفقودة + benchmark + تحديث نطاق M3–M6 |
| `سجل_تغييرات_المرحلة_M*.md` | سجلات التنفيذ لكل مرحلة |
| `ENVIRONMENTS.md` | تشغيل البيئات الثلاث |

**أدوات أُقرر استخدامها في المراحل القادمة:** بحث الويب عند الحاجة لمعايير خارجية (استُخدم للـ benchmark، وسيُستخدم في M6 لتفاصيل NPHIES/ZATCA الدقيقة) · لا حاجة لإضافات مالية/صوت/صور في هذا المشروع · كل مرحلة تُبنى بالأدوات البرمجية نفسها (قراءة/تحرير/بناء/فحص tsc/رفع GitHub).

## 7. ديون مؤجلة معروفة (لا تُنسى)
1. `@Public()` على مسارات nursing التشغيلية — **يُصلح في M2**.
2. `ProviderWalletController.withdraw` stub بطباعة console — **يُصلح في M2**.
3. ازدواج wallet/nabd-extensions وnotification(s) وprovider×5 وbookings×3 — دمج M2 المتأخر/M3.
4. 200 ملف @ts-nocheck (backend) + 240 (مريض) — إزالة تدريجية من الحرج أولًا (M7 هدفه صفر حرج).
5. شاشات عملاقة (DoctorDashboard 4312 سطرًا) — تقسيم M7.
6. Sentry tracesSampleRate 1.0 → 0.1 (M7).
7. فهرس GeoSpatial 2dsphere على locations (M7 أداء — لكن أضفه مبكرًا إن لامسنا schema).
8. تبويب التمريض المخفي في المريض (`href: null`) — يُظهر بعد اكتمال ربط home-care في M2.
9. `insurance/claims/submit` موجود لكن محرك التأمين الكامل M3.
10. نتائج التدقيق الأصلية في `تقرير_التدقيق_الشامل_منصة_نبضة_بلس.md` تحتمل إيجابيات كاذبة في عدّادات "المفقود" (سبب: استخراج أول كنترولر فقط) — الأرقام المصححة في 2.2/2.3 أعلاه هي المرجع.
