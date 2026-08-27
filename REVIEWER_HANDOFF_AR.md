# رسالة جاهزة للمراجع — Enterprise Control Center

مرحباً،

تم إكمال تدقيق وتنفيذ **Enterprise Control Center** على الفرع التالي:

`agent/enterprise-control-center-20260827`

آخر commit مرفوع إلى GitHub هو:

`c984962 fix: finalize enterprise control center security and BFF contracts`

الرابط المباشر للفرع:

[فتح فرع Enterprise Control Center على GitHub](https://github.com/obaid08642-ops/new/tree/agent/enterprise-control-center-20260827)

## ملخص التنفيذ

تم توحيد لوحة الإدارة حول عقد backend canonical مع إزالة قنوات التجاوز القديمة. أصبحت الواجهة تستخدم BFF same-origin عبر مسارات Next.js المحلية، بينما بقي `ADMIN_BACKEND_URL` server-only. لا توجد في مصادر الإدارة نداءات مباشرة إلى backend URL، ولا تخزين لحساسيات المصادقة في `localStorage` أو `sessionStorage`، ولا عرض لـ bearer token أو impersonation token داخل React state أو DOM.

تم إغلاق دورة جلسات الدعم بالكامل. عند بدء جلسة الدعم، يتحقق backend من الصلاحية والسبب والمدة القصوى، ويُنشئ السجل في قاعدة البيانات. لا يعيد backend العام raw token؛ قناة BFF الداخلية فقط تستقبل credential وتضعه في cookie باسم `admin_support_session` بخصائص `HttpOnly` و`SameSite=Lax` ومدة 900 ثانية، ثم تعيد للواجهة metadata آمنة. يقوم `JwtAuthGuard` باستدعاء `ImpersonationSessionService` للتحقق من حالة الجلسة وTTL وtarget وrole في كل request، ولذلك يؤدي revoke أو expiry إلى إبطال JWT فوراً. كما تم رفض المسار القديم `x-impersonate-user-id` fail-closed.

تم توحيد عقود medicines. العقود النشطة للإدارة هي catalog وchange-requests وprice-history وshortage-reports، بينما العقود القديمة الخاصة بـ pending review وapprove وreject وupdate وlegacy delete أصبحت ترجع `410 Gone` برسالة واضحة توجه إلى العقد canonical، ولا تنشئ نجاحاً وهمياً أو تعدّل البيانات خارج مسار التدقيق.

## الشاشات الإدارية الموجودة والمراجعة

تم التحقق من وجود **44 صفحة إدارية** ضمن `admin/src/pages/admin/`، وتشمل مركز القيادة الحي، لوحة المؤشرات، إدارة الطلبات وتفاصيل دورة الطلب، المالية والدفتر المالي والعمولات والمدفوعات، CRM 360، إدارة الشرائح، مركز الإشعارات والحملات، إدارة الكتالوج والأدوية، حوكمة catalog، مراقبة الاحتيال، النزاعات، GDPR، إدارة المزودين، fleet الإسعاف، البوابة التكوينية، RBAC، الأمن وPasskeys، التشغيل والـ queues، التقارير المجدولة، SEO، الترجمة، الرعاية المنزلية والتمريض، مركز SOS، التوريد الصيدلي، audit logs، إدارة المستخدمين، وشاشة جلسات الدعم.

الصفحات التي أضيفت أو توسعت ضمن Enterprise batches A1–A7 تشمل Command Center وOrder Lifecycle Console وFinance Suite وFinancial Ledger وCRM 360 وSegments Builder وNotification Center وCatalog Governance وProvider Moderation وFraud Monitoring وAmbulance Fleet وConfig Portal وImpersonation Sessions وواجهات التحليلات والتقارير. كل مؤشرات KPI في هذه الصفحات تُقرأ من backend responses فعلية، ولا توجد أرقام mock أو بيانات fabricated؛ عند تعذر المصدر تظهر حالة خطأ أو عدم توفر بدلاً من رقم افتراضي.

## أهم BFF endpoints

| المجال | مسارات الواجهة canonical | الغرض |
|---|---|---|
| المصادقة | `/api/admin/auth/login`، `/api/admin/auth/logout`، `/api/admin/auth/verify-2fa`، `/api/admin/auth/passkey-verify` | إدارة cookies HttpOnly وCSRF دون كشف access token للمتصفح |
| جلسات الدعم | `/api/admin/impersonation/start`، `/api/admin/impersonation/revoke`، `/api/admin/impersonation/*` | إنشاء وإبطال واستعراض support sessions مع metadata-only response |
| الإدارة العامة | `/api/admin/[...path]` | BFF catch-all مع server-only upstream وallowlist وno-store للردود الحساسة |
| catalog والأدوية | `/medicines/admin/catalog`، `/medicines/admin/change-requests`، `/medicines/admin/catalog/:id/price-history`، `/medicines/admin/shortage-reports` | القراءة والتعديل والمراجعة السعرية وإدارة النقص عبر العقود الموحدة |
| الطلبات | `/admin/command-center`، `/orders/:kind/:id`، `/orders/:kind/:id/:action` | البحث والتفصيل والإلغاء والتحويل وتسجيل الملاحظات والتصدير |
| المالية | `/finance/revenue`، `/finance/commissions`، `/finance/payouts`، `/finance/reconciliation`، `/finance/providers/:id/statement` | تقارير مالية server-derived، تسويات، عمولات، مدفوعات وكشوف مزودين |
| CRM وGDPR | `/crm/patients`، `/crm/patients/:id/360`، `/gdpr/requests` | ملف العميل الموحد، الطلبات، المحفظة، الأجهزة، التذاكر ودورات الخصوصية |
| التحليلات | `/analytics-suite/funnels`، `/analytics-suite/cohorts`، `/analytics-suite/nps`، `/analytics-suite/provider-league`، `/analytics-suite/search` | تحليلات وفلاتر server-side دون اختلاق مؤشرات |
| التشغيل والحوكمة | `/ops/queues`، `/ops/translations`، `/ops/seo/controls`، `/governance-controls/feature-flags`، `/governance-controls/home-curation` | مراقبة queues، الترجمة، SEO، feature flags وتخصيص الصفحة الرئيسية |
| المحتوى والإشعارات | `/cms/articles`، `/coupons`، `/notification-center/campaigns`، `/notification-center/segments` | دورة المحتوى، القسائم، الحملات، الشرائح واختبارات A/B |

## Backend security and canonical contracts

تم دمج `ImpersonationSessionService` في `JwtAuthGuard` بحيث تتم مراجعة جلسة impersonation أمام قاعدة البيانات مع كل request. أُضيف `ImpersonationSecurityModule` لتوفير dependency المركزية في كل module graph، وتم تحديث unit وintegration tests المتأثرة بالـ constructor الجديد.

تم تعطيل CRM legacy impersonate عبر `GoneException`، وأصبح CRM يستخدم `/impersonation/start` عبر BFF مع user ID وسبب تدقيق محدد. تم إزالة cookie auth legacy من الحارس المركزي، وتثبيت `ADMIN_BACKEND_URL` في جميع BFF routes، كما تم تحويل components التي كانت تعتمد على backend URL مباشر إلى same-origin أو BFF server-side paths.

## ملفات المراجعة

يرجى مراجعة الملفين التاليين باعتبارهما سجل التدقيق الرسمي:

`review/ADMIN_ACTIVE_ROUTE_AND_MUTATION_INVENTORY.md`

يحتوي على inventory لمسارات backend، handlers، أدلة الصلاحيات، عقود BFF، ومسارات medicines legacy التي أصبحت fail-closed.

`review/ADMIN_PAGE_AND_DATA_AUTHORITY_MATRIX.md`

يحتوي على inventory لجميع صفحات الإدارة، نداءات API/BFF، مؤشرات local/direct، mutation heuristics، وقواعد source-of-truth والـ transport authority.

## نتائج التحقق

| الفحص | النتيجة |
|---|---:|
| Backend build من workspace | ناجح |
| Admin Next.js production build من workspace | ناجح؛ تم توليد 48 route/static output بنجاح |
| Backend full Jest من workspace | **86 suites / 472 tests ناجحة** |
| Enterprise A1–A7 integration gate | **22 / 22 ناجحة** |
| Backend full Jest من clean clone | **86 suites / 472 tests ناجحة** |
| Backend وAdmin build من clean clone | ناجحان |
| Static sensitive scan من clean clone | ناجح؛ لا `NEXT_PUBLIC_API_URL` backend ولا `localhost:8002` ولا `localStorage`/`sessionStorage` داخل admin source |
| Git working tree في clean clone | نظيف، مطابق للفرع المرفوع |

تظهر أثناء بعض الاختبارات تحذيرات بيئية متوقعة مثل عدم إعداد mail provider أو S3 في بيئة الاختبار، لكنها تُسجّل كحالات failure delivery أو fallback صريحة ولا تُحوّل إلى بيانات نجاح أو KPIs وهمية.

## ملاحظة lint

نجح TypeScript وproduction build وجميع اختبارات backend. أما أمر lint العام الموجود في المشروع فيُبلغ عن أخطاء أسلوبية قديمة موزعة على نطاق واسع في source غير مرتبط حصراً بهذا التغيير؛ لذلك لم أعدّ lint العام ناجحاً، ولم أخفِ هذه النتيجة. أما static security scan الخاص بمسارات الإدارة والحساسيات فقد نجح بالكامل، كما أن clean clone مطابق للcommit المرفوع.

## المطلوب من المراجع

يرجى مراجعة commit `c984962` والملفين الموجودين في `review/`، ثم اختبار المسارات الحساسة تحديداً: إنشاء جلسة دعم ثم revoke، محاولة استخدام المسار القديم header-based impersonation، مراجعة `410 Gone` لعقود medicines legacy، والتأكد من أن browser network لا يرى backend URL أو bearer token. بعد اعتماد المراجعة يمكن دمج الفرع إلى الفرع المستهدف ونشره وفق سياسة النشر لديكم.

شكراً.
