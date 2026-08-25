# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_COMPLETE_GAP_INVENTORY_AND_PLAN_AR.md`
- **Member SHA-256:** `209519378681ac7ff83220cc81259af309e7a18bd53898680bd4581ce46244a1`
- **Line count:** 164
- **Read range:** `1-164`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: الجرد الخام يحتوي على **250 ملف شاشة/route في Mobile** و**27 ملف route في Web**، منها صفحات المستخدم وصفحات API والبنية المساعدة. لذلك فإن المقارنة الحالية هي parity جزئية موثقة، وليست إعادة بناء كاملة لكل سطح Mobile.`
- `19: | مسار Diagnostics القديم `diagnostics/upload-rx.tsx` كان placeholder باسم Upload | الملف الحالي يوجه إلى `/pharmacy/scan-prescription`. **تم تحويله إلى redirect، لكنه ليس شاشة مستقلة ولا يثبت وجود Web upload contract.** |`
- `20: | مسار `consultations/video/[id].tsx` كان placeholder باسم `VideoCall - s64` | الملف الحالي يوجه إلى LiveKit route الحقيقي `/consultations/video-call`. **تم تحويله إلى redirect، لكن Web video consultation غير مبني.** |`
- `26: توجد في Mobile رحلات تعتمد على polling/timers، مثل booking pending وinsurance approval وincoming call. هذا ليس دليلًا وحده على وجود bug، لكنه يحتاج اختبار cleanup عند unmount، timeout، retry، duplicate submission، app background، وانقطاع ال`
- `38: Web لديه login، لكنه لا يطابق كامل Mobile auth/onboarding. الناقص يشمل welcome، register، forgot-password، OTP، reset-password، provider-info، privacy، terms، onboarding language، onboarding permissions، وتدفقات التحقق الإضافي.`
- `44: Web لديه قائمة المواعيد وتفاصيل read-only. الناقص من Mobile يشمل doctor search، specialty select، doctor profile، clinic profile/location، offer detail، booking form، booking confirmation، booking pending، booking success، cancel/reschedule`
- `46: هذه ليست مجرد صفحات UI؛ هي flows فيها slot locking، booking mutation، payments أو insurance، notifications، realtime/video provider، cancellation rules، idempotency، وownership. لذلك تحتاج APIs قبل البناء.`
- `56: Web لديه public/private read-only catalog وmedicine detail. الناقص من Mobile يشمل product search/filters/compare/detail، barcode scanner، drug-not-found، custom item، manual order، cart، wishlist، checkout، address select، coupon، payment، `
- `58: المطلوب: catalog/availability/pricing APIs، cart lifecycle، order lifecycle، upload/OCR، protected media، pharmacy ownership، payment provider، webhook verification، coupon rules، delivery/address contract، chat contract، وaudit trail. لا ي`
- `62: Web لديه قائمة حجوزات وتفاصيل booking read-only. الناقص يشمل search، packages، package detail، lab comparison، lab detail، test detail، book sample، cart، checkout، booking confirm/success، insurance approval/upload، orders، order detail، s`
- `64: المطلوب هو catalog/booking/order/report contracts، protected documents، pricing/insurance approval، sample logistics، download authorization، وstatus transition rules.`
- `74: Mobile يحتوي hub وpolicy detail وadd policy وcoverage check وnetwork providers وbenefits summary وcopay وpayment split وsubmit claim وclaim tracking وapproval pending وrefund status. لا توجد هذه الرحلة كـWeb production surface.`
### backend_consumers_or_contracts
- `19: | مسار Diagnostics القديم `diagnostics/upload-rx.tsx` كان placeholder باسم Upload | الملف الحالي يوجه إلى `/pharmacy/scan-prescription`. **تم تحويله إلى redirect، لكنه ليس شاشة مستقلة ولا يثبت وجود Web upload contract.** |`
- `64: المطلوب هو catalog/booking/order/report contracts، protected documents، pricing/insurance approval، sample logistics، download authorization، وstatus transition rules.`
- `98: الناقص يشمل articles list/detail/bookmarks، community hub/post detail، global search، services index، settings about/data/feedback/help/language/privacy/security/notifications/support chat/terms، notification actions، وaccount data export/d`
- `142: ننفذ auth/session أولًا، ثم catalog/search، ثم appointments/diagnostics/home-care، ثم pharmacy/orders/payments، ثم health/family/insurance، ثم chat/realtime/AI. كل مرحلة تشمل parser allowlist، server boundary، authorization tests، error sta`
- `146: نبني المسارات الناقصة حسب الأولوية: auth/onboarding، consultations booking، diagnostics checkout/results، pharmacy cart/checkout، family permissions، insurance، health detail/reminders، chat/video، payments/wallet، ثم content/AI/nutrition/m`
### auth_ownership
- `38: Web لديه login، لكنه لا يطابق كامل Mobile auth/onboarding. الناقص يشمل welcome، register، forgot-password، OTP، reset-password، provider-info، privacy، terms، onboarding language، onboarding permissions، وتدفقات التحقق الإضافي.`
- `40: المطلوب هو Auth contract كامل يحدد registration DTO، OTP issuance/verification/resend/expiry، reset tokens، consent records، provider selection، session refresh، lockout/rate limit، وحالات 401/403/429.`
- `46: هذه ليست مجرد صفحات UI؛ هي flows فيها slot locking، booking mutation، payments أو insurance، notifications، realtime/video provider، cancellation rules، idempotency، وownership. لذلك تحتاج APIs قبل البناء.`
- `58: المطلوب: catalog/availability/pricing APIs، cart lifecycle، order lifecycle، upload/OCR، protected media، pharmacy ownership، payment provider، webhook verification، coupon rules، delivery/address contract، chat contract، وaudit trail. لا ي`
- `64: المطلوب هو catalog/booking/order/report contracts، protected documents، pricing/insurance approval، sample logistics، download authorization، وstatus transition rules.`
- `68: Web يعرض قائمة read-only محدودة. الناقص يشمل family hub الكامل، invite، join، scan/code، permissions، permission request، member health، emergency contacts، family chat، calendar، shared calendar، add family member، وربط المواعيد والتنبيهات`
- `70: المطلوب هو membership authorization وinvitation lifecycle وrole/permission matrix وhealth-data consent وcalendar/chat contracts وaudit logs.`
- `76: المطلوب هو policy/coverage/claim/payment/refund contracts، protected documents، provider network source، policy ownership، وقيود البيانات المالية والتأمينية.`
- `88: هذه الرحلات تحتاج health data contracts، device permissions، location consent، background processing، emergency escalation، وواجهات تكامل خارجية قبل بناء Web.`
- `94: المطلوب هو payment and wallet contracts، PCI boundary، webhook/idempotency، refund/return state machine، loyalty balance/event contract، offers validity، support ownership، وaudit logs.`
- `100: هذه تحتاج content API، moderation/permissions، search indexing، privacy/legal consent، data export/deletion contract، وsupport SLA.`
- `111: | Auth runtime | login الحقيقي، OTP، refresh، expiry، logout من أجهزة متعددة، lockout، cookie domain وSameSite وSecure. |`
### state_transitions
- `17: | Reports كان يعرض array ثابتة فيها مختبرات وتواريخ وعدد abnormal counts مصطنعة، وكان يمرر `reportId` لا تقرؤه شاشة التفاصيل | تعليق `reports/hub.tsx` يذكر أن النسخة السابقة كانت hardcoded/fabricated، وأنها استبدلت بـ`/medical-reports/mine?`
- `26: توجد في Mobile رحلات تعتمد على polling/timers، مثل booking pending وinsurance approval وincoming call. هذا ليس دليلًا وحده على وجود bug، لكنه يحتاج اختبار cleanup عند unmount، timeout، retry، duplicate submission، app background، وانقطاع ال`
- `28: توجد كذلك fallback labels مثل `مريض نبض` عندما لا يأتي اسم المستخدم، وحالات empty مثل لا توجد نتائج أو لا توجد أدوية. هذه ليست سجلات مريض وهمية، لكنها تحتاج مراجعة UX حتى لا يختلط fallback label مع بيانات حقيقية.`
- `44: Web لديه قائمة المواعيد وتفاصيل read-only. الناقص من Mobile يشمل doctor search، specialty select، doctor profile، clinic profile/location، offer detail، booking form، booking confirmation، booking pending، booking success، cancel/reschedule`
- `46: هذه ليست مجرد صفحات UI؛ هي flows فيها slot locking، booking mutation، payments أو insurance، notifications، realtime/video provider، cancellation rules، idempotency، وownership. لذلك تحتاج APIs قبل البناء.`
- `56: Web لديه public/private read-only catalog وmedicine detail. الناقص من Mobile يشمل product search/filters/compare/detail، barcode scanner، drug-not-found، custom item، manual order، cart، wishlist، checkout، address select، coupon، payment، `
- `62: Web لديه قائمة حجوزات وتفاصيل booking read-only. الناقص يشمل search، packages، package detail، lab comparison، lab detail، test detail، book sample، cart، checkout، booking confirm/success، insurance approval/upload، orders، order detail، s`
- `64: المطلوب هو catalog/booking/order/report contracts، protected documents، pricing/insurance approval، sample logistics، download authorization، وstatus transition rules.`
- `74: Mobile يحتوي hub وpolicy detail وadd policy وcoverage check وnetwork providers وbenefits summary وcopay وpayment split وsubmit claim وclaim tracking وapproval pending وrefund status. لا توجد هذه الرحلة كـWeb production surface.`
- `76: المطلوب هو policy/coverage/claim/payment/refund contracts، protected documents، provider network source، policy ownership، وقيود البيانات المالية والتأمينية.`
- `92: Web يعرض orders read-only محدودًا. الناقص من Mobile يشمل order history/detail/tracking/cancel/refund، payment success/failed/processing/failure، wallet hub/cards/topup/transactions/transfer، loyalty hub/challenges/leaderboard/referrals/rewa`
- `94: المطلوب هو payment and wallet contracts، PCI boundary، webhook/idempotency، refund/return state machine، loyalty balance/event contract، offers validity، support ownership، وaudit logs.`
### payment_insurance_relevance
- `26: توجد في Mobile رحلات تعتمد على polling/timers، مثل booking pending وinsurance approval وincoming call. هذا ليس دليلًا وحده على وجود bug، لكنه يحتاج اختبار cleanup عند unmount، timeout، retry، duplicate submission، app background، وانقطاع ال`
- `44: Web لديه قائمة المواعيد وتفاصيل read-only. الناقص من Mobile يشمل doctor search، specialty select، doctor profile، clinic profile/location، offer detail، booking form، booking confirmation، booking pending، booking success، cancel/reschedule`
- `46: هذه ليست مجرد صفحات UI؛ هي flows فيها slot locking، booking mutation، payments أو insurance، notifications، realtime/video provider، cancellation rules، idempotency، وownership. لذلك تحتاج APIs قبل البناء.`
- `56: Web لديه public/private read-only catalog وmedicine detail. الناقص من Mobile يشمل product search/filters/compare/detail، barcode scanner، drug-not-found، custom item، manual order، cart، wishlist، checkout، address select، coupon، payment، `
- `58: المطلوب: catalog/availability/pricing APIs، cart lifecycle، order lifecycle، upload/OCR، protected media، pharmacy ownership، payment provider، webhook verification، coupon rules، delivery/address contract، chat contract، وaudit trail. لا ي`
- `62: Web لديه قائمة حجوزات وتفاصيل booking read-only. الناقص يشمل search، packages، package detail، lab comparison، lab detail، test detail، book sample، cart، checkout، booking confirm/success، insurance approval/upload، orders، order detail، s`
- `64: المطلوب هو catalog/booking/order/report contracts، protected documents، pricing/insurance approval، sample logistics، download authorization، وstatus transition rules.`
- `72: ### 3.7 Insurance`
- `74: Mobile يحتوي hub وpolicy detail وadd policy وcoverage check وnetwork providers وbenefits summary وcopay وpayment split وsubmit claim وclaim tracking وapproval pending وrefund status. لا توجد هذه الرحلة كـWeb production surface.`
- `76: المطلوب هو policy/coverage/claim/payment/refund contracts، protected documents، provider network source، policy ownership، وقيود البيانات المالية والتأمينية.`
- `90: ### 3.10 Orders وPayments وWallet وLoyalty وReturns`
- `92: Web يعرض orders read-only محدودًا. الناقص من Mobile يشمل order history/detail/tracking/cancel/refund، payment success/failed/processing/failure، wallet hub/cards/topup/transactions/transfer، loyalty hub/challenges/leaderboard/referrals/rewa`
### error_empty_loading_retry_cancel
- `17: | Reports كان يعرض array ثابتة فيها مختبرات وتواريخ وعدد abnormal counts مصطنعة، وكان يمرر `reportId` لا تقرؤه شاشة التفاصيل | تعليق `reports/hub.tsx` يذكر أن النسخة السابقة كانت hardcoded/fabricated، وأنها استبدلت بـ`/medical-reports/mine?`
- `26: توجد في Mobile رحلات تعتمد على polling/timers، مثل booking pending وinsurance approval وincoming call. هذا ليس دليلًا وحده على وجود bug، لكنه يحتاج اختبار cleanup عند unmount، timeout، retry، duplicate submission، app background، وانقطاع ال`
- `28: توجد كذلك fallback labels مثل `مريض نبض` عندما لا يأتي اسم المستخدم، وحالات empty مثل لا توجد نتائج أو لا توجد أدوية. هذه ليست سجلات مريض وهمية، لكنها تحتاج مراجعة UX حتى لا يختلط fallback label مع بيانات حقيقية.`
- `44: Web لديه قائمة المواعيد وتفاصيل read-only. الناقص من Mobile يشمل doctor search، specialty select، doctor profile، clinic profile/location، offer detail، booking form، booking confirmation، booking pending، booking success، cancel/reschedule`
- `46: هذه ليست مجرد صفحات UI؛ هي flows فيها slot locking، booking mutation، payments أو insurance، notifications، realtime/video provider، cancellation rules، idempotency، وownership. لذلك تحتاج APIs قبل البناء.`
- `74: Mobile يحتوي hub وpolicy detail وadd policy وcoverage check وnetwork providers وbenefits summary وcopay وpayment split وsubmit claim وclaim tracking وapproval pending وrefund status. لا توجد هذه الرحلة كـWeb production surface.`
- `92: Web يعرض orders read-only محدودًا. الناقص من Mobile يشمل order history/detail/tracking/cancel/refund، payment success/failed/processing/failure، wallet hub/cards/topup/transactions/transfer، loyalty hub/challenges/leaderboard/referrals/rewa`
- `112: | E2E | السيناريوهات الكاملة عبر browser على desktop/mobile، وكل حالات empty/loading/error/401/403/404/429/5xx. |`
- `114: | Accessibility | keyboard navigation، screen reader، focus order، contrast، reduced motion، form errors، وsemantic landmarks على كل route. |`
- `122: نحتاج API contract pack مكتوبًا لكل مجموعة: endpoint وmethod وauth requirement وrequest/response DTO وerror schema وownership rule وpagination/filtering وidempotency وrate limits وaudit requirements وprotected media policy. يجب أن يكون لكل `
- `132: سنحتاج بعد ذلك إلى تحويل كل route إلى component inventory موحد، ثم إضافة loading skeletons، empty/error/forbidden states، focus/hover/pressed states، route transitions، staggered card entrance، subtle sheet/modal transitions، reduced-motion`
- `142: ننفذ auth/session أولًا، ثم catalog/search، ثم appointments/diagnostics/home-care، ثم pharmacy/orders/payments، ثم health/family/insurance، ثم chat/realtime/AI. كل مرحلة تشمل parser allowlist، server boundary، authorization tests، error sta`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
