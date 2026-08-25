# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_72_JOURNEY_REGISTER.md`
- **Member SHA-256:** `22f63716a150f0d0b2ad6f535343ff362ea16e5f9f45264bffc50cbac9fad9cf`
- **Line count:** 78
- **Read range:** `1-78`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Web V2 — 72 Journey Register`
- `5: | ID | Domain | Mobile screen | Action | API evidence | Web status | Required proof |`
- `7: | J-001 | (auth) | (auth)/login.tsx | mutation | import { apiFetch, storeAuthSession } from '../../src/utils/api'; \| scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'], \| /auth/social-login | candidate from db404ee8 | PUBL`
- `8: | J-002 | (auth) | (auth)/otp.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /auth/verify-otp \| /auth/register | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW | owner 200; stranger 404; unauth 401; replay for mutation `
- `9: | J-003 | (auth) | (auth)/register.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'], \| /auth/social-login | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW`
- `16: | J-010 | consultations | consultations/booking-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/companies/${insCompany}/networks | candidate from db404ee8 | BLOCKED_OR_CONTRACT_`
- `17: | J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appointmentId}/cancel | candidate from db404ee8 | BLOCKE`
- `18: | J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointment.doctor_id}/slots?date=${d}&service_type=${servi`
- `26: | J-020 | pharmacy | pharmacy/checkout.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /users/me/profile \| /wallet/balance | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; re`
- `31: | J-025 | pharmacy | pharmacy/custom-item.tsx | mutation | import { apiFetch } from "../../src/utils/api"; \| /media/upload \| /support/requests | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; r`
- `32: | J-026 | pharmacy | pharmacy/chat-with-pharmacist.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /chat/threads/booking | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger `
- `71: | J-065 | community | community/hub.tsx | mutation | import { apiFetch } from "../../src/utils/api"; \| /community/posts?page=1&limit=20${qs} \| /community/posts | candidate from db404ee8 | REVIEW_REQUIRED | owner 200; stranger 404; unauth `
### backend_consumers_or_contracts
- `7: | J-001 | (auth) | (auth)/login.tsx | mutation | import { apiFetch, storeAuthSession } from '../../src/utils/api'; \| scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'], \| /auth/social-login | candidate from db404ee8 | PUBL`
- `8: | J-002 | (auth) | (auth)/otp.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /auth/verify-otp \| /auth/register | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW | owner 200; stranger 404; unauth 401; replay for mutation `
- `9: | J-003 | (auth) | (auth)/register.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'], \| /auth/social-login | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW`
- `12: | J-006 | (auth) | (auth)/welcome.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /auth/guest | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW | owner 200; stranger 404; unauth 401; replay for mutation |`
- `15: | J-009 | (tabs) | (tabs)/pharmacy.tsx | read | import { apiFetch, BASE_URL } from '../../src/utils/api'; \| /medicines/categories \| const data = await apiFetch(ep); | candidate from db404ee8 | REVIEW_REQUIRED | owner 200; stranger 404; un`
- `16: | J-010 | consultations | consultations/booking-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/companies/${insCompany}/networks | candidate from db404ee8 | BLOCKED_OR_CONTRACT_`
- `17: | J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appointmentId}/cancel | candidate from db404ee8 | BLOCKE`
- `18: | J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointment.doctor_id}/slots?date=${d}&service_type=${servi`
- `26: | J-020 | pharmacy | pharmacy/checkout.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /users/me/profile \| /wallet/balance | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; re`
- `27: | J-021 | pharmacy | pharmacy/payment.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /payments/intent/pharmacy/${orderId} | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; strange`
- `28: | J-022 | pharmacy | pharmacy/order-tracking.tsx | read | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderIdStr}/tracking \| fetch(); | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth`
- `29: | J-023 | pharmacy | pharmacy/reorder.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /orders/${orderId}/reorder | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; una`
### auth_ownership
- `7: | J-001 | (auth) | (auth)/login.tsx | mutation | import { apiFetch, storeAuthSession } from '../../src/utils/api'; \| scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'], \| /auth/social-login | candidate from db404ee8 | PUBL`
- `8: | J-002 | (auth) | (auth)/otp.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /auth/verify-otp \| /auth/register | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW | owner 200; stranger 404; unauth 401; replay for mutation `
- `9: | J-003 | (auth) | (auth)/register.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'], \| /auth/social-login | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW`
- `10: | J-004 | (auth) | (auth)/privacy.tsx | read | ${BASE_URL}/legal/policy/privacy_policy?lang=${AR ?  | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW | owner 200; stranger 404; unauth 401; replay for mutation |`
- `11: | J-005 | (auth) | (auth)/terms.tsx | read | ${BASE_URL}/legal/policy/patient_terms?lang=${AR ?  | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW | owner 200; stranger 404; unauth 401; replay for mutation |`
- `12: | J-006 | (auth) | (auth)/welcome.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /auth/guest | candidate from db404ee8 | PUBLIC_OR_AUTH_FLOW | owner 200; stranger 404; unauth 401; replay for mutation |`
- `13: | J-007 | (tabs) | (tabs)/index.tsx | read | import { apiFetch } from '../../src/utils/api'; \| /nutrition/daily-summary \| /home/upcoming-appointment | candidate from db404ee8 | REVIEW_REQUIRED | owner 200; stranger 404; unauth 401; replay`
- `14: | J-008 | (tabs) | (tabs)/health.tsx | read | import { apiFetch } from "../../src/utils/api"; \| /health/vitals/summary \| /health/score | candidate from db404ee8 | REVIEW_REQUIRED | owner 200; stranger 404; unauth 401; replay for mutation `
- `15: | J-009 | (tabs) | (tabs)/pharmacy.tsx | read | import { apiFetch, BASE_URL } from '../../src/utils/api'; \| /medicines/categories \| const data = await apiFetch(ep); | candidate from db404ee8 | REVIEW_REQUIRED | owner 200; stranger 404; un`
- `16: | J-010 | consultations | consultations/booking-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/companies/${insCompany}/networks | candidate from db404ee8 | BLOCKED_OR_CONTRACT_`
- `17: | J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appointmentId}/cancel | candidate from db404ee8 | BLOCKE`
- `18: | J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointment.doctor_id}/slots?date=${d}&service_type=${servi`
### state_transitions
- `5: | ID | Domain | Mobile screen | Action | API evidence | Web status | Required proof |`
- `17: | J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appointmentId}/cancel | candidate from db404ee8 | BLOCKE`
- `18: | J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointment.doctor_id}/slots?date=${d}&service_type=${servi`
- `34: | J-028 | pharmacy | pharmacy/broadcast-status.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/bids/request/${orderId} \| /orders/bids/${bidId}/accept | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owne`
- `53: | J-047 | family | family/permission-request.tsx | mutation | /family/permissions/pending \| /family/permissions/respond/${requestInfo._id \|\| requestInfo.id} | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404`
- `63: | J-057 | nutrition | nutrition/hub.tsx | read | import { apiFetch } from '../../src/utils/api'; \| error | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; replay for mutation |`
### payment_insurance_relevance
- `16: | J-010 | consultations | consultations/booking-confirm.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/companies/${insCompany}/networks | candidate from db404ee8 | BLOCKED_OR_CONTRACT_`
- `26: | J-020 | pharmacy | pharmacy/checkout.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /users/me/profile \| /wallet/balance | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; re`
- `27: | J-021 | pharmacy | pharmacy/payment.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /orders/${orderId} \| /payments/intent/pharmacy/${orderId} | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; strange`
- `38: | J-032 | health | health/medication-reminder-add.tsx | read | import { apiFetch } from '../../src/utils/api'; \| /health/reminders \| const response: any = await apiFetch(editing ? `/health/reminders/${id}` : '/health/reminders', { method:`
- `61: | J-055 | insurance | insurance/hub.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /users/me/insurance \| /insurance/claims | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; r`
- `62: | J-056 | insurance | insurance/add-policy.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /insurance/companies \| /insurance/ocr-extract | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; `
- `65: | J-059 | wallet | wallet/hub.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /wallet/cards | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; replay for mutation |`
- `66: | J-060 | wallet | wallet/topup.tsx | mutation | import { apiFetch } from "../../src/utils/api"; \| /wallet/balance \| /wallet/topup | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; replay for mu`
### error_empty_loading_retry_cancel
- `17: | J-011 | consultations | consultations/booking-pending.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/appointments/${appointmentId}/cancel | candidate from db404ee8 | BLOCKE`
- `18: | J-012 | consultations | consultations/cancel-reschedule.tsx | mutation | import { apiFetch } from '../../src/utils/api'; \| /care/appointments/${appointmentId} \| /care/doctors/${appointment.doctor_id}/slots?date=${d}&service_type=${servi`
- `53: | J-047 | family | family/permission-request.tsx | mutation | /family/permissions/pending \| /family/permissions/respond/${requestInfo._id \|\| requestInfo.id} | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404`
- `63: | J-057 | nutrition | nutrition/hub.tsx | read | import { apiFetch } from '../../src/utils/api'; \| error | candidate from db404ee8 | BLOCKED_OR_CONTRACT_REVIEW | owner 200; stranger 404; unauth 401; replay for mutation |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
