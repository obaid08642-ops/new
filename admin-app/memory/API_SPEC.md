# 📡 Nabd Admin — Backend API Specification

> **For Backend Developer** — هذا المستند يحدد كل الـ APIs المطلوبة لتشغيل Admin Dashboard كاملاً.
> كل endpoint مذكور: المسار، الطريقة، الـ request shape، الـ response shape، والشاشة التي تستخدمه.
> Frontend مبني بالكامل ومرتبط بـ `axios` instance في `/app/frontend/src/api/client.js`.

---

## 🌐 Conventions (قواعد عامة لكل الـ APIs)

### Base URL
- Production: `https://api.nabd.plus/api`
- Development: `${REACT_APP_BACKEND_URL}/api`

### Authentication
كل endpoint (ما عدا `/auth/login`) يتطلب JWT Bearer Token:
```
Authorization: Bearer <jwt_token>
```

### Standard Response Envelope
- ✅ Success → `200/201`:
  ```json
  { "success": true, "data": <object|array>, "meta": { ... } }
  ```
- ❌ Error → `4xx/5xx`:
  ```json
  { "success": false, "error": { "code": "ERR_CODE", "message_ar": "...", "message_en": "..." } }
  ```

### Pagination (لكل list endpoint)
- Query: `?page=1&limit=20&sort=created_at:desc&q=بحث&filters[status]=active`
- Response meta:
  ```json
  { "meta": { "page": 1, "limit": 20, "total": 342, "pages": 18 } }
  ```

### Datetime
- ISO 8601 UTC: `"2025-05-28T10:32:00Z"`
- Frontend يحوّلها للتوقيت السعودي عبر `toLocaleString("ar-SA")`

### IDs
- استخدم string IDs (مش int): `"P001"`, `"ORD-8821"`, `"CLM001"` — متوافق مع MOCK
- يفضل MongoDB ObjectId لكن مع field `display_id` للقراءة البشرية

---

## 🔐 1. AUTH

### `POST /auth/login`
**استخدام**: شاشة تسجيل الدخول (سيتم إضافتها لاحقاً)
**Request**:
```json
{ "email": "admin@nabd.plus", "password": "********" }
```
**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "ADM001",
      "name": "أحمد الحربي",
      "email": "admin@nabd.plus",
      "role": "SUPER_ADMIN",
      "avatar": null,
      "permissions": ["all"]
    }
  }
}
```
**Errors**: `401 INVALID_CREDENTIALS`, `423 ACCOUNT_LOCKED`, `429 TOO_MANY_ATTEMPTS`

### `POST /auth/logout`
**Request**: (empty) — يكفي الـ token
**Response**: `{ "success": true }`

### `GET /auth/me`
**Response**: نفس `data.user` من login

### `POST /auth/refresh`
**Request**: `{ "refresh_token": "..." }`
**Response**: `{ "token": "...", "refresh_token": "..." }`

---

## 📊 2. DASHBOARD / KPIs

### `GET /dashboard/kpis`
**استخدام**: Dashboard component (Control Center)
**Response**:
```json
{
  "success": true,
  "data": {
    "orders_today": { "value": 1284, "change_pct": 18 },
    "revenue_today": { "value": 48920, "currency": "SAR", "change_pct": 24 },
    "active_providers": { "value": 342, "change": 3 },
    "patients_today": { "value": 2180, "change_pct": 12 },
    "pending_approvals": { "value": 4, "urgency": "urgent" },
    "active_broadcasts": { "value": 2 },
    "auto_notifications_today": { "value": 358, "change_pct": 8 },
    "pending_insurance_claims": { "value": 1, "urgency": "urgent" }
  }
}
```

### `GET /dashboard/alerts`
**Response**:
```json
{
  "data": [
    { "type": "emergency", "count": 2, "message_ar": "2 طوارئ نشطة — واحدة لم تُقبل!", "severity": "critical", "route": "emergency-live" },
    { "type": "compliance", "count": 3, "message_ar": "3 تراخيص تنتهي قريباً", "severity": "warning", "route": "compliance" },
    { "type": "shortage", "count": 2, "message_ar": "2 بلاغات نقص أدوية", "severity": "warning", "route": "market-shortage" },
    { "type": "fraud", "count": 3, "message_ar": "3 تنبيهات احتيال", "severity": "warning", "route": "fraud" }
  ]
}
```

### `GET /dashboard/live-feed`
**Response**: آخر 10 طلبات (نفس شكل `/orders`)

---

## 📡 3. BROADCAST & EMERGENCY

### `GET /broadcast/live`
**استخدام**: BroadcastMonitor + Dashboard live broadcast widget
**Response**:
```json
{
  "data": [{
    "id": "BC001",
    "order_id": "ORD-8820",
    "type": "Doctor",
    "patient": "سارة العتيبي",
    "area": "جدة - حي الحمراء",
    "radius": 4,
    "started": "2025-05-28T10:15:00Z",
    "elapsed_minutes": 8,
    "providers_notified": 12,
    "accepted": 0,
    "status": "expanding",
    "next_expand_at": "2025-05-28T10:18:00Z"
  }]
}
```

### `POST /broadcast/:id/expand` — توسيع النطاق يدوياً
**Response**: `{ "success": true, "new_radius": 8 }`

### `POST /broadcast/:id/cancel`
**Request**: `{ "reason": "تم الإلغاء يدوياً" }`
**Response**: `{ "success": true }`

### `GET /broadcast/config`
**Response**:
```json
{
  "data": {
    "initial_radius_km": 4,
    "expand_step_km": 4,
    "max_radius_km": 20,
    "expand_after_minutes": 3,
    "max_expand_count": 5,
    "min_providers_before_expand": 1,
    "by_service": {
      "Doctor": { "initial_radius_km": 4 },
      "Pharmacy": { "initial_radius_km": 6 },
      "Nursing": { "initial_radius_km": 4 },
      "Lab": { "initial_radius_km": 8 }
    }
  }
}
```

### `PUT /broadcast/config`
**Request**: نفس شكل `data` أعلاه

### `GET /emergency/live`
**Response**:
```json
{
  "data": [{
    "id": "EM001",
    "patient": "محمد العمري",
    "patient_id": "U006",
    "location": "الرياض - حي الصحافة",
    "lat": 24.7891, "lng": 46.6892,
    "type": "قلبية",
    "started": "2025-05-28T10:20:00Z",
    "hospitals_notified": 5,
    "accepted_by": "مستشفى الرحمة التخصصي",
    "accepted_by_id": "P001",
    "eta_minutes": 7,
    "status": "dispatched",
    "ambulance_id": "AMB-004"
  }]
}
```

### `POST /emergency/:id/dispatch`
**Request**: `{ "ambulance_id": "AMB-004", "hospital_id": "P001" }`

---

## 🔌 4. KILL SWITCHES

### `GET /kill-switches`
**Response**:
```json
{
  "data": [{
    "id": "KS001",
    "name": "الشات الكامل",
    "key": "chat_enabled",
    "value": true,
    "description": "إيقاف يوقف جميع المحادثات في التطبيق فوراً",
    "danger": true,
    "last_changed_by": "أحمد الحربي",
    "last_changed_at": "2025-05-27T18:00:00Z"
  }]
}
```

### `POST /kill-switches/:key/toggle`
**Request**: `{ "value": false, "reason": "صيانة طارئة لخادم الدفع" }`
**Response**: `{ "success": true, "audit_log_id": 6 }`
**ملاحظة**: يجب أن يولّد audit log entry تلقائياً

---

## 🏥 5. PROVIDERS

### `GET /providers?page=1&limit=20&type=Hospital&status=active&q=الرحمة`
**Response**:
```json
{
  "data": [{
    "id": "P001",
    "name": "مستشفى الرحمة التخصصي",
    "type": "Hospital",
    "status": "active",
    "rating": 4.8,
    "orders": 1240,
    "revenue": 184200,
    "area": "الرياض - حي الياسمين",
    "lat": 24.7136, "lng": 46.6753,
    "services": ["Emergency","Clinic","Lab","Imaging"],
    "available": true,
    "commission": 12,
    "sla": 98,
    "contract_end": "2026-01-01",
    "iban": "SA12345678901234567890",
    "cr": "1234567890",
    "scfhs": null,
    "sub_accounts": 8,
    "insurance": ["بوبا","ميدغلف","التعاونية"],
    "has_courier": false,
    "phone": "+966112345678",
    "email": "info@alrahma.com",
    "created_at": "2024-01-15T10:00:00Z"
  }],
  "meta": { "page": 1, "limit": 20, "total": 342, "pages": 18 }
}
```

### `GET /providers/:id` — تفاصيل كاملة
يرجع نفس الـ object + حقول إضافية: `documents[]`, `team_members[]`, `recent_orders[]`, `reviews_summary{}`, `monthly_revenue_chart[]`

### `PUT /providers/:id`
**Request**: نفس fields الـ provider (partial update)

### `POST /providers/:id/suspend`
**Request**: `{ "reason": "تأخر في تجديد الترخيص" }`

### `POST /providers/:id/reactivate`
**Request**: `{ "note": "تم تجديد الترخيص" }`

### `GET /providers/pending-approvals`
**Response**:
```json
{
  "data": [{
    "id": "PA001",
    "name": "مركز الطب التخصصي المتكامل",
    "type": "Hospital",
    "submitted": "2025-05-26T08:00:00Z",
    "docs": {
      "cr": { "uploaded": true, "verified": true, "url": "..." },
      "scfhs": null,
      "iban": { "uploaded": true, "verified": true, "url": "..." },
      "license": { "uploaded": true, "verified": true, "url": "..." },
      "photos": { "uploaded": true, "verified": true, "urls": ["...","..."] }
    },
    "services": ["Emergency","Clinic","Lab","Imaging"],
    "score": 87,
    "commission_proposed": 12,
    "iban_verified": true,
    "city": "الرياض",
    "contact": "+966501111111",
    "specialty": null,
    "degree": null
  }]
}
```

### `POST /providers/:id/approve`
**Request**:
```json
{
  "commission_percent": 12,
  "services_approved": ["Emergency","Clinic","Lab","Imaging"],
  "contract_template": "STANDARD_HOSPITAL_2025",
  "note": "تمت الموافقة بعد التحقق"
}
```
**Response**: `{ "success": true, "provider_id": "P007", "audit_log_id": 7 }`

### `POST /providers/:id/reject`
**Request**: `{ "reason": "نقص في وثيقة SCFHS", "send_email": true }`

### `POST /providers/:id/request-docs` — طلب وثائق إضافية
**Request**: `{ "docs": ["photos","scfhs"], "note_ar": "نحتاج صور أوضح للمنشأة" }`

### `GET /providers/:parent_id/sub-accounts`
**Response**:
```json
{
  "data": [{
    "id": "SA001",
    "parent_provider": "مستشفى الرحمة",
    "parent_id": "P001",
    "name": "د. سامي الغامدي",
    "role": "doctor",
    "specialty": "باطنية",
    "degree": "استشاري",
    "email": "sami@alrahma.com",
    "phone": "+966500000000",
    "status": "active",
    "orders_today": 8,
    "scfhs_id": "SCFHS-123456",
    "permissions": ["accept_orders","issue_rx"]
  }]
}
```

### `POST /providers/:parent_id/sub-accounts`
**Request**: نفس الشكل (بدون id)

### `PUT /sub-accounts/:id` / `DELETE /sub-accounts/:id`

---

## 👨‍⚕️ 6. DOCTORS

### `GET /doctors?specialty=باطنية&degree=استشاري`
**Response**:
```json
{
  "data": [{
    "id": "D001",
    "name": "د. سامي الغامدي",
    "specialty": "باطنية",
    "specialty_id": "SP002",
    "degree": "استشاري",
    "scfhs_id": "SCFHS-123456",
    "scfhs_status": "valid",
    "scfhs_expiry": "2026-12-31",
    "provider_id": "P001",
    "provider_name": "مستشفى الرحمة",
    "rating": 4.7,
    "orders_completed": 240,
    "consultations_online": true,
    "consultations_home": true,
    "languages": ["ar","en"],
    "fee_clinic": 250,
    "fee_online": 150,
    "fee_home": 400
  }]
}
```

---

## 👥 7. PATIENTS

### `GET /patients?page=1&q=أحمد&city=الرياض&status=active`
**Response**:
```json
{
  "data": [{
    "id": "U001",
    "name": "أحمد محمد الزهراني",
    "phone": "+966501234567",
    "email": "ahmed@example.com",
    "status": "active",
    "orders": 24,
    "wallet": 450,
    "wallet_currency": "SAR",
    "joined": "2024-01-15T10:00:00Z",
    "insurance": "بوبا",
    "insurance_id": "INS001",
    "policy": "BP-123456",
    "city": "الرياض",
    "flags": [],
    "family_linked": 2,
    "dob": "1990-03-12",
    "gender": "M",
    "address": "حي الياسمين، شارع 12",
    "lat": 24.81, "lng": 46.71,
    "national_id": "1234567890"
  }],
  "meta": { ... }
}
```

### `GET /patients/:id` + `PUT /patients/:id`

### `POST /patients/:id/block`
**Request**: `{ "reason": "حسابات متعددة", "duration_days": 30 }`

### `POST /patients/:id/unblock`

### `GET /patients/:id/orders` — تاريخ الطلبات
### `GET /patients/:id/wallet-transactions`
### `GET /patients/:id/family-members`

---

## 👨‍👩‍👧 8. FAMILY CARDS

### `GET /family-cards`
**Response**:
```json
{
  "data": [{
    "id": "FC001",
    "primary_user_id": "U001",
    "primary_user_name": "أحمد الزهراني",
    "members": [
      { "id":"FM001", "name":"محمد أحمد", "relation":"ابن", "dob":"2015-04-01", "national_id":null },
      { "id":"FM002", "name":"سارة أحمد", "relation":"ابنة", "dob":"2017-08-12", "national_id":null }
    ],
    "shared_wallet": true,
    "created_at": "2024-02-01T00:00:00Z"
  }]
}
```

---

## 💳 9. WALLET & TRANSACTIONS

### `GET /wallet/transactions?user_id=U001&type=credit&from=2025-01-01`
**Response**:
```json
{
  "data": [{
    "id": "WT001",
    "user_id": "U001",
    "user_name": "أحمد الزهراني",
    "type": "credit",
    "amount": 250,
    "balance_after": 700,
    "reason": "رد مبلغ طلب ORD-8500",
    "reference_type": "refund",
    "reference_id": "RF001",
    "created_at": "2025-05-28T10:05:00Z",
    "created_by": "سارة الدوسري (Finance)"
  }]
}
```

### `POST /wallet/credit`
**Request**: `{ "user_id":"U001", "amount":250, "reason":"رد مبلغ" }`

### `POST /wallet/debit`

---

## 🚫 10. BLACKLIST

### `GET /blacklist`
**Response**: `{ "data": [{ "id":"BL001", "user_id":"U003", "user_name":"...", "phone":"...", "reason":"حسابات متعددة", "blocked_at":"...", "blocked_by":"...", "auto":false }] }`

### `POST /blacklist` — إضافة
### `DELETE /blacklist/:id`

---

## 🕵️ 11. FRAUD DETECTION

### `GET /fraud/alerts?severity=high`
**Response**:
```json
{
  "data": [{
    "id": "FR001",
    "patient_id": "U005",
    "patient_name": "خالد المطيري",
    "rule_triggered": "multiple_refunds_24h",
    "severity": "high",
    "evidence": { "refunds_count": 5, "total_amount": 1200, "in_hours": 18 },
    "status": "open",
    "created_at": "2025-05-28T09:00:00Z"
  }]
}
```

### `POST /fraud/:id/resolve` — `{ "action":"dismiss"|"block"|"investigate", "note":"..." }`

---

## 🔐 12. ADMINS & ROLES

### `GET /admins`
**Response**: `{ "data": [{ "id":"ADM001", "name":"...", "email":"...", "role":"SUPER_ADMIN", "last_login":"...", "active":true }] }`

### `POST /admins` — `{ "name","email","role","send_invite":true }`
### `PUT /admins/:id` / `DELETE /admins/:id`
### `POST /admins/:id/reset-password`

---

## 📦 13. ORDERS

### `GET /orders?status=in_progress&type=Lab&priority=urgent&from=2025-05-28`
**Response**:
```json
{
  "data": [{
    "id": "ORD-8821",
    "patient_id": "U001",
    "patient": "أحمد الزهراني",
    "patient_phone": "+966501234567",
    "patient_lat": 24.81, "patient_lng": 46.71,
    "provider_id": "P003",
    "provider": "مختبر الدقة",
    "type": "Lab",
    "subtype": "سحب منزلي",
    "status": "in_progress",
    "amount": 320,
    "currency": "SAR",
    "created_at": "2025-05-28T10:24:00Z",
    "assigned_to": "فني سامي",
    "assigned_id": "SA005",
    "priority": "normal",
    "broadcast_radius": 4,
    "items": [{ "id":"L001", "name":"CBC", "qty":1, "price":80 }],
    "address": "...",
    "notes": "..."
  }],
  "meta": { ... }
}
```

### `GET /orders/:id` — تفاصيل كاملة + history timeline
### `POST /orders/:id/cancel` — `{ "reason":"المريض غير ل" }`
### `POST /orders/:id/reassign` — `{ "provider_id":"P004", "reason":"..." }`
### `POST /orders/:id/force-complete` — `{ "note":"..." }`
### `POST /orders/:id/refund` — `{ "amount":320, "reason":"...", "to_wallet":true }`

### Special: `GET /orders/:id/ocr-items` (لطلبات الروشتة بالـ OCR)
**Response**:
```json
{
  "data": {
    "ocr_items": [
      { "name":"بنادول", "qty":2, "found":true, "rx":false, "matched_medicine_id":"M001" },
      { "name":"أموكسيسيلين 500mg", "qty":1, "found":true, "rx":true, "matched_medicine_id":"M003" },
      { "name":"كريم إيفاكلار", "qty":1, "found":false, "rx":false }
    ],
    "ocr_image_url": "https://...",
    "ocr_confidence": 0.87
  }
}
```

---

## 📅 14. APPOINTMENTS

### `GET /appointments?date=2025-05-29&status=confirmed`
**Response**:
```json
{
  "data": [{
    "id": "AP001",
    "patient_id": "U001",
    "patient_name": "أحمد الزهراني",
    "doctor_id": "D001",
    "doctor_name": "د. سامي الغامدي",
    "provider_id": "P001",
    "provider_name": "مستشفى الرحمة",
    "specialty": "باطنية",
    "type": "clinic",
    "datetime": "2025-05-29T14:00:00Z",
    "duration_minutes": 30,
    "status": "confirmed",
    "fee": 250,
    "notes": "متابعة ضغط"
  }]
}
```

### `POST /appointments/:id/cancel` / `POST /appointments/:id/reschedule`

---

## ⏳ 15. WAITLIST

### `GET /waitlist?provider_id=P001`
**Response**: قائمة المرضى المنتظرين لحجز معين

---

## 🔄 16. REFERRALS

### `GET /referrals`
**Response**:
```json
{
  "data": [{
    "id": "REF001",
    "from_doctor_id": "D001",
    "from_doctor_name": "د. سامي",
    "to_specialty": "جلدية",
    "to_doctor_id": "D003",
    "patient_id": "U001",
    "reason": "طفح جلدي مزمن",
    "status": "pending",
    "created_at": "..."
  }]
}
```

---

## 💬 17. CHAT CONTROL

### `GET /chat/threads?status=open&flagged=true`
**Response**:
```json
{
  "data": [{
    "id": "CH001",
    "order_id": "ORD-8821",
    "participants": [
      { "type":"patient", "id":"U001", "name":"أحمد" },
      { "type":"provider", "id":"P003", "name":"مختبر الدقة" }
    ],
    "messages_count": 12,
    "last_message_at": "2025-05-28T10:30:00Z",
    "flagged": false,
    "flag_reasons": [],
    "status": "open"
  }]
}
```

### `GET /chat/threads/:id/messages` — لمراقبة محادثة
### `POST /chat/threads/:id/close` — `{ "reason":"..." }`
### `POST /chat/threads/:id/inject-admin-message` — `{ "message":"..." }` (الأدمن يدخل كوسيط)

---

## 💊 18. PHARMACY ORDERS

نفس شكل `/orders` لكن `type="Pharmacy"` + حقول إضافية:
- `prescription_url`: صورة الروشتة
- `items[].rx_required`: bool
- `delivery_address`, `delivery_lat`, `delivery_lng`
- `courier_id`, `courier_name`, `courier_phone`, `courier_eta_minutes`

### `POST /pharmacy-orders/:id/approve-prescription`
### `POST /pharmacy-orders/:id/assign-courier` — `{ "courier_id":"TR001", "courier_name":"...", "courier_phone":"..." }`

---

## 🏭 19. B2B SUPPLY

### `GET /b2b/requests`
**Response**:
```json
{
  "data": [{
    "id": "B2B001",
    "pharmacy_id": "P004",
    "pharmacy": "صيدلية النهدي - الياسمين",
    "items": [
      { "name":"بنادول اكسترا 500mg", "qty":50, "unit":"كرتون" },
      { "name":"فنتولين بخاخ", "qty":30, "unit":"علبة" }
    ],
    "total_items": 2,
    "status": "pending",
    "submitted": "2025-05-28T08:00:00Z",
    "input_method": "voice",
    "ai_transcript": "...",
    "notes": "طلب صوتي — تم تحليله بالـ AI",
    "supplier_assigned": null
  }]
}
```

### `POST /b2b/requests/:id/confirm` / `POST /b2b/requests/:id/reject`
### `POST /b2b/requests` (submit from pharmacy app) — `{ "items":[...], "input_method":"manual|voice|ocr", "raw_input":"..." }`

---

## 🔬 20. LAB RESULTS

### `GET /lab-results?status=ready&flagged=true`
**Response**:
```json
{
  "data": [{
    "id": "LR001",
    "order_id": "ORD-8821",
    "patient_id": "U001",
    "patient": "أحمد الزهراني",
    "lab_id": "P003",
    "lab": "مختبر الدقة",
    "tests": [
      { "test_id":"L001", "name":"CBC", "results":[
        { "param":"WBC", "value":12.5, "unit":"×10³/μL", "ref_min":4, "ref_max":11, "flag":"HIGH" }
      ]}
    ],
    "status": "ready",
    "critical_flag": true,
    "ready_at": "..."
  }]
}
```

### `POST /lab-results/:id/notify-patient`

---

## ⚖️ 21. COMPLAINTS

### `GET /complaints?status=open`
**Response**:
```json
{
  "data": [{
    "id": "CP001",
    "patient_id": "U001",
    "patient_name": "أحمد الزهراني",
    "against_type": "provider",
    "against_id": "P001",
    "against_name": "مستشفى الرحمة",
    "order_id": "ORD-8820",
    "category": "تأخر الخدمة",
    "description": "...",
    "attachments": ["url1","url2"],
    "status": "open",
    "priority": "high",
    "assigned_to": "ADM002",
    "created_at": "..."
  }]
}
```

### `POST /complaints/:id/assign` / `POST /complaints/:id/resolve`

---

## ✔️ 22. TASKS

### `GET /tasks?assigned_to=ADM001&status=open`
### `POST /tasks` — `{ "title","description","assigned_to","priority","due_date" }`
### `PUT /tasks/:id` / `POST /tasks/:id/complete`

---

## 🩺 23. SPECIALTIES (Master Data)

### `GET /specialties`
**Response**:
```json
{
  "data": [{
    "id": "SP001",
    "name_ar": "طب الأسرة والمجتمع",
    "name_en": "Family Medicine",
    "icon": "🏠",
    "scfhs_code": "FM",
    "degree_required": "أخصائي",
    "providers_count": 124,
    "active": true,
    "min_fee": 100,
    "max_fee": 500
  }]
}
```

### `POST /specialties` / `PUT /specialties/:id` / `DELETE /specialties/:id`

---

## ⚕️ 24. SERVICES CATALOG

### `GET /services`
**Response**: `{ "data": [{ "id":"SVC001", "name_ar":"كشف عام", "category":"Clinic", "base_price":150, "active":true }] }`

---

## 💉 25. MEDICINES

### `GET /medicines?q=باراسيتامول&rx=false&shortage=true&category=مسكن`
**Response**:
```json
{
  "data": [{
    "id": "M001",
    "name_ar": "باراسيتامول",
    "generic": "Paracetamol",
    "brand": "بنادول",
    "category": "مسكن",
    "rx": false,
    "price_ref": 15,
    "alternatives": ["M002"],
    "alternatives_full": [
      { "id":"M002", "name_ar":"أدول", "price_ref":18 }
    ],
    "status": "active",
    "active_ingredient": "Paracetamol 500mg",
    "shortage": false,
    "shortage_reporter": null,
    "manufacturer": "GSK",
    "barcode": "1234567890123",
    "image_url": "..."
  }]
}
```

### `GET /medicines/:id` + `POST/PUT/DELETE`
### `POST /medicines/:id/report-shortage` — `{ "reporter_provider_id":"P004", "reason":"..." }`
### `GET /medicines/search?q=...&limit=10` — لـ autocomplete

---

## ⚠️ 26. MARKET SHORTAGE

### `GET /market-shortage`
**Response**:
```json
{
  "data": [{
    "id": "SH001",
    "medicine_id": "M005",
    "medicine_name": "فنتولين بخاخ 100mcg",
    "reporter_id": "P004",
    "reporter": "صيدلية النهدي",
    "reported_at": "2025-05-28T09:00:00Z",
    "confirmed": false,
    "confirmation_count": 1,
    "alternatives": ["سالبوتامول بخاخ","فنتودل"],
    "alternatives_ids": ["M010","M011"],
    "warning_shown_to_patients": false
  }]
}
```

### `POST /market-shortage/:id/confirm` / `POST /market-shortage/:id/resolve`

---

## 🧪 27. LAB TESTS

### `GET /lab-tests?category=قلب&home_available=true`
**Response**:
```json
{
  "data": [{
    "id": "L003",
    "name": "Lipid Profile - دهون الدم",
    "category": "قلب",
    "fasting": true,
    "fasting_hours": 12,
    "price_ref": 150,
    "turnaround": "3 ساعات",
    "home_available": true,
    "preparation_ar": "صيام كامل 12 ساعة...",
    "normal_range": [
      { "param":"Total Cholesterol", "min":0, "max":200, "unit":"mg/dL" },
      { "param":"LDL", "min":0, "max":100, "unit":"mg/dL" }
    ]
  }]
}
```

---

## 📡 28. IMAGING SERVICES

### `GET /imaging`
**Response**: `{ "data": [{ "id":"IMG001", "name":"أشعة سينية صدر", "category":"X-Ray", "price_ref":120, "home_available":false }] }`

---

## 💉 29. NURSING SERVICES

### `GET /nursing-services`
**Response**:
```json
{
  "data": [{
    "id": "NS001",
    "name": "تغيير الجروح والضمادات",
    "category": "جروح وعمليات",
    "home_available": true,
    "price_base": 150,
    "price_unit": null,
    "supplies_included": false,
    "duration_minutes": 30,
    "active": true
  }]
}
```

---

## 📤 30. BULK UPLOAD

### `POST /bulk-upload`
**Request**: `multipart/form-data` with `file` (Excel/CSV) + `entity_type` (`medicines|lab_tests|services|...`)
**Response**:
```json
{
  "success": true,
  "data": {
    "rows_processed": 1200,
    "rows_success": 1180,
    "rows_failed": 20,
    "errors": [{ "row": 45, "field": "price", "message": "Invalid number" }]
  }
}
```

### `GET /bulk-upload/template?entity=medicines` — يرجع Excel template

---

## 🛡️ 31. INSURANCE COMPANIES

### `GET /insurance/companies`
**Response**:
```json
{
  "data": [{
    "id": "INS001",
    "name": "بوبا العربية",
    "name_en": "Bupa Arabia",
    "logo_url": "...",
    "active": true,
    "categories": [
      { "name":"فئة A", "copay_default_percent":10 },
      { "name":"فئة B", "copay_default_percent":20 },
      { "name":"VIP", "copay_default_percent":5 }
    ],
    "covers_services": ["Clinic","Lab","Pharmacy","Imaging"],
    "policies_count": 12400,
    "auto_approve_below_sar": 200
  }]
}
```

---

## 📋 32. INSURANCE CLAIMS

### `GET /insurance/claims?status=pending_manual`
**Response**:
```json
{
  "data": [{
    "id": "CLM001",
    "patient_id": "U001",
    "patient": "أحمد الزهراني",
    "provider_id": "P003",
    "provider": "مختبر الدقة",
    "service": "CBC + Lipid Profile",
    "order_id": "ORD-8821",
    "insurance_co_id": "INS001",
    "insurance_co": "بوبا",
    "policy": "BP-123456",
    "category": "فئة A",
    "total_amount": 230,
    "insurance_covers": 207,
    "patient_copay": 23,
    "copay_percent": 10,
    "status": "pending_manual",
    "documents": ["url1","url2"],
    "submitted_at": "...",
    "approved_by": null,
    "rejection_reason": null
  }]
}
```

### `POST /insurance/claims/:id/approve` — `{ "note":"..." }`
### `POST /insurance/claims/:id/reject` — `{ "reason":"الاستشارات الأونلاين غير مشمولة" }`

---

## 💰 33. FINANCIAL CONTROL

### `GET /financial/summary?from=2025-05-01&to=2025-05-31`
**Response**:
```json
{
  "data": {
    "revenue": { "total": 1240000, "currency":"SAR", "change_pct": 18 },
    "commissions_earned": 124000,
    "refunds_total": 8500,
    "providers_payouts_pending": 340000,
    "by_service_type": [
      { "type":"Doctor", "revenue":420000, "orders":2400 },
      { "type":"Pharmacy", "revenue":380000, "orders":4100 },
      { "type":"Lab", "revenue":240000, "orders":1800 },
      { "type":"Nursing", "revenue":120000, "orders":520 },
      { "type":"Imaging", "revenue":80000, "orders":340 }
    ],
    "daily_chart": [{ "date":"2025-05-01", "revenue":38000 }]
  }
}
```

### `POST /financial/payout` — صرف أرباح لمزود `{ "provider_id":"P001", "amount":12400 }`

---

## 📊 34. COMMISSIONS

### `GET /commissions?provider_type=Hospital`
**Response**: `{ "data": [{ "id":"CMS001", "provider_id":"P001", "provider":"...", "type":"Hospital", "commission_percent":12, "calc_method":"per_order", "last_updated":"...", "monthly_revenue_to_admin":22100 }] }`

### `PUT /commissions/:provider_id` — `{ "commission_percent":13, "reason":"رفع بعد المراجعة" }`

---

## ↩️ 35. REFUNDS

### `GET /refunds?status=pending`
### `POST /refunds`
**Request**:
```json
{
  "order_id": "ORD-8500",
  "user_id": "U001",
  "amount": 250,
  "reason": "خدمة سيئة",
  "to": "wallet" 
}
```
*(`to` يمكن `wallet` أو `card` أو `bank`)*

---

## 🎟️ 36. COUPONS

### `GET /coupons`
**Response**:
```json
{
  "data": [{
    "id": "COP001",
    "code": "SUMMER25",
    "type": "percent",
    "value": 25,
    "max_discount": 100,
    "min_order_amount": 200,
    "applicable_services": ["Lab","Pharmacy"],
    "applicable_cities": ["الرياض","جدة"],
    "valid_from": "...",
    "valid_to": "...",
    "usage_limit": 1000,
    "used_count": 234,
    "per_user_limit": 1,
    "active": true
  }]
}
```

### `POST /coupons` / `PUT /coupons/:id` / `POST /coupons/:id/toggle`

---

## ✨ 36b. LOYALTY POINTS (نظام النبضات/الولاء)

### `GET /loyalty/config`
**استخدام**: `LoyaltyPointsPage` (Admin)
**Response**:
```json
{
  "data": {
    "enabled": true,
    "currency_name_ar": "نبضة",
    "currency_name_en": "Pulse",
    "earn_rules": [
      { "id":"ER001","service":"Doctor","points_per_sar":2,"active":true,"note":"كشف عيادي" },
      { "id":"ER002","service":"Pharmacy","points_per_sar":1,"active":true,"note":"الأدوية" },
      { "id":"ER003","service":"Lab","points_per_sar":3,"active":true,"note":"التحاليل" },
      { "id":"ER004","service":"Nursing","points_per_sar":2.5,"active":true,"note":"التمريض المنزلي" },
      { "id":"ER005","service":"Imaging","points_per_sar":2,"active":false,"note":"الأشعة (موقوف)" },
      { "id":"ER006","service":"Emergency","points_per_sar":0,"active":false,"note":"بدون نقاط" }
    ],
    "redemption_rate_sar_per_point": 0.0075,
    "min_points_to_redeem": 100,
    "max_redemption_percent_per_order": 50,
    "points_expiry_months": 12,
    "first_order_bonus_points": 500,
    "referral_bonus_points": 1000,
    "review_bonus_points": 50,
    "birthday_bonus_points": 200,
    "issued_total": 2840000,
    "redeemed_total": 1120400,
    "active_users": 8420,
    "avg_balance": 215
  }
}
```

### `PUT /loyalty/config`
**Request**: نفس شكل `data` أعلاه (partial update مسموح)
**ملاحظة**: أي تغيير في `redemption_rate_sar_per_point` لا يؤثر بأثر رجعي على النقاط القديمة.

### `PUT /loyalty/earn-rules/:rule_id`
**Request**: `{ "points_per_sar": 2.5, "note": "..." }`

### `POST /loyalty/earn-rules/:rule_id/toggle`
**Response**: `{ "success": true, "active": false }`

### `GET /loyalty/transactions?user_id=U001&type=earn&from=2025-05-01&page=1&limit=20`
**Response**:
```json
{
  "data": [{
    "id": "PT001",
    "user_id": "U001",
    "user_name": "أحمد الزهراني",
    "type": "earn",
    "points": 240,
    "balance_after": 540,
    "reason": "طلب ORD-8821 (CBC + Lipid)",
    "source": "order",
    "order_id": "ORD-8821",
    "admin": null,
    "created_at": "2025-05-28T10:24:00Z"
  }],
  "meta": { "page":1, "limit":20, "total":42, "pages":3 }
}
```
- `type` ∈ `earn | redeem | expire | manual_credit | manual_debit`
- `source` ∈ `order | redeem | bonus | review | referral | birthday | system | admin`

### `GET /loyalty/users/:user_id/balance`
**Response**:
```json
{
  "data": {
    "user_id": "U001",
    "current_balance": 540,
    "lifetime_earned": 2840,
    "lifetime_redeemed": 1300,
    "lifetime_expired": 1000,
    "next_expiry": { "points":120, "expires_at":"2025-08-15T00:00:00Z" }
  }
}
```

### `POST /loyalty/manual-adjust`
**استخدام**: زر "إضافة/خصم يدوي" في LoyaltyPointsPage
**Request**:
```json
{ "user_id": "U001", "points": 300, "reason": "تعويض عن مشكلة في الخدمة" }
```
- `points` موجب = إضافة، سالب = خصم
- **يجب** أن يولّد audit log entry تلقائياً باسم الـ admin
- يرفض إذا الخصم > الرصيد الحالي (`400 INSUFFICIENT_POINTS`)

### `POST /loyalty/redeem`
**استخدام**: من تطبيق المريض عند الدفع
**Request**:
```json
{ "user_id": "U001", "points": 200, "order_id": "ORD-8821" }
```
**Response**:
```json
{
  "success": true,
  "data": {
    "points_redeemed": 200,
    "sar_discount": 1.50,
    "new_balance": 340,
    "order_id": "ORD-8821"
  }
}
```
**Errors**:
- `MIN_POINTS_NOT_MET` (أقل من `min_points_to_redeem`)
- `EXCEEDS_MAX_REDEMPTION` (يتجاوز `max_redemption_percent_per_order`)
- `INSUFFICIENT_POINTS`
- `LOYALTY_DISABLED` (النظام موقوف)

### Earning Logic (للـ Backend)
عند اكتمال طلب (`order.status = "completed"`):
1. تحقق من `loyalty_config.enabled = true`
2. اقرأ `earn_rules[service_type]` حيث `service_type = order.type`
3. لو الـ rule `active`: احسب `points_earned = order.amount * rule.points_per_sar` (مع `Math.floor`)
4. أنشئ `points_transaction` بـ `type:"earn", source:"order"`
5. حدّث balance المستخدم
6. عند `first_order` للمستخدم: أضف `first_order_bonus_points` كمعاملة منفصلة `source:"bonus"`

### Expiry Job (مهم)
شغّل cron يومي:
- اعثر على نقاط مضى عليها أكثر من `points_expiry_months`
- أنشئ معاملة `type:"expire"`، حدّث الرصيد
- أرسل إشعار للعميل قبل 7 أيام من الانتهاء

---

## 🚚 36c. DELIVERY RULES (التوصيل المجاني)

### `GET /delivery/rules`
**Response**:
```json
{
  "data": {
    "free_delivery_enabled": true,
    "global_min_order_sar": 150,
    "base_delivery_fee_sar": 25,
    "rush_delivery_fee_sar": 50,
    "rules": [{
      "id": "DR001",
      "name": "أول طلب مجاناً",
      "target_type": "first_order",
      "active": true,
      "min_order_sar": 0,
      "service_types": ["all"],
      "cities": ["all"],
      "valid_from": null,
      "valid_to": null,
      "note": "كل عميل جديد يحصل على توصيل مجاني لأول طلب"
    }]
  }
}
```
- `target_type` ∈ `first_order | order_amount | city_service | vip_users | seasonal`

### `POST /delivery/toggle`
**Request**: `{ "enabled": false }`

### `PUT /delivery/base-fees`
**Request**: `{ "base_delivery_fee_sar":25, "rush_delivery_fee_sar":50, "global_min_order_sar":150 }`

### `POST /delivery/rules`
**Request**: rule object بدون `id`

### `PUT /delivery/rules/:id` / `POST /delivery/rules/:id/toggle` / `DELETE /delivery/rules/:id`

### `GET /delivery/check?user_id=U001&order_amount=250&service_type=Lab&city=الرياض`
**استخدام**: من تطبيق المريض عند checkout
**Response**:
```json
{
  "data": {
    "free_delivery": true,
    "matched_rule": { "id":"DR003", "name":"توصيل مجاني لتحاليل الرياض" },
    "delivery_fee_sar": 0,
    "original_fee_sar": 25
  }
}
```
**Logic للـ Backend** (طبّق القواعد بالترتيب، استخدم أول match):
1. لو `free_delivery_enabled = false` → return `free_delivery: false`
2. لو `vip_users` active والمستخدم VIP → free
3. لو `first_order` active والمستخدم لا توجد له طلبات سابقة → free
4. لو `seasonal` active وفي النطاق الزمني → check rule
5. لو `city_service` matches → check rule
6. لو `order_amount` matches → check rule
7. أي rule يتطلب `order_amount >= rule.min_order_sar` و `service_type ∈ rule.service_types` و `city ∈ rule.cities`

---

## 🎁 36d. PROMOTIONS (العروض والخصومات العامة)

### `GET /promotions?active=true&scope=service&service=Lab`
**Response**:
```json
{
  "data": [{
    "id": "PR001",
    "name": "خصم 15% على تحاليل الصيف",
    "type": "percent",
    "value": 15,
    "scope_type": "service",
    "scope": ["Lab"],
    "min_order_sar": 200,
    "max_discount_sar": 75,
    "applies_to_users": "all",
    "valid_from": "2025-06-01",
    "valid_to": "2025-08-31",
    "active": true,
    "banner_id": "BN001",
    "uses": 1240,
    "savings_total_sar": 18600,
    "stackable_with_coupons": false,
    "auto_apply": true
  }]
}
```
**Fields**:
- `type` ∈ `percent | fixed`
- `scope_type` ∈ `all | service | category | city`
- `applies_to_users` ∈ `all | first_order | vip | female | male`
- `auto_apply`: لو `true`، يُطبَّق تلقائياً عند checkout بدون كود
- `stackable_with_coupons`: لو `true`، يمكن دمجه مع coupon code

### `POST /promotions` (Create) / `PUT /promotions/:id` (Update)
**Request**: نفس شكل الـ object بدون `id, uses, savings_total_sar`

### `POST /promotions/:id/toggle` / `DELETE /promotions/:id`

### `GET /promotions/applicable?user_id=U001&order_amount=250&services=Lab,Pharmacy&city=الرياض&gender=M&is_first_order=false`
**استخدام**: من تطبيق المريض عند checkout — يرجع كل العروض المنطبقة
**Response**:
```json
{
  "data": {
    "auto_applied": [
      { "promotion_id":"PR001", "name":"خصم 15% على تحاليل", "discount_sar":37.5, "applied_to":"Lab subtotal" }
    ],
    "manual_eligible": [],
    "total_discount_sar": 37.5
  }
}
```
**Logic للـ Backend** (Promotion Engine):
1. اعرض كل `active` promotions ضمن `valid_from/to`
2. صفّ بـ `applies_to_users` (مطابقة الجنس/أول طلب/VIP)
3. صفّ بـ `scope_type/scope` (الخدمة/الفئة/المدينة)
4. تحقق `order_amount >= min_order_sar`
5. احسب الخصم:
   - `percent`: `Math.min(amount * value/100, max_discount_sar)`
   - `fixed`: `Math.min(value, max_discount_sar)`
6. لو `auto_apply` → ضمها في `auto_applied`
7. عند تطبيق العرض على طلب فعلي: زد `uses++` و `savings_total_sar += discount`

### Stacking Priority (مهم)
ترتيب تطبيق الخصومات على فاتورة:
1. **Promotion auto-applied** (الأعلى أولوية)
2. **Coupon code** (لو `promotion.stackable_with_coupons = true`)
3. **Loyalty points redemption** (آخر شيء — على المبلغ بعد الخصومات)
4. **Free delivery rules**

مثال:
- الطلب: 250 ر
- Promotion: 15% lab = -37.5 ر → 212.5 ر
- Coupon SUMMER25: 25 ر = -25 ر → 187.5 ر
- Loyalty: 200 نبضة × 0.0075 = -1.5 ر → 186 ر
- Free delivery (DR003 match): -25 ر → **النهائي = 186 ر**

---

## 📄 37. CONTRACTS

### `GET /contracts?provider_id=P001`
### `POST /contracts/:id/sign` (digital signature)
### `GET /contracts/:id/pdf` — يرجع PDF

---

## 🗂️ 38. PROVIDER DOCUMENTS / KYC

### `GET /provider-docs?provider_id=P001`
**Response**:
```json
{
  "data": [{
    "id": "DOC001",
    "provider_id": "P001",
    "type": "cr",
    "file_url": "...",
    "uploaded_at": "...",
    "verified": true,
    "verified_by": "ADM001",
    "verified_at": "...",
    "expiry_date": "2026-03-15",
    "notes": ""
  }]
}
```

### `POST /provider-docs/:id/verify` / `POST /provider-docs/:id/reject`

---

## 📊 39. SLA MONITOR

### `GET /sla?provider_id=P001&from=2025-05-01`
**Response**:
```json
{
  "data": {
    "provider_id": "P001",
    "sla_score": 98,
    "metrics": {
      "avg_response_time_seconds": 35,
      "completion_rate_pct": 99.2,
      "cancellation_rate_pct": 0.5,
      "complaint_rate_pct": 0.3
    },
    "trend": [{ "date":"2025-05-01", "score":97 }]
  }
}
```

---

## 🗓️ 40. SHIFTS & SCHEDULES

### `GET /shifts?provider_id=P001&date=2025-05-29`
**Response**: مواعيد عمل + مواعيد عطلة + سعة استقبال

### `POST /shifts` / `PUT /shifts/:id`

---

## 🏆 41. PROVIDER SCORECARD

### `GET /scorecard?provider_id=P001`
**Response**:
```json
{
  "data": {
    "overall_score": 92,
    "rank": 4,
    "rank_total": 342,
    "breakdown": {
      "service_quality": 95,
      "response_time": 88,
      "patient_satisfaction": 94,
      "compliance": 100,
      "revenue_contribution": 85
    },
    "badges": ["top_10_percent","100_orders_month"],
    "warnings": []
  }
}
```

---

## ⚠️ 42. COMPLIANCE / LICENSES

### `GET /compliance?status=expiring_soon`
**Response**:
```json
{
  "data": [{
    "id": "C002",
    "provider_id": "P005",
    "provider": "مركز النبض للتمريض",
    "type": "SCFHS",
    "number": "SCFHS-NUR-5678",
    "expiry": "2025-07-01",
    "status": "expiring_soon",
    "days_remaining": 32,
    "auto_alert_sent": true,
    "renewal_url": null
  }]
}
```

---

## 🚗 43. TRANSPORT & COURIERS

### `GET /transport`
**Response**:
```json
{
  "data": [{
    "id": "TR001",
    "name": "أرامكس للشحن الطبي",
    "type": "courier",
    "covers_cities": ["الرياض","جدة","الدمام"],
    "active": true,
    "commission_percent": 8,
    "avg_delivery_minutes": 45,
    "active_orders": 12
  }]
}
```

---

## 📱 44. NOTIFICATIONS

### `GET /notifications/history`
**Response**:
```json
{
  "data": [{
    "id": "N001",
    "title": "عرض خاص — تحاليل صيف 2025",
    "body": "...",
    "target_type": "all_patients",
    "target_filter": null,
    "channel": "push",
    "sent": 28400,
    "opened": 18200,
    "ctr_pct": 64,
    "sent_at": "2025-05-25T10:00:00Z",
    "status": "delivered",
    "created_by": "ADM003"
  }]
}
```

### `POST /notifications/send`
**Request**:
```json
{
  "title": "...",
  "body": "...",
  "target": {
    "type": "all_patients" | "specific_users" | "by_filter" | "by_order",
    "user_ids": [],
    "filter": { "city":"الرياض", "has_insurance":true, "min_orders":5 }
  },
  "channels": ["push","sms","email"],
  "scheduled_at": null,
  "deep_link": "nabd://orders/ORD-8821"
}
```

---

## 🤖 45. AUTO-NOTIFICATIONS RULES

### `GET /notifications/auto-rules`
**Response**: 12 قاعدة بالشكل التالي:
```json
{
  "data": [{
    "id": "AN001",
    "trigger": "cart_abandoned",
    "delay": "30 دقيقة",
    "delay_seconds": 1800,
    "title": "نسيت شيئاً؟ 🛒",
    "body": "سلتك في انتظارك — أكمل طلبك الآن",
    "target": "patient",
    "channel": "push",
    "active": true,
    "sent_today": 24,
    "sent_total": 8421,
    "ctr_pct": 18
  }]
}
```

### `PUT /notifications/auto-rules/:id` — تعديل الشروط/النص/التوقيت
### `POST /notifications/auto-rules/:id/toggle`

---

## ✏️ 46. CMS

### `GET /cms`
**Response**:
```json
{
  "data": [{
    "key": "patient.home.welcome_title",
    "value_ar": "أهلاً بك في نبض بلس",
    "value_en": "Welcome to Nabd Plus",
    "page": "Home",
    "app": "patient",
    "updated_at": "..."
  }]
}
```

### `PUT /cms/:key`

---

## 🖼️ 47. BANNERS & ADS

### `GET /banners`
**Response**:
```json
{
  "data": [{
    "id": "BN001",
    "title": "تحاليل صيف 2025",
    "image_url": "...",
    "image_url_dark": "...",
    "deep_link": "nabd://labs?promo=summer",
    "placement": "home_top",
    "target_app": "patient",
    "active": true,
    "valid_from": "...",
    "valid_to": "...",
    "shown_count": 12400,
    "clicks": 1840,
    "ctr_pct": 14.8
  }]
}
```

---

## ⭐ 48. REVIEWS

### `GET /reviews?provider_id=P001&min_rating=4`
**Response**:
```json
{
  "data": [{
    "id": "RV001",
    "order_id": "ORD-8818",
    "patient_id": "U004",
    "patient_name": "فاطمة الدوسري",
    "provider_id": "P005",
    "provider_name": "مركز النبض",
    "rating": 5,
    "title": "خدمة ممتازة",
    "comment": "ممرضة محترفة جداً",
    "flagged": false,
    "hidden": false,
    "created_at": "...",
    "provider_response": null
  }]
}
```

### `POST /reviews/:id/hide` / `POST /reviews/:id/flag`

---

## 🎨 49. THEME BUILDER

### `GET /system/theme`
### `PUT /system/theme`
**Request**:
```json
{
  "theme_name": "cyber_blue",
  "is_default": true,
  "tokens": {
    "bg":"#07080d","surface":"#0c0d14","accent":"#00b8e6","green":"#00e676",
    "red":"#ff1744","orange":"#ff6d00","purple":"#7c4dff","gold":"#ffd600"
  },
  "applies_to": ["admin","patient_app","provider_app"]
}
```

---

## ⚙️ 50. SYSTEM CONFIG

### `GET /system/config`
**Response**:
```json
{
  "data": {
    "general": { "platform_name_ar":"نبض بلس", "default_currency":"SAR", "default_language":"ar" },
    "commissions_defaults": { "Hospital":12,"Doctor":10,"Pharmacy":5,"Lab":8,"Nursing":15,"Imaging":10 },
    "broadcast": { "initial_radius_km":4, "expand_step_km":4, "max_radius_km":20 },
    "support": { "phone":"+966800000000","email":"support@nabd.plus","working_hours":"24/7" },
    "legal": { "terms_url":"...","privacy_url":"...","tax_id":"..." },
    "payments": { "stripe_enabled":true,"mada_enabled":true,"apple_pay":true,"cash_on_delivery":true }
  }
}
```

### `PUT /system/config`

---

## 🔑 51. PERMISSIONS / ROLES

### `GET /system/permissions`
**Response**:
```json
{
  "data": {
    "roles": [
      { "key":"SUPER_ADMIN", "label":"Super Admin", "color":"#ff1744", "permissions":["*"] },
      { "key":"OPERATIONS", "label":"Operations", "color":"#ff6d00", "permissions":["orders.*","broadcast.*","emergency.*","providers.read"] },
      { "key":"FINANCE", "label":"Finance", "color":"#00e676", "permissions":["financial.*","refunds.*","commissions.*","wallet.*","claims.*"] },
      { "key":"SUPPORT", "label":"Support", "color":"#7c4dff", "permissions":["chat.*","complaints.*","tasks.*","patients.read"] },
      { "key":"CONTENT", "label":"Content", "color":"#ffd600", "permissions":["cms.*","banners.*","notifications.*","reviews.*"] }
    ],
    "team": [
      { "id":"ADM001", "name":"أحمد الحربي", "email":"...", "role":"SUPER_ADMIN", "last_login":"..." }
    ]
  }
}
```

### `PUT /system/permissions/roles/:key` — تعديل صلاحيات دور

---

## 📋 52. AUDIT LOGS

### `GET /system/audit-logs?admin_id=ADM001&type=danger&from=2025-05-01`
**Response**:
```json
{
  "data": [{
    "id": 1,
    "admin_id": "ADM001",
    "admin_name": "أحمد الحربي (Super Admin)",
    "action": "تعليق مزود",
    "action_key": "provider.suspend",
    "entity": "مركز الأشعة التشخيصي",
    "entity_id": "P006",
    "entity_type": "provider",
    "before": "active",
    "after": "suspended",
    "metadata": { "reason":"تأخر تجديد الترخيص" },
    "ip": "85.40.x.x",
    "user_agent": "...",
    "created_at": "2025-05-28T10:32:00Z",
    "severity": "danger"
  }],
  "meta": { ... }
}
```

**ملاحظة هامة للـ backend**: كل action ذو معنى (suspend/approve/refund/kill-switch toggle/impersonation) **يجب** أن يولّد audit log entry تلقائياً.

---

## 🤖 53. WORKFLOW AUTOMATION

### `GET /system/workflows`
**Response**:
```json
{
  "data": [{
    "id": "WF001",
    "name": "إشعار تلقائي عند انتهاء وثيقة",
    "trigger": { "type":"event", "event":"document.expiring", "params":{ "days_before":30 } },
    "actions": [
      { "type":"notify_provider", "channel":"push+email" },
      { "type":"notify_admin", "role":"OPERATIONS" }
    ],
    "active": true,
    "last_run": "...",
    "executions_today": 3
  }]
}
```

### `POST /system/workflows/:id/toggle` / `PUT /system/workflows/:id`

---

## 🧠 54. AI & EXTERNAL API CONFIG

### `GET /system/ai-config`
**Response**:
```json
{
  "data": [{
    "id": "AI001",
    "service": "Llama3 (Voice→Order)",
    "provider": "Groq",
    "endpoint": "https://api.groq.com/openai/v1",
    "model": "llama3-70b-8192",
    "active": true,
    "calls_today": 1240,
    "cost_today_usd": 12.4,
    "key_masked": "gsk_•••••3a4f"
  }]
}
```

### `PUT /system/ai-config/:id` — لا ترجع keys في الـ response أبداً

---

## 🔔 55. ALERT RULES ENGINE

### `GET /system/alert-rules`
**Response**:
```json
{
  "data": [{
    "id": "AR001",
    "name": "إذا تجاوز معدل الاحتيال 5% خلال 24 ساعة",
    "metric": "fraud_alerts_count",
    "condition": ">5_in_24h",
    "actions": [{ "type":"notify","role":"SUPER_ADMIN","channel":"push+sms" }],
    "active": true,
    "triggered_count": 2
  }]
}
```

---

## 📈 56. ANALYTICS & REPORTS

### `GET /analytics/overview?from=2025-05-01&to=2025-05-31`
**Response**: KPIs مجمّعة + رسوم بيانية (daily revenue, top providers, service distribution)

### `POST /analytics/custom-report`
**Request**:
```json
{
  "name": "تقرير مبيعات الأدوية مايو",
  "entities": ["orders"],
  "filters": { "type":"Pharmacy", "from":"2025-05-01", "to":"2025-05-31" },
  "group_by": "city",
  "metrics": ["count","sum_amount","avg_amount"],
  "format": "table" 
}
```

### `GET /analytics/heatmap?service=Doctor&date=2025-05-28`
**Response**:
```json
{
  "data": {
    "points": [{ "lat":24.71, "lng":46.67, "weight":12, "city":"الرياض" }],
    "bounds": { "north":..., "south":..., "east":..., "west":... }
  }
}
```

---

## 👁️ 57. IMPERSONATION MODE (الفيتشر الجديد)

### `POST /admin/impersonate/start`
**Request**: `{ "target_type":"provider"|"patient", "target_id":"P001", "reason":"investigating complaint #CP001" }`
**Response**:
```json
{
  "success": true,
  "data": {
    "impersonation_token": "imp_eyJ...",
    "expires_at": "2025-05-28T11:30:00Z",
    "target": { "id":"P001", "name":"مستشفى الرحمة", "type":"provider" }
  }
}
```
**ملاحظة هامة**:
- Token له expiry قصير (60 دقيقة)
- كل API call تحت الـ impersonation token يجب أن يضيف header `X-Impersonation: true`
- جميع write actions تُرفض (`403 IMPERSONATION_READONLY`)
- يجب توليد audit log entry فوراً

### `POST /admin/impersonate/stop`
**Response**: `{ "success": true }`

---

## 🚨 Error Codes (للـ Frontend ليعرضها بالعربية)

| Code | Meaning |
|------|---------|
| `INVALID_CREDENTIALS` | بيانات الدخول خاطئة |
| `TOKEN_EXPIRED` | انتهت صلاحية الجلسة — أعد الدخول |
| `INSUFFICIENT_PERMISSIONS` | ليس لديك صلاحية |
| `IMPERSONATION_READONLY` | لا يمكن التعديل في وضع المحاكاة |
| `ENTITY_NOT_FOUND` | العنصر المطلوب غير موجود |
| `VALIDATION_FAILED` | بعض الحقول غير صحيحة (يرجى مراجعة `details`) |
| `RATE_LIMIT` | عدد محاولات كثيرة — حاول لاحقاً |
| `KILL_SWITCH_ACTIVE` | هذه الخاصية موقوفة مؤقتاً |
| `OUT_OF_STOCK` | الدواء غير متوفر |
| `LICENSE_EXPIRED` | ترخيص المزود منتهي |
| `INSURANCE_NOT_COVERED` | الخدمة غير مغطاة في وثيقة التأمين |

---

## 🔌 WebSocket Events (للـ Real-time)

اتصل بـ `wss://api.nabd.plus/ws` بعد المصادقة. الأحداث المتوقعة:

```
order.created            { order: {...} }
order.status_changed     { order_id, old_status, new_status }
broadcast.expanded       { broadcast_id, new_radius }
broadcast.accepted       { broadcast_id, provider_id }
emergency.created        { emergency: {...} }
emergency.dispatched     { emergency_id, ambulance_id, hospital_id }
kill_switch.toggled      { key, value, by_admin }
fraud.alert              { alert: {...} }
compliance.expiring      { compliance_id, days_remaining }
shortage.reported        { medicine_id, reporter_id }
notification.delivered   { notification_id, delivered_count }
```

---

## ✅ Checklist للمطور Backend

- [ ] جميع endpoints تستخدم نفس response envelope (`success/data/meta/error`)
- [ ] كل datetime بـ ISO 8601 UTC
- [ ] كل list endpoint يدعم pagination + filters + sort
- [ ] JWT auth على كل endpoint ما عدا `/auth/login`
- [ ] Audit log entry يُولَّد تلقائياً لكل: provider approve/reject/suspend, refund issue, kill-switch toggle, impersonation start/stop, role/permission change, sub-account add/remove
- [ ] كل write action يدعم rollback (transactions)
- [ ] WebSocket للأحداث الحرجة (orders/broadcast/emergency)
- [ ] CORS مفتوح لـ `REACT_APP_BACKEND_URL`
- [ ] Rate limit (50 req/sec لكل admin token)
- [ ] جميع الـ uploaded files تُحفظ في object storage (S3/GCS) — لا تحفظها في DB
- [ ] للـ Arabic search: استخدم MongoDB text index بـ language=ar أو ElasticSearch
- [ ] geo queries (heatmap, broadcast radius): استخدم `2dsphere` index على lat/lng
