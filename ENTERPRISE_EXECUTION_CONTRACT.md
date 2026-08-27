# عقد تنفيذ لوحة الإدارة المؤسسية

**المرجع الوظيفي:** `pasted_content.txt` بتاريخ 27 أغسطس 2026.  
**المرجع البرمجي:** مصادر مفكوكة من أرشيفات `main@22526bed`.  
**مصدر الإضافات المنتقى:** `quarantine/workstation-source-51a84c7@6d4d42fe`، ويُنقل يدوياً فقط لعدم وجود سلف Git مشتركة.

## قواعد غير قابلة للتفاوض

1. لا تُستخدم بيانات وهمية أو قوائم ثابتة لإظهار مؤشرات أو نتائج أو نجاح عمليات. كل قراءة تصدر من API خادم موثق، وكل mutation يصل إلى backend محمي.
2. لا تحفظ لوحة الإدارة access token أو refresh token أو الدور في `localStorage` أو `sessionStorage`. الجلسة تدار عبر HttpOnly Secure cookies وBFF في Next.js Pages Router.
3. كل عملية مالية أو مدمرة تتطلب صلاحية، تأكيداً، وسبباً، وسجل audit يحفظ actor وbefore/after ووقت التنفيذ.
4. كل جدول إداري يدعم pagination وsort وfilter على الخادم. ولا تحسب واجهة العميل VAT أو العمولة أو الرصيد.
5. يمر أي انتقال عبر build واختبارات الوحدة/التكامل المناسبة قبل المرحلة التالية؛ نجاح build لا يساوي اعتماد production.

## مصفوفة نطاق التنفيذ

| الدفعة | الصفحات أو التجارب المطلوبة | عقد backend أو الاعتماد |
|---|---|---|
| A1 | جلسة إدارة، RBAC، نزاعات، سجل تدقيق | `/admin/session`، RBAC، disputes، audit |
| A2 | قائمة دورة الطلب، تفاصيل الطلب، الإيرادات، العمولات، التسوية، الدفعات، كشف المزوّد | orders console، finance suite، wallet/ledger/payment contracts |
| A3 | funnels، cohorts، league table، search/NPS/anomalies، التصدير والتقارير | analytics suite وscheduled reports |
| A4 | CRM 360، الشرائح، impersonation banner، GDPR | CRM/segments/privacy contracts |
| A5 | CMS، كوبونات وعروض، home curation، حملات push وA/B | CMS/coupons + مسارات growth الناقصة |
| A6 | feature flags، queues/DLQ، cron، ترجمات، SEO | ops + flags + queue jobs + SEO |
| A7 | Command Center v2، SSE، خريطة، سجل أحداث، تقارير بريدية | stream/snapshot + report worker + mail provider |
| G/H | catalog governance، sessions/devices، ban workflows | approval workflow/catalog/bans/privacy |

## ملاحظات المصدر

- المصدر الكامل للوحة الإدارة يوجد في `admin/` بعد فك `web_admin_dashboard.zip` من `main`.
- لقطة quarantine تحتوي backend وpatient-mobile وpatient-web، لكنها **لا تتضمن** مصدر لوحة الإدارة أو تطبيق المزوّد؛ لذلك لا تعالج هذه اللقطة نقص الواجهات.
- لا تستخدم هذه الوثيقة كدليل اكتمال تشغيلي. ستُسجل نتائج كل مرحلة في الاختبارات وملف التسليم النهائي.
