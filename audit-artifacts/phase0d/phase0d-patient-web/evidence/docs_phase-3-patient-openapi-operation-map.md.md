# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-3-patient-openapi-operation-map.md`
- **Member SHA-256:** `29923aeced1e33712f14b728a17fe868c8e01e2205493fbef708306792d636fe`
- **Line count:** 138
- **Read range:** `1-138`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: **نطاق الربط:** 122 استدعاء ثابت فريد استخرج من routes والمصدر، لا يشمل admin/provider غير المطلوبين في Web App المريض.`
- `5: > لا تحمل مواصفة OpenAPI annotations أمن كافية لجميع العمليات؛ لذلك لا تستنتج الواجهة صلاحية من غيابها. تعتمد حماية route على الدليل وguards الخادم واختبار Sandbox.`
- `10: | `/ai/ocr-translate` | app/diagnostics/insurance-upload.tsx | `/ai/ocr-translate` | POST AiController_ocrTranslate_v1 | Ai | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `14: | `/articles/bookmarks/mine` | app/articles/bookmarks.tsx | `/articles/bookmarks/mine` | GET ArticleBookmarksController_mine_v1 | ArticleBookmarks | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل`
- `17: | `/auth/login` | app/(auth)/login.tsx | `/auth/login` | POST AuthController_login_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `18: | `/auth/register` | app/(auth)/otp.tsx | `/auth/register` | POST AuthController_register_v1 | Auth | application/json | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `20: | `/auth/send-otp` | app/(auth)/forgot-password.tsx<br>app/(auth)/register.tsx | `/auth/send-otp` | POST AuthController_sendOtp_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI produ`
- `21: | `/auth/social-login` | app/(auth)/login.tsx<br>app/(auth)/register.tsx | `/auth/social-login` | POST AuthController_socialLogin_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI pro`
- `30: | `/chat/threads/booking` | app/pharmacy/chat-with-pharmacist.tsx | `/chat/threads/booking` | POST ChatController_createBooking[0]_v1 | Chat | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI pr`
- `45: | `/finance-engine/coupons/validate` | app/pharmacy/checkout.tsx | `/finance-engine/coupons/validate` | POST FinanceEngineController_validateCoupon_v1 | FinanceEngine | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/ru`
- `46: | `/finance-engine/loyalty/redeem-quote` | app/pharmacy/checkout.tsx | `/finance-engine/loyalty/redeem-quote` | POST FinanceEngineController_loyaltyQuote_v1 | FinanceEngine | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/b`
- `59: | `/home-care/bookings` | app/nursing/nurse-profile.tsx | `/home-care/bookings` | POST HomeCareCompatController_createBooking_v1 | HomeCareCompat | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل `
### backend_consumers_or_contracts
- `10: | `/ai/ocr-translate` | app/diagnostics/insurance-upload.tsx | `/ai/ocr-translate` | POST AiController_ocrTranslate_v1 | Ai | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `11: | `/ai/prescription-ocr` | app/pharmacy/scan-prescription.tsx | `/ai/prescription-ocr` | POST AiController_ocr_v1 | Ai | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `16: | `/auth/guest` | app/(auth)/welcome.tsx<br>app/_layout.tsx | `/auth/guest` | POST AuthController_guest_v1 | Auth | application/json | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `17: | `/auth/login` | app/(auth)/login.tsx | `/auth/login` | POST AuthController_login_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `18: | `/auth/register` | app/(auth)/otp.tsx | `/auth/register` | POST AuthController_register_v1 | Auth | application/json | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `19: | `/auth/reset-password` | app/(auth)/reset-password.tsx | `/auth/reset-password` | POST AuthController_resetPassword_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `20: | `/auth/send-otp` | app/(auth)/forgot-password.tsx<br>app/(auth)/register.tsx | `/auth/send-otp` | POST AuthController_sendOtp_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI produ`
- `21: | `/auth/social-login` | app/(auth)/login.tsx<br>app/(auth)/register.tsx | `/auth/social-login` | POST AuthController_socialLogin_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI pro`
- `22: | `/auth/verify-otp` | app/(auth)/otp.tsx | `/auth/verify-otp` | POST AuthController_verifyOtp_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `24: | `/care/appointments` | app/ai/monthly-report.tsx<br>src/context/ConsultationsContext.tsx | `/care/appointments` | POST AppointmentsController_create_v1<br>GET AppointmentsController_mine_v1 | Appointments<br>Appointments | application/jso`
- `29: | `/cart/prescription` | app/pharmacy/rx-order.tsx | `/cart/prescription` | GET CartController_prescription_v1 | Cart | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `30: | `/chat/threads/booking` | app/pharmacy/chat-with-pharmacist.tsx | `/chat/threads/booking` | POST ChatController_createBooking[0]_v1 | Chat | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI pr`
### auth_ownership
- `3: **نطاق الربط:** 122 استدعاء ثابت فريد استخرج من routes والمصدر، لا يشمل admin/provider غير المطلوبين في Web App المريض.`
- `17: | `/auth/login` | app/(auth)/login.tsx | `/auth/login` | POST AuthController_login_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `18: | `/auth/register` | app/(auth)/otp.tsx | `/auth/register` | POST AuthController_register_v1 | Auth | application/json | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `20: | `/auth/send-otp` | app/(auth)/forgot-password.tsx<br>app/(auth)/register.tsx | `/auth/send-otp` | POST AuthController_sendOtp_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI produ`
- `21: | `/auth/social-login` | app/(auth)/login.tsx<br>app/(auth)/register.tsx | `/auth/social-login` | POST AuthController_socialLogin_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI pro`
- `22: | `/auth/verify-otp` | app/(auth)/otp.tsx | `/auth/verify-otp` | POST AuthController_verifyOtp_v1 | Auth | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `42: | `/family/my-group` | app/family/permissions.tsx<br>app/health/family-hub.tsx | `/family/my-group` | GET FamilyController_myGroup_v1 | Family | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI `
- `43: | `/family/permissions/pending` | app/family/permission-request.tsx | `/family/permissions/pending` | GET FamilyController_pendingRequests_v1 | Family | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox`
- `44: | `/family/permissions/request` | app/family/permissions.tsx | `/family/permissions/request` | POST FamilyController_requestPermissions_v1 | Family | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قب`
- `79: | `/loyalty/config` | app/loyalty/hub.tsx | `/loyalty/config` | GET LoyaltyController_getConfig_v1<br>PUT AdminLoyaltyController_putConfig_v1 | Loyalty<br>AdminLoyalty | —<br>— | 200<br>200 | not declared in OpenAPI<br>not declared in OpenA`
- `86: | `/medical-profile/passport-token` | app/reports/passport.tsx | `/medical-profile/passport-token` | GET MedicalProfileController_passportToken_v1 | MedicalProfile | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runti`
- `90: | `/medical/programs/complete-session` | app/programs/active.tsx | `/medical/programs/complete-session` | POST NabdExtensionsController_completeSession_v1 | NabdExtensions | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/bo`
### state_transitions
- `43: | `/family/permissions/pending` | app/family/permission-request.tsx | `/family/permissions/pending` | GET FamilyController_pendingRequests_v1 | Family | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox`
- `71: | `/insurance/requests/my` | app/insurance/approval-pending.tsx | `/insurance/requests/my` | GET InsuranceFlowController_myRequests_v1 | InsuranceFlow | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox`
- `113: | `/refunds/my` | app/insurance/refund-status.tsx | `/refunds/my` | GET RefundController_my_v1 | Refund | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `121: | `/users/me/profile` | app/(tabs)/index.tsx<br>app/family/chat.tsx<br>app/health/edit-profile.tsx<br>app/health/health-id.tsx<br>app/insurance/approval-pending.tsx<br>app/insurance/network-providers.tsx<br>app/insurance/policy-detail.tsx<b`
- `126: | `/wallet/spending-data` | app/wallet/hub.tsx | `/wallet/spending-data` | GET WalletController_getSpendingData_v1 | Wallet | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
### payment_insurance_relevance
- `10: | `/ai/ocr-translate` | app/diagnostics/insurance-upload.tsx | `/ai/ocr-translate` | POST AiController_ocrTranslate_v1 | Ai | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`
- `63: | `/home/offers` | app/(tabs)/consultations/index.tsx<br>app/offers/index.tsx | `/home/offers` | GET HomeController_getOffers_v1 | Home | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI product`
- `65: | `/insurance/benefits-summary` | app/insurance/benefits-summary.tsx | `/insurance/benefits-summary` | GET InsuranceFlowController_benefits_v1 | InsuranceFlow | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في`
- `66: | `/insurance/claims` | app/insurance/hub.tsx<br>app/orders/index.tsx | `/insurance/claims` | GET InsuranceController_getClaims_v1 | Insurance | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI `
- `67: | `/insurance/claims/my` | app/insurance/claim-tracking.tsx | `/insurance/claims/my` | GET InsuranceFlowController_claimsMy_v1 | InsuranceFlow | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI `
- `68: | `/insurance/claims/submit` | app/insurance/submit-claim.tsx | `/insurance/claims/submit` | POST InsuranceController_submitClaim_v1 | Insurance | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل U`
- `69: | `/insurance/companies` | app/consultations/booking-confirm.tsx<br>app/diagnostics/insurance-upload.tsx<br>app/insurance/add-policy.tsx<br>app/profile/insurance.tsx | `/insurance/companies` | GET InsuranceFlowController_companies_v1<br>POS`
- `70: | `/insurance/ocr-extract` | app/insurance/add-policy.tsx | `/insurance/ocr-extract` | POST InsuranceController_ocrExtract_v1 | Insurance | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI produ`
- `71: | `/insurance/requests/my` | app/insurance/approval-pending.tsx | `/insurance/requests/my` | GET InsuranceFlowController_myRequests_v1 | InsuranceFlow | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox`
- `72: | `/insurance/save-policy` | app/insurance/add-policy.tsx<br>app/insurance/hub.tsx | `/insurance/save-policy` | POST InsuranceFlowController_savePolicy_v1 | InsuranceFlow | — | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/bod`
- `101: | `/orders/create` | app/diagnostics/insurance-upload.tsx<br>app/pharmacy/checkout.tsx | `/orders/create` | POST OrdersController_create_v1 | Orders | application/json | 201 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runti`
- `107: | `/providers` | app/(tabs)/consultations/index.tsx<br>app/(tabs)/diagnostics.tsx<br>app/diagnostics/insurance-upload.tsx | `/providers` | GET ProvidersController_list_v1 | Providers | — | 200 | not declared in OpenAPI | contract موجود؛ يثب`
### error_empty_loading_retry_cancel
- `43: | `/family/permissions/pending` | app/family/permission-request.tsx | `/family/permissions/pending` | GET FamilyController_pendingRequests_v1 | Family | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox`
- `71: | `/insurance/requests/my` | app/insurance/approval-pending.tsx | `/insurance/requests/my` | GET InsuranceFlowController_myRequests_v1 | InsuranceFlow | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox`
- `121: | `/users/me/profile` | app/(tabs)/index.tsx<br>app/family/chat.tsx<br>app/health/edit-profile.tsx<br>app/health/health-id.tsx<br>app/insurance/approval-pending.tsx<br>app/insurance/network-providers.tsx<br>app/insurance/policy-detail.tsx<b`
- `126: | `/wallet/spending-data` | app/wallet/hub.tsx | `/wallet/spending-data` | GET WalletController_getSpendingData_v1 | Wallet | — | 200 | not declared in OpenAPI | contract موجود؛ يثبت method/body/runtime في Sandbox قبل UI production |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
