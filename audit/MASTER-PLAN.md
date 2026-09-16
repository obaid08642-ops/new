# الخطة الشاملة — التنفيذ الكامل بلا توقف (Master Plan)

> تاريخ: 2026-09-16 | البيئة: staging.nabd.plus (معزول) + prod verification
> السيرفر: 2 vCPU / 4GB RAM | Nginx: burst 200 nodelay / connections 4096 / Replica Set rs0 ✅ | الحاوية: healthy

---

## 0) ما تم إنجازه فعلياً (تحقق حي)

| البند | الحالة |
|---|---|
| Staging معزول (nabd_staging 223MB) + replica set + Nginx | ✅ |
| Catalog 20,990 + 51 labs + 6 facilities (staging) | ✅ |
| Providers: صيدلية + مختبر (موثقان، إحداثيات الرياض) + login 200 | ✅ |
| Broadcast: DRAFT→broadcasting (3km) + pharmacy يرى الطلب | ✅ |
| Labs: labservices 151 فحص + category filter | ✅ |
| Catalog diversity (ALL متنوع) + popularity scope fix | ✅ كود جاهز، بانتظار نشر v2 |
| Presence fix (TTL 180s + upsert + provider heartbeat) | ✅ كود جاهز، بانتظار نشر |
| Locations: 5 مناطق / 150 مدينة / districts (sa-riyadh → 117 حي) | ✅ حياً |
| Sentry: DSN مضبوط prod+staging | ✅ |

---

## 1) النواقص الحقيقية (فحص مباشر)

| # | المشكلة | السبب الجذري | الحل |
|---|---|---|---|
| A | **كتالوج الأدوية — تعديل يفشل CSRF** | `admin_csrf` كوكي Max-Age 1 ساعة فقط (login.ts:49). بعد ساعة كل PATCH/PUT → 403. لا تجديد تلقائي. | إصلاح كود: تجديد CSRF مع كل refresh + تمديد 24h |
| B | **Sentry أخطاء كثيرة** | 5xx فقط تُرسل (مفلتر 4xx)، لكن broadcast و labs سابقاً كانت ترمي 500 قبل الإصلاحات | إصلاح A-C سيوقف المصدر؛ ثم تنظيف Sentry |
| C | **Submit pharmacy لا يزال 500 في حالة حافة** | `getBroadcastStages` يرمي إن لم توجد config (correct by design) — staging الآن سليم، لكن prod قد يفتقدها إن لم تُبذر | تأكيد seedSystemConfig على prod |
| D | **Load tests محدودة (500 VU فقط)** | k6-full.js يغطي 4 مسارات فقط، لا يغطي الكتابة | بناء comprehensive suite (see Phase 4-8) |
| E | **E2E لم يُختبر كاملاً** | كان محجوباً بـ staging غير معزول → الآن مفتوح | تنفيذ Phase 2-3 |

---

## 2) المطلوب من المراجع — مرة واحدة ونهائية (انسخ والصق)

```bash
# لا شيء إضافي خارج ما نُفذ! فقط تأكد:
# 1) الفروع التالية مدمجة ومنشورة على staging + prod:
#    fix/catalog-all-diversity, fix/admin-missing-pieces, docs/verify-reviewer-deploy
# 2) SENTRY_DSN مضبوط على كل حاوية (prod + staging) — تحقق:
sudo docker exec nabdah-prod-backend env | grep SENTRY
sudo docker exec nabdah-staging-backend env | grep SENTRY
# 3) لا حاجة لـ provider passwords — تم إصلاحها ✅
# 4) لا حاجة لنسخ إضافي — labservices 151 جاهزة ✅
```

**إن كان كل ما سبق OK → لا تلمس شيئاً، سأبدأ فوراً.**

---

## 3) الخطة التنفيذية — 10 مراحل (تسلسلية، كل مرحلة تُسلم تقرير)

### Phase 0: Pre-flight & Hotfixes (30 دقيقة)
- [ ] 0.1 إصلاح CSRF: تمديد admin_csrf → 24h + تجديد مع refresh + اختبار PATCH /admin/catalog/:id حياً
- [ ] 0.2 تأكيد Sentry: فلتر 500 فقط يعمل، لا تسريب 4xx
- [ ] 0.3 التحقق الصحي: staging liveness + prod liveness + catalog count + labs/services

### Phase 1: E2E Pharmacy — دورة كاملة (45 دقيقة)
- [ ] 1.1 مريض: guest → تسجيل → تسجيل دخول → تصفح ALL (تنوع) → تصفح فئة → بحث بنادول
- [ ] 1.2 سلة: إضافة صنفين → Idempotency-Key → إعادة نفس المفتاح (200) → مفتاح مختلف بجسم مختلف (400)
- [ ] 1.3 طلب: POST /patient/pharmacy/orders → DRAFT → submit → broadcasting (3km)
- [ ] 1.4 مزود: login صيدلية → GET /provider/pharmacy/broadcasts → يرى الطلب → offer
- [ ] 1.5 مريض: GET offers → selectOffer → final-quote → accept → COD / card / insurance
- [ ] 1.6 مزود: confirm → preparing → ready → out-for-delivery → delivered
- [ ] 1.7 إلغاء ومرتجع: cancel (مع Idempotency) → verify cancelled

### Phase 2: E2E Labs / Radiology / Home-care (30 دقيقة)
- [ ] 2.1 labs: GET /labs/services?category=blood → حجز مع provider_account_id → assignTechnician → uploadReport
- [ ] 2.2 radiology: نفس الدورة
- [ ] 2.3 home-care: GET /home-care/services → حجز
- [ ] 2.4 تحقق: bookings/mine للمريض + inbox للمزود

### Phase 3: Admin Dashboard — التدقيق الشامل (45 دقيقة)
- [ ] 3.1 Catalog: إضافة صنف → تعديل → حفظ (CSRF) → حذف — تحقق حياً
- [ ] 3.2 Provider moderation: GeoPicker (region→city→district 117) → approve/reject
- [ ] 3.3 Orders console: /admin/orders → انتقال حالة
- [ ] 3.4 Finance/VAT/GDPR/Disputes/Fraud — كل تبويب
- [ ] 3.5 Command-center: tiles + المتواجدون الآن + stream حي
- [ ] 3.6 Passkey: enroll/options → enroll/verify → login/verify (2-step)
- [ ] 3.7 Chat/Support/Community/Loyalty — كل تبويب

### Phase 4: Baseline Performance (15 دقيقة)
- [ ] تشغيل k6-smoke على staging: 50→200 VU، قياس p50/p95/p99 + error%
- [ ] نفس السكربت على prod (قراءة فقط) — مقارنة

### Phase 5: Load Test المتدرج (30 دقيقة)
- [ ] سكربت شامل 8 مسارات (read + write) — stages: 1K → 2.5K → 5K VU
- [ ] تقرير كل مرحلة: VU, RPS, p50/p95/p99, error%, CPU/RAM (عبر /health + docker stats إن متاح)

### Phase 6: Spike Test (10 دقائق)
- [ ] قفزة 500 → 5,000 VU في 10 ثوانٍ — محاكاة Push مفاجئ

### Phase 7: Stress & Break-point (20 دقيقة)
- [ ] تدرج 10K → 15K → 20K حتى الانهيار — تحديد breaking point + سبب (CPU/RAM/Mongo connections)

### Phase 8: Race & Concurrency (15 دقيقة)
- [ ] طلبان متزامنان بنفس السلة → Idempotency
- [ ] قبول عرضين متزامنين لنفس الطلب → واحد ينجح، الثاني 409
- [ ] حجزان متزامنان لنفس الموعد

### Phase 9: Security (20 دقيقة)
- [ ] OWASP Top 10: IDOR (طلب مريض A لا يراه B), XSS, CSRF negative, authz
- [ ] Rate limit: 429 بعد burst
- [ ] استخدام nuclei / testing-coverage skill إن متاح

### Phase 10: Sentry Triage & Final Report (20 دقيقة)
- [ ] تصفية 5xx الحقيقية vs ضوضاء
- [ ] إغلاق قضايا القرص (NABD-BACKEND-3..9) بعد تأكيد الاستقرار
- [ ] تقرير نهائي شامل: جدول كل مرحلة + توصيات للوصول إلى 100K

---

## 4) الأدوات الخارجية المستخدمة

| الأداة | الاستخدام |
|---|---|
| k6 (load) | المراحل 4-8 |
| testing-coverage skill (rakymat) | تغطية الاختبارات + nuclei security |
| Nginx tuning (burst/connections) | تم ✅ |
| Sentry | المرحلة 10 |
| Playwright (إن لزم) | E2E واجهات |

---

## 5) التسليم

- كل مرحلة تنتهي بتقرير مرحلي (جدول VU/RPS/p95/error + لقطات curl)
- التقرير النهائي: ملف واحد `AUDIT-FINAL-REPORT.md` + تحديث `gap-matrix.md`
- لا حذف سجلات staging الإنتاج — كل الاختبارات على staging فقط

---

**جاهز للانطلاق فور تأكيدك بـ "ابدأ" — أو قل لي إن المراجع أكمل نقطة ما.**
