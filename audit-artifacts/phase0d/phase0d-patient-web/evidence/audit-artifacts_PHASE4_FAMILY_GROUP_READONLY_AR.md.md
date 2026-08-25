# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE4_FAMILY_GROUP_READONLY_AR.md`
- **Member SHA-256:** `55df85bbe2bc228653143a610a088cdade2e834c631a6208f175b878af389afe`
- **Line count:** 9
- **Read range:** `1-9`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: Web يعرض اسم المجموعة وعدد الأعضاء فقط. parser يسقط group id وowner_id وmember user IDs وpermissions وinvite_code وinvite expiry. لا توجد دعوات أو join/leave/remove أو permission mutations.`
- `7: لم يتم فتح `GET /family/member-records/:userId` أو member-health؛ هذه مسارات cross-patient حساسة تعتمد granular consent/permission وBOLA isolation، وتحتاج اختبارات owner/stranger وحسابات Sandbox حية قبل العرض.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
