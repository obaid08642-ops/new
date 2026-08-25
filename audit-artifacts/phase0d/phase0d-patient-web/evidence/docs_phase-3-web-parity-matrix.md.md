# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-3-web-parity-matrix.md`
- **Member SHA-256:** `7569a91bd9ac2b2503bc8c11cb998937c4375adbfe2d85cf1f41442fc00179c5`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: | الهوية والجلسة | welcome، تسجيل/دخول، OTP، reset، onboarding، route guards، انتهاء/تجديد | auth + `SessionManager` + JWT guards | خاص `noindex` | مخطط | auth mode مؤكد وOTP/refresh/revoke واختبارات rejection. |`
- `9: | shell والتنقل | header، desktop nav، mobile nav، language/theme، notifications | root/tab layouts + users/settings | خاص `noindex` | مخطط | كل رابط له escape route وحالة auth/role سليمة وRTL/LTR. |`
- `10: | ملف المريض | profile، photo، addresses، privacy/security/notifications/sessions | `users/me/*` + addresses | خاص `noindex` | مخطط | fetch/update/logout/revoke حقيقة، لا cache حساس غير محمي. |`
- `14: | الصيدلية | catalog/search/filters/detail/compare/scanner/wishlist/cart/Rx/upload/orders/tracking/reorder/returns | medicines/cart/prescriptions/orders/returns | عام فقط للمنتج المنشور؛ المعاملة خاص | مخطط | prices/Rx/availability من respo`
- `15: | الاستشارات | discovery، doctor/facility details، slots، booking، waitlist، cancel/reschedule/check-in/summary | `care/*` + appointments | public entity eligibility only؛ الحجز خاص | مخطط | slot-lock/cancel/reschedule/errors/roles/E2E حقيق`
- `16: | المختبر والأشعة | catalog/packages/tests/booking/documents/insurance/results/tracking | labs/radiology controllers | catalog عام مؤهل؛ النتائج خاصة | مخطط | filters server-side، route الوثائق والنتائج protected/noindex. |`
- `17: | الرعاية المنزلية والتمريض | service/provider detail، booking، tracking | `home-care/*` بعد المطابقة | public service eligibility only؛ booking خاص | مخطط | لا مزود وهمي ولا real-time ظاهر حتى token/event مثبت. |`
- `18: | التأمين | policy/companies/network/benefits/coverage/claims/approvals/payment split/refunds | insurance controllers/API doc مطلوب | خاص `noindex` | مخطط | companies/plans/live coverage response حقيقية؛ لا قوائم تأمين ثابتة. |`
- `20: | التقارير والوثائق | list/timeline/view/download/AI analysis/passport | medical reports/storage contracts | خاص `noindex` | مخطط | authorization owner-check، signed URLs، audit trail، لا file bytes في DB/UI state. |`
- `23: | الصحة النفسية والتغذية والأمومة | tracker/journal/crisis/nutrition/pregnancy | mental/nutrition/maternity contracts | خاص `noindex` | مخطط | حساسية البيانات وضوابط العرض، crisis route آمن، لا نصائح متخيلة. |`
- `25: | المحتوى العام والاكتشاف | articles + published provider/facility/service/medicine pages | articles + SEO resolver + publish status | عام فقط بعد eligibility | مخطط | SSR/metadata/JSON-LD/sitemap/hreflang/canonical، منع جميع routes الخاصة.`
- `27: ## حالات موحدة إلزامية لكل route`
### backend_consumers_or_contracts
- `10: | ملف المريض | profile، photo، addresses، privacy/security/notifications/sessions | `users/me/*` + addresses | خاص `noindex` | مخطط | fetch/update/logout/revoke حقيقة، لا cache حساس غير محمي. |`
- `14: | الصيدلية | catalog/search/filters/detail/compare/scanner/wishlist/cart/Rx/upload/orders/tracking/reorder/returns | medicines/cart/prescriptions/orders/returns | عام فقط للمنتج المنشور؛ المعاملة خاص | مخطط | prices/Rx/availability من respo`
- `16: | المختبر والأشعة | catalog/packages/tests/booking/documents/insurance/results/tracking | labs/radiology controllers | catalog عام مؤهل؛ النتائج خاصة | مخطط | filters server-side، route الوثائق والنتائج protected/noindex. |`
- `21: | المكالمات والمحادثة | doctor/family chat، waiting room، video/voice/call history | Socket/LiveKit contracts/API doc مطلوب | خاص `noindex` | مخطط | room token + authz + reconnect + unavailable/denied/ended states. |`
### auth_ownership
- `4: **النطاق:** Web App المريض فقط. لا يشمل تحويل Admin أو Provider إلى الويب.`
- `8: | الهوية والجلسة | welcome، تسجيل/دخول، OTP، reset، onboarding، route guards، انتهاء/تجديد | auth + `SessionManager` + JWT guards | خاص `noindex` | مخطط | auth mode مؤكد وOTP/refresh/revoke واختبارات rejection. |`
- `9: | shell والتنقل | header، desktop nav، mobile nav، language/theme، notifications | root/tab layouts + users/settings | خاص `noindex` | مخطط | كل رابط له escape route وحالة auth/role سليمة وRTL/LTR. |`
- `10: | ملف المريض | profile، photo، addresses، privacy/security/notifications/sessions | `users/me/*` + addresses | خاص `noindex` | مخطط | fetch/update/logout/revoke حقيقة، لا cache حساس غير محمي. |`
- `13: | العائلة | group/invite/join/members/permissions/calendar/member health | `family/*` + `NoGuestsGuard` | خاص `noindex` | مخطط | role boundary يختبر server-side، reject/pending/approved scenarios كلها مرئية. |`
- `15: | الاستشارات | discovery، doctor/facility details، slots، booking، waitlist، cancel/reschedule/check-in/summary | `care/*` + appointments | public entity eligibility only؛ الحجز خاص | مخطط | slot-lock/cancel/reschedule/errors/roles/E2E حقيق`
- `17: | الرعاية المنزلية والتمريض | service/provider detail، booking، tracking | `home-care/*` بعد المطابقة | public service eligibility only؛ booking خاص | مخطط | لا مزود وهمي ولا real-time ظاهر حتى token/event مثبت. |`
- `19: | الدفع والمحفظة | payment status/cards/transactions/topup/transfer | wallet/payment contracts/API doc مطلوب | خاص `noindex` | مخطط | tokenization/3DS/webhook boundaries مثبتة؛ لا أرقام بطاقات أو success simulation. |`
- `20: | التقارير والوثائق | list/timeline/view/download/AI analysis/passport | medical reports/storage contracts | خاص `noindex` | مخطط | authorization owner-check، signed URLs، audit trail، لا file bytes في DB/UI state. |`
- `21: | المكالمات والمحادثة | doctor/family chat، waiting room، video/voice/call history | Socket/LiveKit contracts/API doc مطلوب | خاص `noindex` | مخطط | room token + authz + reconnect + unavailable/denied/ended states. |`
### state_transitions
- `12: | الصحة والتذكيرات | vitals/sleep/trends/score/reports/prescriptions/reminders/refills/contacts | `health/*` | خاص `noindex` | مخطط | real error/empty states، event timestamps واضحة، قناة reminder ويب مثبتة. |`
- `13: | العائلة | group/invite/join/members/permissions/calendar/member health | `family/*` + `NoGuestsGuard` | خاص `noindex` | مخطط | role boundary يختبر server-side، reject/pending/approved scenarios كلها مرئية. |`
- `15: | الاستشارات | discovery، doctor/facility details، slots، booking، waitlist، cancel/reschedule/check-in/summary | `care/*` + appointments | public entity eligibility only؛ الحجز خاص | مخطط | slot-lock/cancel/reschedule/errors/roles/E2E حقيق`
- `18: | التأمين | policy/companies/network/benefits/coverage/claims/approvals/payment split/refunds | insurance controllers/API doc مطلوب | خاص `noindex` | مخطط | companies/plans/live coverage response حقيقية؛ لا قوائم تأمين ثابتة. |`
- `19: | الدفع والمحفظة | payment status/cards/transactions/topup/transfer | wallet/payment contracts/API doc مطلوب | خاص `noindex` | مخطط | tokenization/3DS/webhook boundaries مثبتة؛ لا أرقام بطاقات أو success simulation. |`
- `20: | التقارير والوثائق | list/timeline/view/download/AI analysis/passport | medical reports/storage contracts | خاص `noindex` | مخطط | authorization owner-check، signed URLs، audit trail، لا file bytes في DB/UI state. |`
- `21: | المكالمات والمحادثة | doctor/family chat، waiting room، video/voice/call history | Socket/LiveKit contracts/API doc مطلوب | خاص `noindex` | مخطط | room token + authz + reconnect + unavailable/denied/ended states. |`
- `22: | AI الصحي | triage/symptom/skin/Rx OCR/translate/monthly report | ai endpoints/consent requirements | خاص `noindex` | مخطط | input consent، refusal/error/scoping، عدم الادعاء بالتشخيص، audit/error path. |`
- `24: | الدعم/المجتمع/الولاء/الإحالات | feedback/tickets/community/reviews/rewards/referrals | support/community/loyalty/referrals | public CMS فقط إن نشر؛ account خاص | مخطط | UGC أصلي فقط، moderation/empty/error، لا reviews مصطنعة. |`
- `25: | المحتوى العام والاكتشاف | articles + published provider/facility/service/medicine pages | articles + SEO resolver + publish status | عام فقط بعد eligibility | مخطط | SSR/metadata/JSON-LD/sitemap/hreflang/canonical، منع جميع routes الخاصة.`
- `29: كل مسار خاص أو عام سيحمل تمييزاً عملياً بين: `loading`، `ready`، `empty`، `recoverable error`، `offline/cached if supported`، `unauthorized`، `forbidden`، `not found`، و`mutation pending/success/failure`. لا يستخدم `catch` صامت، قائمة صفرية`
### payment_insurance_relevance
- `14: | الصيدلية | catalog/search/filters/detail/compare/scanner/wishlist/cart/Rx/upload/orders/tracking/reorder/returns | medicines/cart/prescriptions/orders/returns | عام فقط للمنتج المنشور؛ المعاملة خاص | مخطط | prices/Rx/availability من respo`
- `16: | المختبر والأشعة | catalog/packages/tests/booking/documents/insurance/results/tracking | labs/radiology controllers | catalog عام مؤهل؛ النتائج خاصة | مخطط | filters server-side، route الوثائق والنتائج protected/noindex. |`
- `18: | التأمين | policy/companies/network/benefits/coverage/claims/approvals/payment split/refunds | insurance controllers/API doc مطلوب | خاص `noindex` | مخطط | companies/plans/live coverage response حقيقية؛ لا قوائم تأمين ثابتة. |`
- `19: | الدفع والمحفظة | payment status/cards/transactions/topup/transfer | wallet/payment contracts/API doc مطلوب | خاص `noindex` | مخطط | tokenization/3DS/webhook boundaries مثبتة؛ لا أرقام بطاقات أو success simulation. |`
### error_empty_loading_retry_cancel
- `12: | الصحة والتذكيرات | vitals/sleep/trends/score/reports/prescriptions/reminders/refills/contacts | `health/*` | خاص `noindex` | مخطط | real error/empty states، event timestamps واضحة، قناة reminder ويب مثبتة. |`
- `13: | العائلة | group/invite/join/members/permissions/calendar/member health | `family/*` + `NoGuestsGuard` | خاص `noindex` | مخطط | role boundary يختبر server-side، reject/pending/approved scenarios كلها مرئية. |`
- `15: | الاستشارات | discovery، doctor/facility details، slots، booking، waitlist، cancel/reschedule/check-in/summary | `care/*` + appointments | public entity eligibility only؛ الحجز خاص | مخطط | slot-lock/cancel/reschedule/errors/roles/E2E حقيق`
- `22: | AI الصحي | triage/symptom/skin/Rx OCR/translate/monthly report | ai endpoints/consent requirements | خاص `noindex` | مخطط | input consent، refusal/error/scoping، عدم الادعاء بالتشخيص، audit/error path. |`
- `24: | الدعم/المجتمع/الولاء/الإحالات | feedback/tickets/community/reviews/rewards/referrals | support/community/loyalty/referrals | public CMS فقط إن نشر؛ account خاص | مخطط | UGC أصلي فقط، moderation/empty/error، لا reviews مصطنعة. |`
- `29: كل مسار خاص أو عام سيحمل تمييزاً عملياً بين: `loading`، `ready`، `empty`، `recoverable error`، `offline/cached if supported`، `unauthorized`، `forbidden`، `not found`، و`mutation pending/success/failure`. لا يستخدم `catch` صامت، قائمة صفرية`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
