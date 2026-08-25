# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/COMPREHENSIVE_SERVICE_SCENARIO_MATRIX_20260818.md`
- **Member SHA-256:** `982e1076517a57473404f90af83ad40a5119d82bf4c21da2f6dad3853f673d10`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | المختبر | فرع، سحب منزلي، باقات وتحاليل | نقدي، بطاقة، تأمين يدوي، out-of-network cash | catalog/preparation → booking → confirmation → sample collected/analyzing/result → report | provider inbox → accept/reject/reassign → sample state tr`
- `14: | الأشعة | فرع، منزل، modality/PACS | نقدي، بطاقة، تأمين يدوي | modality/preparation → booking → confirmation → perform → images/report | inbox → respond/allocate/finalize → report/images upload → complete | PACS/report access، تأمين، إعادة`
- `15: | التمريض والرعاية المنزلية | زيارة منزلية، متابعة ميدانية، طوارئ | نقدي، بطاقة، تأمين، pending finance review | service/location → request/broadcast → accept → arrival/start/in-progress/complete → notes/care plan → rating | onboarding/avai`
- `16: | المستشفى والمنشأة | دليل، فروع/أقسام، مواعيد، staff | حسب الخدمة: نقدي/بطاقة/تأمين | profile/department/doctor → schedule → booking → visit/discharge/report | hospital-admin staff invite/roles → doctor schedule/leave → patient tracker → d`
- `18: | التغذية | خطة غذائية، متابعة، تخصيص | نقدي/بطاقة/تأمين إن كان مدعوماً | intake → nutrition plan → follow-up → adherence/rating | provider profile/availability → accept → plan/update → follow-up | بيانات حساسة، تعديل الخطة، cancellation، o`
- `19: | الصحة النفسية | جلسة أونلاين/عيادة/منزل إن مدعوم | نقدي/بطاقة/تأمين | intake → booking → chat/call/visit → follow-up | credentialing، schedule، accept، session، notes/report | الخصوصية، escalation، no-show، emergency boundary |`
- `29: | حالات الواجهة | loading، empty، retry، offline/weak network، validation، success، server error، payment unavailable، permission denied، deep link، background/return |`
- `30: | المدفوعات | cash branch، card/Moyasar safe 502، insurance decision/copay، webhook signature، idempotency، refund/ledger؛ لا refund حقيقي قبل التفعيل التجاري |`
- `33: | الإشعارات | إنشاء notification عند كل transition، read/read-all ownership، push/deep link، التطبيق مغلق، retry/delivery log |`
- `41: تُصنف كل خانة إلى **PASS** إذا اكتمل مصدر واختبار وlive evidence، أو **FAIL** إذا ظهر خلل، أو **BLOCKED** إذا تعلقت بخدمة خارجية مثل Moyasar أو مزود sandbox غير متاح، أو **NOT IMPLEMENTED** إذا لم توجد شاشة/route/contract، أو **UNRECONCILED`
- `45: يبدأ التنفيذ بالمصادر والـroutes، ثم provider intake لأن استلام الطلب يربط الطرفين، ثم patient booking، ثم admin oversight، ثم shared services، ثم live lifecycle الكامل. لا تُختبر فروع الدفع الحي أو SOS/QR/location غير المعتمدة بطريقة تفتحه`
### backend_consumers_or_contracts
- `20: | الحمل والدورة والتبويض | متابعة، تذكيرات، محتوى، استشارات | حسب المكوّن | profile/consent → timeline/reminders → consultation/lab/radiology links | provider follow-up، referrals، reports | consent، localization، sensitive data، notificati`
- `31: | الاتصال | chat membership، typing، message ownership، call initiate/ringing/accept/reject/end/no-show، WebSocket origin، token tampering، disconnect |`
### auth_ownership
- `13: | المختبر | فرع، سحب منزلي، باقات وتحاليل | نقدي، بطاقة، تأمين يدوي، out-of-network cash | catalog/preparation → booking → confirmation → sample collected/analyzing/result → report | provider inbox → accept/reject/reassign → sample state tr`
- `16: | المستشفى والمنشأة | دليل، فروع/أقسام، مواعيد، staff | حسب الخدمة: نقدي/بطاقة/تأمين | profile/department/doctor → schedule → booking → visit/discharge/report | hospital-admin staff invite/roles → doctor schedule/leave → patient tracker → d`
- `17: | الإسعاف/الطوارئ | SOS وdispatch وfleet | عقد خاص؛ لا تفعيل غير معتمد | trigger → safe fail-closed أو dispatch مع الموقع والسياسة | ambulance availability → mission broadcast → accept → tracking → handoff/complete | QR/location fail-closed`
- `18: | التغذية | خطة غذائية، متابعة، تخصيص | نقدي/بطاقة/تأمين إن كان مدعوماً | intake → nutrition plan → follow-up → adherence/rating | provider profile/availability → accept → plan/update → follow-up | بيانات حساسة، تعديل الخطة، cancellation، o`
- `19: | الصحة النفسية | جلسة أونلاين/عيادة/منزل إن مدعوم | نقدي/بطاقة/تأمين | intake → booking → chat/call/visit → follow-up | credentialing، schedule، accept، session، notes/report | الخصوصية، escalation، no-show، emergency boundary |`
- `28: | الهوية والصلاحيات | patient owner، patient2 foreign، assigned provider، provider2، hospital-admin، admin؛ يجب أن تكون القراءة/التعديل غير المصرح 403/404 ولا تكشف side-channel |`
- `29: | حالات الواجهة | loading، empty، retry، offline/weak network، validation، success، server error، payment unavailable، permission denied، deep link، background/return |`
- `31: | الاتصال | chat membership، typing، message ownership، call initiate/ringing/accept/reject/end/no-show، WebSocket origin، token tampering، disconnect |`
- `32: | الموقع | permission، mock location في المحاكي، geofence، أقل بيانات، GPS loss، emergency policy؛ لا تفعيل لعقد غير معتمد |`
- `33: | الإشعارات | إنشاء notification عند كل transition، read/read-all ownership، push/deep link، التطبيق مغلق، retry/delivery log |`
- `45: يبدأ التنفيذ بالمصادر والـroutes، ثم provider intake لأن استلام الطلب يربط الطرفين، ثم patient booking، ثم admin oversight، ثم shared services، ثم live lifecycle الكامل. لا تُختبر فروع الدفع الحي أو SOS/QR/location غير المعتمدة بطريقة تفتحه`
### state_transitions
- `7: كل صف هو عائلة سيناريوهات، ويجب تفكيكه أثناء التنفيذ إلى: إنشاء، تحقق، تسعير، تأمين/دفع، توجيه أو broadcast، قبول أو رفض، تعيين، انتقالات الحالة، التواصل، التنفيذ، التقرير، الإلغاء/no-show، الإشعار، السجل المالي، والتقييم. لكل خطوة تُسجل هو`
- `11: | الاستشارة الطبية | أونلاين صوت/فيديو، عيادة، زيارة منزلية | نقدي، بطاقة/Moyasar، تأمين، موافقة جزئية/copay | دليل وتخصص وطبيب ومنشأة → slots → تأكيد → chat/call أو وصول للعيادة/المنزل → وصفة/تقرير → متابعة وتقييم | onboarding/اعتماد → ava`
- `13: | المختبر | فرع، سحب منزلي، باقات وتحاليل | نقدي، بطاقة، تأمين يدوي، out-of-network cash | catalog/preparation → booking → confirmation → sample collected/analyzing/result → report | provider inbox → accept/reject/reassign → sample state tr`
- `14: | الأشعة | فرع، منزل، modality/PACS | نقدي، بطاقة، تأمين يدوي | modality/preparation → booking → confirmation → perform → images/report | inbox → respond/allocate/finalize → report/images upload → complete | PACS/report access، تأمين، إعادة`
- `15: | التمريض والرعاية المنزلية | زيارة منزلية، متابعة ميدانية، طوارئ | نقدي، بطاقة، تأمين، pending finance review | service/location → request/broadcast → accept → arrival/start/in-progress/complete → notes/care plan → rating | onboarding/avai`
- `18: | التغذية | خطة غذائية، متابعة، تخصيص | نقدي/بطاقة/تأمين إن كان مدعوماً | intake → nutrition plan → follow-up → adherence/rating | provider profile/availability → accept → plan/update → follow-up | بيانات حساسة، تعديل الخطة، cancellation، o`
- `19: | الصحة النفسية | جلسة أونلاين/عيادة/منزل إن مدعوم | نقدي/بطاقة/تأمين | intake → booking → chat/call/visit → follow-up | credentialing، schedule، accept، session، notes/report | الخصوصية، escalation، no-show، emergency boundary |`
- `29: | حالات الواجهة | loading، empty، retry، offline/weak network، validation، success، server error، payment unavailable، permission denied، deep link، background/return |`
- `30: | المدفوعات | cash branch، card/Moyasar safe 502، insurance decision/copay، webhook signature، idempotency، refund/ledger؛ لا refund حقيقي قبل التفعيل التجاري |`
- `31: | الاتصال | chat membership، typing، message ownership، call initiate/ringing/accept/reject/end/no-show، WebSocket origin، token tampering، disconnect |`
- `33: | الإشعارات | إنشاء notification عند كل transition، read/read-all ownership، push/deep link، التطبيق مغلق، retry/delivery log |`
- `35: | السجل والبيانات | audit trail، state history from/to، ledger before/after، timestamps UTC، عدم وجود mock/placeholder/fallback، cleanup لكل sandbox mutation |`
### payment_insurance_relevance
- `11: | الاستشارة الطبية | أونلاين صوت/فيديو، عيادة، زيارة منزلية | نقدي، بطاقة/Moyasar، تأمين، موافقة جزئية/copay | دليل وتخصص وطبيب ومنشأة → slots → تأكيد → chat/call أو وصول للعيادة/المنزل → وصفة/تقرير → متابعة وتقييم | onboarding/اعتماد → ava`
- `12: | الصيدلية | توصيل، استلام من الفرع، إعادة طلب/refill | نقدي، بطاقة، تأمين، copay | دواء/بديل → سلة → موافقة → توجيه → تتبع → إتمام | catalog/inventory → broadcast → accept/reject/reassign → substitution/unavailable → cart approval → delive`
- `13: | المختبر | فرع، سحب منزلي، باقات وتحاليل | نقدي، بطاقة، تأمين يدوي، out-of-network cash | catalog/preparation → booking → confirmation → sample collected/analyzing/result → report | provider inbox → accept/reject/reassign → sample state tr`
- `15: | التمريض والرعاية المنزلية | زيارة منزلية، متابعة ميدانية، طوارئ | نقدي، بطاقة، تأمين، pending finance review | service/location → request/broadcast → accept → arrival/start/in-progress/complete → notes/care plan → rating | onboarding/avai`
- `22: | الأدوية والفهرس والوظائف | drug index، scanner، provider jobs | لا mock price أو inventory | search/scan → verified information → order/referral إن وجد | drug index/jobs/availability | مصدر البيانات، عدم اختراع سعر/مخزون، صلاحيات الإدارة `
- `29: | حالات الواجهة | loading، empty، retry، offline/weak network، validation، success، server error، payment unavailable، permission denied، deep link، background/return |`
- `30: | المدفوعات | cash branch، card/Moyasar safe 502، insurance decision/copay، webhook signature، idempotency، refund/ledger؛ لا refund حقيقي قبل التفعيل التجاري |`
- `36: | تطبيق المزود | onboarding/KYC/approval، online toggle، availability/schedule/holiday/leave، broadcast/inbox، accept/reject/reassign، patient minimization، report/prescription، wallet/withdrawal، settings |`
- `41: تُصنف كل خانة إلى **PASS** إذا اكتمل مصدر واختبار وlive evidence، أو **FAIL** إذا ظهر خلل، أو **BLOCKED** إذا تعلقت بخدمة خارجية مثل Moyasar أو مزود sandbox غير متاح، أو **NOT IMPLEMENTED** إذا لم توجد شاشة/route/contract، أو **UNRECONCILED`
### error_empty_loading_retry_cancel
- `15: | التمريض والرعاية المنزلية | زيارة منزلية، متابعة ميدانية، طوارئ | نقدي، بطاقة، تأمين، pending finance review | service/location → request/broadcast → accept → arrival/start/in-progress/complete → notes/care plan → rating | onboarding/avai`
- `18: | التغذية | خطة غذائية، متابعة، تخصيص | نقدي/بطاقة/تأمين إن كان مدعوماً | intake → nutrition plan → follow-up → adherence/rating | provider profile/availability → accept → plan/update → follow-up | بيانات حساسة، تعديل الخطة، cancellation، o`
- `29: | حالات الواجهة | loading، empty، retry، offline/weak network، validation، success، server error، payment unavailable، permission denied، deep link، background/return |`
- `33: | الإشعارات | إنشاء notification عند كل transition، read/read-all ownership، push/deep link، التطبيق مغلق، retry/delivery log |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
