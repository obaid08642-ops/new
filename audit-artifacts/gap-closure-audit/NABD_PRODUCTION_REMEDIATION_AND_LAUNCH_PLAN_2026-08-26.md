# خطة العلاج والإطلاق الشاملة لمنصة Nabd

**الإصدار:** 2026-08-26

**الحالة الحالية:** `NO-GO`

**نوع الوثيقة:** خطة علاج وإطلاق مبنية على تدقيق مصدر يدوي؛ ليست تصريحًا بتنفيذ التعديلات تلقائيًا، ولا حكمًا بأن كل سلوك تشغيلي أو خلفي قد فُحص بالفعل.

> **الإجابة الصادقة:** لا يجوز الادعاء بأننا «اكتشفنا كل شيء» بالمعنى المطلق. الذي اكتمل هو جرد ومراجعة مصدر يدويان لـPatient Mobile وPatient Web، كل منهما **246/246** مرشحًا. لكن Provider غير reconciled تشغيليًا، وAdmin لم يخضع بعد لمراجعة يدوية مكافئة، كما أن backend/runtime/data/PSP/payer/device/operations لم تثبت بعد. لذلك تسد الخطة أدناه كل الفجوات **المثبتة والمعلنة حاليًا** وتُلزم باكتشاف/إغلاق المجهول قبل أي GO.

## 1. نتائج التدقيق التي تحكم الخطة

| المسار | ما اكتمل | ما لا يثبته الإكمال | حكم الحالة |
|---|---|---|---|
| Patient Mobile | جرد ومراجعة مصدر يدويان 246/246. | العقد الخلفي، ownership، الدفع، التأمين، الأجهزة، التشغيل ونتائج runtime. | `NO-GO` |
| Patient Web | جرد ومراجعة CTA/source يدويان 246/246: 3 عيوب مؤكدة، 1 دليل غير كافٍ، 53 جزئيًا، 189 قدرة مفقودة. | parity الوظيفي، security/runtime، readiness، أو صحة backend/data. | `NO-GO` |
| Provider | قراءة مصدر سابقة 45/45 فقط. | reconciliation إلى backend/runtime، رحلة المزوّد، المال، المخزون، التنفيذ، الصلاحيات. | `NO-GO` |
| Admin | ليس مكتمل المراجعة اليدوية المستقلة. | لا يجوز بناء خطة إصلاح Admin نهائية من افتراضات. | `NOT_YET_MANUALLY_REVIEWED` |
| Backend/Data | لم يخضع reconciliation تعاقدي end-to-end في هذه الموجة. | لا يجوز اعتماد frontend أو API أو state machine كحقيقة تشغيلية. | `REQUIRES_CONTRACT_RECONCILIATION` |

### 1.1 المبادئ غير القابلة للتفاوض

1. **لا نسخ أعمى من Mobile إلى Web.** أي عيب أو outcome محلي/مصطنع في Mobile يجب تصحيحه في المنتجين، لا توريثه.
2. **لا mock أو placeholder أو success مصطنع في مسار الإنتاج.** كل حالة تعرض للمستخدم يجب أن تأتي من contract حقيقي أو تُعرض كحالة محجوبة صادقة.
3. **لا mutation بلا contract pack.** يجب أن يتضمن method/path/payload/DTO/statuses/idempotency/authorization/state transition/negative states.
4. **السعر، التوافر، المخزون، التغطية والتخصيص الطبي قرارات خادمية authoritative.** لا تكون محكومة بفلاتر أو state عميل.
5. **لا GO بموجب count أو build أخضر فقط.** GO يتطلب أدلة security، contracts، runtime، مالية، تشغيلية وسريرية حسب المجال.
6. **التنفيذ يكون بشرائح صغيرة قابلة للرجوع.** كل شريحة: contract → backend/data → provider/admin → Mobile/Web → اختبارات → observability → review → قرار انتقال.

## 2. القرارات والعقود التي يجب اعتمادها قبل البناء

هذه المرحلة ليست تطوير واجهات. إنها تحدد ما يمكن بناؤه بصورة صحيحة، ومن يملك القرار، وكيف يثبت transition.

| Contract pack | مالك القرار | يجب حسمه كتابةً | مخرجات الإغلاق |
|---|---|---|---|
| الحساب والهوية والجلسة | Security + Backend/Data | الحساب/الضيف/التسجيل الاجتماعي، OTP/reset/2FA، refresh/logout/device/session lifecycle، منع fallback silent guest بعد 401/403. | OpenAPI/DTO، cookie/token policy، rate-limit، threat model، owner/stranger/unauth tests. |
| PHI والعائلة والموافقة | Privacy + Clinical + Backend/Data | guardianship، scope وزمن التفويض، مشاركة QR/reports، revoke، export/delete/retention، access audit. | consent schema/versioning، audit model، authorization matrix، revocation tests. |
| الصيدلية والعروض | Pharmacy Ops + Backend/Data + Finance | cart lines، geofence، broadcast audience، stock/substitution/price/ETA، offer expiry، selected-offer lock، COD. | order/offer state machine، socket/API events، price/stock authority، operational runbook. |
| التأمين وco-pay | Payer/Provider Ops + Finance + Backend/Data | full/partial/reject/co-pay، reason codes، policy freshness، patient choice، alternative/cancel، confirmation gate. | payer-decision contract، calculation/version model، notification and audit schema. |
| الحجز الموحد | Provider Ops + Backend/Data | service/provider/slot authority، hold/expiry/timezone، cash before confirmation، approval/co-pay/payment/confirmation، cancel/reschedule. | booking state machine، lock/idempotency policy، provider/admin actions، result events. |
| المدفوعات والدفتر المالي | Finance + Backend/Data + PSP | intent/authorization/capture/fail/reversal/refund، webhook verification/replay، receipts، disputes، COD reconciliation. | PSP boundary، immutable/double-entry ledger، reconciliation jobs، incident runbook. |
| الفيديو والاتصال | Backend/Data + Security + Clinical | booking entitlement، scoped one-time token، room isolation، device permissions، recording/retention، leave/end. | call-token/room contract، audit events، device matrix، incident escalation. |
| AI والمحتوى السريري والطوارئ | Clinical Safety + Legal/Privacy + Backend/Data | use cases، citations/grounding، risk tiers، uncertainty/refusal، human handoff، emergency SOP. | content governance، evaluation set، escalation protocol، monitoring and approval records. |

## 3. تعريف الرحلات الصحيحة التي يجب أن يلتزم بها كل منتج

### 3.1 الصيدلية

```text
Cart → submit (location + prescription when required) → geo broadcast
→ pharmacy offers (availability, substitutions, quoted price, ETA)
→ patient selects one offer → selected-offer lock
→ cash/card payment OR explicit COD-collection-deferred policy
→ fulfillment → tracking → completion / issue / return / refund
```

في التأمين، يبقى الاختيار للصيدلية أولًا، ثم قرار الصيدلية/الدافع: `full | partial | reject | co-pay`. بعد وصول القرار، يدفع المريض حصته إن وجدت أو يختار cash/إلغاء بصورة واعية؛ ثم يبدأ fulfillment فقط بعد transition الصحيح.

### 3.2 الاستشارة، التحاليل، الأشعة، الرعاية/التمريض المنزلي

```text
select service → select authoritative provider and slot → hold with expiry
→ cash/card payment before confirmation
→ confirmed booking → provider delivery → result/completion → support/dispute
```

في التأمين:

```text
select service/provider/slot → insurance request without payment
→ provider/payer decision → patient sees co-pay/reason/alternatives
→ patient pays co-pay if accepted → confirmation
```

لا يجوز إظهار confirmation قبل الدفع النقدي/البطاقي أو قبل قرار التأمين ودفع co-pay، ولا يجوز أن تكون الأسعار أو slots أو provider acceptance قرارًا محليًا في العميل.

## 4. خارطة التنفيذ المرحلية

### المرحلة 0 — حوكمة الإصلاح ووقف الأخطاء الخطرة

**الهدف:** منع أي توسع في feature ناقصة أو وهمية، وتجهيز قرارات العقود ومُلّاكها.

| العمل | المسار | بوابة الإغلاق |
|---|---|---|
| تجميد outcomes الوهمية/local-success في المال والحجز والتأمين والطوارئ. | Mobile + Web | لا يظهر success إلا من server transition موثق؛ surfaces غير الجاهزة تعرض blocked state صادقة. |
| إنشاء Architecture Decision Records للعقود أعلاه. | Shared Backend/Data | ADR موافق عليه لكل journey؛ owner ومسؤول تصعيد واضحان. |
| بناء contract register CTA→backend→provider/admin→result. | Shared | لا صف عام أو keyword anchor؛ كل صف يتضمن negative states/authorization/authority/payment. |
| إدارة الأسرار وبيئات العمل. | Platform/Security | لا secrets في العميل أو repo؛ rotation، least privilege، separated sandbox/staging/prod بحسب قرار المالك. |
| تعريف definition of done موحد. | جميع الفرق | لا merge لرحلة دون contracts/tests/observability/accessibility/RTL/error states/docs. |

### المرحلة 1 — أساس Backend/Data والأمن

**الهدف:** جعل المنصة قابلة للبناء بأمان بدل ترقيع شاشات منفصلة.

| نطاق التنفيذ | المتطلبات الأساسية |
|---|---|
| Authorization | `owner / stranger / unauth` لكل resource وmutation؛ RBAC/ABAC، provider tenant boundary، admin privilege segmentation، family delegation expiry/revocation. |
| Sessions | OTP/signup/login/reset/2FA، device/session list/revoke، refresh rotation، logout server-side، anti-bruteforce، audit events؛ بلا silent guest fallback. |
| Data governance | PHI classification، field minimization، encryption in transit/at rest، audit logs، retention/deletion/export، consent receipts، redaction in logs/support/analytics. |
| API discipline | OpenAPI generated from source، schema validation، error envelope، cursor pagination، idempotency keys، optimistic concurrency/ETags where needed، API version and deprecation policy. |
| Async architecture | Outbox/event model، retries/DLQ، idempotent consumers، notification delivery states، cache invalidation/freshness، rate limits and abuse controls. |
| Financial core | PSP tokenization only، verified webhook, immutable ledger, reconciliation, refund/reversal/dispute states, COD reconciliation and receipts. |

### المرحلة 2 — شريحة الصيدلية كاملة أولًا

**الهدف:** إثبات أكثر رحلة مالية/تشغيلية تعقيدًا end-to-end قبل توسيع الكتالوج.

1. بناء catalog وmedicine/Rx source-of-truth مع freshness وavailability provenance.
2. بناء cart server-side وvalidation للكمية والوصفة والعنوان.
3. بناء geo broadcast وعروض الصيدليات مع stock/substitution/price/ETA وexpiry.
4. بناء selected-offer lock ومنع race/resubmission/repricing الخفي.
5. إضافة card/cash/COD وفق policy موثقة، ثم insurance decision/co-pay lifecycle.
6. بناء provider pharmacy console: receive → offer → substitution → prepare → dispatch → complete/issue.
7. بناء patient tracking، support، return/refund/dispute من ledger الحقيقي.
8. توحيد Mobile وWeb على نفس contracts وحذف manual-order/fake success paths.

**بوابة المرحلة:** اختبارات lifecycle كاملة، stock race، expiry، duplicate mutation، webhook replay، owner/stranger، provider tenant boundary، COD وco-pay وrefund reconciliation، ثم اختبار runtime واقعي على Mobile/Web/provider.

### المرحلة 3 — الحجز الموحد والخدمات الطبية

**الهدف:** بناء عقد واحد قابل للتخصيص لخدمات consultation/lab/radiology/home-care/nursing، لا شاشات متفرقة.

| بناء مشترك | تطبيقات الخدمة |
|---|---|
| authoritative catalog/provider/slot، quote، hold/expiry، payment/insurance decision، confirmation، cancellation/reschedule، notifications، audit. | Consultation: call-token/room/post-call; Labs/Radiology: home visit, prep, reports; Home-care/Nursing: address, caregiver assignment, visit tracking, completion evidence. |

يجب أن يملك Provider workflow واضحًا: قبول/رفض/طلب معلومة/قرار تأمين/تحديد co-pay/تقديم الخدمة/رفع نتيجة أو completion. ويجب أن تملك Admin عمليات الاستثناء، dispute، audit، SLA، intervention، لا مجرد dashboard للعرض.

### المرحلة 4 — هوية المستخدم وPHI والعائلة والملف الصحي

**الهدف:** إغلاق أعمق مخاطر الخصوصية قبل التوسع في features الصحية.

- إعادة بناء onboarding وregistration/social/guest policy من عقد واحد؛ guest ليس بديلًا صامتًا لجلسة فشلت.
- profile/address/insurance/family controls حقيقية، لا summaries فقط.
- family membership/invite/accept/permission scope/expiry/revoke/audit.
- PHI reports/prescriptions/vitals/chronic conditions/reminders مع read/edit boundary صريحة وclinical provenance.
- export/delete/retention/consent workflows وsupport tooling يتجنب كشف PHI.

### المرحلة 5 — المال والولاء والمرتجعات

**الهدف:** عدم إطلاق أي قيمة مالية بلا ledger وعمليات دعم وإقفال.

- wallet/cards/top-up/transfers/transactions فقط بعد ledger immutable وlimits/AML/fraud policy اللازمة.
- loyalty points/rewards/referrals تحدد eligibility، anti-abuse، expiry، reversal، accounting owner.
- returns/refunds تربط eligibility بالمخزون/order/payment provider والدفتر والإشعارات.
- payment outcomes لا تكون صفحات ثابتة؛ تعرض transaction state المعتمد وإعادة المحاولة والدعم والreceipt.

### المرحلة 6 — الأمان السريري، AI، الطوارئ والمحتوى

**الهدف:** منع أن تتحول واجهة صحية جذابة إلى مخاطر سريرية أو قانونية.

- AI: approved knowledge, citations/grounding، versioned prompts، PII policy، risk classifiers، refusal/handoff، human review، offline evaluation، drift/incident monitoring.
- emergency: لا SOS أو tracking أو dispatch قبل SOP محلي، consent/location policy، responder integration، acknowledgement/failure modes، human escalation واختبارات حرجة.
- mental health/maternity/nutrition/health scores: clinical owners، sources، disclaimers ليست بديلًا عن safety، age/locale restrictions، crisis escalation.
- articles/community/reviews: editorial workflow، medical review، moderation/abuse/reporting، public-link lifecycle، SEO only for approved truthful content.

### المرحلة 7 — Patient Mobile وPatient Web كمنتجين متكافئين وظيفيًا

**الهدف:** parity صحيحة على مستوى journey وليس تطابق عدد الشاشات.

1. بناء **parity matrix** جديد بعد كل contract pack، يربط CTA إلى contract/state/authorization وليس إلى اسم route فقط.
2. تنفيذ كل journey في Mobile وWeb من contract مشترك مع تصميم native مناسب لكل منصة.
3. حذف/fix مسارات Mobile التي تعتمد local state، hardcoded outcomes، raw card input، fake policy/benefit، أو navigation-only authorization.
4. تنفيذ surfaces Web المفقودة فقط بعد أن تكون الرحلة الأساسية صحيحة، وليس لإكمال عدّ 246 واجهة.
5. توحيد RTL، الترجمة، accessibility، error/empty/loading/retry/offline states، design tokens وreduced motion.

### المرحلة 8 — Provider stream المستقل

**شرط البدء:** تدقيق يدوي evidence-first لكل route/CTA/scenario في Provider، ثم contract reconciliation مع Backend/Data؛ لا يعتمد على قراءة 45/45 السابقة وحدها.

يشمل التنفيذ بعد التدقيق: onboarding/KYC والتراخيص، tenant/branch/staff roles، inventory/catalog، offers، slots، insurance decisions، fulfillment، clinical results، visit/call workflow، payouts/settlement، disputes، notifications، audit، support وSLA.

### المرحلة 9 — Admin stream المستقل

**شرط البدء:** جرد/تدقيق يدوي مستقل كامل. لا تُبنى لوحة "مثل Amazon" من افتراضات UI.

يشمل التنفيذ بعد التدقيق: tenant governance، provider approvals، user/role controls، catalog/price policy، payer exceptions، financial reconciliation/refunds، content/moderation، clinical incident controls، customer support، fraud/risk، audit search، data export/deletion requests، dashboards مبنية على data lineage وسلطات واضحة.

### المرحلة 10 — الأداء، الاعتمادية، الأمن التشغيلي وقابلية التوسع

| المجال | متطلبات الإغلاق |
|---|---|
| Performance | budgets للـAPI وWeb/Mobile، caching صحيح مع invalidation، pagination، DB indexes/query plans، queue backpressure، load/soak tests وفق SLO متفق عليه. |
| Reliability | health checks، graceful degradation، retry policy لا تكرر mutations، idempotency، backups/restore drills، RPO/RTO، disaster runbooks. |
| Observability | structured logs بلا PHI، traces عبر request/event/payment، metrics/SLOs، alerting، audit correlation IDs، product funnel غير حساس. |
| Security | threat modeling، SAST/DAST/dependency/container/secrets scanning، pen test مستقل، CSP/CSRF/SSRF/file-upload defenses، WAF/rate limits، access review. |
| UX/accessibility | keyboard/screen reader، WCAG AA، focus/error semantics، RTL/languages، low bandwidth/offline، reduced motion، device/browser matrix. |
| SEO/AI discovery | لا indexing لمحتوى PHI أو غير موثق؛ sitemap/canonical/robots/structured data تطابق UI الحقيقي، 404/410 lifecycle، moderation/publication workflow. |

### المرحلة 11 — الإطلاق المتدرج والقبول النهائي

1. بيانات seed/sandbox مصنفة بوضوح، ولا بيانات وهمية داخل الإنتاج.
2. migration rehearsals مع backup/restore/rollback وخطة تواصل.
3. feature flags مع kill switch وaudit؛ لا تفتح feature بلا contract أو monitoring.
4. pilot محدود لخدمات محددة ومزوّدين مع support on-call وقياس real user outcomes.
5. توسع تدريجي only after SLO/security/financial/clinical gates تبقى خضراء مدة متفق عليها.

## 5. بوابات الجودة التي تمنع إعلانًا زائفًا

| بوابة | دليل مطلوب قبل المرور |
|---|---|
| Contract complete | OpenAPI/DTO/controller/service/schema/state-machine متطابقة؛ method/path حي أو runtime sandbox مثبت. |
| Authorization complete | owner/stranger/unauth/role/tenant/family delegation tests لكل read/mutation/socket. |
| Financial complete | PSP sandbox + signed webhook + duplicate/replay + ledger reconciliation + refund/COD/co-pay/receipt tests. |
| Clinical complete | owner طبي/سياسة محتوى/triage/escalation/adverse cases/monitoring; لا claims غير قابلة للإثبات. |
| Privacy complete | consent/audit/revoke/export/delete/retention وPHI leakage tests في logs/analytics/support. |
| Product complete | happy + negative + recovery + offline + concurrent + accessibility + RTL لكل journey. |
| Operational complete | alerts/SLO/runbooks/on-call/support/dispute/provider/admin flows وrestore drill. |
| Launch complete | independent security review وقرار product/clinical/finance/ops مكتوب، ثم pilot metrics دون مخالفات حرجة. |

## 6. تعريف صريح لـ"صفر بيانات وهمية"

لا يعني ذلك أن sandbox أو fixtures ممنوعة؛ بل يعني الآتي:

- لا تظهر بيانات اختبار أو ثابتة أو placeholders للمريض أو المزود كأنها حقيقة تشغيلية.
- لا نجاح دفع أو حجز أو موافقة تأمين أو نتيجة طبية أو عرض صيدلية بلا state خادمي موثق.
- fixtures مسموحة فقط في test/sandbox، موسومة ومفصولة، ولا تدخل bundle/DB الإنتاجية.
- catalog/content/price/stock/result/benefit/ETA/availability لها authoritative source، freshness policy، owner، audit وfallback صادق.
- كل empty/error/blocked state يشرح الواقع ولا يحاكي اكتمال عملية غير موجودة.

## 7. معايير GO النهائية

لا يصبح المشروع "جاهزًا للنشر" إلا إذا حققت **كل** ما يلي، وليس بعضها:

1. اكتمل تدقيق Provider وAdmin وBackend/Data بنفس أو أعلى مستوى الأدلة.
2. أُقرت العقود والـstate machines والـdata ownership لكل journey قبل التنفيذ.
3. أُغلقت كل الثغرات الحرجة والعالية بعد اختبار مستقل، مع عدم وجود mock/fake production outcomes.
4. اكتملت بوابات security/privacy/financial/clinical/runtime/ops المذكورة أعلاه بأدلة قابلة للمراجعة.
5. نجح pilot محدود ومراقب، وتأكدت reconciliation المالية والتشغيلية، وأُغلق أي incident أو regression حرج.
6. صدر قرار GO مكتوب من ملاك Product وSecurity وClinical وFinance وOperations، وليس من فريق واجهات فقط.

## المراجع الداخلية

[1]: `PATIENT_MOBILE_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md` — خلاصة Mobile source review وقيودها.

[2]: `PATIENT_WEB_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md` — خلاصة Web source review وقيودها.

[3]: `PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv` — سجل الأدلة والمطابقة اليدوية على مستوى CTA/source.

[4]: `patient-mobile-manual-evidence/` و`patient-web-manual-evidence/` — أدلة row-level القابلة للمراجعة.
