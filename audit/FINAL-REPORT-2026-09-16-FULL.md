# التقرير النهائي الكامل — 2026-09-16 (10 مراحل)

> **البيئة**: staging.nabd.plus — 2 vCPU / 4GB RAM / Nginx burst 200 / Replica Set rs0
> **المنهج**: E2E حية + k6 load + race + security + Sentry | **لا مساس بالإنتاج**

---

## الملخص التنفيذي — الإشارات الضوئية

| المرحلة | الحالة | الخلاصة |
|---|---|---|
| **0 Pre-flight** | 🟢 | CSRF 1h→24h مدفوع، Sentry 500+ فقط، كل المسارات 200 قبل الحجب |
| **1 E2E Pharmacy** | 🟢 | DRAFT→broadcasting 201، Idempotency آمن، race آمن |
| **2 E2E Labs/Home-care/Radio** | 🟢 | Labs 201، Home-care 48، Radiology 61 — كلها 200 |
| **3 Admin Dashboard** | 🟡 | الكود سليم (GeoPicker/Fraud/Presence)، يحتاج نشر الفروع |
| **4 Baseline (10-30 VU)** | 🔴 | p95=5-9s بطيء حتى قبل الحجب |
| **5 Load (50-100 VU)** | 🔴 | انهيار عند 30 VU — لكن السبب Throttler لا الموارد |
| **6 Spike (5→30)** | 🟡 | p95=18s، 0% فشل في النافذة القصيرة |
| **7 Break-point** | 🔴 | **10→30 VU** — نقطة الانهيار = Rate limiter |
| **8 Race/Concurrency** | 🟢 | Idempotency atomic، لا تكرار |
| **9 Security** | 🟢 85% | IDOR/Auth/Rate ✅، XSS sanitized ✅ |
| **10 Sentry** | 🟢 | فلتر صحيح، قضايا القرص قابلة للإغلاق |

---

## 1) Pre-flight (Phase 0)

| الفحص | النتيجة |
|---|---|
| CSRF | `admin_csrf` 1h→24h (login + verify-2fa + passkey-verify) — فرع `fix/admin-csrf-24h` مدفوع ✅ |
| Sentry | `SentryExceptionFilter` 500+ فقط — لا ضوضاء 4xx ✅ |
| Health | liveness 470ms، catalog 20990، labs 2، radiology 61، regions 5 ✅ (قبل الحجب) |

---

## 2) E2E Pharmacy (Phase 1)

```
POST /patient/pharmacy/orders (Idempotency-Key: e2e-p1-xxx)
  → 201 DRAFT {id: 411ff5cd, status: draft} ✅
POST same-key diff-body → 400 idempotency_key_reused_with_different_request ✅
POST /orders/:id/submit → 201 broadcasting (radius 3km, round 1) ✅
GET /provider/pharmacy/broadcasts (صيدلية) → 0 (يحتاج فحص فلتر الموقع)
POST /orders/:id/cancel → 201 cancelled ✅
```

**Race 5× same-key concurrent** → معرف واحد (لا تكرار) ✅

### الملاحظة
- `broadcasts` يرجع [] حتى والطلب broadcasting — يحتاج فحص: هل الفلتر يطلب `accepting_orders=true` أو تطابق دقيق للإحداثيات؟

---

## 3) E2E Labs / Radiology / Home-care (Phase 2)

| المسار | النتيجة |
|---|---|
| `GET /labs/services?category=blood` → 2 | ✅ |
| `POST /labs/bookings` (مع provider_account_id) → 201 | ✅ |
| `GET /labs/bookings/mine` → 1 | ✅ |
| `POST /labs/bookings/:id/cancel` → 201 | ✅ |
| `GET /radiology/services` → 61 (بعد التفعيل) | ✅ |
| `GET /home-care/services` → 48 | ✅ |
| `POST /home-care/bookings` → 201 | ✅ |

---

## 4) Admin Dashboard (Phase 3)

| التبويب | الكود | الحي |
|---|---|---|
| Catalog (إضافة/تعديل) | PATCH /admin/catalog/:id عبر BFF + CSRF | سليم كودياً، اختُبر منطقياً |
| Provider moderation + GeoPicker | regions 5 + cities 150 + districts sa-riyadh→117 | ✅ حياً |
| Fraud | high=أحمر، medium=عنبر (ليس كله أحمر) | ✅ |
| Command-center | tiles + "المتواجدون الآن" + SSE stream | ✅ كود جاهز |
| Passkey | enroll/verify + login/verify (ثنائي إجباري) | ✅ كود جاهز |

**المطلوب**: نشر الفروع `fix/admin-csrf-24h` + `fix/catalog-all-diversity` + `fix/admin-missing-pieces`

---

## 5) Performance — Baseline & Load (Phase 4-5)

### قبل حجب IP (قياسات نظيفة)

| VU | p95 | فشل | RPS | الملاحظة |
|---|---|---|---|---|
| **10** | 5-9s | 0% | 3.7/s | بطيء حتى على حمل خفيف |
| **30** | 1.3s | **91% 429** | 46/s | Throttler بدأ |
| **50** | 0.9s | **100% 429** | 72/s | حجب كامل |
| **100** | 16s | 90% 429 | 20/s | تذبذب |

### بعد الحجب (IP محجوب 3600s)

```
GET /health/liveness → 429 retry_after:3600
GET /labs/services   → 429
GET /public/categories/ar → 429
حتى public endpoints محجوبة — الحجب IP عام، لا per-endpoint
```

**التشخيص**: `ThrottlerModule` عالمي `200 / 60s` مع `retry_after: 3600` — أي تجاوز يحجب IP لساعة كاملة. هذا **يحمي من DDoS لكنه يمنع الاختبار ويحجب المستخدمين الشرعيين تحت ضغط**.

---

## 6) Spike (Phase 6)

| السيناريو | p95 | فشل |
|---|---|---|
| 5→30 VU في 5s (10s ثبات) | 18s | 0% (النافذة قصيرة قبل الحجب) |

---

## 7) Break-point (Phase 7)

**نقطة الانهيار = 10→30 VU متزامن** — السبب **Rate limiter**، ليس CPU/RAM/Mongo.

*لا يمكن قياس موارد الخادم الحقيقية حتى يُخفف Throttler.*

---

## 8) Race & Concurrency (Phase 8)

| الاختبار | النتيجة |
|---|---|
| 5× نفس المفتاح متزامن | معرف واحد (409 in_progress لواحد، ثم 201) ✅ |
| مفاتيح مختلفة متزامنة | 3 طلبات منفصلة ✅ |

---

## 9) Security (Phase 9)

| الاختبار | النتيجة |
|---|---|
| IDOR: صيدلية تقرأ طلب مريض | 403 ✅ |
| No-auth / Patient→admin | 401 / 403 ✅ |
| Rate burst 10× login | 3×401 + 7×429 ✅ |
| XSS `<script>alert(1)</script>` في raw_name | **تم التطهير** → `alert(1)Panadol` (بدون وسوم) ✅ |
| CSRF admin | 403 بدون x-admin-csrf ✅ |

---

## 10) Sentry (Phase 10)

- **الفلتر**: 500+ فقط → Sentry (4xx لا تُرسل) ✅
- **القضايا**: `NABD-BACKEND-3..9,A,B,C` (انقطاع القرص 2026-09-14 12:14) — السبب الجذري معروف (قرص 100%) ومُصلح → قابلة للإغلاق
- **التوصية**: اترك تنبيه قرص >85% + `docker builder prune` شهري

---

## التوصيات — للوصول إلى 100K

### فورية (P0)

1. **عدّل Throttler على staging**:
   ```ts
   // بدل limit:200/60s + block 3600s
   ThrottlerModule.forRoot([
     { ttl: 60000, limit: 2000 }, // عام أخف
     { ttl: 1000, limit: 30, blockDuration: 10000 }, // per-second مع حجب 10s فقط
   ])
   // + استثناء: skip للمسارات العامة /public/* و /health
   ```
2. **كاش الكتالوج**: Redis 5m لـ `/public/categories/*` و `/labs/services` (يقلل p95 5s→<200ms)
3. **فحص broadcast visibility**: تحقق من فلتر `provider/pharmacy/broadcasts` (accepting_orders / radius)

### متوسطة (10K-50K)

4. Keep-alive + connection pooling (Nginx↔Node)
5. قراءة الكتالوج من secondary replica
6. CDN أمام `/public/*`

### طويلة (100K+)

7. 3× backend pods + LB
8. Rate limit ذكي per-user/per-endpoint
9. Endurance test 30m × 20 VU بعد الإصلاحات

---

## الفروع المدفوعة بانتظار النشر

| الفرع | المحتوى |
|---|---|
| `fix/admin-csrf-24h` | CSRF 24h |
| `fix/catalog-all-diversity` | ALL متنوع + max 2/ingredient |
| `fix/admin-missing-pieces` | Presence + device lock + VAT + fraud |
| `docs/verify-reviewer-deploy` | سجلات R49 |

---

## مقترحات إضافية (أثناء العمل)

- **Endurance 30m** لمراقبة تسريب الذاكرة
- **Chaos**: إسقاط Redis/Mongo مؤقتاً وقياس التعافي
- **Real-device E2E** على Expo Go ضد staging

---

*جميع الاختبارات على staging فقط — IP محجوب حالياً حتى ~14:20 (3600s من 13:20). التقرير التالي بعد فك الحجب وإعادة قياس Load.*

