# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/CURRENT_PRODUCTION_READINESS_TRUTH_AUDIT_AR.md`
- **Member SHA-256:** `34e38219c085bb30ed830f34b86ed91a105094d8c3ba01ff78d5ab6cf9e34a7e`
- **Line count:** 51
- **Read range:** `1-51`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: تم تنفيذ login وserver-side session و2FA verification، pharmacy/orders read-only، cart/checkout/prescription previews read-only، order tracking، appointments list/detail، diagnostics list/detail، health score informational، health reports m`
- `11: آخر slice أضاف `GET /insurance/claims` مع BFF GET-only allowlist وparser يسمح فقط بـ `id/service/status/date`. لا تُعرض patient identifiers أو amounts أو covered values أو documents أو payment/refund actions.`
- `23: | Auth/onboarding | register، forgot/reset password، resend/expiry/lockout، consent، provider onboarding | عقود DTO وحالات 429 وrefresh/logout متعدد الأجهزة لم تُثبت حية بالكامل |`
- `24: | Consultations | doctor/provider search، slot locking، booking/cancel/reschedule، waiting room، LiveKit/video، doctor chat، rating | mutations وrealtime/video ownership/idempotency غير مغلقة |`
- `25: | Pharmacy | add-to-cart، prescription scan/OCR، checkout، payment، reorder، pharmacist chat، coupon/address | payment/webhook/protected-media/idempotency contracts غير مثبتة |`
- `26: | Diagnostics | packages/search/compare، sample booking، tracking، insurance upload/approval، reports/results، protected PDF | media authorization، logistics status machine، upload/download contracts غير مثبتة |`
- `28: | Insurance | add policy، coverage check، network providers، submit claim، copay/payment split، refund | sensitive documents والـfinancial mutation contracts غير مثبتة |`
- `31: | Orders/Wallet/Loyalty/Returns/Support | refunds، wallet، top-up، loyalty، returns، reviews، tickets/support chat | payment/PCI/webhook/audit/SLA contracts ناقصة |`
- `32: | Content/Settings | articles/bookmarks/community/search/privacy export/deletion/settings actions | content/moderation/privacy/legal contracts ناقصة |`
- `39: لكن لا يصح القول إن التصميم “الأفضل عالميًا” أو إنه حصل على ترتيب/score أو أنه لا يشبه أي تطبيق؛ لم يُجرَ benchmark رسمي مع Figma أو design award rubric. كما أن الـanimation الحالية محدودة غالبًا في transitions وhover وبعض reduced-motion ru`
- `41: للوصول إلى مستوى premium عالمي قابل للدفاع عنه يلزم design source of truth: Figma أو token spec نهائي، typography/fonts مرخصة، icon/brand asset set، component states، responsive snapshots لكل route، visual regression، وقواعد motion موحدة مع`
- `49: لا يمكن إعلان 100% قبل أن تصل contract packs التالية من Backend: auth/onboarding، transactional pharmacy/order/payment، booking/realtime/video، diagnostics media/results/tracking، insurance payment/claims/documents، family permissions، AI/m`
### backend_consumers_or_contracts
- `9: تم تنفيذ login وserver-side session و2FA verification، pharmacy/orders read-only، cart/checkout/prescription previews read-only، order tracking، appointments list/detail، diagnostics list/detail، health score informational، health reports m`
- `11: آخر slice أضاف `GET /insurance/claims` مع BFF GET-only allowlist وparser يسمح فقط بـ `id/service/status/date`. لا تُعرض patient identifiers أو amounts أو covered values أو documents أو payment/refund actions.`
- `31: | Orders/Wallet/Loyalty/Returns/Support | refunds، wallet، top-up، loyalty، returns، reviews، tickets/support chat | payment/PCI/webhook/audit/SLA contracts ناقصة |`
### auth_ownership
- `9: تم تنفيذ login وserver-side session و2FA verification، pharmacy/orders read-only، cart/checkout/prescription previews read-only، order tracking، appointments list/detail، diagnostics list/detail، health score informational، health reports m`
- `15: لم يُعثر في browser-facing production code على `mock`, `fake`, `dummy`, `fixture` أو seed patient data. truthful-runtime gate نجح على 195 ملف production source. القيم الثابتة الموجودة هي labels، status translations، empty/error copy، design`
- `23: | Auth/onboarding | register، forgot/reset password، resend/expiry/lockout، consent، provider onboarding | عقود DTO وحالات 429 وrefresh/logout متعدد الأجهزة لم تُثبت حية بالكامل |`
- `24: | Consultations | doctor/provider search، slot locking، booking/cancel/reschedule، waiting room، LiveKit/video، doctor chat، rating | mutations وrealtime/video ownership/idempotency غير مغلقة |`
- `26: | Diagnostics | packages/search/compare، sample booking، tracking، insurance upload/approval، reports/results، protected PDF | media authorization، logistics status machine، upload/download contracts غير مثبتة |`
- `27: | Family | invite/join/permissions/consent، member health، family chat/calendar | membership authorization وconsent/audit contracts ناقصة |`
- `33: | Operations | Staging E2E، deployment/rollback/monitoring، CSP/HSTS/CSRF/rate-limit، pen test، Web Vitals | البيئة الحية والحسابات وعمليات التشغيل لم تُفتح بعد |`
- `41: للوصول إلى مستوى premium عالمي قابل للدفاع عنه يلزم design source of truth: Figma أو token spec نهائي، typography/fonts مرخصة، icon/brand asset set، component states، responsive snapshots لكل route، visual regression، وقواعد motion موحدة مع`
- `49: لا يمكن إعلان 100% قبل أن تصل contract packs التالية من Backend: auth/onboarding، transactional pharmacy/order/payment، booking/realtime/video، diagnostics media/results/tracking، insurance payment/claims/documents، family permissions، AI/m`
### state_transitions
- `11: آخر slice أضاف `GET /insurance/claims` مع BFF GET-only allowlist وparser يسمح فقط بـ `id/service/status/date`. لا تُعرض patient identifiers أو amounts أو covered values أو documents أو payment/refund actions.`
- `15: لم يُعثر في browser-facing production code على `mock`, `fake`, `dummy`, `fixture` أو seed patient data. truthful-runtime gate نجح على 195 ملف production source. القيم الثابتة الموجودة هي labels، status translations، empty/error copy، design`
- `24: | Consultations | doctor/provider search، slot locking، booking/cancel/reschedule، waiting room، LiveKit/video، doctor chat، rating | mutations وrealtime/video ownership/idempotency غير مغلقة |`
- `26: | Diagnostics | packages/search/compare، sample booking، tracking، insurance upload/approval، reports/results، protected PDF | media authorization، logistics status machine، upload/download contracts غير مثبتة |`
- `28: | Insurance | add policy، coverage check، network providers، submit claim، copay/payment split، refund | sensitive documents والـfinancial mutation contracts غير مثبتة |`
- `31: | Orders/Wallet/Loyalty/Returns/Support | refunds، wallet، top-up، loyalty، returns، reviews، tickets/support chat | payment/PCI/webhook/audit/SLA contracts ناقصة |`
- `37: الأساس الحالي **premium ومرتب**: palette صحية فاتحة teal/ink، typography واضحة، cards ذات radius وظلال ناعمة، vector icons، hierarchy جيد، RTL/i18n بست لغات، وحالات empty/error/forbidden صريحة. الفحص البصري للصفحة العامة وشاشة الدخول أكد أن`
- `39: لكن لا يصح القول إن التصميم “الأفضل عالميًا” أو إنه حصل على ترتيب/score أو أنه لا يشبه أي تطبيق؛ لم يُجرَ benchmark رسمي مع Figma أو design award rubric. كما أن الـanimation الحالية محدودة غالبًا في transitions وhover وبعض reduced-motion ru`
- `41: للوصول إلى مستوى premium عالمي قابل للدفاع عنه يلزم design source of truth: Figma أو token spec نهائي، typography/fonts مرخصة، icon/brand asset set، component states، responsive snapshots لكل route، visual regression، وقواعد motion موحدة مع`
### payment_insurance_relevance
- `9: تم تنفيذ login وserver-side session و2FA verification، pharmacy/orders read-only، cart/checkout/prescription previews read-only، order tracking، appointments list/detail، diagnostics list/detail، health score informational، health reports m`
- `11: آخر slice أضاف `GET /insurance/claims` مع BFF GET-only allowlist وparser يسمح فقط بـ `id/service/status/date`. لا تُعرض patient identifiers أو amounts أو covered values أو documents أو payment/refund actions.`
- `25: | Pharmacy | add-to-cart، prescription scan/OCR، checkout، payment، reorder، pharmacist chat، coupon/address | payment/webhook/protected-media/idempotency contracts غير مثبتة |`
- `26: | Diagnostics | packages/search/compare، sample booking، tracking، insurance upload/approval، reports/results، protected PDF | media authorization، logistics status machine، upload/download contracts غير مثبتة |`
- `28: | Insurance | add policy، coverage check، network providers، submit claim، copay/payment split، refund | sensitive documents والـfinancial mutation contracts غير مثبتة |`
- `31: | Orders/Wallet/Loyalty/Returns/Support | refunds، wallet، top-up، loyalty، returns، reviews، tickets/support chat | payment/PCI/webhook/audit/SLA contracts ناقصة |`
- `37: الأساس الحالي **premium ومرتب**: palette صحية فاتحة teal/ink، typography واضحة، cards ذات radius وظلال ناعمة، vector icons، hierarchy جيد، RTL/i18n بست لغات، وحالات empty/error/forbidden صريحة. الفحص البصري للصفحة العامة وشاشة الدخول أكد أن`
- `49: لا يمكن إعلان 100% قبل أن تصل contract packs التالية من Backend: auth/onboarding، transactional pharmacy/order/payment، booking/realtime/video، diagnostics media/results/tracking، insurance payment/claims/documents، family permissions، AI/m`
### error_empty_loading_retry_cancel
- `15: لم يُعثر في browser-facing production code على `mock`, `fake`, `dummy`, `fixture` أو seed patient data. truthful-runtime gate نجح على 195 ملف production source. القيم الثابتة الموجودة هي labels، status translations، empty/error copy، design`
- `24: | Consultations | doctor/provider search، slot locking، booking/cancel/reschedule، waiting room، LiveKit/video، doctor chat، rating | mutations وrealtime/video ownership/idempotency غير مغلقة |`
- `37: الأساس الحالي **premium ومرتب**: palette صحية فاتحة teal/ink، typography واضحة، cards ذات radius وظلال ناعمة، vector icons، hierarchy جيد، RTL/i18n بست لغات، وحالات empty/error/forbidden صريحة. الفحص البصري للصفحة العامة وشاشة الدخول أكد أن`
- `39: لكن لا يصح القول إن التصميم “الأفضل عالميًا” أو إنه حصل على ترتيب/score أو أنه لا يشبه أي تطبيق؛ لم يُجرَ benchmark رسمي مع Figma أو design award rubric. كما أن الـanimation الحالية محدودة غالبًا في transitions وhover وبعض reduced-motion ru`
- `45: بعد إصلاح timeout لاختبار Dashboard SSR، نجحت full Vitest: **65 test files passed، 14 skipped، 119 tests passed، 23 skipped**. نجح truthful-runtime gate على **195 production files**، وTypeScript، وproduction build، وdiff check. نجاح هذه الا`
- `49: لا يمكن إعلان 100% قبل أن تصل contract packs التالية من Backend: auth/onboarding، transactional pharmacy/order/payment، booking/realtime/video، diagnostics media/results/tracking، insurance payment/claims/documents، family permissions، AI/m`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
