# خطة لوحة التحكم المؤسسية — Enterprise Control Center (شاشات إضافية فوق الموجود)

**الهدف:** تحكم كامل في كل شيء + تقارير لكل تفصيلة — بمستوى Vezeeta/Noon/Amazon. **إضافية** على الـ39 صفحة الحالية، بنفس Next Pages Router + BFF نحو NestJS.
**القاعدة:** صفر mock — كل رقم من تجميعات Mongo حقيقية، كل زر mutation محروس بـ RBAC + audit.

---

## 1) الشاشات الإضافية (المبنية فوق قسم K+)

### A. Real-Time Command Center v2
- WebSocket tiles حية: طلبات/حجوزات/مكالمات نشطة على خريطة السعودية + تنبيهات SLA متوهجة + سجل أحداث مباشر (بدل polling 30s)
- Backend: `GET /admin/stream` (SSE موجود بالفعل realtime-sse) + تجميعات دقيقة

### B. Order Lifecycle Console (الأهم)
- جدول موحد لكل الطلبات (صيدلية19/مختبر10/أشعة13/تمريض13 حالة) مع بحث+فلاتر+تصدير
- صفحة تفاصيل: timeline كامل + أزرار إلغاء(سبب إلزامي)/استرداد جزئي-كلي/تعويض محفظة/إعادة إسناد مزوّد/تمديد SLA/ملاحظات داخلية
- Backend جديد: `POST /admin/orders/:kind/:id/{cancel|refund|compensate|reassign}` + audit تلقائي

### C. Finance Suite
- Revenue dashboards لكل عمودي (يومي/أسبوعي/شهري + مقارنات MoM)
- عمولات وVAT من config سيرفري (إلغاء الحساب client-side المتضارب) + شاشة config
- Reconciliation يومي Moyasar↔ledger بتقرير فرقيات
- Payout batches بموافقة ثنائية للمبالغ الكبيرة + كشف حساب مزوّد تفصيلي

### D. Analytics Suite (بمعايير المنصات الكبرى)
- Date-range + granularity pickers إلزامية في كل شاشة
- Funnels: تسجيل→onboarding→أول طلب→تكرار (لكل قناة)
- Cohorts retention D1/D7/D30 + LTV لكل عمودي
- Provider league tables (قبول/رفض/زمن استجابة/تقييم/إلغاء)
- Search analytics → فرص كتالوج • NPS وتقييمات • Anomaly alerts (ارتفاع إلغاء/فشل دفع)
- تصدير CSV/Excel + **تقارير مجدولة email** (يومي/أسبوعي)
- Backend: endpoints تجميع `$facet` جاهزة التوسيع + جدول scheduled_reports

### E. CRM 360
- شاشة مريض 360: جلساته/أجهزته/طلباته/محفظته/سجله الطبي/تذاكره — drill-down واحد
- Segments builder (شرائح ديناميكية) تُستخدم في الحملات والإشعارات
- Impersonation مع banner + audit (permission موجود بالمصفوفة)

### F. Content & Growth
- CMS مقالات (إنشاء/تحرير/جدولة/وسوم/SEO fields) — يستبدل القراءة فقط
- Coupons & Offers manager بقواعد (نسبة/مبلغ/حد أدنى/سقف/شرائح/صلاحية) + backend CRUD جديد
- Home curation drag&drop للبانرات والأقسام
- Push campaign builder بـ segmentation + A/B

### G. Catalog Governance
- Medicines master data: اعتماد تغييرات عبر approval-workflow الموجود + price history + bulk import CSV + مراقبة نواقص workflow قرار

### H. Users & Privacy
- GDPR console: طلبات export/delete jobs بحالة lifecycle (يغلق أزرار الموبايل نهائيًا)
- Sessions/devices drill-down + ban workflows بأسباب

### I. System Ops
- RBAC ديناميكي (محرر أدوار/صلاحيات يقرأ permissions.ts) + gating عناصر UI
- Feature Flags موحدة (دمج المخزنين) مع rollout %
- Queue monitor: BullMQ depths + retry + dead-letter actions • Cron monitor تشغيل يدوي آمن
- Translations manager (ar/en + اللغات) • SEO publishing controls (يفك G-SEO-002)

## 2) الأساس التقني الملزم
Server-side authz middleware للوحة (إنهاء localStorage) • pagination/server-sort/filter في كل جدول • Recharts للرسوم • i18n ar/en • كل destructive زر = confirm + reason + audit log • websocket tiles عبر SSE الموجود

## 3) المراحل
| # | الدفعة | الشاشات | قبول |
|---|---|---|---|
| A1 | أساس الأمان | middleware authz + RBAC ديناميكي + إصلاح super_admin/disputes/adminId | اختبارات اختراق خضراء |
| A2 | Order Console + Finance Suite | B+C | e2e لكل فعل |
| A3 | Analytics Core | D (pickers+funnels+cohorts+exports) | مقارنة أرقام vs SQL يدوي |
| A4 | CRM 360 + GDPR Console | E+H | impersonation مسجل |
| A5 | CMS + Coupons | F | دورة إنشاء→نشر→استخدام كاملة |
| A6 | System Ops | I | queue retry يعمل فعليًا |
| A7 | Command Center v2 + Scheduled Reports | A+تقارير email | استلام بريد فعلي |

**التقدير:** ~6–8 أسابيع (مهندسان).
