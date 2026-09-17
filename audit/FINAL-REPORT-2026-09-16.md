# التقرير النهائي الشامل — 2026-09-16

> البيئة: staging.nabd.plus (2 vCPU / 4GB RAM) — معزول عن الإنتاج
> الأدوات: k6 v0.54 + Python E2E + curl live probes

---

## 1) ملخص تنفيذي

| المرحلة | الحالة | النتيجة |
|---|---|---|
| **0 Pre-flight** | ✅ مكتمل | CSRF 1h→24h pushed، Sentry فلتر 500+، كل المسارات 200 |
| **1 E2E Pharmacy** | ✅ 90% | DRAFT→broadcasting 201، Idempotency آمن، cancel 201 |
| **2 E2E Labs/Home-care** | ✅ 80% | Labs booking 201، home-care 48 خدمة، radiology صفر (بيانات) |
| **3 Admin Dashboard** | ⚠️ يحتاج نشر | الكود جاهز، GeoPicker/Presence/Fraud سليمة حياً |
| **4 Baseline** | ✅ | 10 VU: p95=5-9s (بطيء)، 30 VU: 91% 429 |
| **5 Load (1K-5K)** | ⚠️ محجوب | Throttler 200 req/60s — يحد قبل القياس |
| **6 Spike (5→30)** | ✅ | p95=18s، 0% فشل (قصير) |
| **7 Stress/Break-point** | 🔴 انهيار مبكر | Breaking point = **10→30 VU** (Rate limiter) |
| **8 Race/Concurrency** | ✅ | Idempotency atomic، لا تكرار طلبات |
| **9 Security** | ✅ 80% | IDOR/Auth/Rate limit ✅، XSS ⚠️ يحتاج تطهير |
| **10 Sentry** | ✅ | فلتر صحيح، قضايا القرص قابلة للإغلاق |

---

## 2) التفاصيل — كل مرحلة

### Phase 0: Pre-flight & Hotfixes
- **CSRF**: `admin_csrf` كان 1h → الآن 24h (login + verify-2fa + passkey-verify) — فرع `fix/admin-csrf-24h` مدفوع
- **Sentry**: `SentryExceptionFilter` يرسل 500+ فقط — لا ضوضاء 4xx
- **Health**: كل المسارات 200 (liveness 470ms، catalog 1419ms، labs 416ms)

### Phase 1: E2E Pharmacy
```
Patient: +966500000091 → DRAFT(201) → submit→broadcasting(201) → cancel(201) ✅
Idempotency: نفس المفتاح + جسم مختلف → 400 ✅
Race 5× same-key concurrent: نفس المعرف (لا تكرار) ✅
```
- **العائق**: `GET /provider/pharmacy/broadcasts` يرجع [] حتى والطلب broadcasting — يحتاج فحص فلتر الموقع/الحالة

### Phase 2: E2E Labs/Radiology/Home-care
- **Labs**: `GET /labs/services?category=blood` → 2 فحوص → booking 201 → mine 1 → cancel 201 ✅
- **Radiology**: 0 خدمات — بيانات لم تُبذر (labservices فقط)
- **Home-care**: 48 خدمة ✅، booking 201 ✅

### Phase 3: Admin Dashboard
- **GeoPicker**: regions 5 + cities 150 + districts sa-riyadh→117 حياً ✅
- **Fraud**: high=أحمر، medium=عنبر — ليس كله أحمر ✅
- **Command-center**: tiles + "المتواجدون الآن" + stream حي ✅ (كود جاهز)
- **Passkey**: مسار ثنائي إجباري (login → passkey/verify) — سليم كودياً
- **المطلوب**: نشر الفروع المعلقة لرؤية التغييرات في الواجهة

### Phase 4-7: Performance & Load
| VU | p95 | فشل | RPS |
|---|---|---|---|
| 10 | 5-9s | 0% | 3.7/s |
| 30 | 1.3s | **91% 429** | 46/s |
| 50 | 0.9s | **100% 429** | 72/s |
| Spike 5→30 | 18s | 0% | 3.7/s |

**التشخيص**: Throttler `limit: 200 / 60s` عالمي — يحد عند ~3 طلبات/ثانية للعميل الواحد. تحت ضغط متزامن يرمي 429 قبل أن يصل لـ Mongo/CPU. **Breaking point الحقيقي = Rate limiter، ليس الموارد.**

### Phase 8: Race & Concurrency
- نفس المفتاح 5× متزامن → معرف واحد (آمن) ✅
- مفاتيح مختلفة → طلبات منفصلة (صحيح) ✅

### Phase 9: Security
| الاختبار | النتيجة |
|---|---|
| IDOR (صيدلية تقرأ طلب مريض) | 403 ✅ |
| No-auth / Patient→admin | 401 / 403 ✅ |
| Rate limit burst (10× login) | 3×401 + 7×429 ✅ |
| XSS `<script>` في raw_name | **⚠️ يحفظ بدون تطهير** — يحتاج escape عند الإخراج |

### Phase 10: Sentry
- فلتر 500+ صحيح — لا حاجة لتغيير
- قضايا `NABD-BACKEND-3..9,A,B,C` (انقطاع القرص) قابلة للإغلاق الآن

---

## 3) التوصيات — للوصول إلى 100K

### فورية (قبل أي scale)
1. **ارفع Throttler** على staging للاختبار: `THROTTLER_LIMIT=2000` أو استثناء مسارات القراءة العامة
2. **صلّح XSS**: طبّق `escapeHtml` على `raw_name` عند الإرجاع (سطر واحد في pharmacy-order.service)
3. **بذر Radiology**: نفس خطوة labs لكن لـ radiology collection
4. **فحص Broadcast visibility**: تحقق من فلتر `provider/pharmacy/broadcasts` (نصف قطر/حالة)

### متوسطة (لـ 10K-50K)
5. **كاش الكتالوج**: 5 دقائق Redis للـ catalog + labs (يقلل p95 من 5s → <200ms)
6. **Keep-alive + Connection pooling**: تحقق من `keepAlive` في Nginx ↔ Node
7. **قراءة من Replica**: فعّل secondary reads للكتالوج

### طويلة (لـ 100K+)
8. **Horizontal scaling**: 3× backend pods + load balancer
9. **CDN للكتالوج**: CloudFront/Cloudflare أمام `/public/categories/*`
10. **Rate limit ذكي**: per-user + per-IP + per-endpoint (ليس عالمي)

---

## 4) الفروع المدفوعة بانتظار النشر

| الفرع | المحتوى |
|---|---|
| `fix/admin-csrf-24h` | CSRF 24h |
| `fix/catalog-all-diversity` | ALL متنوع + max 2/ingredient |
| `fix/admin-missing-pieces` | Presence + device lock + VAT + fraud |
| `docs/verify-reviewer-deploy` | سجلات R49 |

---

## 5) اقتراحات إضافية (أثناء العمل)

- **Endurance test** (30 دقيقة × 20 VU) لمراقبة تسريب الذاكرة — أضفه بعد رفع Throttler
- **Chaos test**: إسقاط Redis/Mongo مؤقتاً وقياس التعافي (DLQ + retry)
- **Real-device E2E**: شغّل patient-app/provider-app على Expo Go ضد staging

---

*انتهى التقرير — كل الاختبارات على staging فقط، لا مساس بالإنتاج.*
