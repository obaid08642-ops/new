# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_AGENT_TRANSITION_OPEN_WORK_AND_REMAINING_PHASES_20260819.md`
- **Member SHA-256:** `eddcf451c503f05417d066e268af831d280ba33c6f2ebc01c485397df3710929`
- **Line count:** 184
- **Read range:** `1-184`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `39: | REL-02 | BLOCKED — owner | Moyasar live غير مفعّل؛ المسار يعيد 502 آمن كما ينبغي. | لا mock/bypass. يفعّل المالك الحساب ثم تُختبر intent/webhook/idempotency/refund على Sandbox فقط. |`
- `56: | Localization | 2,813 زوج نص/قالب وصل للغات الست آلياً؛ Arabic-only RTL محفوظ. | مراجعة بشرية للنص الطبي/المالي/القانوني، API/notification errors، القوالب غير المتكافئة، wrap/fonts/screen reader/native device. |`
- `64: | Profile/Addresses | زر إضافة عنوان يحتاج form حقيقياً مرتبطاً بـ`POST /users/me/addresses` مع validation/retry/duplicate/ownership/RTL/accessibility. |`
- `65: | Diagnostics booking | إزالة address/provider/slot/document/price المصطنع؛ quote/payment/server state وتأمين server-authoritative. |`
- `66: | Maternity | لا fallback للـweek/due-date؛ ملف حمل Backend-authoritative، rollback/retry، ومدخلات متحققة ومحتوى طبي آمن. |`
- `70: | Chronic refill | order_id حقيقي للتتبع، fulfillment/stock server-owned، eligibility/idempotency/retry. |`
- `72: | Insurance/copay/consultations | owned booking/policy/decision/quote/payment intent، workflows online/clinic/home × cash/card/insurance والـBOLA. |`
- `87: | Command centre/analytics | لا heatmap أو telemetry محلي؛ stale/error/retry وminimum-PHI/audit. |`
- `89: | Payout/refund/ledger/warehouse | state machine/atomic/idempotent/reconciled، IBAN masking، destination/proof/receipt وdual control. |`
- `93: | AI/nursing/disputes/catalog | PHI/model governance، assignment eligible/acceptance/audit، dispute/refund evidence/appeal، catalog publish/retire approvals. |`
- `100: | Workflows/events | كل transition عبر shared engine، unknown state fail-safe، durable transactional outbox/retry/reconciliation. |`
- `102: | Payments/insurance | ownership قبل read/mutation، verified webhooks، atomic intent/refund/outbox، quote/copay/policy evidence server-owned. |`
### backend_consumers_or_contracts
- `51: | Pharmacy chat/support/notifications/devices | fixtures والمتغيرات المحلية احتويت. | بناء عقود ticket/device session/revoke/notification mark-read/pharmacy chat ذات persistence وownership وidempotency. |`
- `53: | Lab | فوالب المريض والتحليل والتأمين والسعر والوقت أزيلت. | إثبات inbox/sample/result/report/insurance/BOLA حياً، وربط report خاص موقّع. |`
- `54: | Pharmacy/Radiology/Nursing/Facility/Ambulance | عولجت عقود عديدة مصدرّياً أو fail-closed، لكن دورة التشغيل كاملة غير مثبتة. | queue/claim/reject/reassign/transition/report/GPS/insurance/notifications/wallet لكل نوع مزود، مع minimum-PHI وB`
- `56: | Localization | 2,813 زوج نص/قالب وصل للغات الست آلياً؛ Arabic-only RTL محفوظ. | مراجعة بشرية للنص الطبي/المالي/القانوني، API/notification errors، القوالب غير المتكافئة، wrap/fonts/screen reader/native device. |`
- `72: | Insurance/copay/consultations | owned booking/policy/decision/quote/payment intent، workflows online/clinic/home × cash/card/insurance والـBOLA. |`
- `75: | Home care/diagnostics | quote/availability/assignment/location/insurance server-owned، questionnaires وسلامة slot/report/ownership. |`
- `93: | AI/nursing/disputes/catalog | PHI/model governance، assignment eligible/acceptance/audit، dispute/refund evidence/appeal، catalog publish/retire approvals. |`
- `102: | Payments/insurance | ownership قبل read/mutation، verified webhooks، atomic intent/refund/outbox، quote/copay/policy evidence server-owned. |`
- `103: | WebSocket | room membership/purpose، waiting room/presence، durable message/read cursor، replay acknowledgment وليس process-memory. |`
- `106: | Public discovery/security | published DTOs فقط، pagination/search/location policy، اختبارات negative كاملة للـREST/Socket/storage/webhook/QR/consent. |`
- `112: | Sandbox linked fixtures | تعريف أو ربط حسابات pharmacy/lab/radiology/nursing/hospital مناسبة لطلبات Sandbox حقيقية؛ لا seed أو اختراع بيانات في الإنتاج. |`
- `132: **التنفيذ:** يبدأ بـProvider clinical consultation/prescription ثم عقود chat/support/device/lab/doctor، ثم Patient وAdmin المفتوحين، وبعدها canonical state machines/outbox/storage/payment/insurance/authorization حسب المخاطر. كل تغيير: inspe`
### auth_ownership
- `19: | 9–10 | لا | بوابات build/lock integrity وترقيات تبعيات محكومة. Backend الآن 0 high/critical؛ Admin نظيف؛ تحذيرات Expo/RN المتبقية upstream موثقة. | لا تثبت توافق الأجهزة أو أداء الإنتاج. |`
- `38: | REL-01 | BLOCKED — reviewer | إصلاح حماية `GET /prescriptions/:id` مصدرى، لكن لا يوجد بعد دليل BOLA حي لأن Patient1 لا يملك وصفة Sandbox مناسبة. | تجهيز مرشح Backend وrollback، نشر مراجع فقط، ثم إثبات owner/foreign 2xx مقابل 403/404. |`
- `39: | REL-02 | BLOCKED — owner | Moyasar live غير مفعّل؛ المسار يعيد 502 آمن كما ينبغي. | لا mock/bypass. يفعّل المالك الحساب ثم تُختبر intent/webhook/idempotency/refund على Sandbox فقط. |`
- `51: | Pharmacy chat/support/notifications/devices | fixtures والمتغيرات المحلية احتويت. | بناء عقود ticket/device session/revoke/notification mark-read/pharmacy chat ذات persistence وownership وidempotency. |`
- `55: | Payout | reservation/idempotency مصدرّياً مثبتة. | destination/bank/admin approval/concurrency/ledger E2E بعد تفعيل البيئة المالية. |`
- `64: | Profile/Addresses | زر إضافة عنوان يحتاج form حقيقياً مرتبطاً بـ`POST /users/me/addresses` مع validation/retry/duplicate/ownership/RTL/accessibility. |`
- `71: | Family calendar/chat | form cross-platform بدل prompt، owner/capability deletion، group membership canonical وrevocation فوري. |`
- `75: | Home care/diagnostics | quote/availability/assignment/location/insurance server-owned، questionnaires وسلامة slot/report/ownership. |`
- `76: | Wallet | gateway tokenization فقط، atomic ledger/idempotency/recovery، confirmation form cross-platform، recipient eligibility. |`
- `79: | Loyalty/privacy/data rights/support | ledger/claims atomic وtokens آمنة؛ حقوق export/delete/portability وprivacy policy fail-closed؛ support ticket/chat owned/persisted/attachments secured. |`
- `80: | UX/i18n/native | RTL navigation، labels، keys/error/plural/date، design tokens، Expo native compatibility، APK/AAB وجهازان حقيقيان. |`
- `82: ### د. Admin: العيوب المؤكدة المفتوحة`
### state_transitions
- `39: | REL-02 | BLOCKED — owner | Moyasar live غير مفعّل؛ المسار يعيد 502 آمن كما ينبغي. | لا mock/bypass. يفعّل المالك الحساب ثم تُختبر intent/webhook/idempotency/refund على Sandbox فقط. |`
- `56: | Localization | 2,813 زوج نص/قالب وصل للغات الست آلياً؛ Arabic-only RTL محفوظ. | مراجعة بشرية للنص الطبي/المالي/القانوني، API/notification errors، القوالب غير المتكافئة، wrap/fonts/screen reader/native device. |`
- `64: | Profile/Addresses | زر إضافة عنوان يحتاج form حقيقياً مرتبطاً بـ`POST /users/me/addresses` مع validation/retry/duplicate/ownership/RTL/accessibility. |`
- `65: | Diagnostics booking | إزالة address/provider/slot/document/price المصطنع؛ quote/payment/server state وتأمين server-authoritative. |`
- `66: | Maternity | لا fallback للـweek/due-date؛ ملف حمل Backend-authoritative، rollback/retry، ومدخلات متحققة ومحتوى طبي آمن. |`
- `67: | Mood journal | مواءمة energy/stress/sleep/activities/notes مع schema، منع التكرار، وفصل error عن empty history. |`
- `70: | Chronic refill | order_id حقيقي للتتبع، fulfillment/stock server-owned، eligibility/idempotency/retry. |`
- `74: | Reports/AI viewer | canonical `/medical-reports/:id`، PHI share confirmation، attachment auth، six-language errors. |`
- `78: | Triage/drug/skin/OCR | لا تشخيص أو claims أو results مصطنعة؛ مصدر clinical approved، consent/retention/rate-limit/audit، fail-closed حيث يلزم. |`
- `80: | UX/i18n/native | RTL navigation، labels، keys/error/plural/date، design tokens، Expo native compatibility، APK/AAB وجهازان حقيقيان. |`
- `87: | Command centre/analytics | لا heatmap أو telemetry محلي؛ stale/error/retry وminimum-PHI/audit. |`
- `89: | Payout/refund/ledger/warehouse | state machine/atomic/idempotent/reconciled، IBAN masking، destination/proof/receipt وdual control. |`
### payment_insurance_relevance
- `39: | REL-02 | BLOCKED — owner | Moyasar live غير مفعّل؛ المسار يعيد 502 آمن كما ينبغي. | لا mock/bypass. يفعّل المالك الحساب ثم تُختبر intent/webhook/idempotency/refund على Sandbox فقط. |`
- `53: | Lab | فوالب المريض والتحليل والتأمين والسعر والوقت أزيلت. | إثبات inbox/sample/result/report/insurance/BOLA حياً، وربط report خاص موقّع. |`
- `54: | Pharmacy/Radiology/Nursing/Facility/Ambulance | عولجت عقود عديدة مصدرّياً أو fail-closed، لكن دورة التشغيل كاملة غير مثبتة. | queue/claim/reject/reassign/transition/report/GPS/insurance/notifications/wallet لكل نوع مزود، مع minimum-PHI وB`
- `55: | Payout | reservation/idempotency مصدرّياً مثبتة. | destination/bank/admin approval/concurrency/ledger E2E بعد تفعيل البيئة المالية. |`
- `65: | Diagnostics booking | إزالة address/provider/slot/document/price المصطنع؛ quote/payment/server state وتأمين server-authoritative. |`
- `72: | Insurance/copay/consultations | owned booking/policy/decision/quote/payment intent، workflows online/clinic/home × cash/card/insurance والـBOLA. |`
- `75: | Home care/diagnostics | quote/availability/assignment/location/insurance server-owned، questionnaires وسلامة slot/report/ownership. |`
- `76: | Wallet | gateway tokenization فقط، atomic ledger/idempotency/recovery، confirmation form cross-platform، recipient eligibility. |`
- `89: | Payout/refund/ledger/warehouse | state machine/atomic/idempotent/reconciled، IBAN masking، destination/proof/receipt وdual control. |`
- `90: | Insurance/RBAC | Backend versioned policy، permissions سلبية، step-up/reason/audit، no raw JSON. |`
- `93: | AI/nursing/disputes/catalog | PHI/model governance، assignment eligible/acceptance/audit، dispute/refund evidence/appeal، catalog publish/retire approvals. |`
- `102: | Payments/insurance | ownership قبل read/mutation، verified webhooks، atomic intent/refund/outbox، quote/copay/policy evidence server-owned. |`
### error_empty_loading_retry_cancel
- `56: | Localization | 2,813 زوج نص/قالب وصل للغات الست آلياً؛ Arabic-only RTL محفوظ. | مراجعة بشرية للنص الطبي/المالي/القانوني، API/notification errors، القوالب غير المتكافئة، wrap/fonts/screen reader/native device. |`
- `64: | Profile/Addresses | زر إضافة عنوان يحتاج form حقيقياً مرتبطاً بـ`POST /users/me/addresses` مع validation/retry/duplicate/ownership/RTL/accessibility. |`
- `66: | Maternity | لا fallback للـweek/due-date؛ ملف حمل Backend-authoritative، rollback/retry، ومدخلات متحققة ومحتوى طبي آمن. |`
- `67: | Mood journal | مواءمة energy/stress/sleep/activities/notes مع schema، منع التكرار، وفصل error عن empty history. |`
- `70: | Chronic refill | order_id حقيقي للتتبع، fulfillment/stock server-owned، eligibility/idempotency/retry. |`
- `74: | Reports/AI viewer | canonical `/medical-reports/:id`، PHI share confirmation، attachment auth، six-language errors. |`
- `80: | UX/i18n/native | RTL navigation، labels، keys/error/plural/date، design tokens، Expo native compatibility، APK/AAB وجهازان حقيقيان. |`
- `87: | Command centre/analytics | لا heatmap أو telemetry محلي؛ stale/error/retry وminimum-PHI/audit. |`
- `91: | SOS/audit log/configuration | SOS fail-closed؛ audit error/source/masking/pagination؛ kill-switch/break-glass/dual control حقيقي. |`
- `100: | Workflows/events | كل transition عبر shared engine، unknown state fail-safe، durable transactional outbox/retry/reconciliation. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
