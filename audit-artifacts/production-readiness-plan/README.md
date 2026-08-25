# حزمة خطة الجاهزية الإنتاجية

## النطاق

هذه الحزمة تنظم نتائج التدقيق السابقة إلى خطة اعتماد قبل أي إصلاح. لا تعدل product source ولا تمنح GO أو approval للبناء أو النشر.

## الملفات

| الملف | الغرض |
|---|---|
| `AUDIT_EVIDENCE_INVENTORY_2026-08-25.tsv` | جرد commits وartifacts ذات الإشارات المرتبطة بالأمن والدفع والـruntime والبيانات والأداء |
| `PRODUCTION_PLAN_EVIDENCE_CLASSIFICATION_2026-08-25.tsv` | فصل 80 root controls المطَبّعة عن 62 static defects التي تتطلب reconfirmation، و77 catalog-only row، و40 historical mechanical row مستبعدة |
| `NABD_CANONICAL_JOURNEY_AND_PAYMENT_CONTRACTS_2026-08-25.md` | العقود المقترحة للصيدلية، Cash/COD/Insurance، والاستشارات/التشخيص/الرعاية المنزلية |
| `NABD_PRODUCTION_READINESS_MASTER_PLAN_2026-08-25.md` | خطة Backend/Data وPatient Mobile/Web وProvider وAdmin والشرائح الرأسية |
| `NABD_PRODUCTION_GATES_SECURITY_PERFORMANCE_TESTING_2026-08-25.md` | بوابات الأمن والأداء والاختبار والتشغيل قبل الإنتاج |
| `SURFACE_SCREEN_ROUTE_CANDIDATES_2026-08-25.tsv` | جرد source-derived لمرشحي screen/route، ولا يثبت parity أو عدد شاشات مرئي نهائي |
| `SURFACE_MOCK_PLACEHOLDER_GAP_CANDIDATES_2026-08-25.tsv` | مرشحات mock/placeholder/TODO تتطلب disposition يدويًا، وليست defects مؤكدة آليًا |
| `NABD_FOUR_SURFACE_PARITY_AND_THREE_AGENT_PROGRAM_2026-08-25.md` | برنامج الجرد اليدوي الكامل وخطة Agent 1/2/3 مع Backend/Data owner مشترك |

## قرارات مطلوبة من المالك والمراجع قبل التنفيذ

1. اعتماد state machines والسياسات المالية في عقود الرحلات، ولا سيما offer selection وCOD وinsurance/co-pay وcancel/refund.
2. تحديد jurisdictions والمتطلبات القانونية والسريرية والخصوصية والدفع التي ستطبق فعليًا؛ لا تكفي المعايير العامة بدل اعتماد المختصين.
3. تحديد موفر الدفع وscope التكامل وبيئة sandbox وحسابات الاختبار والـwebhook verification المسموحة.
4. تحديد insurance actors ومصدر قرار full/partial/reject ومرجع approval وexpiry وco-pay/COD policy.
5. اعتماد SLOs وcapacity model وRTO/RPO وميزانية الأداء بدل ادعاء قابلية تحمل أرقام مستخدمين بلا load evidence.
6. اعتماد برنامج Screen–Action–Scenario inventory اليدوي وتحديد آلية مقارنة الـ246 Mobile candidate بمكافئات Web قبل أي parity claim.
7. اختيار أول vertical slice مصرح به، بعد مراجعة الـroot controls والـ62 static findings التي تحتاج reconfirmation.

## حدود الأدلة

الـ77 row في Phase 0D.1 مصنفة `CATALOG_ONLY__INSUFFICIENT_EVIDENCE`، وليست defects مؤكدة ولا proof لرحلة مكتملة. الـ40 row الآلية السابقة تاريخية فقط بالحالة `REJECTED_MECHANICAL_ANCHOR`. يظل القرار **NO-GO** حتى تحقق بوابات الخطة وأدلة runtime المستقلة.
