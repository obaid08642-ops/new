# 🚀 رسائل بدء الجلسات — انسخ والصق في شات جديد

## 📩 رسالة الجلسة 1 — ويب المريض (مطابقة الموبايل)

```
اقرأ ~/Downloads/nabdah-audit/workstation/HANDOFF.md كاملًا ثم نفّذ مسار
"WEB PARITY BACKLOG" (33 مجموعة) بالترتيب من البند 9 إلى 33، بنفس آلية:
بناء → بوابة تحقق ذاتي (greps + دليل FILE:LINE) → إصلاح → تثبيت commit.
- كل شيء على فرع release/patient-production في workstation — لا تدفع لـ GitHub.
- طبّق قاعدة 🚫 ZERO-MOCK حرفيًا: كل شاشة تستدعي API حقيقيًا عبر BFF الموحد
  (zod+CSRF+idempotency)، وممنوع أي mock/fake/placeholder/noop.
- ابدأ بالبنود: 9 تمريض، 10 مختبر/أشعة، 11 تأمين الاستشارة+copay، 12 محفظة،
  13 شات realtime، 14 web-push... حتى 33.
- بعد كل مجموعة: حدّث جدول الحالة في HANDOFF.md وثبّت commit.
لا تسألني إلا إذا احتجت مفاتيح أو قرارًا من DECISIONS_LOCKED.md.
```

## 📩 رسالة الجلسة 2 — تطبيق مزوّدي الخدمات

```
اقرأ ~/Downloads/nabdah-audit/workstation/PROVIDER_PRODUCTION_PLAN.md كاملًا
ثم نفّذه مرحلة بمرحلة P1→P9 بنفس آلية: بناء → بوابة تحقق ذاتي → إصلاح → تثبيت.
- الكود في workstation/provider/ والباكند workstation/backend/.
- طبّق مصفوفة السيناريوهات لكل نوع مزوّد (صيدلية/طبيب/مختبر/أشعة/تمريض/
  منشأة/إسعاف) × (نقدي/تأمين) من الاستلام حتى الإتمام والحسابة.
- ابنِ الـ9 endpoints الجديدة أولًا (P3) ثم الواجهات، وقضِ على كل mock
  موجود في DoctorDashboard وأخواتها (P1) قبل أي بناء جديد.
- ZERO-MOCK إلزامي + لا دفع GitHub + بوابات e2e بين المراحل.
```

## 📩 رسالة الجلسة 3 — لوحة الإدارة المؤسسية

```
اقرأ ~/Downloads/nabdah-audit/workstation/ADMIN_ENTERPRISE_PLAN.md كاملًا
ثم نفّذ الدفعات A1→A7 بالترتيب (لا تتخطَّ A1 الأمني أبدًا):
A1 أساس الأمان (middleware authz + RBAC ديناميكي + إصلاح super_admin/disputes/adminId)
A2 Order Lifecycle Console + Finance Suite
A3 Analytics Suite (pickers/funnels/cohorts/anomaly/exports/scheduled)
A4 CRM 360 + GDPR Console
A5 CMS + Coupons Manager (+backend)
A6 System Ops (queues/crons/translations/SEO controls)
A7 Real-Time Command Center v2 + تقارير email مجدولة
- كل رقم من تجميعات Mongo حقيقية، كل زر mutation = RBAC + audit + reason.
- ZERO-MOCK إلزامي، لا دفع GitHub، وبوابة قبول لكل دفعة قبل التالية.
```

---

### ملاحظات عامة لكل الجلسات
1. المصدر المحلي فقط: `~/Downloads/nabdah-audit/workstation` — فرع `release/patient-production`
2. لا تعمل أبدًا على `main` ولا تدفع دون أمر صريح من المالك
3. عند الحاجة لمفاتيح حية (Moyasar/Firebase) توقف واطلبها — لا تخترع قيمًا
4. بعد إنهاء المسار: شغّل `backend/e2e/governing-rules.js` ضد staging وأبلغ بالنتيجة
