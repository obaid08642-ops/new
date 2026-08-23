# جرد إعادة القراءة الثانية لخطة بناء ومعالجة مشروع نَبْض

**مصدر الجرد:** `خطةبناءومعالجةشاملةلمشروعنَبْض.md`، تمت قراءته كاملًا على ثلاثة مقاطع متتابعة حتى السطر 342.

## نطاق الوثيقة ومبدأها الحاكم

الخطة تشمل Backend وPatient Mobile وPatient Web وProvider وAdmin والعقود المشتركة. وهي خطة فقط، لا تثبت تنفيذًا أو نشرًا. نقطة البداية المثبتة هي `main@22526bedb77a3d8148219036367e4714f401aecc`. المبدأ الحاكم هو أن الصفحة لا تعتبر مكتملة بقراءة البيانات فقط؛ يجب إثبات رحلة واجهة المريض → حالة العميل → API/BFF → تحقق العقد والخادم → التخزين والأحداث → واجهة المزود/الإدارة → success/failure/cancel/retry.

## قواعد التنفيذ والتسليم

يجب العمل على فرع مستقل، دون إنتاج أو أسرار أو PII أو قاعدة حقيقية. Mongo/Redis مؤقتان وحسابات Sandbox فقط. كل DTO له schema وserver validation وcontract test. الدفع Sandbox/fake PSP أولًا. الأحداث الحية تحتاج JWT handshake وغرفًا مشتقة خادميًا وصلاحية لكل event. يمنع fallback identity وHTTP مع Authorization وadmin tokens في localStorage والمعرفات الصحية الثابتة في QR. كل migration يجب أن تكون قابلة للتنفيذ والرجوع. لا يكفي build؛ المطلوب unit + contract + integration + E2E. النشر لاحقًا فقط بعد source review وgates وboot مؤقت وbackup/rollback وlive sandbox smoke وmain sync.

## Definition of Done

لا تُغلق البطاقة إلا بسلوك منفذ دون `@ts-nocheck` جديد، واختبارات success و401/403 وvalidation وconflict وtimeout/retry عند انطباقها، ورسائل خطأ مفهومة، وaudit/monitoring للأفعال الحساسة، وعدم وجود بيانات ثابتة أو UI يوحي بنتيجة لم يستلمها الخادم.

## سجل findings الكامل

| المعرف | الأولوية | المجال | المشكلة | المطلوب |
|---|---|---|---|---|
| F-001 | P0 | Backend/Admin auth | Cookie إداري يكتب كائن token بدل access JWT | accessToken كسلسلة، refresh منفصل، اختبار login ثم `/auth/me` |
| F-002 | P0 | Backend auth | Apple/X/Snapchat تفك token بلا توقيع/issuer/audience/expiry | تحقق رسمي كامل أو تعطيل آمن، حذف fallback identity |
| F-003 | P0 | Pharmacy backend | الرفض/الإلغاء قد ينتهي بـDELIVERED | state machine مركزية، `CANCELLED/UNFULFILLABLE/PARTIAL`، التسليم فقط عند اكتمال allocations |
| F-004 | P1 | Backend/data | لا migrations/rollback تنفيذية مثبتة | runner بإصدارات/checksums/rollback واختبارات ترقية |
| F-005 | P0 | Backend Socket | Socket عام، غرف من العميل، broadcast عام | JWT handshake، identity في socket.data، rooms مشتقة خادميًا، منع broadcast |
| F-006 | P0 | Backend chat | التحقق عند join فقط وthreadId يقبل من العميل | authorization لكل event، قراءة state، persistence قبل broadcast |
| F-007 | P0 | Mobile/Pharmacy | `file://` أو `content://` يرسل كـprescription_id | upload أولًا، server media_id، ملكية/MIME خادمية |
| F-008 | P1 | Mobile/Consultations | نجاح ثابت لطبيب/موعد/حالة | response أو GET حقيقي، حالات فعلية، منع waiting room قبل confirmation |
| F-009 | P0 | Mobile/Diagnostics | checkout redirect إلى الجذر | checkout حقيقي أو إزالة كل رابط غير منفذ |
| F-010 | P1 | Mobile/uploads | FormData مع Content-Type JSON | اكتشاف FormData وإزالة header، multipart contract test |
| F-011 | P1 | Mobile/Privacy | QR يكشف national_id/user_id وPHI بلا ضوابط | QR قصير العمر خادمي، مشاركة منتقاة بموافقة وإخفاء افتراضي |
| F-012 | P0 | Provider | custom IP يفرض HTTP مع Authorization | HTTPS في production، dev override محدود بلا auth headers |
| F-013 | P0 | Admin | admin_token في localStorage | HttpOnly/Secure/SameSite + CSRF + CSP، منع localStorage |
| F-014 | P1 | Mobile/Orders | `/care/appointments/mine` بلا عقد والخطأ مبتلع | endpoint مدعوم أو عقد جديد، خطأ واضح، integration test |
| F-015 | P1 | Dependencies | 5/9/4 HIGH في mobile/provider/admin | ترقيات مقيدة واختبارات regression بلا force |
| WP-001 | P0 | Web/Pharmacy | checkout preview بلا order/payment/success/failure | cart checkout كامل idempotent |
| WP-002 | P0 | Web/Diagnostics | labs catalog بلا اختيار/حجز | service → quote/slot/address → booking/payment |
| WP-003 | P0 | Web/Diagnostics | radiology بلا تفاصيل قابلة للتنفيذ/حجز | referral/center/slot/coverage/payment |
| WP-004 | P0 | Web/Home-care | تفاصيل بلا حجز | eligibility/address/time/provider/price/confirmation |
| WP-005 | P0 | Web/Pharmacy | medicine catalog بلا cart/Rx/purchase | availability/Rx/quantity/cart/order |
| WP-006 | P0 | Web parity | web actions محصورة auth/appointments مقارنة بالموبايل | parity backlog لكل مجال وعدم تسويقها كبديل كامل |
| MP-016 | P1 | Mobile quality | 199 ملفًا `@ts-nocheck` | إزالة تدريجية حسب خطورة الرحلة مع DTOs/strict checks |
| MP-017 | P2 | Mobile tests | Jest ينجح لكن teardown يخرج 1 | mock/setup صحيح، exit code صفر بلا forceExit |
| MP-019 | P0 | Home-care | اختيار ممرض لكن backend يكتب provider_id undefined | قرار provider-reserved أو open queue، عقد وواجهة حقيقة |
| MP-020 | P1 | Home-care | daysCount/transport لا تصل للخادم/التسعير | DTO visit_count/recurrence/transport وتسعير خادمي |
| MP-021 | P1 | Home-care | لا idempotency وقد يتكرر retry | key + outcome persistence + timeout-after-commit E2E |

**ملاحظة استكشافية:** BFF catch-all body forwarding غير مثبت كعطل مؤثر؛ يجب اختباره أولًا ولا يُصلح افتراضيًا.

## قرارات المنتج غير المحسومة

يجب اعتماد نموذج الدفع لكل مجال، دلالة اختيار مقدم الرعاية المنزلية، نموذج recurrence/visit count والنقل، قواعد Rx والمراجعة والبدائل، نموذج labs/radiology للمركز أو المنزل والـreferral والـslots، التأمين وpre-authorization/copay/claims، الإلغاء/refund/no-show، وقنوات الإشعارات وconsent/deduplication.

## المراحل المطلوبة

| المرحلة | الهدف والمخرجات |
|---|---|
| Phase 0 | سجل API/DTO versioned، أخطاء موحدة، migration framework، fixtures صناعية، واختبار BFF body forwarding |
| Phase 1 | إغلاق F-001/F-002/F-005/F-006/F-012/F-013: sessions، social auth، Socket/Chat، HTTPS، Admin cookie/CSRF/CSP |
| Phase 2 | F-003/F-004: pharmacy state machine، migrations، idempotency، outbox/audit، body forwarding |
| Phase 3 | Pharmacy MVP web/mobile: catalog، Rx media upload، cart، quote، order، sandbox payment، tracking |
| Phase 4 | Diagnostics/Home-care: referral/eligibility/slots/quote/booking/payment أو approval، provider semantics، recurrence، transport، idempotency |
| Phase 5 | Mobile truth/privacy: FormData، Rx، consultation success الحقيقي، diagnostics checkout، QR قصير العمر، orders endpoint، types |
| Phase 6 | Parity Registry لكل capability وربط mobile/web/API/provider-admin/states/tests، ثم insurance/health/family/reminders/chat/notifications/emergency |
| Phase 7 | إزالة `@ts-nocheck`، إصلاح Expo/Jest teardown، dependency remediation، CI lint/type/unit/contract/integration/audit/SAST/secret scan/build |
| Phase 8 | قبول Sandbox متعدد الأطراف ثم backup/rollback/migrations/on-call/dashboards/live sandbox smoke وقرار إطلاق منفصل |

## معايير القبول الحرجة

يجب ألا يصل order إلى DELIVERED قبل كل allocation الملزم، وأن ينشئ replay سجلًا واحدًا فقط، وأن تكون migrations قابلة للترقية والرجوع. Pharmacy E2E يغطي card/cash وRx failure وpayment failure وduplicate retry وdecline/cancel. Diagnostics يغطي no slot وmissing referral وapproval/decline/payment retry. Home-care يغطي provider A/B أو queue المعلن، 1 و20 زيارة، transport، cash/insurance، timeout. كل actor يرى الحالة حسب صلاحياته. QR لا يحتوي PHI ويُبطل بعد expiry. كل الفشل قابل للretry أو الرجوع دون duplicate.

## Quality وRelease gates

لا P0/P1 مفتوح في domain سيُطلق، لا `@ts-nocheck` جديد، لا test process غير صفري، ولا `--forceExit` لإخفاء المشكلة. لا يوجد staging مفترض؛ الإطلاق prod-only لكنه لا يتم تلقائيًا. يلزم قرار مستقل بعد Sandbox acceptance، backup وrollback وmigration dry-run وon-call وdashboards وlive smoke.

## موجات التنفيذ

A = Phase 0 و1، B = Phase 2 وPharmacy، C = Diagnostics وHome-care، D = Mobile truth/privacy وWeb parity، E = quality/dependencies/CI، F = Sandbox acceptance وrelease decision. لا وعد زمني ثابت قبل معرفة الفريق وقرارات المنتج وPSP والتأمين.

## ملفات الدليل المطلوبة

`NABD_Forensic_Audit_Main_22526.md`، `NABD_Patient_Web_vs_Mobile_Deep_Parity_Audit.md`، `verified_findings_register.md`، `24_patient_web_mobile_parity_findings.md`، `29_mobile_quality_findings.md`، `32_manual_patient_web_mobile_parity_matrix.md`، `31_local_verification_summary.md`، `21_patient_surface_catalog.tsv`، `23_web_mutation_markers.tsv`، و`25_mobile_action_flows.tsv`.

## قائمة المالك قبل التنفيذ

اعتماد الدفع لكل مجال، provider أم queue، recurrence/visit count/transport/pricing، التأمين، مالكي contract/API وmobile وweb وsecurity، جعل Phase 1 مانعة، تجهيز Sandbox/fake PSP/Mongo/Redis مؤقتة، واعتماد عدم النشر التلقائي.
