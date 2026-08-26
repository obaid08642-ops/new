# خلاصة تدقيق Patient Mobile على مستوى المصدر — 2026-08-26

**الحالة:** مكتمل على مستوى جرد المصدر فقط، **NO-GO** للإنتاج. هذه الوثيقة ليست برهان جاهزية تشغيلية، ولا reconciliation مع Backend/Data، ولا إثبات parity مع الويب، ولا تفويضًا لتنفيذ remediation.

> **ما أُغلق:** كل المرشحات الـ246 في جرد Patient Mobile أصبحت بحالة `MANUAL_REVIEW_COMPLETE__FINDINGS_OR_CONTRACT_GAPS_RECORDED` بعد مراجعة يدوية وتوثيق المصدر.
> **ما لم يُغلق:** أمن وتشغيل Backend، صحة العقود الحية، ownership الحقيقي، المدفوعات والـledger، التأمين، الفيديو/الأجهزة، الخصوصية، التحمل، اختبار runtime، وموثوقية تجربة المستخدم. لا يجوز استنتاج أي منها من قراءة الواجهة.

## 1. النطاق وطريقة القراءة

يغطي الجرد routes/screens المرشحة في مشروع Mobile فقط. الأدلة موزعة على 38 ملف مراجعة يدوي؛ وتحتوي على 270 معرّف finding مميزًا و164 ظهورًا لتصنيف evidence (`CONFIRMED_DEFECT` أو `STATIC_MATCHED_PARTIAL` أو `RUNTIME_REQUIRED` أو `INSUFFICIENT_EVIDENCE` أو `MISSING_CAPABILITY`). هذه الأرقام **مؤشرات تغطية توثيق** وليست عدد عيوب مستقلًا ولا ترتيب خطورة؛ فقد يصف finding واحد أكثر من محور أو يرد في عدة شاشات.[1]

| عنصر التدقيق | النتيجة | الدلالة الصحيحة |
|---|---:|---|
| صفوف الجرد | 246/246 | تمت مراجعة كل route/screen candidate في TSV يدويًا؛ لا يثبت ذلك صحة التنفيذ. |
| الملفات الدليلية | 38 | أدلة source-path/line التفصيلية موزعة حسب موجة الشاشة/المجال. |
| `CONFIRMED_DEFECT` | 73 ظهورًا | سلوك أو تناقض يمكن إثباته من المصدر المقروء، لا يعني قياس الأثر أو الاستغلال runtime. |
| `STATIC_MATCHED_PARTIAL` | 40 ظهورًا | توجد صلة مصدرية جزئية، لكن العقد أو الحماية أو lifecycle لا يزال غير مثبت. |
| `MISSING_CAPABILITY` | 21 ظهورًا | قدرة لازمة للرحلة لا يظهر لها implementation صالح في النطاق المقروء. |
| `RUNTIME_REQUIRED` | 11 ظهورًا | يلزم backend/device/network أو اختبار تشغيل لتأكيد الحكم. |
| `INSUFFICIENT_EVIDENCE` | 19 ظهورًا | لا توجد أدلة مصدرية كافية لادعاء عقد أو عيب محدد. |

## 2. الحكم التنفيذي

يظل Patient Mobile **NO-GO** لأن الشاشات والـCTA لا تثبت، وحدها، سلاسل القرار والملكية والدفع والنتيجة اللازمة للخدمات الصحية. وتظهر الأدلة عيوبًا مؤكدة ومسارات جزئية ومطالبات مُولَّدة/محلية أو ثابتة في مجالات حساسة: الهوية والجلسة، PHI والعائلة، المدفوعات والمحفظة والتأمين، الصيدلية، الحجوزات الطبية، الطوارئ والمحتوى السريري، الذكاء الاصطناعي والأجهزة، والاتصال المرئي.[2] [3]

| القرار | الوضع | السبب |
|---|---|---|
| إعلان production-ready | مرفوض | لا توجد reconciliation أو runtime/security/payment evidence كافية. |
| نسخ Mobile إلى Patient Web | مرفوض | Mobile نفسه يحتوي عيوب journey/state/fake-local outcomes يجب تصحيح منطقها لا توريثها. |
| remediation الآن | خارج النطاق | تعليمات العمل الحالية artifacts-only؛ يلزم قرار عقد ومُلّاك للبيانات أولًا. |
| بدء تدقيق Patient Web | مسموح بعد هذه الخلاصة | تدقيق منفصل يدوي وفق CTA → contract → ownership/state، لا وفق عدّ الشاشات أو keyword matching. |
| إغلاق Provider/Admin | مرفوض | Provider source-read سابق لا يساوي readiness/reconciliation؛ Admin يبقى stream مستقلًا. |

## 3. العيوب وحواجز الرحلات ذات الأولوية

### 3.1 الهوية، الجلسة، الصلاحيات والخصوصية

تشير أدلة Mobile إلى تناقضات في identifiers ومسارات OTP/reset، وتدفقات ضيف أو fallback بعد `401/403` على عميل API، مع حدود دور/صلاحية تبدو navigation-only أو state محليًا في عدة أسطح. كما توجد أسطح PHI/family/share/QR وخصوصية وإقرار قانوني لا يكفي المصدر لإثبات enforcement الخادمي أو الموافقة القابلة للتدقيق.[4] [5]

| حاجز | التصنيف في الأدلة | قرار الإغلاق المطلوب |
|---|---|---|
| هوية المستخدم والجلسة | `CONFIRMED_DEFECT` / `RUNTIME_REQUIRED` | contract موحد للـOTP/session/refresh/logout/reset، وعدم الرجوع الصامت إلى guest عند فشل جلسة مصادق عليها. |
| ownership وRBAC | `STATIC_MATCHED_PARTIAL` / `INSUFFICIENT_EVIDENCE` | enforcement في كل endpoint/socket على مستوى actor/resource، مع owner/stranger/unauth tests. |
| الموافقة والخصوصية | `MISSING_CAPABILITY` / `RUNTIME_REQUIRED` | consent versioning، purpose limitation، access logs، revoke/export/delete flow مع سياسة retention. |
| تفويض العائلة وPHI sharing | `CONFIRMED_DEFECT` / `STATIC_MATCHED_PARTIAL` | نطاق تفويض محدد زمنيًا وخدميًا، consent من المريض، audit trail، وإبطال فوري. |

### 3.2 الصيدلية: الرحلة المطلوبة لا تظهر كسلسلة قابلة للإثبات

المسار الصحيح للصيدلية ليس checkout من catalog ثابت. يلزم **cart → submit مع موقع/وصفة عند الاقتضاء → geo broadcast → عروض صيدليات** لكل عرض توافر/بدائل/سعر/ETA → **اختيار المريض عرضًا محددًا** → تثبيت العرض. في الـcash/card يتم دفع المبلغ بعد اختيار العرض؛ وCOD يجب أن يقرر صراحة أن التحصيل مؤجل عند الاستلام. وفي التأمين، بعد اختيار الصيدلية، تمر الموافقة `full/partial/reject/co-pay` عبر قرار الصيدلية/الدافع، ثم يدفع المريض حصته أو يختار بديلًا واعيًا/إلغاء. الأدلة الحالية توثق catalog/cache وcart/Rx/manual-order UI، لا تثبت هذه السلسلة أو authoritative stock/price/offer/payment state.[6]

| حاجز رحلة الصيدلية | الوضع المصدرِي | دليل الإغلاق المطلوب لاحقًا |
|---|---|---|
| بث الطلب جغرافيًا وعروض المنافسة | `MISSING_CAPABILITY`/`STATIC_MATCHED_PARTIAL` | order state machine، geofence/audience، offer schema، expiry/reservation، socket/event audit. |
| الكمية والبدائل والمخزون والسعر | `CONFIRMED_DEFECT`/`RUNTIME_REQUIRED` | مصدر صيدلية authoritative لكل line-item، substitution consent، quote total وضرائب/رسوم. |
| اختيار عرض محدد | `MISSING_CAPABILITY` | selected-offer lock مع race handling، expiration وإعادة التسعير. |
| cash/card/COD | `STATIC_MATCHED_PARTIAL` | payment intent/authorization/webhook/ledger وCOD collection-deferred policy. |
| التأمين وco-pay | `MISSING_CAPABILITY` | payer/provider decision lifecycle، patient notification، co-pay payment ثم fulfillment أو alternate/cancel. |

### 3.3 الاستشارات، المختبر، الأشعة والرعاية/التمريض المنزلي

القاعدة المطلوبة لهذه الخدمات: **اختيار الخدمة/المزود/slot → cash/card قبل confirmation**. في التأمين: request **بلا دفع** ثم قرار مقدم الخدمة/الدافع ثم إظهار co-pay ثم دفع حصة المريض ثم confirmation. أدلة الاكتشاف والحجز في Mobile تكشف handoffs عامة وفلاتر عميل/slots أو outcomes محلية في مواضع متعددة، ولا تثبت price authority أو hold atomic أو provider/payer decision أو notification/result chain.[7] [8]

| حاجز مشترك | الخطر | دليل الإغلاق المطلوب |
|---|---|---|
| الخدمة/المزود/slot | availability أو السعر يمكن أن يُفهم من UI/client state لا authority | server quote، slot hold atomically، expiry، timezone/cancellation/reschedule. |
| payment before cash confirmation | confirmation قبل نتيجة دفع موثقة أو نجاح ظاهري | intent/authorized/captured/failed/refunded state and ledger reconciliation. |
| insurance before confirmation | عدم فصل approval/co-pay/payment/confirmation | payer decision evidence، provider action، co-pay calculation/version، patient choice. |
| provider action والنتيجة | لا يوجد إثبات وصول/قبول/رفض/إشعار كامل | role-enforced provider workflow، admin exceptions، events/notifications/read receipts. |
| clinical result أو fulfillment | القراءة لا تثبت authoritative report/delivery/service completion | result provenance، signed/audited transition، patient notification and dispute/return support. |

### 3.4 المال، التأمين، العوائد والمحفظة

توثق أدلة payments/wallet/returns استخدام مدخلات/بطاقات أو نتائج نجاح/return محلية أو غير موصولة بإثبات ledger/webhook، بالإضافة إلى وثيقة/benefit تأمين غير موثقة مصدرًا. هذه ليست تفاصيل UI؛ بل تمنع الادعاء بصحة مالية أو تأمينية.[9] [10]

| محور | ما لا يجوز ادعاؤه الآن | ما يلزم لاحقًا |
|---|---|---|
| الدفع | عدم صحة raw card capture أو state نجاح/فشل/استرداد | PSP tokenization، PCI scope review، idempotency، webhook signature/replay defense، ledger. |
| المحفظة | عدم دقة الرصيد/المعاملة/الطلب | double-entry/immutable transactions، available vs pending، reconciliation and disputes. |
| التأمين | عدم صحة policy/benefits/CHI scraping أو approval | source-of-truth payer integration، consent، cache/freshness، reason codes. |
| الإرجاع/الاسترداد | عدم تنفيذ refund حقيقي | eligibility/state machine، PSP reversal/refund، inventory/order adjustments، ledger and notification. |

### 3.5 السلامة السريرية، الطوارئ، AI والمحتوى الصحي

الأدلة تسجل مخاطر في emergency/call/content والادعاءات الطبية/تحسين الصحة المعتمدة على بيانات ثابتة أو AI. لا يكفي وجود disclaimer أو screen لكي تثبت clinical safety، escalation، أو grounding. يجب ألا تقدم الواجهة triage أو emergency direction أو prescription interpretation أو prediction كمعلومة مؤكدة بلا governance ومصادر وإجراءات تصعيد.[11] [12]

| محور | حظر الإطلاق | دليل الإغلاق المطلوب |
|---|---|---|
| الطوارئ والاتصال | لا إثبات dispatch/موقع/acknowledgement/failure handling | emergency SOP، verified location/consent، call escalation، responder state and audit. |
| AI/أعراض/تقارير | لا إثبات citation, grounding, clinical validation أو safeguards | approved knowledge sources، risk tiers، human escalation، refusal/uncertainty UX، evaluation and monitoring. |
| أدوية/وصفة/مسح | لا إثبات drug authority أو pharmacist verification | drug database provenance/freshness، barcode/Rx validation، interaction/contraindication policy. |
| محتوى الصحة النفسية/الأمومة/التغذية | لا يمكن إسناد نصائح شخصية أو نتائج علاجية | clinical review ownership، locale and crisis escalation content، audit/versioning. |

### 3.6 الفيديو، الأجهزة، البحث والروابط العامة

غرفة الفيديو تقرأ token join وتستخدم حالة محلية للتحكم بالوسائط، لكن المصدر لا يثبت entitlement/token expiry/room isolation/audit؛ كما لا يظهر event خادمي صريح للمغادرة/الإنهاء في الدليل المقروء. resolver للروابط العامة يحول نتيجة `/seo/resolve` إلى route أو fallback للبحث؛ ولا يثبت publication/canonical/type-ID integrity. ومسار دليل الخدمات يعلن capabilities وروابط ثابتة، لا catalog واقعيًا.[13]

| محور | الحكم | الإغلاق المطلوب |
|---|---|---|
| video/call | `STATIC_MATCHED_PARTIAL` + `CONFIRMED_DEFECT` | scoped one-time tokens، room/booking ownership، native device tests، leave/end lifecycle، retention/audit. |
| wearables/device data | `RUNTIME_REQUIRED` / `MISSING_CAPABILITY` | OS permissions, data minimization, encrypted storage, revocation, sync conflict/freshness. |
| search/voice | `STATIC_MATCHED_PARTIAL` | query authorization, result provenance, PII redaction and speech consent/failure UX. |
| public deep links/SEO | `STATIC_MATCHED_PARTIAL` | resolver states (published/revoked/not-found), canonical mapping، malicious slug/type tests. |
| services directory | `CONFIRMED_DEFECT` | backend-authoritative availability/capability directory with correct typed handoff. |

## 4. نطاق reconciliation المطلوب قبل أي build

يجب أن تكون وحدة التخطيط التالية **contract row لكل CTA/transition حقيقي**، لا صفًا عامًا لكل surface ولا keyword-anchor. لكل row، يلزم frontend source path/line، CTA، navigation/state، request/socket and payload، backend controller/service/DTO/schema/state transition، actor/ownership enforcement، authority للسعر/stock/provider/insurance، payment/ledger/COD/co-pay، provider/admin action، notification/result، happy وnegative states، وتصنيف خاص بالصف. غياب أي مكوّن يسجل `MISSING_CAPABILITY` أو `INSUFFICIENT_EVIDENCE` مع دليل عدم وجود، لا نصًا مكررًا.

| Slice الأولوية | مالك العقد الأساسي | قرار product لازم قبل التنفيذ |
|---|---|---|
| Pharmacy offer-to-order | Backend/Data + Pharmacy Ops | offer schema/selection lock، COD policy، insurance/co-pay ownership، payment/ledger semantics. |
| Unified booking | Backend/Data + Provider Ops | service/provider/slot authority، hold/pay/approval/confirmation/cancel/reschedule state machine. |
| Auth/PHI/family | Security + Backend/Data | account model، session/guest boundaries، consent/delegation/access audit. |
| Wallet/payments/refunds | Finance + Backend/Data | PSP boundaries، ledger/reconciliation/refund/dispute policy. |
| Emergency/AI/clinical content | Clinical Safety + Backend/Data | clinical owner، escalation SOP، data/citation governance، regional regulatory requirements. |
| Video/devices | Backend/Data + Security + Mobile | token/room/recording/privacy policy، native support matrix and observability. |

## 5. أدنى بوابات إثبات قبل تغيير حالة NO-GO

لا تكفي الاختبارات الخضراء محليًا إذا كانت mocks أو لا تثبت owner/stranger أو lifecycle. بعد اعتماد العقود، يجب تنفيذ بوابات منطقية طبقية قبل إطلاق أي journey.

| طبقة التحقق | الحد الأدنى المطلوب |
|---|---|
| Contract | OpenAPI/DTO/schema versioned؛ method/path/payload/responses/status codes مكتوبة ومطابقة controller، وفحص حي محكوم عند الحاجة. |
| Authorization | `owner 200`، `stranger 404/403` وفق السياسة، `unauth 401`، role boundaries، family delegation expiry/revocation. |
| State machine | transitions شرعية/مرفوضة، race/retry/idempotency، expiry/hold، negative and recovery states. |
| Financial | payment authorization/capture/failure/webhook replay، ledger reconciliation، refund/COD/co-pay and receipts. |
| Privacy/security | threat model، secrets/session review، PII/PHI minimization، audit logs، abuse/rate limits، penetration review. |
| Clinical | content governance، safe failure/escalation، medical review، adverse scenario tests and monitoring. |
| Mobile runtime | physical device/OS permutations، network loss/retry، accessibility/RTL، performance/observability/crash-free metrics. |
| Ops | provider/admin workflows، alerts/SLOs، support/dispute/recovery runbooks، migration/rollback strategy. |

## 6. حدود العمل المنفذ

لم يُعدَّل أي product source ضمن موجة الإغلاق هذه. لم تُشغَّل builds أو runtime tests أو migrations أو deploy أو merge أو عمليات live-data. كل commits المخصصة للإغلاق artifacts-only. والإنهاء العددي للجرد لا يحوّل أي finding إلى إصلاح ولا يمنح حق إعلان جاهزية.

## References

[1]: ./PATIENT_MOBILE_SCREEN_ACTION_SCENARIO_INVENTORY_2026-08-26.tsv "Patient Mobile source inventory — 246/246 manual-review-complete rows"
[2]: ./patient-mobile-manual-evidence/ "Patient Mobile manual evidence corpus"
[3]: ./patient-mobile-manual-evidence/TABS_HOME_HEALTH_CONSULTATIONS_NURSING_PHARMACY_SERVICES_MANUAL_REVIEW_2026-08-26.md "Manual evidence: Home, health, consultations, nursing, pharmacy and services tabs"
[4]: ./patient-mobile-manual-evidence/AUTH_ONBOARDING_SESSION_LEGAL_MANUAL_REVIEW_2026-08-26.md "Manual evidence: authentication and onboarding"
[5]: ./patient-mobile-manual-evidence/HEALTH_PROFILE_PHI_REMINDERS_VITALS_WEARABLES_MANUAL_REVIEW_2026-08-26.md "Manual evidence: health and PHI"
[6]: ./patient-mobile-manual-evidence/TABS_HOME_HEALTH_CONSULTATIONS_NURSING_PHARMACY_SERVICES_MANUAL_REVIEW_2026-08-26.md "Manual evidence: pharmacy tab"
[7]: ./patient-mobile-manual-evidence/TABS_HOME_HEALTH_CONSULTATIONS_NURSING_PHARMACY_SERVICES_MANUAL_REVIEW_2026-08-26.md "Manual evidence: consultations and nursing tabs"
[8]: ./patient-mobile-manual-evidence/DIAGNOSTICS_CORE_BOOKING_INSURANCE_RESULT_MANUAL_REVIEW_2026-08-26.md "Manual evidence: medical programmes"
[9]: ./patient-mobile-manual-evidence/PAYMENT_PROCESSING_AND_SAVED_CARDS_MANUAL_REVIEW_2026-08-26.md "Manual evidence: payment processing and saved cards"
[10]: ./patient-mobile-manual-evidence/RETURNS_REFUNDS_POLICY_ATTACHMENT_MANUAL_REVIEW_2026-08-26.md "Manual evidence: wallet transactions and orders"
[11]: ./patient-mobile-manual-evidence/EMERGENCY_SOS_LOCATION_TRACKING_MANUAL_REVIEW_2026-08-26.md "Manual evidence: emergency surfaces"
[12]: ./patient-mobile-manual-evidence/AI_TRIAGE_OCR_REPORTING_MANUAL_REVIEW_2026-08-26.md "Manual evidence: AI surfaces"
[13]: ./patient-mobile-manual-evidence/FINAL_ROOM_REVIEWS_PUBLIC_LINKS_SERVICE_DIRECTORY_MANUAL_REVIEW_2026-08-26.md "Manual evidence: video room, reviews, public links and service directory"
