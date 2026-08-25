# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-3-openapi-reconciliation.md`
- **Member SHA-256:** `3ae56cf858e17de4116853db6fe9ec129900ad6aa16a6de3ee66a5e8ecab5d3e`
- **Line count:** 257
- **Read range:** `1-257`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `80: | UnifiedBookings | 7 |`
- `105: | BookingOps | 5 |`
- `106: | AdminRefunds | 5 |`
- `122: | BookingFlow | 4 |`
- `150: | ArticleBookmarks | 3 |`
- `151: | Refund | 3 |`
- `237: | AdminBulkUpload | 1 |`
### backend_consumers_or_contracts
- `246: | `/care/appointments/mine` |`
- `247: | `/user/insurance` |`
### auth_ownership
- `9: * Security schemes: `bearer:http/bearer`.`
- `26: | Admin | 19 |`
- `33: | AdminAuthority | 16 |`
- `54: | ProviderAdmin | 11 |`
- `56: | AdminFinanceEngine | 10 |`
- `61: | AdminSystem | 10 |`
- `62: | AdminNotificationCenter | 9 |`
- `64: | AdminAnalytics | 9 |`
- `68: | AdminProcurement | 9 |`
- `73: | AdminBroadcast | 8 |`
- `77: | AdminMatching | 7 |`
- `78: | AdminShortage | 7 |`
### state_transitions
- `106: | AdminRefunds | 5 |`
- `151: | Refund | 3 |`
### payment_insurance_relevance
- `34: | InsuranceFlow | 16 |`
- `42: | Insurance | 13 |`
- `59: | Wallet | 10 |`
- `83: | Moyasar | 7 |`
- `90: | Payments | 6 |`
- `106: | AdminRefunds | 5 |`
- `130: | ProviderPayouts | 3 |`
- `151: | Refund | 3 |`
- `162: | UsersInsurance | 2 |`
- `178: | InsuranceAlias | 2 |`
- `180: | AdminInsurance | 2 |`
- `196: | AdminInsuranceClaims | 2 |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
