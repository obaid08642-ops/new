# نبض (Nabd) — دليل المشروع الكامل للمطورين
**PROJECT-CONTEXT.md · v1.0 · 2026-07-29 · Production: https://api.nabd.plus**

> **ما هذا الملف؟** كل ما يحتاجه مبرمج جديد لفهم المشروع وإكماله من الصفر:
> المعمارية، كل وحدة، كل شاشة (244+39+33)، نماذج البيانات، مجموعات الـ APIs،
> المتغيرات (109)، التشغيل المحلي، النشر الإنتاجي، الاختبار، وسير الأعمال.
> كل محتواه مُتحقق من الكود الحي — لا توثيق نظري.

---

## 1) المنظومة بنظرة واحدة

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                 │
│  nabd_plus (مريض)   NabdProvider (مزود)   Napd-admin (أدمن)   │
│  Expo RN 244 شاشة   Expo RN 39 ملف        Next.js 33 صفحة      │
└──────────┬──────────────────┬───────────────────┬──────────────┘
           │ HTTPS/WSS        │                   │
┌──────────▼──────────────────▼───────────────────▼──────────────┐
│  nginx (443) — api.nabd.plus · admin. · provider. · live.      │
├────────────────────────────────────────────────────────────────┤
│  nabdah-backend — NestJS · 97 وحدة · 1031 مسار API             │
│  MongoDB 7 (nabd_nestjs) · Redis 7 (كاش+طوابر BullMQ)          │
│  FastAPI (AI/ETL aux) · LiveKit (SFU) · Coturn (STUN/TURN)     │
├────────────────────────────────────────────────────────────────┤
│  خارجي: Cloudflare R2 (صور) · Cloudinary (محتوى مزود) · Resend │
│  Firebase FCM · Gemini AI · بوابات دفع (Moyasar/Tabby/Tamara)  │
└────────────────────────────────────────────────────────────────┘
```

## 2) خريطة المستودع (GitHub: obaid08642-ops/new · branch m7-quality)

| الملف على جيت هوب | المحتوى | الحجم |
|---|---|---|
| `nabd_plus-patient.zip` | تطبيق المريض كاملاً (856 ملف) | 38MB |
| `NabdProvider-provider.zip` | تطبيق المزود (138 ملف) | 580KB |
| `Napd-admin-dashboard.zip` | لوحة الأدمن web-admin + CRA legacy (195 ملف) | 540KB |
| `nabdah-backend.zip` | الباك إند + **حزمة النشر deploy/** كاملة (868 ملف) | 1.1MB |
| `PROJECT-CONTEXT.md` | هذا الملف — جذر المستودع | — |

> كل الأزيب مُتحققة بايتياً (0 فروقات من المصدر) قبل كل رفع. الأسرار مستثناة دائماً من الأزيب.

## 3) البيئات الثلاث

| | المحلي | الإنتاج |
|---|---|---|
| API | `http://localhost:8002/api/v1` | `https://api.nabd.plus/api/v1` |
| WebSocket | `http://localhost:8002` | `https://api.nabd.plus` / `wss://live.nabd.plus` |
| Mongo | mongodb-memory-server (للاختبار) | mongo:7 container |
| Redis | redis محلي :6388 | redis:7 container |

---

## 4) المعمارية التقنية لكل تطبيق

### 4.1 تطبيق المريض — `nabd_plus/`
```
app/                    ← expo-router (الشاشات = مسارات الملفات)
  (tabs)/               ← الشاشات الرئيسية (home, pharmacy, bookings, profile...)
  pharmacy/             ← product-detail, cart, checkout, order-tracking, filters, search...
  consultations/        ← مواعيد، شات، مكالمات، تقارير
  health/               ← سجلات، متتبع صحي، أجهزة قابلة للارتداء
  ai/                   ← symptom-checker (BodyMap3D حقيقي)
  maternity/            ← 40 أسبوع حمل بالصور
src/
  components/           ← ProductImage (R2+cache+blurhash+fallback), BodyMap3D, NotificationHandler
  hooks/                ← usePushNotifications (expo+native tokens), useOfflineData
  utils/                ← api, prefetch (تنبؤي), imageUrl (CDN resolver), notifications
  context/              ← AppContext, CartContext, SocketContext
  core/                 ← Repository pattern (AsyncStorageDataSource + sync)
```
**قواعد البناء:** `newArchEnabled=true` (Fabric+Turbo) · Hermes (SDK54) · expo-image · reanimated · gesture-handler · i18n ar/en

### 4.2 تطبيق المزود — `NabdProvider/`
```
src/screens/{auth,doctor,pharmacy,lab,radiology,nursing,facility,shared}/
  ← 7 أدوار، كل دور dashboard مستقل + Drug Index مشترك
src/constants/index.ts  ← API_BASE = EXPO_PUBLIC_API_URL || localIp
src/navigation          ← Stack per role + tabs
```

### 4.3 لوحة الأدمن — `Napd-admin/web-admin/` (Next.js — النشط)
```
src/pages/login.tsx           ← دخول متخفٍ (نبض فقط، 2FA)
src/pages/admin/              ← 33 صفحة: dashboard, analytics, health-dashboard,
                                notification-center, shortage-reports, image-suggestions,
                                rbac, payouts, sos-monitor, support-tickets, facilities...
src/utils/api.ts              ← apiFetch بتوكن admin_token
Napd-admin/frontend/ (CRA)    ← legacy — App_old.js محذوف عمداً (كود ميت)
```

### 4.4 الباك إند — `nabdah-backend/src/`
```
main.ts                ← helmet+compression+CORS+prefix api/v1+Swagger /api/docs
app.module.ts          ← 97 وحدة مسجلة
common/                ← auth.guard (JWT+RBAC+Roles), enums, events
modules/
  auth/                ← JWT 1h + refresh 7d (jti rotation + device-bound) + OTP + 2FA + social
  medicines/           ← الكتالوج + بحث FTS + hot cache + shortage/image workflows
  orders/              ← patient-only guard + lifecycle
  notifications/       ← multi-channel + queue + deep-link payloads
  push/                ← FCM v1 + APNs HTTP/2 + WebPush VAPID + engagement
  admin-notification-center/ ← حملات/بث/retargeting/tذكيرات/إحصائيات
  chat/ + realtime/    ← Socket.IO gateways (2) + presence + receipts + call signaling
  livekit/ + coturn/   ← tokens 2h + sessions + HMAC TURN creds
  storage/             ← S3R2 + base64 fallback + signed URLs + Cloudinary pipeline
  api-security/        ← rate limits حبيبية + honeypot + blacklist + scraping detection
  device-trust/        ← Play Integrity + App Attest
  mail/                ← Resend→SES failover (@Global)
  sms/                 ← Taqnyat/Infobip (معطل بفلاج)
  ai/                  ← 4 مزودين + triage persistence
  analytics/           ← 6 نقاط تحليلات + health-dashboard
  compat/              ← 40+ متحكم توافقي (admin SPA + provider portals)
  admin-spa/ + admin-web-core/ ← عمليات الأدمن الموسعة
```

---

## 5) نماذج البيانات الرئيسية (MongoDB collections)

### medicines_master (21,052) — أهم مجموعة
```
id, slug, name_ar/en, generic_name, active_ingredient, search_text (مُطبَّع),
manufacturer, brand, category, sub_category, sub_sub_category, categories[],
price, old_price, discount (محسوب), form, strength, package_size, barcode,
image, image_1..5, images[], requires_prescription, online_exclusive, available_online,
availability_status (none|availability_may_be_limited|admin_flagged_shortage|discontinued),
indications_ar/en[], dosage_ar/en, usage_instructions_ar/en, warnings_ar/en[],
precautions_ar/en[], side_effects_ar/en[], contraindications_ar/en[], interactions[],
storage_conditions_ar/en, pregnancy_info_ar/en, breastfeeding_info_ar/en,
description_ar/en, more_info_ar/en, package_content_details,
translations {ur,hi,bn,tl}, verified, source, usage_count, aggregate_stock,
pharmacies_count, is_deleted, version
```
### أخرى (أسماء المجموعات الحقيقية)
```
users, provider_profiles, orders, carts, appointments, callsessions,
notifications, pushtokens, pushlogs, pushengagements, campaigns, webpushsubscriptions,
chat_threads, chat_messages, pharmacy_inventory, pharmacy_shortage_reports,
medicine_image_suggestions, storage_objects, search_queries, product_views,
hot_medicines, ai_triage_sessions, system_events (audit), security_events,
featureflags, homecarebookings, labbookings, insurance_requests, refunds
```

---

## 6) مجموعات الـ API الرئيسية (1031 مساراً — أهمها)

| المجموعة | النقاط الرئيسية |
|---|---|
| `/auth` | register · login · verify-2fa · refresh (device-bound) · logout · logout-all · send-otp · verify-otp · forgot-password · social-login |
| `/medicines` | `?q=/search/category/page/limit/cursor` · :id · :id/details · :id/alternatives · **hot** · **categories** · autocomplete · search/trending · search/recent · :id/report-shortage · :id/suggest-image · admin/* (catalog/shortage-reports/image-suggestions/availability) |
| `/drugs` (مزود) | `?search/category/limit` · :id (قراءة فقط) |
| `/orders` | create (patient only) · mine · :id/cancel · :id/reorder |
| `/notifications` | list · read · register-token · scheduled |
| `/push` | register · test · web/subscribe · web/vapid-key · events |
| `/admin/notification-center` | segments · broadcasts · campaigns[/:id/send] · stats/overview · retarget/run |
| `/admin/analytics` | overview · top-searched/medicines/doctors/pharmacies/services |
| `/admin/health-dashboard` | خدمات + مقاييس + طوابير + crons + أخطاء |
| `/admin/security` | events · blacklist/clear |
| `/device-trust` | challenge · challenge-guest · verify · status |
| `/storage` | upload · :id · **:id/signed-url** · upload-cloudinary |
| `/chat` | threads/direct · threads/:id/messages · read · delivered |
| `/calls` | initiate · :id/join · :id/end · history · ice/credentials · admin/rooms|analytics |
| `/care/appointments` | CRUD + booking lifecycle |
| `/doctors`, `/labs/services`, `/home-care/services`, `/insurance/companies` | كتالوجات عامة |
| `/ai` | triage · ocr · skin · meal · diet · report analysis |
| `/coturn` | credentials (HMAC time-limited) |

---

## 7) سير الأعمال الكامل (Workflows)

### 7.1 طلب دواء (مريض)
```
تصفح/بحث → تفاصيل (hot/cached) → سلة → [RX؟ رفع روشتة إجباري] →
[حصري أونلاين؟ استلام فقط] → عنوان بإحداثيات → دفع → orders/create (201) →
إشعار للصيدلية → تجهيز → سائق → تتبع → تسليم → (تذكير/retargeting إن هجر السلة)
```

### 7.2 شارة "قد يكون غير متوفر"
```
مزود: POST /medicines/:id/report-shortage → pending (بلا شارة) →
إشعار role=admin → أدمن يعتمد → availability_status=availability_may_be_limited →
الشارة تظهر للجميع (لا تمنع الشراء) + audit في system_events
```

### 7.3 اقتراح صورة دواء
```
مزود: POST /storage/upload → POST /medicines/:id/suggest-image {storage_id} →
pending → أدمن يعتمد → image=الجديدة + حذف القديمة من R2 تلقائياً + إبطال الكاش
```

### 7.4 مكالمة فيديو
```
دكتور: POST /calls/initiate → room+token(2h) + حدث call.incoming (push) →
مريض يفتح (deep link) → join → session ACTIVE → ICE عبر coturn HMAC →
end → duration محسوب → analytics حقيقية من callsessions
```

### 7.5 تجديد الجلسة (Auth)
```
login → access(1h)+refresh(7d بـ jti مربوط بالجهاز) →
refresh: تحقق jti حي + جهاز مطابق → إبطال القديم فوراً → زوج جديد →
تكرار نفس القديم = 401 + قتل عائلة الجلسة (كشف سرقة)
```

---

## 8) تشغيل محلي (للمطور الجديد)

```bash
# 1) الباك إند
cd nabdah-backend && cp .env.example .env   # املأ الأساسيات فقط (تعمل بلا مفاتيح خارجية)
npm ci --legacy-peer-deps
# Mongo+Redis محليان (أو mongodb-memory-server للاختبار)
npm run start:dev          # :8002 — Swagger على /api/docs

# 2) اختبار حي كامل (mongodb-memory-server + redis + dist)
bash projects/verifier/rebuild-stack.sh && cd /tmp/e2e && node boot.js
node matrix.js    # 65 سيناريو
node matrix2.js   # 51 سيناريو عميق

# 3) المريض/المزود
cd nabd_plus && npm i && npx expo start      # EXPO_PUBLIC_API_URL يُخبز وقت البناء
```

## 9) النشر الإنتاجي (من الصفر على VPS)

```bash
# كل شيء مؤتمت في deploy/ (داخل nabdah-backend.zip):
bash deploy/setup-server.sh          # docker+ufw+fail2ban+sysctl+swap+awscli
cd deploy && bash scripts/deploy.sh  # أسرار تلقائية + بناء + إقلاع + فهارس + صحة
bash scripts/issue-certs.sh          # SSL بعد توجيه DNS
# cron: نسخ 3:00 · مراقبة */15د · prune أسبوعي · تجديد شهادات 12س
```

## 10) الاختبار والتحقق (verifier/)

```
verifier/CRITERIA v1-v3     ← معايير كل مرحلة
verifier/runs/              ← كل التشغيلات بتواريخها (append-only)
  matrix 65/65 · matrix2 51/51 · acceptance 28/28 · journey 24/24 ·
  chat 13/13 · audit.md 31 · perf bench (كل الأهداف) · security battery
verifier/CONTEXT.md         ← سجل القرارات والفجوات بصدق
```

---

## 11) جرد الشاشات الكامل — تطبيق المريض (244 شاشة، 140 موصولة بالـ API)

> مولّد برمجياً من ملفات `app/` — العمودان: المسار ← نقاط الـ API المستدعاة.

| الشاشة (route) | الملف | نقاط API |
|---|---|---|
| `/_layout` | `app/_layout.tsx` | — |
| `/ai-assistant` | `app/ai-assistant.tsx` | — |
| `/` | `app/index.tsx` | — |
| `/(auth)/_layout` | `app/(auth)/_layout.tsx` | — |
| `/(auth)/forgot-password` | `app/(auth)/forgot-password.tsx` | /auth/send-otp |
| `/(auth)/login` | `app/(auth)/login.tsx` | /auth/login<br>/auth/social-login |
| `/(auth)/otp` | `app/(auth)/otp.tsx` | /auth/register<br>/auth/verify-otp |
| `/(auth)/privacy` | `app/(auth)/privacy.tsx` | — |
| `/(auth)/provider-info` | `app/(auth)/provider-info.tsx` | — |
| `/(auth)/register` | `app/(auth)/register.tsx` | /auth/send-otp<br>/auth/social-login |
| `/(auth)/reset-password` | `app/(auth)/reset-password.tsx` | /auth/reset-password |
| `/(auth)/terms` | `app/(auth)/terms.tsx` | — |
| `/(auth)/welcome` | `app/(auth)/welcome.tsx` | /auth/guest |
| `/(onboarding)/_layout` | `app/(onboarding)/_layout.tsx` | — |
| `/(onboarding)` | `app/(onboarding)/index.tsx` | — |
| `/(onboarding)/language` | `app/(onboarding)/language.tsx` | — |
| `/(onboarding)/permissions` | `app/(onboarding)/permissions.tsx` | — |
| `/(tabs)/_layout` | `app/(tabs)/_layout.tsx` | — |
| `/(tabs)/diagnostics` | `app/(tabs)/diagnostics.tsx` | /labs/packages<br>/labs/services<br>/providers?type=lab<br>/radiology/services |
| `/(tabs)/health` | `app/(tabs)/health.tsx` | /health/vitals/summary<br>/home/upcoming-appointment<br>/nutrition/daily-summary?date=${new Date().toISOString().split(<br>/users/me/profile |
| `/(tabs)` | `app/(tabs)/index.tsx` | /home/offers<br>/home/upcoming-appointment<br>/users/me/profile |
| `/(tabs)/nursing` | `app/(tabs)/nursing.tsx` | /home-care/packages<br>/home-care/services |
| `/(tabs)/pharmacy` | `app/(tabs)/pharmacy.tsx` | /medicines/categories |
| `/(tabs)/services` | `app/(tabs)/services.tsx` | — |
| `/(tabs)/consultations` | `app/(tabs)/consultations/index.tsx` | /providers?type=doctor |
| `/ai/chat-doctor` | `app/ai/chat-doctor.tsx` | — |
| `/ai/monthly-report` | `app/ai/monthly-report.tsx` | — |
| `/ai/prescription-translator` | `app/ai/prescription-translator.tsx` | — |
| `/ai/skin-analysis` | `app/ai/skin-analysis.tsx` | — |
| `/ai/symptom-checker` | `app/ai/symptom-checker.tsx` | — |
| `/ai/symptom-timeline` | `app/ai/symptom-timeline.tsx` | — |
| `/ai/triage` | `app/ai/triage.tsx` | — |
| `/community/hub` | `app/community/hub.tsx` | /community/posts?page=1&limit=20 |
| `/community/live-session` | `app/community/live-session.tsx` | — |
| `/community/post-detail` | `app/community/post-detail.tsx` | /community/posts/${postId}<br>/community/posts/${postId}/comment<br>/community/posts/${postId}/vote |
| `/consultations/appointment-detail` | `app/consultations/appointment-detail.tsx` | /patient/pay-copay |
| `/consultations/appointments` | `app/consultations/appointments.tsx` | — |
| `/consultations/booking-confirm` | `app/consultations/booking-confirm.tsx` | — |
| `/consultations/booking-pending` | `app/consultations/booking-pending.tsx` | /care/appointments/${appointmentId}/cancel |
| `/consultations/booking-success` | `app/consultations/booking-success.tsx` | — |
| `/consultations/call-history` | `app/consultations/call-history.tsx` | /calls/history?page=${pageNum}&limit=20 |
| `/consultations/cancel-reschedule` | `app/consultations/cancel-reschedule.tsx` | — |
| `/consultations/chat-with-doctor` | `app/consultations/chat-with-doctor.tsx` | /care/doctors/${doctorId}<br>/chat/threads/${threadId}/messages<br>/chat/threads/${tid}/messages<br>/chat/threads/direct |
| `/consultations/clinic-confirm` | `app/consultations/clinic-confirm.tsx` | — |
| `/consultations/clinic-location` | `app/consultations/clinic-location.tsx` | /care/appointments/${appointmentId} |
| `/consultations/doctor-profile` | `app/consultations/doctor-profile.tsx` | /care/appointments/waitlist/join |
| `/consultations/doctor-search` | `app/consultations/doctor-search.tsx` | /care/doctors?${qs.toString()} |
| `/consultations/follow-up` | `app/consultations/follow-up.tsx` | /consultations/${consultationId}<br>/consultations/${consultationId}/messages |
| `/consultations/home-visit-tracking` | `app/consultations/home-visit-tracking.tsx` | /care/appointments/${appointmentId} |
| `/consultations/incoming-call` | `app/consultations/incoming-call.tsx` | /calls/${sessionId}/reject |
| `/consultations/post-call-rating` | `app/consultations/post-call-rating.tsx` | /care/appointments/rating |
| `/consultations/prescription-from-doctor` | `app/consultations/prescription-from-doctor.tsx` | /prescriptions/active |
| `/consultations/share-report` | `app/consultations/share-report.tsx` | — |
| `/consultations/specialty-select` | `app/consultations/specialty-select.tsx` | /care/specialties |
| `/consultations/summary` | `app/consultations/summary.tsx` | — |
| `/consultations/video-call` | `app/consultations/video-call.tsx` | /calls/${sessionId}/join<br>/calls/initiate |
| `/consultations/virtual-waiting-room` | `app/consultations/virtual-waiting-room.tsx` | /care/appointments/${appointmentId} |
| `/consultations/waiting-room` | `app/consultations/waiting-room.tsx` | /care/appointments/${appointmentId} |
| `/consultations/clinic/[id]` | `app/consultations/clinic/[id].tsx` | — |
| `/consultations/doctor/[id]` | `app/consultations/doctor/[id].tsx` | /care/doctors/${encodeURIComponent(id ||  |
| `/consultations/offer/[id]` | `app/consultations/offer/[id].tsx` | /promotions/offers/${id}/providers |
| `/consultations/video/[id]` | `app/consultations/video/[id].tsx` | — |
| `/delivery/address-select` | `app/delivery/address-select.tsx` | /users/me/addresses |
| `/diagnostics/book-sample` | `app/diagnostics/book-sample.tsx` | — |
| `/diagnostics/booking-confirm` | `app/diagnostics/booking-confirm.tsx` | /cart/clear |
| `/diagnostics/booking-success` | `app/diagnostics/booking-success.tsx` | — |
| `/diagnostics/cart` | `app/diagnostics/cart.tsx` | /labs/compatible-providers?testIds=${ids} |
| `/diagnostics/checkout` | `app/diagnostics/checkout.tsx` | — |
| `/diagnostics/insurance-approval` | `app/diagnostics/insurance-approval.tsx` | /orders/${orderId}<br>/orders/${orderId}/items/${item.id}/opt-in-cash |
| `/diagnostics/insurance-upload` | `app/diagnostics/insurance-upload.tsx` | /orders/create<br>/providers?type=lab |
| `/diagnostics/lab-comparison` | `app/diagnostics/lab-comparison.tsx` | /labs/compatible-providers?testIds=${id}<br>/labs/services/${id} |
| `/diagnostics/my-results` | `app/diagnostics/my-results.tsx` | — |
| `/diagnostics/orders` | `app/diagnostics/orders.tsx` | /labs/bookings/mine<br>/radiology/bookings/mine |
| `/diagnostics/package-detail` | `app/diagnostics/package-detail.tsx` | /labs/packages/${id} |
| `/diagnostics/packages` | `app/diagnostics/packages.tsx` | /labs/categories<br>/labs/packages |
| `/diagnostics/results-history` | `app/diagnostics/results-history.tsx` | — |
| `/diagnostics/sample-tracking` | `app/diagnostics/sample-tracking.tsx` | — |
| `/diagnostics/search` | `app/diagnostics/search.tsx` | /labs/services |
| `/diagnostics/technician-tracking` | `app/diagnostics/technician-tracking.tsx` | /labs/bookings/${bookingId} |
| `/diagnostics/test-detail` | `app/diagnostics/test-detail.tsx` | — |
| `/diagnostics/upload-rx` | `app/diagnostics/upload-rx.tsx` | — |
| `/diagnostics/lab/[id]` | `app/diagnostics/lab/[id].tsx` | /labs/services?providerId=${id}<br>/providers/${id} |
| `/diagnostics/order/[id]` | `app/diagnostics/order/[id].tsx` | /orders/mine |
| `/drug-scanner` | `app/drug-scanner/index.tsx` | /ai/drug-interactions<br>/health/medications |
| `/emergency` | `app/emergency/index.tsx` | — |
| `/emergency/sos-active` | `app/emergency/sos-active.tsx` | /emergency/my/active |
| `/emergency/sos` | `app/emergency/sos.tsx` | — |
| `/emergency/tracking` | `app/emergency/tracking.tsx` | /emergency/tracking |
| `/family/calendar` | `app/family/calendar.tsx` | /family/calendar<br>/family/calendar/event<br>/family/calendar/event/${id} |
| `/family/chat` | `app/family/chat.tsx` | /family/chat/messages |
| `/family/emergency-contacts` | `app/family/emergency-contacts.tsx` | — |
| `/family/hub` | `app/family/hub.tsx` | /family/members |
| `/family` | `app/family/index.tsx` | — |
| `/family/invite` | `app/family/invite.tsx` | /family/invite |
| `/family/join` | `app/family/join.tsx` | /family/join |
| `/family/member-health` | `app/family/member-health.tsx` | /family/member-health/${memberId} |
| `/family/permission-request` | `app/family/permission-request.tsx` | /family/permissions/pending<br>/family/permissions/respond/${requestInfo._id || requestInfo.id} |
| `/family/permissions` | `app/family/permissions.tsx` | /family/permissions/request<br>/family/remove-member/${memberId} |
| `/family/shared-calendar` | `app/family/shared-calendar.tsx` | /family/calendar<br>/family/calendar/event<br>/family/calendar/event/${id} |
| `/family/voice-call` | `app/family/voice-call.tsx` | — |
| `/health/actionable-order` | `app/health/actionable-order.tsx` | — |
| `/health/add-family-member` | `app/health/add-family-member.tsx` | — |
| `/health/chronic-disease` | `app/health/chronic-disease.tsx` | /health/chronic-diseases<br>/health/vitals |
| `/health/chronic-medications` | `app/health/chronic-medications.tsx` | /health/chronic-meds |
| `/health/conditions-allergies` | `app/health/conditions-allergies.tsx` | — |
| `/health/edit-profile` | `app/health/edit-profile.tsx` | /users/me/profile |
| `/health/emergency-contacts` | `app/health/emergency-contacts.tsx` | /health/emergency-contacts |
| `/health/family-calendar` | `app/health/family-calendar.tsx` | — |
| `/health/family-chat` | `app/health/family-chat.tsx` | — |
| `/health/family-hub` | `app/health/family-hub.tsx` | /family/create<br>/family/members<br>/family/my-group |
| `/health/family-member-detail` | `app/health/family-member-detail.tsx` | — |
| `/health/health-id` | `app/health/health-id.tsx` | — |
| `/health/medication-reminder-add` | `app/health/medication-reminder-add.tsx` | — |
| `/health/medication-reminder-list` | `app/health/medication-reminder-list.tsx` | /health/medications/reminders |
| `/health/medications` | `app/health/medications.tsx` | — |
| `/health/prescriptions` | `app/health/prescriptions.tsx` | /health/prescriptions |
| `/health/refills` | `app/health/refills.tsx` | /medical-profile |
| `/health/reminders` | `app/health/reminders.tsx` | /health/reminders<br>/health/reminders/${id}/log |
| `/health/reports` | `app/health/reports.tsx` | /health/reports |
| `/health/sleep-score` | `app/health/sleep-score.tsx` | — |
| `/health/sleep-tracker` | `app/health/sleep-tracker.tsx` | — |
| `/health/smart-reminders` | `app/health/smart-reminders.tsx` | — |
| `/health/trends` | `app/health/trends.tsx` | /health/trends |
| `/health/vitals-log` | `app/health/vitals-log.tsx` | /health/vitals<br>/health/vitals/chart?vital=${vital}<br>/health/vitals/recent?vital=${vital} |
| `/health/vitals` | `app/health/vitals.tsx` | /health/vitals/summary |
| `/health/wearables` | `app/health/wearables.tsx` | /wearables/data<br>/wearables/devices |
| `/insurance/add-policy` | `app/insurance/add-policy.tsx` | /insurance/companies<br>/insurance/ocr-extract<br>/insurance/save-policy |
| `/insurance/approval-pending` | `app/insurance/approval-pending.tsx` | — |
| `/insurance/benefits-summary` | `app/insurance/benefits-summary.tsx` | /insurance/benefits-summary |
| `/insurance/claim-tracking` | `app/insurance/claim-tracking.tsx` | /api/v1/insurance/claims/my |
| `/insurance/copay` | `app/insurance/copay.tsx` | /patient/pay-copay |
| `/insurance/coverage-check` | `app/insurance/coverage-check.tsx` | — |
| `/insurance/hub` | `app/insurance/hub.tsx` | /insurance/claims<br>/insurance/save-policy<br>/users/me/insurance |
| `/insurance` | `app/insurance/index.tsx` | — |
| `/insurance/network-providers` | `app/insurance/network-providers.tsx` | — |
| `/insurance/payment-split` | `app/insurance/payment-split.tsx` | /insurance/coverage-check?service_type=${SERVICE.serviceType}<br>/insurance/payment-confirm |
| `/insurance/policy-detail` | `app/insurance/policy-detail.tsx` | — |
| `/insurance/refund-status` | `app/insurance/refund-status.tsx` | — |
| `/insurance/submit-claim` | `app/insurance/submit-claim.tsx` | /insurance/claims/submit |
| `/loyalty/challenges` | `app/loyalty/challenges.tsx` | /loyalty/challenges |
| `/loyalty/hub` | `app/loyalty/hub.tsx` | /loyalty/account<br>/loyalty/config<br>/loyalty/rewards<br>/loyalty/transactions?page=1 |
| `/loyalty/leaderboard` | `app/loyalty/leaderboard.tsx` | — |
| `/loyalty/referrals` | `app/loyalty/referrals.tsx` | — |
| `/loyalty/rewards` | `app/loyalty/rewards.tsx` | /loyalty/account<br>/loyalty/rewards<br>/loyalty/rewards/${reward.id}/claim |
| `/map` | `app/map/index.tsx` | /providers/map?${query.toString()}<br>/user/insurance |
| `/maternity/baby-development` | `app/maternity/baby-development.tsx` | /maternity/profile |
| `/maternity/baby-growth` | `app/maternity/baby-growth.tsx` | /maternity/infant-growth<br>/maternity/profile<br>/maternity/vaccines |
| `/maternity/fetus-data` | `app/maternity/fetus-data.ts` | — |
| `/maternity/hub` | `app/maternity/hub.tsx` | /maternity/checkups/${encodeURIComponent(week)}/toggle<br>/maternity/content<br>/maternity/profile |
| `/maternity/maternity-setup` | `app/maternity/maternity-setup.tsx` | /maternity/profile |
| `/maternity/ovulation-tracker` | `app/maternity/ovulation-tracker.tsx` | /maternity/profile |
| `/maternity/pregnancy-tracker` | `app/maternity/pregnancy-tracker.tsx` | /maternity/checkups/${encodeURIComponent(week)}/toggle<br>/maternity/contractions<br>/maternity/kicks<br>/maternity/profile |
| `/mental-health/breathing` | `app/mental-health/breathing.tsx` | /mental-health/breathing |
| `/mental-health/crisis-support` | `app/mental-health/crisis-support.tsx` | /mental-health/crisis-contacts |
| `/mental-health/hub` | `app/mental-health/hub.tsx` | — |
| `/mental-health` | `app/mental-health/index.tsx` | — |
| `/mental-health/meditation` | `app/mental-health/meditation.tsx` | /mental-health/meditation |
| `/mental-health/mood-journal` | `app/mental-health/mood-journal.tsx` | /mental-health/mood<br>/mental-health/mood?days=7 |
| `/mental-health/self-assessment` | `app/mental-health/self-assessment.tsx` | /mental-health/assessment<br>/mental-health/assessment-questions |
| `/mental-health/therapist-match` | `app/mental-health/therapist-match.tsx` | — |
| `/notifications` | `app/notifications/index.tsx` | — |
| `/nursing/live-doctor-tracking` | `app/nursing/live-doctor-tracking.tsx` | — |
| `/nursing/live-tracking` | `app/nursing/live-tracking.tsx` | /nursing/visits/${bookingId}/tracking |
| `/nursing/nurse-profile` | `app/nursing/nurse-profile.tsx` | /home-care/bookings<br>/home-care/insurance/verify<br>/home-care/providers/${nurseId} |
| `/nursing/service-details` | `app/nursing/service-details.tsx` | /home-care/providers?type=${serviceId}&sort=${sortType}&gender=${gender ||  |
| `/nutrition/ai-meal-planner` | `app/nutrition/ai-meal-planner.tsx` | — |
| `/nutrition/ai-plan-builder` | `app/nutrition/ai-plan-builder.tsx` | /nutrition/profile |
| `/nutrition/body-composition` | `app/nutrition/body-composition.tsx` | /nutrition/profile |
| `/nutrition/body-target` | `app/nutrition/body-target.tsx` | /nutrition/profile |
| `/nutrition/calorie-analyzer` | `app/nutrition/calorie-analyzer.tsx` | /nutrition/meals |
| `/nutrition/daily-tracker` | `app/nutrition/daily-tracker.tsx` | /nutrition/water |
| `/nutrition/exercise-plan` | `app/nutrition/exercise-plan.tsx` | — |
| `/nutrition/food-scanner` | `app/nutrition/food-scanner.tsx` | /nutrition/meals |
| `/nutrition/hub` | `app/nutrition/hub.tsx` | — |
| `/nutrition` | `app/nutrition/index.tsx` | — |
| `/nutrition/log-meal` | `app/nutrition/log-meal.tsx` | /nutrition/foods<br>/nutrition/meals |
| `/nutrition/nutrition-plan` | `app/nutrition/nutrition-plan.tsx` | — |
| `/nutrition/water-tracker` | `app/nutrition/water-tracker.tsx` | /nutrition/water |
| `/offers/[id]` | `app/offers/[id].tsx` | — |
| `/payments/failed` | `app/payments/failed.tsx` | — |
| `/payments/failure` | `app/payments/failure.tsx` | — |
| `/payments/processing` | `app/payments/processing.tsx` | — |
| `/payments/success` | `app/payments/success.tsx` | — |
| `/pharmacy/barcode-scanner` | `app/pharmacy/barcode-scanner.tsx` | — |
| `/pharmacy/broadcast-status` | `app/pharmacy/broadcast-status.tsx` | /orders/bids/${pharmacyId}/accept<br>/orders/bids/request/${requestId ||  |
| `/pharmacy/cart` | `app/pharmacy/cart.tsx` | — |
| `/pharmacy/chat-with-pharmacist` | `app/pharmacy/chat-with-pharmacist.tsx` | /chat/threads/${threadId}/messages<br>/chat/threads/${tid}/messages<br>/chat/threads/booking |
| `/pharmacy/checkout` | `app/pharmacy/checkout.tsx` | /orders/create<br>/users/me/profile |
| `/pharmacy/custom-item` | `app/pharmacy/custom-item.tsx` | — |
| `/pharmacy/drug-not-found` | `app/pharmacy/drug-not-found.tsx` | /patient/pharmacy/shortage-flags/lookup?generic_name=${encodeURIComponent(name)} |
| `/pharmacy/filters` | `app/pharmacy/filters.tsx` | /medicines/filters |
| `/pharmacy/manual-order` | `app/pharmacy/manual-order.tsx` | — |
| `/pharmacy/medicine-compare` | `app/pharmacy/medicine-compare.tsx` | /medicines/compare |
| `/pharmacy/order-confirm` | `app/pharmacy/order-confirm.tsx` | /orders/${orderId}<br>/orders/${orderId}/approve-basket<br>/orders/${orderId}/reject-basket |
| `/pharmacy/order-history` | `app/pharmacy/order-history.tsx` | /orders/mine |
| `/pharmacy/order-tracking` | `app/pharmacy/order-tracking.tsx` | /orders/${orderIdStr}/tracking |
| `/pharmacy/payment` | `app/pharmacy/payment.tsx` | /payments/paymob/initiate<br>/payments/paymob/methods |
| `/pharmacy/pharmacist-chat` | `app/pharmacy/pharmacist-chat.tsx` | — |
| `/pharmacy/product-detail` | `app/pharmacy/product-detail.tsx` | /medicines/${id}/details |
| `/pharmacy/product-search` | `app/pharmacy/product-search.tsx` | — |
| `/pharmacy/reorder` | `app/pharmacy/reorder.tsx` | /orders/${orderId}<br>/orders/${orderId}/reorder<br>/orders/${orderId}/reorder-partial |
| `/pharmacy/rx-order` | `app/pharmacy/rx-order.tsx` | /cart/prescription |
| `/pharmacy/scan-prescription` | `app/pharmacy/scan-prescription.tsx` | /ai/prescription-ocr |
| `/pharmacy/waiting-for-pharmacy` | `app/pharmacy/waiting-for-pharmacy.tsx` | /orders/${orderId}<br>/orders/${orderId}/cancel |
| `/pharmacy/wishlist` | `app/pharmacy/wishlist.tsx` | /users/me/wishlist<br>/users/me/wishlist/${id} |
| `/profile/addresses` | `app/profile/addresses.tsx` | /users/me/addresses<br>/users/me/addresses/${id} |
| `/profile/edit` | `app/profile/edit.tsx` | — |
| `/profile` | `app/profile/index.tsx` | — |
| `/profile/insurance` | `app/profile/insurance.tsx` | /users/me/insurance |
| `/programs/active` | `app/programs/active.tsx` | /medical/programs/active<br>/medical/programs/complete-session |
| `/reports/ai-analysis` | `app/reports/ai-analysis.tsx` | — |
| `/reports/hub` | `app/reports/hub.tsx` | — |
| `/reports/passport` | `app/reports/passport.tsx` | /medical-profile |
| `/reports/timeline` | `app/reports/timeline.tsx` | /medical-reports/timeline |
| `/reports/view-report` | `app/reports/view-report.tsx` | /reports/${params.id} |
| `/returns/detail` | `app/returns/detail.tsx` | — |
| `/returns/hub` | `app/returns/hub.tsx` | — |
| `/returns/new-request` | `app/returns/new-request.tsx` | /pharmacy/returns |
| `/reviews` | `app/reviews/index.tsx` | — |
| `/room/[id]` | `app/room/[id].tsx` | — |
| `/s/[type]/[slug]` | `app/s/[type]/[slug].tsx` | /seo/resolve/${type}/${encodeURIComponent(String(slug))} |
| `/search` | `app/search/index.tsx` | /home/search?q=${encodeURIComponent(query)} |
| `/settings/about` | `app/settings/about.tsx` | — |
| `/settings/data` | `app/settings/data.tsx` | — |
| `/settings/feedback` | `app/settings/feedback.tsx` | /support/feedback |
| `/settings/help` | `app/settings/help.tsx` | — |
| `/settings` | `app/settings/index.tsx` | — |
| `/settings/language` | `app/settings/language.tsx` | — |
| `/settings/notifications-settings` | `app/settings/notifications-settings.tsx` | /users/me/notification-settings |
| `/settings/notifications` | `app/settings/notifications.tsx` | — |
| `/settings/privacy` | `app/settings/privacy.tsx` | /users/me/privacy-settings |
| `/settings/security` | `app/settings/security.tsx` | /users/me/change-password<br>/users/me/security-settings |
| `/settings/support-chat` | `app/settings/support-chat.tsx` | — |
| `/settings/terms` | `app/settings/terms.tsx` | — |
| `/shared/location-picker` | `app/shared/location-picker.tsx` | /users/me/addresses |
| `/support/chat` | `app/support/chat.tsx` | — |
| `/support/ticket` | `app/support/ticket.tsx` | — |
| `/voice` | `app/voice/index.tsx` | — |
| `/wallet/cards` | `app/wallet/cards.tsx` | /wallet/cards<br>/wallet/cards/${cardId} |
| `/wallet/hub` | `app/wallet/hub.tsx` | /wallet/spending-data |
| `/wallet/topup` | `app/wallet/topup.tsx` | /wallet/topup |
| `/wallet/transactions` | `app/wallet/transactions.tsx` | /wallet/transactions |
| `/wallet/transfer` | `app/wallet/transfer.tsx` | /wallet/transfer |
| `/wearables/hub` | `app/wearables/hub.tsx` | /health/sleep<br>/health/vitals |

## 12) جرد تطبيق المزود (39 ملف شاشة)

- `src/screens/auth/AuthScreens.tsx`
- `src/screens/auth/PendingDashboard.tsx`
- `src/screens/doctor/DoctorDashboard.tsx`
- `src/screens/doctor/DoctorRegistration.tsx`
- `src/screens/doctor/FacilityInvitationsScreen.tsx`
- `src/screens/doctor/components/DoctorHeader.tsx`
- `src/screens/doctor/components/DoctorQueueList.tsx`
- `src/screens/doctor/components/DoctorStatsRow.tsx`
- `src/screens/doctor/components/DoctorUrgentRequests.tsx`
- `src/screens/facility/DischargeSummaryScreen.tsx`
- `src/screens/facility/FacilityAnnouncementsScreen.tsx`
- `src/screens/facility/FacilityAuditLogScreen.tsx`
- `src/screens/facility/FacilityDashboard.tsx`
- `src/screens/facility/FacilityInternalChatScreen.tsx`
- `src/screens/facility/FacilityInvitationScreen.tsx`
- `src/screens/facility/FacilityLeaveRequestsScreen.tsx`
- `src/screens/facility/FacilityPatientTrackerScreen.tsx`
- `src/screens/facility/FacilityProfileConfigScreen.tsx`
- `src/screens/facility/FacilityRegistration.tsx`
- `src/screens/facility/FacilityResourcesScreen.tsx`
- `src/screens/facility/FacilityUnifiedCalendarScreen.tsx`
- `src/screens/lab/LabDashboard.tsx`
- `src/screens/lab/LabRegistration.tsx`
- `src/screens/nursing/NursingDashboard.tsx`
- `src/screens/nursing/NursingFieldOps.tsx`
- `src/screens/nursing/NursingRegistration.tsx`
- `src/screens/pharmacy/PharmacyDashboard.tsx`
- `src/screens/pharmacy/PharmacyRegistration.tsx`
- `src/screens/radiology/RadiologyDashboard.tsx`
- `src/screens/radiology/RadiologyRegistration.tsx`
- `src/screens/shared/BlueprintScreens.tsx`
- `src/screens/shared/InsuranceRequestsScreen.tsx`
- `src/screens/shared/LiveKitRoomProvider.tsx`
- `src/screens/shared/PharmacyChatResponder.tsx`
- `src/screens/shared/ProviderHome.tsx`
- `src/screens/shared/RealScreens.tsx`
- `src/screens/shared/RealScreensExtended.tsx`
- `src/screens/shared/RegistrationSuccess.tsx`
- `src/screens/shared/SharedScreens.tsx`

## 13) جرد لوحة الأدمن (33 صفحة)

- `pages/_app.tsx`
- `pages/_document.tsx`
- `pages/index.tsx`
- `pages/login.tsx`
- `pages/admin/analytics.tsx`
- `pages/admin/audit-logs.tsx`
- `pages/admin/commissions.tsx`
- `pages/admin/config-portal.tsx`
- `pages/admin/dashboard.tsx`
- `pages/admin/disputes.tsx`
- `pages/admin/financial-ledger.tsx`
- `pages/admin/fraud-monitoring.tsx`
- `pages/admin/health-dashboard.tsx`
- `pages/admin/image-suggestions.tsx`
- `pages/admin/insurance-queue.tsx`
- `pages/admin/notification-center.tsx`
- `pages/admin/nursing-portal.tsx`
- `pages/admin/payouts.tsx`
- `pages/admin/provider-audits.tsx`
- `pages/admin/provider-moderation.tsx`
- `pages/admin/rbac.tsx`
- `pages/admin/shortage-reports.tsx`
- `pages/admin/sos-monitor.tsx`
- `pages/admin/support-tickets.tsx`
- `pages/admin/users-management.tsx`
- `pages/api/hello.ts`
- `pages/articles/index.tsx`
- `pages/doctors/index.tsx`
- `pages/facilities/index.tsx`
- `pages/home-care-services/index.tsx`
- `pages/lab-services/index.tsx`
- `pages/medicines/index.tsx`
- `pages/s/[type]/[slug].tsx`

## 14) جرد وحدات الباك إند (97 وحدة)

- **admin** — admin.controller.ts, admin.module.ts
- **admin-authority** — admin-authority.module.ts
- **admin-command-center** — admin-command-center.module.ts
- **admin-governance** — admin-governance.module.ts, b2b.controller.ts
- **admin-notification-center** — admin-notification-center.module.ts
- **admin-web-core** — admin-web-core.module.ts
- **ai** — ai.controller.ts, ai.module.ts
- **analytics** — analytics.module.ts
- **api-security** — api-security.module.ts
- **approval-workflow** — approval-workflow.module.ts
- **articles** — articles.module.ts
- **auth** — auth.controller.ts, auth.module.ts
- **bans** — bans.controller.ts, bans.module.ts
- **billing** — billing.module.ts
- **booking-flow** — booking-flow.module.ts
- **booking-ops** — booking-ops.module.ts
- **business-rules** — business-rules.module.ts
- **care** — appointments.controller.ts, care.controller.ts
- **cart** — cart.controller.ts, cart.module.ts
- **chat** — chat.module.ts
- **community** — community.controller.ts, community.module.ts
- **compat** — admin-spa.module.ts, compat.module.ts
- **config** — config.controller.ts, config.module.ts
- **consistency** — consistency.module.ts
- **coturn** — coturn.controller.ts, coturn.module.ts
- **custom-services** — custom-services.controller.ts, custom-services.module.ts
- **device-trust** — device-trust.module.ts
- **doctors** — doctors.module.ts
- **drivers** — drivers.controller.ts, drivers.module.ts
- **emergency** — emergency.controller.ts, emergency.module.ts
- **event-reliability** — event-reliability.module.ts
- **events** — events.module.ts
- **export** — export.controller.ts, export.module.ts
- **facility-ops** — facility-ops.module.ts
- **family** — family.controller.ts, family.module.ts
- **feature-flags** — feature-flags.controller.ts, feature-flags.module.ts
- **health** — health-dashboard.controller.ts, health.controller.ts
- **home** — home.controller.ts, home.module.ts
- **home-care** — home-care.controller.ts, home-care.module.ts
- **home-care-compat** — home-care-compat.module.ts
- **hospital** — hospital.module.ts
- **hospital-staff** — hospital-staff.module.ts
- **i18n** — i18n.controller.ts, i18n.module.ts
- **insurance** — insurance.controller.ts, insurance.module.ts
- **insurance-engine** — insurance-engine.module.ts
- **labs** — lab-results.controller.ts, labs.controller.ts
- **legacy** — legacy.module.ts
- **livekit** — livekit.controller.ts, livekit.module.ts
- **loyalty** — loyalty.controller.ts, loyalty.module.ts
- **mail** — mail.module.ts
- **maternity** — maternity.controller.ts, maternity.module.ts
- **media** — media.controller.ts, media.module.ts
- **medical-profile** — medical-profile.controller.ts, medical-profile.module.ts
- **medical-reports** — medical-reports.controller.ts, medical-reports.module.ts
- **medicines** — medicines.controller.ts, medicines.module.ts
- **mental-health** — mental-health.controller.ts, mental-health.module.ts
- **moyasar** — moyasar.module.ts
- **nabd-extensions** — nabd-extensions.controller.ts, nabd-extensions.module.ts
- **notification** — notification.module.ts
- **notifications** — notifications.controller.ts, notifications.module.ts
- **nutrition** — nutrition.controller.ts, nutrition.module.ts
- **ocr** — —
- **operations-safety** — operations-safety.module.ts
- **orders** — orders.controller.ts, orders.module.ts
- **patient-ux** — patient-ux.module.ts
- **payments** — payments.module.ts, payments.webhook.controller.ts
- **pharmacy** — patient-pharmacy.controller.ts, pharmacy.module.ts
- **pharmacy_ops** — pharmacy_ops.controller.ts, pharmacy_ops.module.ts
- **prescriptions** — prescriptions.controller.ts, prescriptions.module.ts
- **presence** — presence.module.ts
- **provider** — leave-requests.controller.ts, provider.module.ts
- **provider-jobs** — provider-jobs.module.ts
- **provider-onboarding** — provider-onboarding.module.ts
- **provider-ops** — provider-ops.module.ts
- **providers** — providers.controller.ts, providers.module.ts
- **push** — push.module.ts
- **radiology** — radiology.controller.ts, radiology.module.ts
- **realtime** — realtime.module.ts
- **recruitment** — recruitment.module.ts
- **redis** — redis.module.ts
- **returns** — returns.controller.ts, returns.module.ts
- **security** — security.module.ts
- **seed** — seed.module.ts
- **seo** — seo.controller.ts, seo.module.ts
- **service-catalog** — service-catalog.module.ts
- **slot-locks** — slot-locks.module.ts
- **sms** — sms.module.ts
- **storage** — storage.module.ts
- **support** — support.controller.ts, support.module.ts
- **system-health** — system-health.controller.ts, system-health.module.ts
- **timeline** — timeline.controller.ts, timeline.module.ts
- **tour** — tour.controller.ts, tour.module.ts
- **unified-bookings** — unified-bookings.controller.ts, unified-bookings.module.ts
- **users** — user.insurance.controller.ts, users.addresses.controller.ts
- **wallet** — wallet.controller.ts, wallet.module.ts
- **webhooks** — webhooks.controller.ts, webhooks.module.ts
- **workflow-engine** — workflow-engine.module.ts

---

## 15) المتغيرات البيئية (109) — مرجع سريع

> التفصيل الكامل بالعربية في `nabdah-backend/ENVIRONMENT.md` (داخل الأزيب) و`.env.example`.

| المجموعة | المتغيرات |
|---|---|
| **Core** | `PORT=8002` `NODE_ENV` `MONGO_URL` `DB_NAME` `REDIS_URL/HOST/PORT/PASSWORD` `JWT_SECRET` `CORS_ORIGINS` `API_PUBLIC_URL` |
| **Push/FCM** | `FCM_PROJECT_ID` `FCM_CLIENT_EMAIL` `FCM_PRIVATE_KEY` |
| **APNs** | `APNS_KEY_ID` `APNS_TEAM_ID` `APNS_BUNDLE_ID` `APNS_AUTH_KEY` `APNS_TOPIC` `APNS_HOST` |
| **Web Push** | `WEB_PUSH_VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT` |
| **Calls** | `LIVEKIT_URL/API_KEY/API_SECRET` `COTURN_HOST/SECRET/STUN_PORT/TURN_PORT` `TURN_REALM` `TURN_URLS` |
| **Mail** | `RESEND_API_KEY` `MAIL_FROM` `SES_SMTP_HOST/PORT/USER/PASS/FROM` |
| **SMS** | `SMS_ENABLED` `TAQNYAT_API_KEY` `INFOBIP_API_KEY/BASE_URL` |
| **AI** | `AI_PROVIDER` `AI_MODEL/VISION_MODEL` `GEMINI_API_KEY` `OPENAI_API_KEY/MODEL` `OPENROUTER_API_KEY/MODEL` `GROQ_API_KEY/MODEL/VISION_MODEL` |
| **R2/S3** | `S3_ENDPOINT/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY/PUBLIC_BASE_URL/REGION` |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` |
| **Device Trust** | `PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON` `PLAY_INTEGRITY_PACKAGE` |
| **Payments** | `MOYASAR_*` `TABBY_*` `TAMARA_*` `STCPAY_*` |
| **Flags** | `ENABLE_AI_TRIAGE/VIDEO_CALLS/VOICE_CALLS/CHAT` `ZATCA_ENABLED` |
| **Patient App** | `EXPO_PUBLIC_API_URL` `EXPO_PUBLIC_WS_URL` `EXPO_PUBLIC_LIVEKIT_URL` `EXPO_PUBLIC_CDN_URL` `EXPO_PUBLIC_GOOGLE_MAPS_KEY` `EXPO_PUBLIC_PROJECT_ID` + دفع |
| **Provider App** | `EXPO_PUBLIC_API_URL` `EXPO_PUBLIC_BACKEND_URL` `EXPO_PUBLIC_LIVEKIT_URL` `EXPO_PUBLIC_PROJECT_ID` |
| **Admin** | `NEXT_PUBLIC_API_URL/WS_URL/SITE_URL/APP_NAME` |

---

## 16) المتبقي الخارجي (قائمة تشغيل المالك)

1. توكن R2 (Admin Read & Write) + R2 Custom Domain cdn.nabd.plus + Public Access
2. Cloudflare WAF/Bot/DDoS (Proxied DNS)
3. Cloudinary (3 مفاتيح) · Play Integrity service account · APNs (نفسها App Attest)
4. Firebase FCM+Analytics · Sentry DSN · reCAPTCHA · Resend · بوابات الدفع
5. SHA256 fingerprint + TeamID لملفي deep links (`deploy/nginx/well-known/`)

**قواعد ذهبية للمشروع:** لا mock في المسارات الحية · لا أسرار في الكود/جيت · كل حذف صورة يحذف من التخزين · كل شارة تمر باعتماد الأدمن · كل حدث أمني يُسجَّل · المزود لا يشتري أبداً · OTP عبر البريد حتى تفعيل SMS بفلاج.
