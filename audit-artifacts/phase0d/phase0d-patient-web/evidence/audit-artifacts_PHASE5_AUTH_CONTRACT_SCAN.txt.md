# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE5_AUTH_CONTRACT_SCAN.txt`
- **Member SHA-256:** `c5eb414c8f314476a8330e3c6f97dc8cf31145ffcc507e63a3ccfb89ce5ad796`
- **Line count:** 51
- **Read range:** `1-51`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: POST /api/v1/auth/register | AuthController_register_v1 | responses= 201 | body= True | params= []`
- `2: POST /api/v1/auth/login | AuthController_login_v1 | responses= 201 | body= False | params= []`
- `5: POST /api/v1/auth/login/verify-2fa | AuthController_verify2fa_v1 | responses= 201 | body= False | params= []`
- `12: POST /api/v1/auth/logout-all | AuthController_logoutAll_v1 | responses= 201 | body= False | params= []`
- `14: POST /api/v1/auth/logout | AuthController_logout_v1 | responses= 201 | body= False | params= []`
- `18: POST /api/v1/auth/social-login | AuthController_socialLogin_v1 | responses= 201 | body= False | params= []`
- `23: POST /api/v1/auth/passkey/login/verify | PasskeyController_loginVerify_v1 | responses= 201 | body= False | params= []`
- `25: POST /api/v1/provider/auth/register | ProviderAuthController_register_v1 | responses= 201 | body= False | params= []`
- `26: POST /api/v1/provider/auth/login | ProviderAuthController_login_v1 | responses= 201 | body= False | params= []`
- `28: POST /api/v1/provider/auth/logout | ProviderAuthController_logout_v1 | responses= 201 | body= False | params= []`
- `35: POST /api/v1/admin/authority/appointments/{id}/force-cancel | AdminAuthorityController_fca_v1 | responses= 201 | body= False | params= [('id', 'path')]`
- `37: POST /api/v1/admin/authority/appointments/{id}/force-reschedule | AdminAuthorityController_fra_v1 | responses= 201 | body= False | params= [('id', 'path')]`
### backend_consumers_or_contracts
- `1: POST /api/v1/auth/register | AuthController_register_v1 | responses= 201 | body= True | params= []`
- `2: POST /api/v1/auth/login | AuthController_login_v1 | responses= 201 | body= False | params= []`
- `3: POST /api/v1/auth/guest | AuthController_guest_v1 | responses= 201 | body= True | params= [('x-device-id', 'header')]`
- `4: POST /api/v1/auth/convert-guest | AuthController_convertGuest_v1 | responses= 201 | body= True | params= []`
- `5: POST /api/v1/auth/login/verify-2fa | AuthController_verify2fa_v1 | responses= 201 | body= False | params= []`
- `6: GET /api/v1/auth/me | AuthController_me_v1 | responses= 200 | body= False | params= []`
- `7: GET /api/v1/auth/trusted-devices | AuthController_trustedDevices_v1 | responses= 200 | body= False | params= []`
- `8: DELETE /api/v1/auth/trusted-devices/{deviceId} | AuthController_revokeTrustedDevice_v1 | responses= 200 | body= False | params= [('deviceId', 'path')]`
- `9: POST /api/v1/auth/heartbeat | AuthController_heartbeat_v1 | responses= 201 | body= False | params= []`
- `10: GET /api/v1/auth/sessions/online | AuthController_onlineSessions_v1 | responses= 200 | body= False | params= []`
- `11: POST /api/v1/auth/refresh | AuthController_refresh_v1 | responses= 201 | body= False | params= [('x-device-id', 'header')]`
- `12: POST /api/v1/auth/logout-all | AuthController_logoutAll_v1 | responses= 201 | body= False | params= []`
### auth_ownership
- `2: POST /api/v1/auth/login | AuthController_login_v1 | responses= 201 | body= False | params= []`
- `5: POST /api/v1/auth/login/verify-2fa | AuthController_verify2fa_v1 | responses= 201 | body= False | params= []`
- `10: GET /api/v1/auth/sessions/online | AuthController_onlineSessions_v1 | responses= 200 | body= False | params= []`
- `11: POST /api/v1/auth/refresh | AuthController_refresh_v1 | responses= 201 | body= False | params= [('x-device-id', 'header')]`
- `12: POST /api/v1/auth/logout-all | AuthController_logoutAll_v1 | responses= 201 | body= False | params= []`
- `14: POST /api/v1/auth/logout | AuthController_logout_v1 | responses= 201 | body= False | params= []`
- `15: POST /api/v1/auth/send-otp | AuthController_sendOtp_v1 | responses= 201 | body= False | params= []`
- `16: POST /api/v1/auth/verify-otp | AuthController_verifyOtp_v1 | responses= 201 | body= False | params= []`
- `18: POST /api/v1/auth/social-login | AuthController_socialLogin_v1 | responses= 201 | body= False | params= []`
- `23: POST /api/v1/auth/passkey/login/verify | PasskeyController_loginVerify_v1 | responses= 201 | body= False | params= []`
- `26: POST /api/v1/provider/auth/login | ProviderAuthController_login_v1 | responses= 201 | body= False | params= []`
- `27: POST /api/v1/provider/auth/refresh | ProviderAuthController_refresh_v1 | responses= 201 | body= False | params= []`
### state_transitions
- `35: POST /api/v1/admin/authority/appointments/{id}/force-cancel | AdminAuthorityController_fca_v1 | responses= 201 | body= False | params= [('id', 'path')]`
- `38: POST /api/v1/admin/authority/orders/{id}/force-cancel | AdminAuthorityController_fco_v1 | responses= 201 | body= False | params= [('id', 'path')]`
- `41: POST /api/v1/admin/authority/labs/{id}/force-cancel | AdminAuthorityController_fcl_v1 | responses= 201 | body= False | params= [('id', 'path')]`
- `44: POST /api/v1/admin/authority/radiology/{id}/force-cancel | AdminAuthorityController_fcr_v1 | responses= 201 | body= False | params= [('id', 'path')]`
### payment_insurance_relevance
- `43: POST /api/v1/admin/authority/labs/{id}/override-insurance | AdminAuthorityController_oil_v1 | responses= 201 | body= False | params= [('id', 'path')]`
- `46: POST /api/v1/admin/authority/radiology/{id}/override-insurance | AdminAuthorityController_oir_v1 | responses= 201 | body= False | params= [('id', 'path')]`
### error_empty_loading_retry_cancel
- `35: POST /api/v1/admin/authority/appointments/{id}/force-cancel | AdminAuthorityController_fca_v1 | responses= 201 | body= False | params= [('id', 'path')]`
- `38: POST /api/v1/admin/authority/orders/{id}/force-cancel | AdminAuthorityController_fco_v1 | responses= 201 | body= False | params= [('id', 'path')]`
- `41: POST /api/v1/admin/authority/labs/{id}/force-cancel | AdminAuthorityController_fcl_v1 | responses= 201 | body= False | params= [('id', 'path')]`
- `44: POST /api/v1/admin/authority/radiology/{id}/force-cancel | AdminAuthorityController_fcr_v1 | responses= 201 | body= False | params= [('id', 'path')]`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
