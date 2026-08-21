# حزمة العقود الناقصة — Patient Web Parity (Contract Pack v1)
**إعداد: المراجع المعتمد | التاريخ: 2026-08-21 | الأساس: backend المنشور حياً (main @ 8db3ac0f، 1398 مساراً)**

قواعد حاكمة تسري على **كل** عقد في هذه الحزمة:

1. **الملكية:** كل مورد مملوك لمريض يرجع `404` لغير المالك (لا `403`) لمنع تخمين الوجود، باستثناء القوائم العامة الموثقة أدناه.
2. **Idempotency:** كل `POST` مالي أو حجز يقبل هيدر `Idempotency-Key: <uuid>` إلزامياً؛ إعادة نفس المفتاح ترجع نفس النتيجة الأصلية (`200` + `idempotent_replay: true`) دون تنفيذ مضاعف. TTL للمفتاح 24 ساعة.
3. **Rate limits:** mutations الحساسة `10/min` لكل مستخدم؛ OTP وlogin حسب السياسة الحالية.
4. **Audit:** كل mutation تكتب سجل تدقيق (actor_id, action, resource_id, before/after hash, ip, ua).
5. **لا PII في URLs:** المعرّفات في المسار UUID فقط؛ ممنوع هاتف/بريد/اسم في query أو path.
6. **الاستجابات:** أخطاء موحدة `{ message, code, statusCode }`؛ النجاح DTO مقيد — لا `__v`، لا مسارات تخزين خام، لا حقول داخلية.
7. **الاختبار الإلزامي لكل عقد:** owner 200 / stranger 404 (أو 401) / unauth 401 + اختبار replay للـ idempotency.
8. **i18n:** رسائل الخطأ الموجهة للمستخدم بمفاتيح ترجمة، والباك إند يرجع `code` ثابتاً تترجمه الواجهة.

---

## 1) Auth & Session (G-OTP-001)

### POST /auth/otp/request
- Body: `{ identifier: string }` (بريد أو هاتف)
- 200: `{ otp_sent: true, channel: "email"|"sms", expires_in: 300 }` — 429 عند التجاوز (3/10min)
- لا يكشف وجود الحساب: نفس الاستجابة لغير المسجّل.

### POST /auth/otp/verify
- Body: `{ identifier, code: string(6), device_id?: uuid }`
- 200: `{ exchange_token: string, expires_in: 60 }` — رمز أحادي الاستخدام قصير العمر (60ث، one-time)
- 401: `{ code: "otp_invalid" }` | 410: `{ code: "otp_expired" }` | 429 بعد 5 محاولات فاشلة ثم قفل 15 دقيقة.

### POST /auth/session/exchange  (جديد — جسر الويب)
- Body: `{ exchange_token }`
- 200: ينشئ الجلسة ويرجع `{ authenticated: true }` مع Set-Cookie httpOnly (access 1h + refresh 14d) — **التوكنات لا تظهر في body ولا URL أبداً**.
- 401 exchange_token منتهي/مستهلك. كل exchange_token يُبطل فور استخدامه.

### POST /auth/register / POST /auth/password/forgot / POST /auth/password/reset
- register: `{ name, identifier, password, locale, consents: [{policy_id, version}] }` → 201 `{ registered: true }` + يبدأ OTP. تسجيل الموافقات القانونية إلزامي.
- forgot: نفس مبدأ عدم كشف الوجود. reset: `{ reset_token(60s TTL, one-time), new_password }`.

---

## 2) Profile & Health ID (G-PROFILE-001)

### GET /users/me/display  (جديد — DTO عرض مقيد)
- 200: `{ display_name, avatar_url(public CDN فقط), locale, member_since, health_id }` — **بدون** بريد/هاتف/معرفات داخلية/مسارات تخزين.

### PATCH /users/me
- Body allowlist: `{ display_name?, avatar_media_id?, locale?, gender?, birth_date?, height_cm?, weight_kg?, blood_type? }`
- 200: DTO العرض نفسه. 400 لأي حقل خارج القائمة. avatar_media_id يجب أن يكون مورد ميديا مملوكاً للمستخدم.

### GET /users/me/health-id
- 200: `{ health_id, qr_payload(jwt قصير 5min), issued_at }` — الـ QR payload موقّع وقصير العمر.

---

## 3) Vitals & Health Logs (الفجوة المؤكدة: الموبايل يستدعي GET غير موجود)

### GET /health/vitals-log?limit=100  (جديد — يطابق استدعاء الموبايل)
- 200: `{ items: [{ id, type: "blood_pressure"|"glucose"|"weight"|"heart_rate"|..., value, unit, measured_at, source: "manual"|"device", context? }] }` — بدون synthetic defaults.

### POST /health/vitals  | PATCH /health/vitals/{id} | DELETE /health/vitals/{id}
- POST body: `{ type, value, unit, measured_at, context? }` + Idempotency-Key → 201 `{ id }`
- PATCH/DELETE: 404 لغير المالك. DELETE حذف ناعم (soft delete) مع audit.

### POST /health/wearables/link | DELETE /health/wearables/{device_id}
- link: `{ provider: "apple_health"|"google_fit"|..., auth_code }` → التكامل server-to-server فقط؛ لا مفاتيح أجهزة في المتصفح. 501 إن لم يُفعّل المزود بعد (حالة صادقة).

---

## 4) Medication Reminders

### GET /health/reminders — موجود (يبقى)
### POST /health/reminders — body: `{ medicine_id|manual_name, schedule: {times[], frequency}, start_date, end_date? }` + Idempotency-Key → 201
### PATCH /health/reminders/{id} | DELETE /health/reminders/{id} | POST /health/reminders/{id}/log — body `{ taken_at, status: "taken"|"skipped" }` + Idempotency-Key
### POST /health/medications/{id}/refill — يحوّل لطلب صيدلية مسودة (يرتبط بعقد الطلبات)

---

## 5) Family (G-FAMILY-001)

### GET /family/my-group/members — 200: `{ members: [{ display_name, role, joined_at }] }` فقط (لا IDs ولا invite_code)
### POST /family/invite — `{ channel: "sms"|"email", target }` → 201 `{ invite_sent: true, expires_in: 86400 }` (الرمز لا يظهر في الاستجابة)
### POST /family/join — `{ invite_code }` → 200 | 410 منتهي | 409 عضو بالفعل
### PATCH /family/members/{member_id}/permissions — `{ scopes: ["view_health"|"book_for"|...] }` — مالك المجموعة فقط، 403 واضح هنا (الدور معلوم للعضو)
### DELETE /family/members/{member_id} | POST /family/leave — soft remove + audit + إشعار للطرف الآخر

---

## 6) Pharmacy & Orders (الأولوية الأولى — عقود موجودة تحتاج إثباتات)

### POST /cart/items | PATCH /cart/items/{item_id} | DELETE /cart/items/{item_id}
- body: `{ medicine_id|manual_name, quantity }` — manual_name يتبع نفس مسار المراجعة اليدوية المنشور (PENDING_REVIEW للصيدلي).
### POST /cart/checkout — `{ address_id, payment_method_id|"cash", coupon_code?, prescription_media_ids? }` + **Idempotency-Key إلزامي** → 201 `{ order_id, status, total, payment_intent? }`
- 409: مخزون تغيّر | 422: كوبون غير صالح | 402: فشل الدفع (بدون تفاصيل حساسة).
### GET /orders/{id}/tracking — موجود ✅ (يبقى، مع تحقق ملكية)
### POST /orders/{id}/reorder — ينشئ سلة جديدة من الطلب المملوك
### POST /orders/{id}/cancel — قواعد الإلغاء حسب الحالة؛ 409 إن تجاوز مرحلة قابلة للإلغاء
### POST /payments/moyasar/webhook — توقيع webhook يتحقق خادمياً (MOYASAR_WEBHOOK_SECRET) — ممنوع فتحه للمريض.

---

## 7) Consultations & Booking

### POST /unified-bookings — `{ doctor_id, slot_id, type: "clinic"|"video"|"home", notes?, payment_method_id? }` + Idempotency-Key → 201 `{ booking_id, status: "pending_payment"|"confirmed" }`
- **Slot locking:** قفل الموعد 10 دقائق بانتظار الدفع، ثم تحرير تلقائي. 409 slot_taken.
### POST /unified-bookings/{id}/cancel | POST /unified-bookings/{id}/reschedule — `{ new_slot_id }` — 404 لغير المالك، قواعد الإلغاء الزمنية (24h) تفرض خادمياً.
### GET /unified-bookings/{id}/call-token — 200 `{ provider: "livekit", token(10min TTL), room }` — للمالك والطبيب فقط، يصدر عند اقتراب الموعد فقط (نافذة ±15min).

---

## 8) Home Care (G-HOME-001)

### GET /home-care/bookings/{bookingId} (جديد)
- 200 للمالك: `{ id, status, service_type, scheduled_at, nurse: { display_name, avatar_url }, timeline: [{status, at}] }` — **404 لغير المالك**، DTO محدود بلا بيانات داخلية.

---

## 9) Prescriptions & Chat (G-PRESCRIPTION-001 / G-CHAT-001)

### GET /prescriptions/{id} — إضافة Bearer security في OpenAPI + 404 لغير المالك + DTO: `{ id, status, items: [{name, dose, frequency, duration}], issued_at, doctor: { display_name, specialty } }` (بدون diagnosis/notes الداخلية)
### POST /chat/threads/{id}/messages — `{ body, media_ids? }` + Idempotency-Key — للمشاركين فقط (404 لغيرهم)
### POST /chat/threads/{id}/read — `{ up_to_message_id }`
- Realtime: Socket.IO/LiveKit token عبر `GET /chat/threads/{id}/rt-token` قصير العمر (10min) للمشاركين فقط.

---

## 10) Media & Files (G-FILE-001)

### POST /media/upload — موجود ✅ مع قيود النوع/الحجم الحالية. يضاف: ربط `purpose` (order_prescription|chat|avatar|report) و`owner_binding`.
### GET /media/{id}/url — روابط موقعة قصيرة العمر (15min) للمالك والأطراف المصرح لهم بالغرض فقط. الملفات الطبية لا تُخدم برابط عام أبداً.
### DELETE /media/*key — **مقيّد admin فقط (تم إغلاق P1 في main @926995c8)** — يبقى كذلك.

---

## 11) Public Catalog & SEO (G-SEO-002 / G-DATA-004)

### GET /public/catalog/{locale}/{category}.json — شظايا الكتالوج المولدة (راجع وثيقة بنية التوزيع): فقط عناصر `public_eligibility:true + medical_review_status:approved + indexing_eligibility:true`.
### GET /public/specialties — يضاف `published_provider_count` المحسوب من المزودين المعتمدين فقط (إصلاح G-DATA-004: عدّ صفري رغم وجود سجلات).
- ممنوع اشتقاق العدّ في الواجهة؛ المصدر خادمي فقط.

---

## 12) Notifications & Articles mutations

### POST /articles/{id}/bookmark | DELETE /articles/{id}/bookmark — owner-scoped + Idempotency-Key
### PATCH /users/me/notification-settings — allowlist `{ channels: {push?, email?, sms?}, categories: {...} }`
### DELETE /users/me/sessions/{session_id} — revoke للجلسة المملوكة فقط (404 لغير المالك)، مع audit.

---

## معايير القبول لكل حزمة
1. العقد منفذ في الباك إند + اختباراته (owner/stranger/unauth + idempotency) ضمن جناح الاختبارات (75 suites/417 حالياً — تبقى خضراء وتزيد).
2. OpenAPI محدّث: security + schemas + responses/errors لكل عملية جديدة (G-OAPI-001/002).
3. الويب: parser + allowlist أولاً ← اختبار sandbox owner/other ← اختبار SSR ← UI.
4. فحص الإقلاع الحقيقي `node dist/main.js` قبل تسليم أي دفعة باك إند.
