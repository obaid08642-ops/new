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

### ✅ M4 — التدفقات الممتدة وربط الشاشات (مكتملة، فرع m4-extended-flows، tsc=0 للمشاريع الثلاثة)
> حادثة: `InsuranceRequestsScreen.tsx` فُقد عند إعادة تشغيل بيئة العمل قبل الرفع — أُعيد بناؤه كاملًا من عقد M3 الموثقة هنا. **القاعدة: لا يُنهى أي ملف جديد دون رفعه للفرع فورًا أو تدوينه هنا.**
- **Backend:** `ConsultationSummary` (schema + `POST/GET /care/appointments/:id/summary` — كتابة الطبيب تُقفل الموعد COMPLETED · نافذة متابعة 7 أيام افتراضيًا) · alias `GET /insurance/claims/my`.
- **المزود:** `src/screens/shared/InsuranceRequestsScreen.tsx` (طابور + قرار ثلاثي بمعاينة copay) مسجلة في **اللوحات الست** (doctor/facility/lab/nursing/pharmacy/radiology) مع نقاط دخول · `.gitignore` أُضيف (كان مفقودًا).
- **المريض:** `booking-pending.tsx` (انتظار قبول المزود: استطلاع 5ث + مهلة 15د + إلغاء/استرداد حقيقي + توجيه تلقائي بالمعرّف الحقيقي) · `clinic-confirm.tsx` (BR-3: QR حقيقي عبر `react-native-qrcode-svg` + اتجاهات/اتصال/محادثة + سياسة استرداد) · `summary.tsx` (ملخص الاستشارة + زر متابعة) · إزالة `APT001` الثابت من booking-success/payments-success · **إصلاح كراش `AR` غير المعرف** في appointment-detail (مودال PENDING_COPAY) · دمج الأشعة في `diagnostics/orders.tsx` و`my-results.tsx` (bookings/mine + reports/mine + حالات REPORT_READY).
**ديون M4 المسجلة:** خصم المتابعة يُمرر كبارامتر فقط — الربط الفعلي بمحرك quote في M5/M6 · ازدواج مخطط RadiologyBooking (modules/radiology/schemas مقابل schemas/) يُدمج M7 · عارض نصي لتقرير الأشعة السريري عند غياب PDF.
**بنود M4 الأصلية المتبقية (تُستكمل مع M6):** مسار العلاج الطبيعي للمريض · الإسعاف المجدول · شاشة عروض الصيدليات (broadcast موجود backend) · facility beds/surgeries stubs (من 2.3).

### ✅ M5 — صفحات الأدمن التشغيلية (مكتملة، فرع m5-admin-pages، tsc=0 + next build ✓)
- **Backend:** دمج طابور السحوبات (فجوة حقيقية: سحوبات المزود `ProviderWithdrawal` كانت غير مرئية للأدمن — `GET /admin/finance/withdrawals/pending` يدمج المجموعتين + `execute/reject` للمصدرين) · `AdminInsuranceController` جديد (`GET /admin/insurance/requests|stats`) · تحصين `/support/admin/*` بـ `@Roles(ADMIN)` (كانت مفتوحة لأي موثّق!).
- **AdminGuard مركزي:** قائمة 16 صفحة/4 أقسام — كان 7 روابط + sidebar مزدوج في 3 صفحات (أُزيل التكرار).
- **صفحات جديدة (5):** sos-monitor (استطلاع 10ث + إسناد مستشفى + إنهاء) · insurance-queue (إحصاءات + طلبات + مستردات باعتماد/رفض) · commissions (مؤشرات + تفصيل بالنسب) · support-tickets (thread + رد + حالات) · rbac (مصفوفة BR-7: 15 دورًا × 27 صلاحية — مرآة common/permissions.ts).
- **محدَّثة:** payouts (رفض + مصدر موحد).
**بقايا M5 المؤجلة:** Feature Flags UI · كوبونات/CMS · Broadcast · قائمة سوداء · ترجمات (M6) · اعتماد كتالوج معامل/أشعة · خريطة طلبات حية · تعديل أدوار ديناميكي (M6).

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

## 4ج. التوجيهات المؤسسية الإضافية (ER-1..ER-13) — ملزمة (مستند المالك 24/07)

| # | التوجيه | القرار المعماري / التعيين للمراحل |
|---|---|---|
| ER-1 | منصة مؤسسية قابلة للتوسع (ملايين المستخدمين) | مبدأ حاكم لكل القرارات — فهارس/تصفّح/طوابير (M7 أداء) |
| ER-2 | SEO/GEO/AI-Search: صفحة عامة قابلة للفهرسة لكل كيان (أطباء/عيادات/مستشفيات/صيدليات/معامل/أشعة/ممرضين/خدمات/فئات/أدوية/أجهزة/تجميل/أطفال/مقالات) مع metadata + Schema.org + OG + Twitter Cards + canonical + hreflang + بنية نظيفة | **يُبنى في web (Next.js) كقسم عام `/(public)` — دفعة M6-SEO1:** أطباء/مزودون/خدمات/أدوية + sitemap.xml + robots + JSON-LD · **M6-SEO2:** بقية الكيانات + مقالات |
| ER-3 | SEO ديناميكي: توليد الصفحة والميتا تلقائيًا عند إضافة كيان | صفحات SSR/SSG تقرأ من API الباك إند مباشرة — لا عمل يدوي (M6-SEO1) + endpoint عام `GET /public/seo/:type/:id` |
| ER-4 | قاعدة معرفة دوائية شاملة (اسم تجاري/عام/مكونات/جرعات/صور متعددة/وصف/دواعي/موانع/تحذيرات/آثار/تداخلات/إرشادات/حمل/رضاعة/تخزين/بدائل/مرتبطات/فئات) — 20k+ منتج | توسعة مخطط Product/Drug في M6 + فهارس نصية · استيراد كتالوج لاحقًا (ETL موجود جزئيًا infra/fastapi/import_etl_products.py) |
| ER-5 | تعدد لغات معماري: المحتوى نفسه (أطباء/خدمات/أدوية/مقالات/فئات/ميتا/إشعارات/بحث) لا الواجهة فقط · قابل للتوسع | حقول ثنائية `name_ar/name_en` معممًا كـ i18n map في المخططات الجديدة (M6) + واجهة BR-6 |
| ER-6 | التأمين يدوي من المزود (لا تكامل مباشر افتراضيًا) — يعالجه في نظامه NPHIES ثم يسجل النتيجة في التطبيق | **مُنفَّذ بالفعل = BR-2/M3/M4** ✓ (قرار يدوي full/partial/reject + copay + إشعارات) · تقييم تكامل NPHIES API: نتيجة البحث موثقة في §4ج-أدناه |
| ER-7 | تبسيط تسجيل التأمين (API رسمي؟ WebView تحقق؟ استخراج تلقائي بعد تحقق المستخدم) | نتيجة التقييم موثقة أدناه (بحث 24/07) — التنفيذ حسب التوصية |
| ER-8 | نظام إشعارات إنتاجي كامل: FCM + Expo + خدمة backend + قاعدة + Retry Queue + مجدولة + Real-time + مركز + قراءة/عدم قراءة + Deep Linking + تحليلات + سجل + حالة تسليم · **كل إشعار يفتح الشاشة الصحيحة حتى والتطبيق مغلق** | مراجعة الفجوات في M6-N: payload موحد `screen/params` + retry queue (BullMQ) + حالة تسليم + ربط listener في التطبيقين |
| ER-9 | بنية الاتصالات: LiveKit/WebRTC/STUN/TURN/Signaling/Socket.IO/JWT tokens/تحقق موعد/Presence/Chat/ملاحظات صوتية/مرفقات/مؤشرات كتابة/إيصالات قراءة/إعادة اتصال/استرداد مكالمة/مراقبة/مقاييس جودة | جرد مقابل الموجود في M6-C + سد: TURN config + presence + typing/read receipts إن غابا |
| ER-10 | أداء شامل (إقلاع/رسم/lazy/تصفّح/صور/DB/API/كاش/خلفية/ذاكرة/بطارية/أوفلاين/استرداد شبكة) | M7 — تسجيل التوصيات أثناء العمل (GeoSpatial index مسجل من M0) |
| ER-11 | مراجعة أمن مؤسسية كاملة (مصادقة/تفويض/RBAC/JWT/Refresh/HTTPS/TLS/SRTP/تخزين آمن/رفع ملفات/API/Rate limiting/تشفير/أسرار/خصوصية/عزل/سجلات) | M6-S: تدقيق + سد الفجوات (كثير أُصلح M0–M5 — يوثق ويستكمل) |
| ER-12 | Deep Linking شامل: كل إشعار/نتيجة بحث/رابط مشاركة/QR/رابط AI يفتح الشاشة الصحيحة مباشرة | M6-D: إعداد `scheme`/linking في التطبيقين + خريطة مسارات موحدة + QR الحجز (M4) يحمل رابطًا عميقًا |
| ER-13 | فكر كمهندس مؤسسي: تحدَّ كل تدفق وشاشة وسيناريو مقابل العالمية | مبدأ حاكم — يطبق في المراجعة المستمرة |

### 4ج-1. نتيجة تقييم NPHIES/استرجاع بيانات التأمين (بحث 24/07 — مصادر: portal.nphies.sa/ig · chi.gov.sa)
- **NPHIES** بوابة وطنية (CHI/MoH) مبنية على **HL7 FHIR R4** لحوالات التأمين المالية: Eligibility (لحظي ≤5ث) · Prior-Authorization (5 أنواع: institutional/professional/pharmacy/dental/vision) · Claims · Payment. الأحجام 2025: 96M معاملة/ربع، 25 مؤمّن + 8 TPA + 6,400+ منشأة، 98% من سوق المطالبات.
- **الانضمام المباشر** يتطلب: كيان مرخّص (مزود/مؤمّن/TPA/مورّد أنظمة) ← Onboarding ← Sandbox ← **اختبار مطابقة (Conformance) إلزامي** ← إنتاج. المعرف الوطني/Iqama هو المعرف الأساسي، وأكواد وطنية (ICD-10-CM/SFDA/LOINC/SBS).
- **القرار (يوافق ER-6):** نبضة بلس سوق إلكتروني وليس HIS — **يبقى التدفق اليدوي من المزود هو المعتمد** (المزود ينفذ eligibility/authorization في نظامه NPHIES المعتمد ثم يسجل القرار عندنا = BR-2 المنفذ). التكامل المباشر كبائع HIS مسار شهادة منفصل طويل وليس مطلوبًا للسوق.
- **ER-7 (استرجاع بيانات تأمين المريض):** لا يوجد API عام مفتوح للتحقق الذاتي للمريض؛ يوجد **HIDP-API** لاكتشاف وثائق المريض لكنه مخصص للمزودين المنضمين. **التوصية المنفذة:** ① إدخال يدوي مبسّط (شركة من قائمة الـ 10 المزروعة M3 + رقم وثيقة + صورة بطاقة) ② حقل اختياري `eligibility_reference` يسجله المزود من بوابته ③ عند انضمام كيان قانوني مرخّص مستقبلًا: HIDP لاكتشاف الوثائق + Eligibility لحظي. WebView لبوابات خارجية مرفوض (خصوصية/أمان/كسر UX).

---

## 5. خطة المراحل وحالتها

| المرحلة | المحتوى | الحالة |
|---|---|---|
| M0 | تأسيس وإطفاء | ✅ مكتملة ومرفوعة |
| M1 | توصيل المريض | ✅ مكتملة ومرفوعة (الفحص tsc أخضر) |
| M2 | سد فجوات API + نظام التقييمات + تأمين nursing | ✅ **مكتملة** — 33+ مسارًا جديدًا (فرع m2-backend-apis) |
| M3 | التأمين (BR-2) + المحرك المالي + الاسترداد + quote | ✅ **مكتملة backend** (فرع m3-insurance-finance) — الربط بالشاشات في M4 |
| M4 | التدفقات الممتدة وربط الشاشات (انتظار القبول، ختامية العيادة BR-3، ملخص الاستشارة، قرار التأمين للمزود، أشعة المريض) | ✅ **مكتملة** (فرع m4-extended-flows) — بقايا مؤجلة مع M5 |
| M5 | صفحات الأدمن التشغيلية (SOS، تأمين/مستردات، سحوبات، عمولات، RBAC، دعم + تنقل موحد) | ✅ **مكتملة** (فرع m5-admin-pages) — بقايا CMS/Flags مع M6 |
| M6 | أمن وامتثال + التوجيهات المؤسسية ER (§4ج) | 🔄 **دفعة 1 مكتملة** (فرع m6-seo-enterprise): SEO العام + ER-4 + Deep Linking — البقايا أدناه |

### M6 — الدفعة 1 (مكتملة 24/07): SEO/GEO + ER-4 + ER-8/12 (تفاصيلها في سجل M6)
- **اكتشاف:** modules/seo موجود مسبقًا (resolve/meta/sitemap/robots/IndexNow + slug util) — الفجوة كانت الواجهة العامة فقط.
- **بُني:** صفحة كيان SSR `/s/[type]/[slug]` (JSON-LD + OG + canonical + KB دوائية كاملة) · 5 أدلة SSR (doctors/medicines/facilities/lab-services/home-care-services) · رئيسية عامة بدل redirect · robots.txt · توسعة medicine.schema بـ 18 حقل ER-4 · إصلاح robots v2←v1 · deep links موحدة `nabdplus://s/...` · NotificationHandler بعقد screen+params + whitelist · ملتقط روابط `/s/...` داخل التطبيق.
- **قرار معماري موثق:** الويب العام يُقدَّم من نفس تطبيق Next.js (web-admin) — لا يوجد مشروع ويب خامس؛ يُفصَل لاحقًا عند الحاجة (M8).
- **مطلوب عند النشر (M8):** ملفا `apple-app-site-association` و`assetlinks.json` على النطاق + ضبط NABD_PUBLIC_URL/NEXT_PUBLIC_SITE_URL/INDEXNOW_KEY.
**متبقي M6:** ER-10 المتبقي (N+1) · SEO-2 · i18n المحتوى في الباك إند · نفاذ/Nafath (تقييم) · إحصاء التسليم في واجهة الأدمن.

### M6 — الدفعة 3 (مكتملة 24/07): BR-6 + ZATCA + فهارس
- **BR-6:** توحيد مصدر الترجمة — LanguageManager كان يقرأ JSONs فارغة بينما القاموس الحقيقي في index.ts ← الآن مصدر واحد (6 لغات + fallback عربي). دين: t() rollout داخل الشاشات (M7).
- **ZATCA-1:** موديول billing — فاتورة إلكترونية لكل حجز مدفوع + QR TLV (tags1-5) + رقم تسلسلي سنوي ذري + `GET /billing/invoice/:kind/:id` · `/billing/my` · `/billing/admin/list`. بيانات البائع: ZATCA_SELLER_NAME/ZATCA_VAT_NUMBER env. **دين: المرحلة 2 (UBL/توقيع/Fatoora) تتطلب حلًا معتمدًا.**
- **ER-10:** فهرسان للمواعيد (patient_id+slot_start · doctor_id+status+slot_start).

### M6 — الدفعة 2 (مكتملة 24/07): إشعارات + اتصالات + أمن
- **ER-8 backend:** طابور BullMQ `notifications-delivery` (retry ×4 أسّي + جدولة + fallback مباشر) · حقول delivery/status/scheduled_at في المخطط · حالة لكل قناة · عقد حمولة `{type,screen,params,action}` · توجيه Expo/FCM حسب الرمز · مسارا admin/schedule + admin/delivery-stats.
- **ER-9:** الجرد: LiveKit/Coturn/Presence/typing/مرفقات/صوتيات موجودة ✓ — الفجوة المسدودة: `mark_seen`→`message_seen` (إيصالات قراءة لحظية).
- **ER-11 ثغرتان:** بوابة Socket كانت تقبل userId بلا تحقق ← JWT إلزامي (fallback تطوير فقط) + CORS `*` ← ALLOWED_ORIGINS.
**عقد الاتصال بالسوكت:** `io(URL, {auth:{token}})` — تطبيق المريض متوافق مسبقًا؛ المزود يجب التأكد منه عند M7.


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
