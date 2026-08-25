# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase5-domain-inventory.txt`
- **Member SHA-256:** `47250fdac7f384b269a95b80a82808020437baf2616417747f1ab62f4052392e`
- **Line count:** 412
- **Read range:** `1-412`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `51: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx`
- `52: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/submit-claim.tsx`
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/health/edit-profile.tsx:40:    try { await apiFetch('/medical-profile', { method: 'PATCH', body: JSON.stringify({ ...draft, height_cm, weight_kg }) }); router.back(); }`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/health/edit-profile.tsx:57:      const upload: any = await apiFetch('/media/upload', { method: 'POST', body: formData });`
- `90: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-list.tsx:43:    try { await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key, occurred_at: n`
- `91: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-list.tsx:49:    try { await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await cancelMedicationNotifications(id`
- `129: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx:33:    apiFetch('/refunds/my')`
- `131: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/submit-claim.tsx:27:      await apiFetch("/insurance/claims/submit", {`
- `154: === web pages ===`
- `155: app/[locale]/chat/[threadId]/page.tsx`
- `156: app/[locale]/chat/page.tsx`
- `157: app/[locale]/family/page.tsx`
### backend_consumers_or_contracts
- `40: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/add-policy.tsx`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `42: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/benefits-summary.tsx`
- `43: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/claim-tracking.tsx`
- `44: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/copay.tsx`
- `45: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/coverage-check.tsx`
- `46: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/hub.tsx`
- `47: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/index.tsx`
- `48: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/network-providers.tsx`
- `49: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/payment-split.tsx`
- `50: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/policy-detail.tsx`
- `51: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx`
### auth_ownership
- `10: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permission-request.tsx`
- `11: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permissions.tsx`
- `115: /home/ubuntu/nabdah_review/extracted/mobile/app/reports/passport.tsx:39:    apiFetch('/medical-profile/passport-token').then(res => setPassportToken(res)).catch(() => setPassportToken(null));`
- `139: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permission-request.tsx:24:    apiFetch('/family/permissions/pending')`
- `140: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permission-request.tsx:52:        await apiFetch(`/family/permissions/respond/${requestInfo._id || requestInfo.id}`, {`
- `144: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permissions.tsx:119:        const group = await apiFetch("/family/my-group");`
- `145: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permissions.tsx:147:        await apiFetch(`/family/member/${memberId}/permissions`, {`
- `146: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permissions.tsx:153:        await apiFetch("/family/permissions/request", {`
- `147: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permissions.tsx:186:              await apiFetch(`/family/remove-member/${memberId}`, {`
- `183: lib/api/vitals-server.ts:5:  return callPatientApi("/health/vitals/summary", {}, accessToken);`
- `184: lib/api/vitals-server.ts:9:  return callPatientApi("/health/vitals?limit=100", {}, accessToken);`
- `185: lib/api/vitals-server.ts:12:export function getPatientHealthScore(accessToken: string) {`
### state_transitions
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `51: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx`
- `90: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-list.tsx:43:    try { await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key, occurred_at: n`
- `91: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-list.tsx:49:    try { await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await cancelMedicationNotifications(id`
- `124: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx:32:          req = await apiFetch(`/insurance/requests/${params.requestId}`).catch(() => null);`
- `125: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx:34:          const list = await apiFetch('/insurance/requests/my').catch(() => []);`
- `126: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx:48:    apiFetch('/users/me/profile').then((p: any) => {`
- `129: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx:33:    apiFetch('/refunds/my')`
- `139: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permission-request.tsx:24:    apiFetch('/family/permissions/pending')`
- `178: lib/api/doctors.ts:15:export function extractDoctors(payload: unknown): DoctorRow[] { return rowsFrom(payload).flatMap((value) => { const parsed=doctorSchema.safeParse(value); if(!parsed.success) return []; const d=parsed.data; const id=d.i`
- `194: lib/api/trends.ts:5:export function parseHealthTrends(payload:unknown):HealthTrend[]{const rows=Array.isArray(payload)?payload:(payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as Record<s`
- `202: lib/api/settings.ts:22:  return parsed.success ? { profileVisible: parsed.data.profile_visible, shareData: parsed.data.share_data } : {};`
### payment_insurance_relevance
- `40: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/add-policy.tsx`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `42: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/benefits-summary.tsx`
- `43: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/claim-tracking.tsx`
- `44: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/copay.tsx`
- `45: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/coverage-check.tsx`
- `46: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/hub.tsx`
- `47: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/index.tsx`
- `48: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/network-providers.tsx`
- `49: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/payment-split.tsx`
- `50: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/policy-detail.tsx`
- `51: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx`
### error_empty_loading_retry_cancel
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `64: /home/ubuntu/nabdah_review/extracted/mobile/app/health/chronic-disease.tsx:26:          apiFetch('/health/chronic-diseases').catch(() => null),`
- `65: /home/ubuntu/nabdah_review/extracted/mobile/app/health/chronic-disease.tsx:27:          apiFetch('/health/vitals').catch(() => null),`
- `84: /home/ubuntu/nabdah_review/extracted/mobile/app/health/health-id.tsx:37:          apiFetch('/users/me/profile').catch(() => null),`
- `85: /home/ubuntu/nabdah_review/extracted/mobile/app/health/health-id.tsx:38:          apiFetch('/health/emergency-contacts').catch(() => []),`
- `86: /home/ubuntu/nabdah_review/extracted/mobile/app/health/health-id.tsx:39:          apiFetch('/health/chronic-meds').catch(() => []),`
- `90: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-list.tsx:43:    try { await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key, occurred_at: n`
- `91: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-list.tsx:49:    try { await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }); await cancelMedicationNotifications(id`
- `108: /home/ubuntu/nabdah_review/extracted/mobile/app/health/wearables.tsx:45:        apiFetch('/wearables/devices').catch(() => null),`
- `109: /home/ubuntu/nabdah_review/extracted/mobile/app/health/wearables.tsx:46:        apiFetch('/wearables/data').catch(() => null),`
- `112: /home/ubuntu/nabdah_review/extracted/mobile/app/notifications/index.tsx:114:      apiFetch(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});`
- `114: /home/ubuntu/nabdah_review/extracted/mobile/app/reports/passport.tsx:38:    apiFetch('/medical-profile').then(res => setProfile(res)).catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
