# الخطة الرئيسية للوصول إلى جاهزية إنتاج حقيقية — نبض

## 1. الحكم الحالي وطريقة العمل

**الحكم الحالي: NO-GO.** لا يوجد في الأدلة الحالية ما يسمح بادعاء جاهزية إنتاجية، أو اكتمال رحلة، أو تشغيل دفع، أو merge إلى `main`، أو نشر. سجل Phase 0B يضم 80 root controls مطبّعة من 4,243 observation؛ 39 منها `SECURITY_RELEASE_BLOCKER`، و36 تتطلب قرار منتج، و3 تتطلب تحققًا runtime أو خارجيًا.[1] كما أن 77 row في Phase 0D.1 هي catalog evidence فقط وليست journey reconciliation، والـ40 row الميكانيكية السابقة مستبعدة تاريخيًا.[2] [3]

> **التوصية:** لا يكون المسار «Backend منفصل تمامًا» ولا «كل واجهة منفصلة تمامًا». الأفضل هو **نموذج هجين**: طبقة تأسيس Backend/Data/Security مشتركة أولًا، ثم شرائح رأسية صغيرة لكل رحلة تعبر Backend → Patient Mobile/Web → Provider → Admin → اختبارات القبول. فصل التطبيقات مطلوب للملكية والتنفيذ، لكن لا يجوز إغلاق تطبيق بينما عقده وstate machine والدفع والتأمين في الخادم غير مثبتة.

## 2. حوكمة البرنامج قبل أي إصلاح

| المرحلة | المالك | المخرج المطلوب | بوابة الانتقال |
|---|---|---|---|
| P0.0 — اعتماد القرار | مالك المنتج + مراجع مستقل | اعتماد عقود الصيدلية والحجوزات والتأمين وقائمة features القانونية | لا توجد سياسة مبهمة للدفع أو COD أو refund أو PHI |
| P0.1 — تثبيت عقود الخادم | Backend + Security | OpenAPI/DTO/state-machine لكل mutation، ownership matrix، error taxonomy | review مستقل للعقد قبل UI |
| P0.2 — خط أساس الجودة | Platform + QA | CI gates، secret scan، SBOM، migrations/backup/rollback، sandbox isolation | الأخضر لا يعني production؛ لكنه يمنع regressions |
| P0.3 — تسليم slice | ملاك الأسطح | commit صغير، contract tests، owner/stranger/unauth، replay/concurrency، evidence | remote head مطابق وreview accepted |

لا يعتمد أي فريق على mock success أو placeholder أو UI state كبديل عن server state. أي route أو mutation بلا عقد منشور ومثبت يبقى feature-flagged وfail-closed أو hidden بصدق، ولا يسلك مسار نجاح مزيف.

## 3. برنامج Backend وData — الأولوية الأولى المشتركة

### B1. الهوية والجلسة والملكية

| العمل | المطلوب | معيار الإغلاق |
|---|---|---|
| Session/OTP | HTTP-only secure cookies، rotation/revocation، OTP single-use وTTL، rate limiting/device/risk controls | unauth=401، wrong-role=403 أو 404 policy، لا token في body/URL/local storage |
| Authorization | policy layer واحدة لكل patient/provider/admin/resource، owner/stranger tests وBOLA regression suite | لا controller أو service يعتمد entity ID من العميل بلا scope/owner query |
| Consent/Delegation | family permissions، caregiver access، PHI scope، emergency override، expiry/audit | consent قابل للإثبات والتراجع والـaudit، لا inherited access صامت |
| Audit/forensics | immutable actor/action/resource/outcome/correlation logs، redaction، retention | كل financial/clinical/admin transition قابلة للمراجعة بلا كشف أسرار/PHI |

هذه الأعمال تستجيب لworkstream `platform/identity/audit` ولضوابط privacy/authorization وruntime/operations الموجودة في root backlog.[1]

### B2. Data model وstate machines

ينبغي تعريف state machine خادمية ومقيدة لكل order، offer، appointment، lab/radiology booking، nursing visit، insurance authorization، payment intent، refund، delivery، prescription، chat escalation. كل transition يحمل actor، preconditions، idempotency key، version/CAS أو transaction/saga، event/outbox، وcompensation policy.

| control | قاعدة إلزامية |
|---|---|
| price/stock/availability | server-authoritative snapshot؛ لا total أو stock أو ETA نهائي من العميل |
| concurrency | unique constraints وoptimistic locking أو transaction موزع/سaga؛ فحص replay وrace |
| ledger | immutable double-entry أو ledger متوازن، payment/refund/reference immutable، webhook deduplication |
| data migration | versioned migration، preflight، backup/restoration drill، validation وrollback |
| PHI/PII | minimization، field-level access، encryption/secret management، retention/deletion/export policy |

### B3. الصيدلية والعروض والتسوية

تنفذ فقط بعد اعتماد العقد المفصل في `NABD_CANONICAL_JOURNEY_AND_PAYMENT_CONTRACTS_2026-08-25.md`.[4] لا يوجد checkout مباشر إلى صيدلية قبل broadcast والعروض. يجب فصل `Request` عن `Offer` عن `SelectedOffer` عن `Payment/InsuranceDecision` عن `Fulfillment` في schema وAPI وUI، وتطبيق one-selected-offer atomic lock وoffer expiry وoffer snapshot.

### B4. الحجوزات والتشخيص والرعاية المنزلية

ينفذ booking-core موحدًا للـconsultation/labs/radiology/home-care، مع adapters domain-specific. slot lock محدود TTL، provider eligibility، insurance request/decision/co-pay، no-show/cancel/refund policy، result/report access، وoutbox notifications هي عناصر العقد، وليست تحسينات لاحقة.

### B5. Data platform والأداء

| طبقة | قرارات الإنتاج |
|---|---|
| MongoDB | indexes من workload حقيقي، replica set، backups/PITR، encryption، connection caps، query timeouts، slow-query review |
| Redis | sessions/locks/rate limits/cache فقط مع TTL وeviction policy، لا source of truth للحالة المالية أو السريرية |
| Async | transactional outbox ثم worker idempotent؛ DLQ، retry budget، dead-letter triage، no fire-and-forget financial/clinical events |
| Search/cache | cache invalidation tied to publication/version، bypass on authorization-sensitive reads، stampede protection |
| Media | signed scoped upload/download، malware/content validation، no public predictable PHI URLs |

## 4. خطة Patient Mobile مستقلة

تملك Mobile تجربة المريض، navigation، offline policy، device permissions، secure storage، accessibility، وnative notifications؛ لكنها لا تملك truth المالي أو السريري.

| الحزمة | نطاق التنفيذ بعد عقود Backend | تعريف الإغلاق |
|---|---|---|
| M1 — Auth/onboarding | OTP/social/passkey فقط وفق العقد، session restoration/logout/revocation، deep-link safety | لا token ثابت، error/lockout/retry/RTL/a11y مثبتة |
| M2 — Pharmacy | cart، submit request، offer comparison، selected offer، Cash/Card/COD، insurance co-pay، tracking/cancel/refund | كل screen يرتبط contractًا؛ لا price/coverage وهمي أو direct pharmacy checkout |
| M3 — Consultations | doctor/service/slot، cash payment، insurance decision/co-pay، call token، reschedule/cancel/report | slot race وcall expiry وwrong-role/owner tests |
| M4 — Diagnostics/home-care | service/provider/visit، insurance path، result/report/PHI، visit tracking | results scoped، no pre-confirmation claim، offline behavior صادق |
| M5 — Family/health/prescriptions/chat | consent-aware family، health data، prescriptions، chat/support escalation | delegation/time-expiry/PHI redaction وcrisis safety |
| M6 — Quality | animation لا تخفي failure، reduced motion، AA contrast، Arabic RTL، low-network/low-storage | visual regression + accessibility + real-device matrix |

**حظر مطلق:** لا ينشأ mock patient, fake order, fake offer, fake payment success, fake insurance approval, أو placeholder PHI في مسار مستخدم أو snapshot production. data fixtures معزولة فقط في test namespace وموسومة صراحة.

## 5. خطة Patient Web مستقلة

Web يعالج SSR/SEO العامة، BFF/session safety، routing، browser privacy، والأداء. أسطح patient الحساسة تظل authenticated، ولا تنشر PHI أو cookies أو private APIs في SSR/metadata.

| الحزمة | المطلوب | معيار الإغلاق |
|---|---|---|
| W1 — BFF/session | cookie-only، CSRF/origin controls، request correlation، typed server-side API client، no browser token | SSR/security tests، cache headers منضبطة |
| W2 — Commerce/booking parity | نفس contracts Mobile للـpharmacy/consultation/diagnostics/home-care، بدون route محلي مخترع | screen/CTA → route → contract evidence وnegative states |
| W3 — SEO/public discovery | public catalog فقط بعد publication governance، canonical/robots/sitemap/structured data مطابقة لما يظهر للمستخدم | noindex للأسطح القانونية أو بلا body حقيقي، no PHI/index leakage |
| W4 — UX/accessibility | responsive RTL، keyboard/screen reader، reduced motion، loading/empty/error truthful | performance budgets وa11y automated+human review |
| W5 — browser safety | CSP، dependency hygiene، no secret exposure، upload constraints، open redirect prevention | security headers وSAST/DAST review |

## 6. خطة Provider مستقلة

Provider ليس نسخة من patient. هو سطح عمليات حساس يغير offer، eligibility، coverage decision، booking/visit state، result/report، وinventory. لذلك يطبق least privilege وstep-up audit على كل mutation حساسة.

| الحزمة | المطلوب | معيار الإغلاق |
|---|---|---|
| PR1 — Provider identity/onboarding | KYC/license/facility binding/review state، scoped roles | pending/rejected/expired لا يصلون للعمليات |
| PR2 — Pharmacy operations | broadcast inbox، quote/offers، per-line availability/substitutions/ETA، internal insurance decision، fulfillment | لا offer بلا inventory snapshot؛ لا insurance decision بلا audit/reference |
| PR3 — Doctor/lab/radiology/nursing ops | queue، availability/slot، clinical report lifecycle، visit/field state | transitions role-limited، clinical data minimally exposed |
| PR4 — Insurance and payout | approve/full/partial/reject، co-pay publication، reconciliation، disputes | provider cannot mutate patient balance/ledger directly |
| PR5 — Notifications/chat | bounded message scopes، attachment safety، escalation/status | no cross-provider patient/thread access |

## 7. خطة Admin Dashboard مستقلة

Admin هو سطح governance لا «master bypass». يجب تقسيم roles (support، finance، clinical governance، content/catalog، security، super-admin) واعتماد dual control للعمليات المالية والـPHI والحذف والـpolicy change.

| الحزمة | المطلوب | معيار الإغلاق |
|---|---|---|
| A1 — RBAC/governance | granular roles، JIT elevation، immutable audit، break-glass policy | admin action لا يلتف على owner/clinical/financial policy بلا justification |
| A2 — Catalog/provider moderation | publication/review/source provenance، provider onboarding/review | public availability fail-closed |
| A3 — Operations/disputes | order/booking exception queues، refund/dispute workflow، SLA/escalation | no direct uncontrolled state edit |
| A4 — Financial control | ledger visibility، webhook reconciliation، refund approvals، settlement exports | maker-checker، immutable reference، report reconciliation |
| A5 — Security/observability | user/device/risk flags، audit search، incident containment | redacted data، access audit، alert runbooks |

## 8. ترتيب الشرائح الرأسية بعد طبقة التأسيس

| الترتيب | slice | لماذا الآن | أسطح لازمة |
|---:|---|---|---|
| 1 | Identity + authorization baseline | يمنع BOLA/token/role regressions في كل ما بعده | Backend, Mobile, Web, Provider, Admin |
| 2 | Pharmacy offers + Cash/COD | رحلة معقدة وبها broadcast/offer/settlement | Backend, Mobile, Web, Provider, Admin |
| 3 | Pharmacy insurance/co-pay | يضيف قرار مزوّد وfinancial truth | نفس الأسطح + insurance/payment |
| 4 | Consultation Cash ثم Insurance | يثبت slot/payment/provider decision/call | Backend, Mobile, Web, Provider, Admin |
| 5 | Labs/Radiology Cash ثم Insurance | يضيف reports/PHI وprovider operations | Backend, Mobile, Web, Provider, Admin |
| 6 | Nursing/Home-care Cash ثم Insurance | يضيف visit field workflow/tracking | Backend, Mobile, Web, Provider, Admin |
| 7 | Family/health/prescription/chat/support | consent وPHI وcommunication safety | Backend, Mobile, Web, Provider, Admin |
| 8 | Public catalog/SEO + release operations | لا public claims قبل governance وtruthful content | Backend, Web, Admin |

كل slice يمر بهذا التسلسل: contract pack → backend/data transitions → provider/admin controls → patient mobile/web → owner/stranger/unauth + replay/concurrency → sandbox/runtime verification → accessibility/performance/security → independent review → push/remote-head verification.

## 9. قبول «مكتمل للإنتاج»

لا توجد نسبة 100% صادقة قبل إثبات بنود القبول التالية لكل slice وسطح: contract accepted، migration rehearsed، feature flags and rollback، no mock/placeholder route، real sandbox evidence، payment/insurance lifecycle evidence، fraud/risk checks، SLO/observability، backup/restore evidence، incident/DR exercise، privacy/legal sign-off، load/security/accessibility/device validation، and independent reviewer approval.

## المراجع

[1]: ../phase0b-backend/PHASE0C_NORMALIZATION_REPORT_2026-08-25.md
[2]: ../phase0d/PHASE0D1_EVIDENCE_FIRST_REPORT_2026-08-25.md
[3]: ../phase0d/PHASE0D_JOURNEY_CONTRACT_RECONCILIATION_REJECTED_MECHANICAL_ANCHOR.tsv
[4]: NABD_CANONICAL_JOURNEY_AND_PAYMENT_CONTRACTS_2026-08-25.md
