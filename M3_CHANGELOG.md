# سجل تغييرات المرحلة M3 — منظومة التأمين والمحرك المالي (Backend)

**التاريخ:** 23 يوليو 2026 · **الحالة:** مكتملة ومُتحقق منها ✅
**إثبات الجودة:** `tsc --noEmit` = **صفر أخطاء** · `nest build` ناجح · **24 مسارًا جديدًا** · 4 مخططات بيانات جديدة

---

## ما بُني — وحدة `insurance-engine` جديدة كليًا

### 1️⃣ القياس الموحد للدفع (BR-1) — `GET /bookings/quote`

الخادم يقرر طرق الدفع المسموحة (لا الواجهة):

| القناة | النتيجة |
|---|---|
| online / video / audio / home / delivery / nursing / physio / ambulance | `allowed_methods: [insurance?, online]` — **لا كاش إطلاقًا** |
| clinic | `allowed_methods: [insurance?, online, clinic_pay]` |
| مع `with_insurance=true` | يُضاف خيار `insurance` للجميع |

### 2️⃣ محرك التأمين (BR-2) — التدفق الكامل كما اعتمده المالك

```
مريض يختار "تأمين" ← فحص الوثيقة تلقائيًا
  ├─ لا وثيقة: يرفض الخادم بـ NO_INSURANCE_POLICY ← التطبيق يوجّه لإضافة الوثيقة ثم يعود
  └─ وثيقة موجودة: POST /insurance/requests ← PENDING_PROVIDER_REVIEW
        ← المزود يرى الطابور: GET /insurance/requests/provider/queue
        ← قراره: POST /insurance/requests/:id/decide
              ├─ approve_full → copay = 0
              ├─ approve_partial {copay_percent 1..99} → يُحسب copay_amount تلقائيًا
              └─ reject {reason إلزامي}
        ← المريض يدفع copay فقط: POST /insurance/requests/:id/pay-copay {payment_id}
        ← COPAY_PAID ← إشعار المزود ← تبدأ الخدمة
أحداث EventEmitter: insurance.requested / insurance.decided / insurance.copay.paid
```

**24 مسارًا:** شركات (مع سكربت زرع 10 شركات سعودية حقيقية: بوبا/التعاونية/ميدغلف/سايكو/تكافل الراجحي/ولاء/أليانز/أكسا/الخليجية/ملاذ) · حفظ وثيقة · وثيقتي · فحص تغطية · ملخص منافع · إنشاء/قائمة/تفاصيل/إلغاء طلب · طابور المزود · القرار · دفع copay · aliases للمسارات التي يناديها التطبيق فعلًا (`/patient/pay-copay`, `/insurance/payment-confirm`, `/home-care/insurance/verify`).

**حماية مدمجة:** لا قرار مزدوج (state مفروضة)، لا copay بلا payment_id، لا إلغاء بعد الدفع، صلاحيات (المريض/المزود/الأدمن كلٌّ يرى ما يخصه فقط)، سجل `history` كامل لكل انتقال.

### 3️⃣ الاسترداد بسياسات النوافذ

| النافذة | الاسترداد |
|---|---|
| إلغاء قبل >24 ساعة | 100% |
| قبل 4–24 ساعة | 50% |
| قبل <4 ساعات / عدم حضور | 0% |

`POST /refunds/request` (يحسب النسبة تلقائيًا من موعد الحجز، idempotent لكل حجز) · `GET /refunds/my` · `GET /refunds/policy-preview` · طابور الأدمن + قرار.

### 4️⃣ محرك العمولات ودفتر الأستاذ

`POST /finance/ledger/accrue` — تسجيل عمولة المنصة وصافي المزود لكل طلب مدفوع (idempotent): استشارة 15% · صيدلية 10% · عيادة/معمل/أشعة 12% · منزلي/تمريض/طبيعي 18% (قابلة للتعديل عبر CommissionRule). ملخص للمزود وللمنصة.

## المتبقي (موثق — يربط في M4/M5)
- ربط شاشات التأمين الـ 13 في تطبيق المريض + بناء شاشة قرار المزود (M4).
- تنفيذ الاسترداد الفعلي عبر Moyasar عند اعتماد الأدمن (البنية جاهزة — يحتاج payment_id الحقيقي).
- ربط accrue تلقائيًا بأحداث الدفع (webhook moyasar) بدل النداء اليدوي.
- صفحات الأدمن: طابور الاستردادات وملخص العمولات (M5).

## التحقق
| الفحص | النتيجة |
|---|---|
| tsc الباك إند كاملًا | ✅ صفر أخطاء |
| nest build | ✅ ناجح |
| مخططات جديدة | InsuranceServiceRequest · RefundRequest · PlatformLedgerEntry · CommissionRule |

**التالي: M4 — التدفقات الممتدة وربط الشاشات (الختامية الثلاث، ملخص الاستشارة، محرك بث الصيدليات، الأشعة للمريض، ربط شاشات التأمين).**
