# خريطة تنفيذ الرسالة الموحدة — قبل تعديل المصدر

**المرجع:** `pasted_content_6.txt`، مقروء كاملاً مرتين.  
**الفرع الوحيد:** `remediation/provider-production-governed`.  
**خط الأساس:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`.  
**الرأس عند بدء المراجعة:** `864b736ad050d006109f62ad1e00692c75194aa7`.  
**الحكم التشغيلي:** **NO-MERGE / NO-DEPLOY**.

> هذه الخريطة تصف ما سيُنفذ، ولا تدعي أن السطوح الحالية مكتملة أو صالحة للإنتاج.

| الدفعة الإلزامية | جذور المصدر الحالية | الفجوة المثبتة | نتيجة التنفيذ المطلوبة |
|---|---|---|---|
| PR-A — انتهاء وبث | `pharmacy-expiry-command.service.ts`، `pharmacy-broadcast.service.ts`، `pharmacy.schema.ts`، `pharmacy.controllers.ts`، `scripts/migrations/20260827-pharmacy-expiry-indexes.js` | الأمر الحالي يغيّر الجولة فقط ولا يضيف المستلمين الجدد أو notification intents، ويستخدم fallback policy صامتاً؛ `expireStaleBroadcasts` ما زال موجوداً في الخدمة. | سياسة صريحة أو manual review، recipient set ذري، membership/intents فريدة، cursor/lease/outbox، تعطيل sweep، وفهرس وترحيل موثق غير منفذ. |
| PR-B — تأمين | `pharmacy-insurance-decision.service.ts`، `pharmacy-allocation.service.ts`، `pharmacy.controllers.ts`، `pharmacy-offer.service.ts`، مخططات الصيدلية واختباراتها | القرار الآن إداري وليس للصيدلية المختارة، ولا يملك مسار patient reject/cash fallback أو transaction مشتركة للقرار/outbox. | command للصيدلية المختارة مع account/resource relation وoffer/allocation/version، قرار per-item خادمي، رفض legacy، وعقد patient lifecycle لا يترك hold بلا حالة. |
| PR-C — دفع/COD/تسوية | `pharmacy-allocation.service.ts`، payment schemas/webhook roots، `pharmacy.schema.ts`، ledger/outbox migration وtests | قبول `payment_status=paid` أو lookup واسع `booking_id+amount`، لا collection proof لـCOD، ledger بعد delivered بلا transaction أو business key/settlement lifecycle. | payment evidence مقيد بالعرض/الإصدار/snapshot، COD proof منفصل، settlement pending/outbox/reconciliation، وفشل صريح لا catch صامت. |
| PR-D — خصوصية ومؤلف العرض | `pharmacy-broadcast.service.ts`، `pharmacy-offer.service.ts`، `pharmacy.controllers.ts`، `PharmacyDashboard.tsx`، `BlueprintScreens.tsx`، storage/attachment roots | DTO الأساسي حُدّ جزئياً، لكن لا tenant relation أو purpose/attachment API، وحقول dosage/form/generic لا تملك policy موثقة، وحالة TTL/round في الواجهة غير مكتملة. | DTO بغرض لكل حقل، تحقق account/facility/recipient في كل command، مرفق scoped/audited أو surface unavailable، composer خادمي كامل وnegative tests. |
| PR-E — بقية القطاعات | شاشات provider وroutes/backend services للطب والمختبر/الأشعة والتمريض/الإسعاف/onboarding/payout | توجد أسطح مشتركة قد تعرض workflows أو نجاحاً محلياً بينما لا يثبت العقد الحاكم الكامل. | `PROVIDER_SURFACE_COMPLETENESS_MATRIX.md` بأدلة source-level؛ كل surface غير مكتمل يصبح unavailable بسبب صريح، مع remediation cards محددة. |
| PR-F — تكامل | harness/compose/config فقط عند الحاجة | لا توجد بيئة Mongo replica-set/Redis معزولة مصرح بها. | هيكل اختبار معزول لا يُشغّل هنا؛ لا E2E ولا PSP/storage/live claims. |

## قواعد الحوكمة التي ستفحص في كل دفعة

| الطبقة | التحقق الإلزامي |
|---|---|
| الهوية والموارد | role مسموح، provider account approved/active، facility/tenant متطابق إن كان النموذج يدعمه، actor مرتبط بالـbroadcast/offer/allocation نفسه، وpurpose محدد. |
| الحقيقة التجارية | السعر والمخزون والتغطية والـco-pay والدفع والـETA والرسوم من snapshot/policy خادميين فقط، لا من body أو client state. |
| الفشل | لا success toast أو `.catch(() => null)` لأثر حرج. يستخدم الأمر transaction + outbox فريد، أو حالة قابلة للتسوية ومختبرة. |
| الخصوصية | الحد الأدنى فقط؛ لا phone/name/address/raw attachment/raw order ولا precise location أو signed URL بلا تفويض وغرض وسجل تدقيق. |
| الاختبار | negative authorization/ownership/idempotency/state tests محلية فقط؛ E2E/integration الحي مؤجل لبيئة معزولة مصرح بها. |

## لا تنفيذ تشغيلي ضمن الخطة

لن يُشغَّل migration أو expiry caller أو cron أو queue worker أو webhook/PSP حي أو اتصال production. كل التزامات الدفعات ستكون صغيرة، مرتبة، قابلة للمراجعة، ومدفوعة للفرع نفسه فقط بلا force-push أو merge.
