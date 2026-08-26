# نطاق تدقيق Patient Web اليدوي: CTA → Contract — 2026-08-26

**الحالة:** تحضير نطاق فقط. لا يوجد في هذا الملف claim بأن Patient Web يطابق Mobile أو أن أي رحلة متاحة أو مؤمنة أو جاهزة للإنتاج. لا تعديل product source، ولا build/runtime/live API test، ولا merge/deploy في هذه المرحلة.

> لا يبدأ إغلاق parity من تشابه اسم route أو وجود صفحة. يبدأ من CTA ظاهر أو state مُمَكّن، ويتتبع أثره إلى contract وactor/ownership وstate transition وauthority للبيانات والنتيجة. إذا لم تكن الأدلة كافية، تكون النتيجة `INSUFFICIENT_EVIDENCE` لا "مكتمل".

## 1. baseline القابل للتكرار

| عنصر | القيمة |
|---|---|
| Source root المقروء | `audit-work/source/nabd-patient-web` |
| Git branch | `agent/audit-main-contract-inventory` |
| Git HEAD | `1321902fd29dc05b1ef0454cd528ba8952a8fc81` |
| حالة source worktree | نظيفة لحظة الالتقاط |
| localized UI page files | 55 ملف `app/[locale]/**/page.tsx` |
| BFF/API route handlers | 13 ملف `app/api/**/route.ts` |
| SHA-256 لقائمة/محتوى `page.tsx` و`route.ts` | `a77e29b83838c586b0c8a90a738adc481ec7928fdac8cd7a9ddae7c7d7e5bce6` |
| Mobile reference inventory | 246/246 route/screen candidate تم توثيقها يدويًا، لا باعتبارها مواصفة تصميم صحيحة بذاتها.[1] |

الفرق بين baseline أقدم (60 Web pages) وsnapshot الحالي (55 localized `page.tsx`) لا يصنف نقصًا أو تحسنًا من تلقاء نفسه. يجب تفسيره route-by-route بعد التحقق من تغيير snapshot، aliases، ودمج screens/states؛ لا يجوز تحويل العدّ إلى parity claim.[2]

## 2. الوحدات المستقلة التي لا يجوز خلطها

| Stream | مهمة التدقيق | ما لا يثبت وحده |
|---|---|---|
| Patient Mobile | مرجع surfaces وعيوب journey المصدرية، وليس implementation مرجعيًا للنسخ | صحة العقود أو readiness أو UX/Web parity. |
| Patient Web | كل page/CTA/state/BFF contract يدويًا | أن وجود صفحة أو BFF route يساوي تنفيذ رحلة. |
| Backend/Data | controller/service/DTO/schema/state/authorization/authority/ledger | أن استدعاء frontend أو OpenAPI قديم يثبت runtime. |
| Provider | workflow accept/reject/fulfill/report/offer per role | أن source-read 45/45 يثبت reconciliation أو readiness. |
| Admin | governance/exception/operations/audit workflow منفصل | أن patient UI يكفي لإثبات operator actions. |

## 3. قاعدة عدم توريث أخطاء Mobile

الـWeb المقصود ليس "نسخة 1:1 من كل سطر في Mobile". يحافظ على **هدف المريض المشروع** ويفتح surface/UX ويب مناسبًا، لكنه لا ينسخ defect أو static/fabricated/local-only outcome. تنطبق هذه القاعدة خصوصًا على guest fallback، client-side price/availability/insurance filtering، fake/local payment/wallet/refund success، بطاقة خام، حقول policy/benefit غير authoritative، screen-based role gating، AI/clinical claims، ومطالبات service directory الثابتة.[1]

| Mobile finding family | تصرف Web audit الصحيح |
|---|---|
| Price/stock/provider/insurance من client state | تطلب authority backend/Data أو تصنف `MISSING_CAPABILITY`/`BLOCKED_BY_BACKEND_CONTRACT`. |
| Payment/card/wallet/refund success محلي | تمنع happy state وتبحث عن intent/webhook/ledger/idempotency/receipt state. |
| Guest fallback بعد authentication error | تمنع silent downgrade وتدقق session/unauth branch وPHI leakage. |
| Surface AI/emergency/clinical | تدقق disclaimer، grounded source، escalation/negative state، وليس جمال الشاشة فقط. |
| Static directory/launcher | لا تعتبره service availability ولا typed booking handoff. |

## 4. وحدة العمل الإلزامية: CTA Contract Row

لا يوجد row صالح إلا إذا كان anchored في **CTA أو action أو automatic state transition** ضمن صفحة Web/Component حقيقي. كل CTA mutation أو disclosure أو claim طبي/مالي عالي الحساسية يستحق row منفصلًا؛ لا يدمج "حجز" أو "دفع" كامل في نص عام.

| حقل row | الإثبات المطلوب | نتيجة الغياب |
|---|---|---|
| Surface/actor | URL Web وpage/component path+line، actor المتوقع | `INSUFFICIENT_EVIDENCE` |
| CTA/action | label/handler exact مع path+line، وشرط enabled/disabled | `INSUFFICIENT_EVIDENCE` |
| Navigation/state | modal/page/optimistic/local/retry/error/empty/unauth next state | `CONFIRMED_DEFECT` إذا تحقق success محلي غير مسنود؛ وإلا `INSUFFICIENT_EVIDENCE` |
| Request/socket | method/path/event وpayload fields من BFF/client | `MISSING_CAPABILITY` إن لم يوجد مسار evidence للرحلة |
| Backend chain | controller → service → DTO/schema → state transition exact path+line | `STATIC_MATCHED_PARTIAL` أو `INSUFFICIENT_EVIDENCE`، لا inference من الاسم |
| Authority | price/stock/provider/slot/insurance/result source path+line | `MISSING_CAPABILITY` أو `RUNTIME_REQUIRED` وفق الأدلة |
| Security | actor/ownership/role/CSRF/session/idempotency paths+lines | `INSUFFICIENT_EVIDENCE` أو defect محدد |
| Financial | intent/webhook/ledger/COD/co-pay/refund paths+lines | `MISSING_CAPABILITY` إن لم يثبت |
| Ops/result | provider/admin action، notification، receipt/report، happy/negative branch | `MISSING_CAPABILITY` أو `INSUFFICIENT_EVIDENCE` |
| Classification | سبب مخصص بهذا row ودليل path/line | row غير صالح إن كان نصًا عامًا متكررًا |

## 5. مسارات الرحلات الحاكمة

### Pharmacy

`cart → submit مع الموقع/الوصفة عند الاقتضاء → broadcast جغرافي → عروض صيدليات تشمل availability/substitution/price/ETA → اختيار عرض محدد → تثبيت العرض`. بعد اختيار العرض، cash/card يتطلبان payment قبل fulfillment؛ وCOD يجب أن يعلن سياسة **collection deferred at delivery** بوضوح. التأمين يتطلب قرار `full/partial/reject/co-pay` من الصيدلية/الدافع ثم دفع حصة المريض أو تحويلًا واعيًا إلى cash/إلغاء. لا يغلق CTA "checkout" إن تخطى offer selection أو authority أو هذا lifecycle.[1]

### Consultation / Lab / Radiology / Home-care / Nursing

`اختيار service/provider/slot → cash/card payment before confirmation`. في التأمين: `request without payment → provider/payer decision → co-pay → patient payment → confirmation`. المراجع يدقق slot hold/expiry، source السعر، owner/role، retry/idempotency، accept/reject، وnotification/result، ولا يستنتجها من route أو screen title.[1]

## 6. ترتيب المراجعة اليدوية

ينظم الترتيب المخاطر وdependencies؛ لا يعدّ الصفوف دليلاً على parity.

| Wave | نطاق Web أولي | سبب الأولوية | مخرجات الدليل |
|---|---|---|---|
| W1 | login، OTP، session، profile، family، settings، privacy | session/PHI boundary تمنع صحة باقي الرحلات | auth/ownership/consent/session BFF rows والحالات السلبية. |
| W2 | medicines، cart، checkout، orders، order detail/tracking، prescriptions | offer/payment/insurance/fulfillment أعلى أثر مالي وتشغيلي | pharmacy contract rows من cart حتى offer/pay/COD/insurance/receipt. |
| W3 | consultations، appointments، call-token، diagnostics/labs/radiology، home-care | booking/slot/pay/co-pay/provider state | unified booking rows مع backend/provider/admin handoff. |
| W4 | insurance، wallet، health/reports/vitals، notifications/reminders | PHI/financial authority and disclosure | read/mutation authority، data export/retention/error cases. |
| W5 | AI, mental health, articles, search, maps, community | clinical content/safety, SEO/deep-link and public claims | grounding/disclosure/escalation/publication rows. |
| W6 | visual/RTL/a11y/responsive/SEO cross-cutting | لا ينوب عن contract correctness | evidence منفصل؛ لا يرفع contract status. |

## 7. قواعد الحالة والإغلاق

| Status | المعنى |
|---|---|
| `NOT_REVIEWED` | لم تبدأ القراءة اليدوية. |
| `MANUAL_REVIEW_IN_PROGRESS` | بدأ source path/CTA mapping لكنه لا يملك evidence كاملًا بعد. |
| `STATIC_MATCHED_PARTIAL` | path/CTA وchain جزئية ظاهرة، لكن لا يكفي العقد/authority/role/financial lifecycle. |
| `CONFIRMED_DEFECT` | تناقض أو outcome أو gap يمكن إثباته من source lines. |
| `MISSING_CAPABILITY` | لا يظهر implementation لازم للرحلة مع evidence غياب خاص بالCTA. |
| `RUNTIME_REQUIRED` | لا يستطيع source-only إثبات behavior المطلوب. |
| `INSUFFICIENT_EVIDENCE` | لا توجد anchors كافية؛ ليست كلمة مرادفة لـdefect. |
| `NATIVE_ONLY_WITH_WEB_ALTERNATIVE` | استثناء محدود وموثق: هدف المريض محفوظ ببديل Web محدد، لا مجرد claim. |

لا تستخدم `MATCHED` أو `COMPLETE` أو `PRODUCTION_READY` في parity register إلا بعد اكتمال row evidence وبوابة backend/runtime الملائمة. ولا يوصف static listing أو BFF proxy أو UI happy path كإثبات رحلة.

## 8. ضوابط العمل

يبقى العمل read-only/artifacts-only. لا تُشغَّل tests/build/runtime/live API أو migration/deploy/merge ضمن هذا المسار حتى يصدر إذن صريح لاحق وتُحسم العقود. لا تُدخل بيانات حقيقية أو credentials أو PHI إلى artifacts. ولا يستبدل keyword ranking أو inventory count أو route-name matching تدقيق CTA إلى contract.

## References

[1]: ./PATIENT_MOBILE_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md "Mobile source-review consolidation and journey blockers"
[2]: ./PATIENT_WEB_PARITY_BASELINE_GAP_REPORT_2026-08-26.md "Patient Web ↔ Patient Mobile baseline parity gap report"
[3]: ./PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv "Existing parity register — all rows require manual mapping"
