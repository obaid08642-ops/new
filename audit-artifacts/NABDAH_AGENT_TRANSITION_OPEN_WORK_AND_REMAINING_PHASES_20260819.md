# منصة نبض — حزمة انتقال: المشاكل المفتوحة والمراحل المتبقية

**تاريخ التسليم:** 19 أغسطس 2026  
**المستودع الوحيد المسموح:** [`obaid08642-ops/new`](https://github.com/obaid08642-ops/new)  
**فرع التنفيذ والدليل الوحيد:** [`manus/on-live-reconciliation`](https://github.com/obaid08642-ops/new/tree/manus/on-live-reconciliation)  
**آخر رأس معروف قبل اعتماد هذه الحزمة:** `48b978a1d6b8b52162c4076709c8b05a25b7d6bc`  
**حالة الإصدار:** **NO-GO**. لا نشر إنتاجي ولا رفع متاجر ولا تفعيل للعقود الحساسة في هذه الحزمة.

> هذه وثيقة انتقال تنفيذية. وهي تفرق عمداً بين: **إصلاح مصدرى مثبت**، و**عيب مكتشف لم يُحل**، و**ميزة محجوبة fail-closed لحين وجود عقد معتمد**، و**عمل يحتاج موافقة مالك أو مراجع أو بيئة خارجية**. لا يجوز تحويل أي من هذه الفئات إلى PASS بلا الدليل المحدد لكل بند.

## الإجابة المباشرة عن مراحل 1–12

نعم، **اكتملت مراحل الخطة الأصلية 1–12 بوصفها مراحل تدقيق/معالجة/بوابات/قبول محدود/حكم جاهزية**. لم تكن هذه المراحل مجرد فحص نظري؛ شملت إصلاحات مصدرية فعلية واختبارات وبناء وأرشفة ورفعاً إلى فرع المصالحة. لكنها **لا تعني أن كل مشكلة في المنصة أو كل مسار إنتاجي قد حُل أو اختُبر حياً**. انتهت Phase 12 بحكم **NO-GO** تحديداً لأن الإطلاق الكامل يتطلب موانع خارج الاختبارات المصدرية: النشر المراجع، E2E على Sandbox، الدفع، موافقات العقود عالية الخطورة، البنى الموقعة والأجهزة الحقيقية، ومراجعة اللغات البشرية. [1] [2]

| نطاق المراحل المنتهية | هل كان فحصاً فقط؟ | ما تم فعلياً | الحد الذي لا يجوز تجاوزه |
|---|---|---|---|
| 1–7 | لا | جرد معماري/مسارات/أمن/ملكية/UX ومقارنة سوقية، مع تثبيت الأدلة وتحديد العيوب. | ليس بديلاً عن كل سيناريو حي لكل خدمة. |
| 8 | لا | دفعات إصلاح مصدرية واسعة A–AO لعقود الملكية، realtime، الدفع، التخزين، الواجهات، المرضى، المزودين والإدارة؛ بوابات موحدة وصلت إلى 64 suite / 364 test في الدفعة الأخيرة. | بعض المزايا حُجبت fail-closed بدلاً من اختراع عقد تشغيل غير موجود. |
| 9–10 | لا | بوابات build/lock integrity وترقيات تبعيات محكومة. Backend الآن 0 high/critical؛ Admin نظيف؛ تحذيرات Expo/RN المتبقية upstream موثقة. | لا تثبت توافق الأجهزة أو أداء الإنتاج. |
| 11 | لا | قبول Sandbox محدود وقراءات/اختبارات سلبية للملكية، مع إصلاح حماية تفاصيل الوصفة. | ليس E2E شاملاً ولا دليل نشر. |
| 12 | لا | تقرير جاهزية، package للمراجع، rollback/post-deploy checklist، وحكم NO-GO. | لا يمنح تصريح نشر. |
| ما بعد Phase 12 | لا | ترقية Nest/Expo، دعم ست لغات للمزوّد، إزالة نجاحات/بيانات محلية غير حقيقية، احتواء عقد مقدم الخدمة، وإضافات اختبارات/أرشيفات. | بقيت عقود وظيفية وإثباتات حية وبشرية مفتوحة. |

## ما تم إصلاحه فعلياً بعد Phase 12

التفاصيل الدقيقة والالتزامات والأرشيفات موجودة في حزمة المراجعة السابقة. باختصار، تمت ترقية Backend إلى Nest 11 مع 67 suite / 373 test و0 high/critical، وترقية تطبيقَي Patient وProvider إلى Expo SDK 57 ضمن بوابات موثقة. [2]

في Provider، تم بناء أساس اللغات الست، ثم نقل 3,755 فرع نص ثابت و85 قالباً ديناميكياً آمناً إلى طبقة ترجمة؛ وأزيلت سجلات دردشة وتذاكر وأجهزة ومواعيد وتحويلات وبيانات مختبر أو نجاحات قانونية محلية كانت يمكن أن تظهر كحقائق تشغيلية. حيث لم يكن العقد الخلفي مثبتاً، تم الاحتواء بحالة **غير متاح** صريحة، لا ببيانات أو نجاح وهمي. [3] [4] [5] [6] [7]

هذا يعني أن البنود المبينة في القسم التالي **ليست بالضرورة كوداً متروكاً بلا عمل**. كثير منها يتحول الآن إلى أحد شكلين: إما بناء عقد وظيفي حقيقي لاستبدال الاحتواء، أو اختبار حي/اعتماد خارجي لإثبات ما تم إصلاحه مصدرّياً.

## سجل المشاكل والعناصر المفتوحة

### أ. أولويات حرجة تمنع الإطلاق مباشرة

| المعرّف | الحالة | المشكلة أو النقص المفتوح | الإجراء الإلزامي |
|---|---|---|---|
| REL-01 | BLOCKED — reviewer | إصلاح حماية `GET /prescriptions/:id` مصدرى، لكن لا يوجد بعد دليل BOLA حي لأن Patient1 لا يملك وصفة Sandbox مناسبة. | تجهيز مرشح Backend وrollback، نشر مراجع فقط، ثم إثبات owner/foreign 2xx مقابل 403/404. |
| REL-02 | BLOCKED — owner | Moyasar live غير مفعّل؛ المسار يعيد 502 آمن كما ينبغي. | لا mock/bypass. يفعّل المالك الحساب ثم تُختبر intent/webhook/idempotency/refund على Sandbox فقط. |
| REL-03 | BLOCKED — legal/product | SOS وQR وconsent وlocation محجوبة fail-closed. | اعتماد مكتوب للعقود والمحتوى والاحتفاظ والتدقيق، ثم تنفيذ/اختبار ضيق ومراجع. |
| REL-04 | BLOCKED — devices | لا APK/IPA موقّع ولا جهاز حقيقي/مزرعة أجهزة موثقة. | بيئة Android SDK/EAS/Apple/GCP أو حسابات المالك، ثم build/device-farm/هاتفان حقيقيان. |
| REL-05 | OPEN | لا يوجد E2E كامل ومراجع لكل خدمة/دور وحالة دفع/تأمين/ملكية. | تنفيذ Phase 16 أدناه بسيناريوهات Sandbox وbefore/after وcleanup. |
| REL-06 | OPEN | قبول بشري للغات الست، RTL/LTR، accessibility والواجهة premium لم يكتمل. | مراجعة لغوية/طبية ومرئية على الأجهزة لكل شاشة حرجة. |

### ب. Provider: العقود والوظائف التي بقيت محجوبة أو غير مكتملة

| المجال | الوضع الحالي الدقيق | العمل المتبقي |
|---|---|---|
| استشارة الطبيب والوصفة | لا تزال محادثة الاستشارة وEHR وtemplates/medicines وبعض مسارات الوصفة بحاجة احتواء/عقد؛ سجلت المشكلة ولم يُعدّل هذا الجزء بعد طلب المراجعة. | منع العمل على مريض/موعد غير مثبت، تصميم عقد appointment/patient/prescription، catalog دوائي معتمد، persistence/audit، واختبارات BOLA وحالات الخطأ. |
| Chat/calls/attachments | fallback والنجاح المحلي أزيلا وحولت الواجهات إلى fail-closed. | عقد participant-authorized للـthread والرسائل/read receipts والمرفقات والتوقيع/التخزين والمكالمات/LiveKit/reconnect. |
| Pharmacy chat/support/notifications/devices | fixtures والمتغيرات المحلية احتويت. | بناء عقود ticket/device session/revoke/notification mark-read/pharmacy chat ذات persistence وownership وidempotency. |
| Doctor configuration | مواعيد/إحالات/إجازة مرضية/وثائق/وسائط ثابتة أزيلت. | عقود schedule/leave/referral/sick-leave/document/media تملك audit/storage وBOLA قبل إعادة العرض. |
| Lab | فوالب المريض والتحليل والتأمين والسعر والوقت أزيلت. | إثبات inbox/sample/result/report/insurance/BOLA حياً، وربط report خاص موقّع. |
| Pharmacy/Radiology/Nursing/Facility/Ambulance | عولجت عقود عديدة مصدرّياً أو fail-closed، لكن دورة التشغيل كاملة غير مثبتة. | queue/claim/reject/reassign/transition/report/GPS/insurance/notifications/wallet لكل نوع مزود، مع minimum-PHI وBOLA. |
| Payout | reservation/idempotency مصدرّياً مثبتة. | destination/bank/admin approval/concurrency/ledger E2E بعد تفعيل البيئة المالية. |
| Localization | 2,813 زوج نص/قالب وصل للغات الست آلياً؛ Arabic-only RTL محفوظ. | مراجعة بشرية للنص الطبي/المالي/القانوني، API/notification errors، القوالب غير المتكافئة، wrap/fonts/screen reader/native device. |

### ج. Patient: العيوب المؤكدة المفتوحة

هذه قائمة كاملة **مُجمّعة حسب الشاشة/الميزة** لبنود Phase 2 المفتوحة في سجل العمل؛ لا تعني أن كل شاشة فاشلة، بل أن كل بند لم يحصل بعد على إصلاح + بوابة + قبول حي.

| الميزة/الشاشة | النقص الذي يجب أن ينفذه Agent التالي |
|---|---|
| Profile/Addresses | زر إضافة عنوان يحتاج form حقيقياً مرتبطاً بـ`POST /users/me/addresses` مع validation/retry/duplicate/ownership/RTL/accessibility. |
| Diagnostics booking | إزالة address/provider/slot/document/price المصطنع؛ quote/payment/server state وتأمين server-authoritative. |
| Maternity | لا fallback للـweek/due-date؛ ملف حمل Backend-authoritative، rollback/retry، ومدخلات متحققة ومحتوى طبي آمن. |
| Mood journal | مواءمة energy/stress/sleep/activities/notes مع schema، منع التكرار، وفصل error عن empty history. |
| AI nutrition | عقد response/render/save مملوك، موافقة وتفضيلات وحدود/contraindications؛ أو تعطيل save/feature بصدق. |
| Medication reminders | حفظ recurrence/dose/fraction/time الصحيح؛ لا تحويل monthly→weekly ولا refill promise محلي؛ اختبار timezone/device. |
| Chronic refill | order_id حقيقي للتتبع، fulfillment/stock server-owned، eligibility/idempotency/retry. |
| Family calendar/chat | form cross-platform بدل prompt، owner/capability deletion، group membership canonical وrevocation فوري. |
| Insurance/copay/consultations | owned booking/policy/decision/quote/payment intent، workflows online/clinic/home × cash/card/insurance والـBOLA. |
| Vitals/monthly report | type/unit/time/schema حقيقي؛ تحقق readings وحدود طبية مراجعة؛ timezone/partial-source/all-language formatting. |
| Reports/AI viewer | canonical `/medical-reports/:id`، PHI share confirmation، attachment auth، six-language errors. |
| Home care/diagnostics | quote/availability/assignment/location/insurance server-owned، questionnaires وسلامة slot/report/ownership. |
| Wallet | gateway tokenization فقط، atomic ledger/idempotency/recovery، confirmation form cross-platform، recipient eligibility. |
| Profile/notification settings | clinical DTO validation/consent/audit، preference merge/rollback/enforcement، inbox read reconciliation. |
| Triage/drug/skin/OCR | لا تشخيص أو claims أو results مصطنعة؛ مصدر clinical approved، consent/retention/rate-limit/audit، fail-closed حيث يلزم. |
| Loyalty/privacy/data rights/support | ledger/claims atomic وtokens آمنة؛ حقوق export/delete/portability وprivacy policy fail-closed؛ support ticket/chat owned/persisted/attachments secured. |
| UX/i18n/native | RTL navigation، labels، keys/error/plural/date، design tokens، Expo native compatibility، APK/AAB وجهازان حقيقيان. |

### د. Admin: العيوب المؤكدة المفتوحة

| المجال | الإجراء المطلوب |
|---|---|
| Authorization/session shell | لا role/token في المتصفح/localStorage؛ session/permissions/branch scope وخطوط/أيقونات و6 لغات. |
| Command centre/analytics | لا heatmap أو telemetry محلي؛ stale/error/retry وminimum-PHI/audit. |
| KYC/provider moderation | maker-checker، reviewer evidence، suspension case/appeal وtyped/masked deltas. |
| Payout/refund/ledger/warehouse | state machine/atomic/idempotent/reconciled، IBAN masking، destination/proof/receipt وdual control. |
| Insurance/RBAC | Backend versioned policy، permissions سلبية، step-up/reason/audit، no raw JSON. |
| SOS/audit log/configuration | SOS fail-closed؛ audit error/source/masking/pagination؛ kill-switch/break-glass/dual control حقيقي. |
| User/medicine/support/campaign | moderation/retention/privacy؛ clinical governance/versioned publication؛ owned tickets/PHI masking؛ consent-filtered campaigns and deep-link allowlist. |
| AI/nursing/disputes/catalog | PHI/model governance، assignment eligible/acceptance/audit، dispute/refund evidence/appeal، catalog publish/retire approvals. |

### هـ. Backend/Database: العيوب المعمارية والعقود المفتوحة

| المجال | العمل المتبقي |
|---|---|
| Canonical data | توحيد pharmacy order/allocation/broadcast وprovider profiles مع migration/rollback/reconciliation متولدة، لا تقارير تقريبية. |
| Workflows/events | كل transition عبر shared engine، unknown state fail-safe، durable transactional outbox/retry/reconciliation. |
| Storage/media | purpose-derived visibility، private signing fail-closed، MIME/malware/DLP/quarantine، consent/retention/audit. |
| Payments/insurance | ownership قبل read/mutation، verified webhooks، atomic intent/refund/outbox، quote/copay/policy evidence server-owned. |
| WebSocket | room membership/purpose، waiting room/presence، durable message/read cursor، replay acknowledgment وليس process-memory. |
| Authorization | branch/tenant scope، revoked JWT/session/device/role version، impersonation case/step-up/TTL/audit، trusted proxy IP. |
| Transaction/event schema | unique indexes للـintent/idempotency/gateway references، currency/refund invariants، immutable actor/case/PSP evidence. |
| Public discovery/security | published DTOs فقط، pagination/search/location policy، اختبارات negative كاملة للـREST/Socket/storage/webhook/QR/consent. |

### و. موانع البيئة والقبول الحي

| المانع | المطلوب من المالك/المراجع أو البيئة |
|---|---|
| Sandbox linked fixtures | تعريف أو ربط حسابات pharmacy/lab/radiology/nursing/hospital مناسبة لطلبات Sandbox حقيقية؛ لا seed أو اختراع بيانات في الإنتاج. |
| Backend deployment | طلب مراجع صريح، backup/rollback image+DB، SHA منشور، readiness/logs، smoke ثم BOLA. |
| Payment | تفعيل Moyasar/credentials test-safe ثم lifecycle مالي. |
| Legal/product | اعتماد SOS/QR/consent/location/agreement/policy/AI/PHI retention قبل التفعيل. |
| Native/mobile | Android SDK/EAS/Apple Developer/GCP/Firebase أو بديل معتمد، APK/IPA signed، device farm، هاتفان. |
| Security/infra | تدوير R2 secret، origin allowlist fail-closed، production readiness/logs/observability، backups/restore/load test. |

## المراحل المتبقية: **سبع مراحل مرقمة يجب تنفيذها بالترتيب**

هذه المراحل تبدأ بعد Phase 12 ولا تحذف أي بند مفتوح أعلاه. لا تبدأ مرحلة لاحقة قبل تطبيق معيار خروج سابقتها أو تصنيف كل ما لا يمكن إغلاقه كـBLOCKED مع دليل وموافقة استمرار مكتوبة.

### Phase 13 — استكمال جرد العقود والعيوب المصدرية المتبقية

**الهدف:** تحويل كل بند مفتوح في Patient/Provider/Admin/Backend إلى row قابل للتنفيذ: screen/action → consumer → controller/schema → role/ownership → state transition → evidence.  
**التنفيذ:** إكمال mapping لمسارات API المعقدة، فحص التمبلتات/النصوص الديناميكية، مراجعة المكونات Provider Doctor clinical/prescription، وتصنيف كل زر بأنه wired أو stale أو placeholder أو fail-closed أو missing.  
**معيار الخروج:** لا يبقى route/button/contract candidate غير مصنف؛ جميع العيوب الجديدة تسجل في `todo.md` و`audit-artifacts` مع PASS/FIX/BLOCKED/INCONCLUSIVE.

### Phase 14 — معالجة مصدرية وعقود Backend/Database المتبقية

**الهدف:** معالجة العيوب المصدرية المؤكدة فقط، لا بناء features تخمينية.  
**التنفيذ:** يبدأ بـProvider clinical consultation/prescription ثم عقود chat/support/device/lab/doctor، ثم Patient وAdmin المفتوحين، وبعدها canonical state machines/outbox/storage/payment/insurance/authorization حسب المخاطر. كل تغيير: inspect → test سلبي/إيجابي → implement fail-closed → regression → typecheck/build/archive.  
**معيار الخروج:** كل عيب مصدرى مؤكد إما FIX مع tests/build/archive أو FAIL-CLOSED موثق أو BLOCKED بسبب اعتماد محدد؛ لا بيانات وهمية أو success محلي في نطاق المراجعة.

### Phase 15 — حزمة مرشح النشر وحوكمة الاعتماد

**الهدف:** تحويل التغييرات المسموح بها إلى مرشحين قابلين للمراجعة دون نشر تلقائي.  
**التنفيذ:** clean installs، builds، suites، dependency audit، migration/index preflight، archive SHA، source change manifest، rollback/backup، health/readiness/log plan، وطلب نشر منفصل للمراجع. تجهيز owner packages لـMoyasar والعقود القانونية وEAS/Apple/GCP.  
**معيار الخروج:** مرشح محدد بالـSHA/commit وخطة rollback وpost-deploy BOLA/smoke؛ لا عملية نشر قبل موافقة المراجع الصريحة.

### Phase 16 — نشر مراجع وSandbox E2E شامل

**الهدف:** إثبات دورة الحياة الفعلية لكل خدمة على النسخة المنشورة فقط وبحسابات Sandbox.  
**التنفيذ:** بعد نشر مراجع، اختبر consultations (online/clinic/home × cash/insurance)، pharmacy، lab، radiology، nursing، hospital، wallet/family/notifications، provider intake لكل نوع، Admin RBAC، وBOLA actor matrix. سجّل request/response/status/IDs/state/ledger before-after/cleanup.  
**معيار الخروج:** كل صف lifecycle PASS أو FIX أو BLOCKED بدليل حي؛ لا تعتبر قراءة endpoint أو build دليلاً على دورة كاملة.

### Phase 17 — البنى الموقعة والمزرعة والهاتفان الحقيقيان

**الهدف:** إثبات native runtime لا JS/web export فقط.  
**التنفيذ:** APK/AAB وIPA/TestFlight موقعة، Android device farm، small/medium/tablet، weak network/lifecycle/orientation/permissions، ثم هاتفان حقيقيان لـpush/deep links/CallKeep or full-screen intent/LiveKit/GPS/background/audio/camera/barcode.  
**معيار الخروج:** artifacts وlogs/crashes/screenshots/videos وقائمة عيوب صريحة؛ كل native blocker مرفوع للمالك مع بيانات الوصول المطلوبة.

### Phase 18 — قبول بشري للغات والـRTL والإتاحة وUX/design

**الهدف:** تحويل الطبقة التقنية للغات الست إلى منتج مقبول سريرياً وبصرياً.  
**التنفيذ:** مراجعة بشرية AR/EN/UR/HI/BN/FIL للنص الطبي/المالي/القانوني، RTL Arabic فقط، LTR الأربع الأخرى، plural/date/number، screen reader/focus/contrast/touch targets، light/dark، responsive، وتطبيق design tokens/icons/premium states بعد استقرار العقود.  
**معيار الخروج:** sign-off لكل لغة وشاشة حرجة مع قائمة truncation/semantic/design fixes واختبارات إعادة؛ لا قبول بناء على ترجمة آلية فقط.

### Phase 19 — بوابة الإطلاق النهائية والمتاجر

**الهدف:** إصدار قرار GO/NO-GO جديد ومحدود بالأدلة.  
**التنفيذ:** مراجعة مستقلة للـsource/archives/SHA/migrations/backups/E2E/device/locale/security/privacy/Moyasar/contracts، verification post-deploy، monitoring/incident/rollback، ثم تجهيز metadata/privacy/store submission فقط عند GO.  
**معيار الخروج:** شهادة readiness موقعة من reviewer/owner لكل بوابة إلزامية. إذا بقي مانع واحد عالي الخطورة فالحكم NO-GO ويستمر العمل في المرحلة ذات الصلة.

## تعليمات إلزامية للـAgent التالي

1. اسحب `manus/on-live-reconciliation` أولاً، وتحقق من HEAD والأرشيفات قبل أي تعديل. لا تستخدم `main` أو `fix/e2e-operational-contracts-20260814` كأساس تنفيذ بديل، ولا أي repository خارج `obaid08642-ops/new`.
2. استخرج الكود من الأرشيفات الحاكمة إلى worktree معزول؛ لا تعدّل ZIP مباشرة ولا تُدخل `node_modules` أو build output في الأرشيف.
3. قبل كل إصلاح، أضف بند `[ ]` محدداً إلى `todo.md`. بعد كل إصلاح، أضف test مناسب، شغّل gates، وثّق PASS/FIX/BLOCKED، حدّث SHA، ثم commit/push إلى الفرع نفسه.
4. لا تنشئ mock data، fake reviews، بيانات مرضى/طلبات/دفع وهمية، أو نجاح toast محلي لمسار بلا عقد. استخدم fail-closed مع رسالة صريحة عند غياب العقد.
5. استخدم حسابات Sandbox فقط. لا تحفظ كلمات مرور أو OTP أو JWT أو PII أو ملفات تقارير طبية في Git أو الأدلة.
6. لا تنشر إلى الخادم. قدّم للمراجع فقط مرشحاً محدداً وrollback ثم انتظر موافقة صريحة. عدم الرد ليس موافقة.
7. لا تفعّل SOS/QR/consent/location أو الدفع أو عقود قانونية/AI/PHI قبل اعتماد المالك/القانون والمنتج والعقد الخلفي واختبار التشغيل.

## مصادر الدليل

[1]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PHASE12_FINAL_PRODUCTION_READINESS_REPORT_20260819.md "Phase 12 final production-readiness report"  
[2]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_DEPENDENCY_REMEDIATION_FINAL_DOUBLE_CHECK_20260819.md "Dependency remediation final double check"  
[3]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_FULL_LOCALE_STATIC_TEXT_MIGRATION_20260819.md "Provider static text migration"  
[4]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_TEMPLATE_LOCALE_MIGRATION_20260819.md "Provider template migration"  
[5]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_CHAT_TRUTHFULNESS_20260819.md "Provider chat truthfulness"  
[6]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_PROVIDER_SHARED_OPERATION_TRUTHFULNESS_20260819.md "Provider shared operation truthfulness"  
[7]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/audit-artifacts/NABDAH_REVIEW_HANDOVER_CURRENT_STATE_20260819.md "Current-state reviewer handover"  
[8]: https://github.com/obaid08642-ops/new/blob/manus/on-live-reconciliation/todo.md "Master execution log"
