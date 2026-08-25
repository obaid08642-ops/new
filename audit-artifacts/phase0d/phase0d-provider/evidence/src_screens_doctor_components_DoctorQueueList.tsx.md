# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/doctor/components/DoctorQueueList.tsx`
- **Member SHA-256:** `8806a3bcf936200d982823411a0a9d7154e217b0d537c5ad44701f0a451ecd63`
- **Line count:** 106
- **Read range:** `1-106`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `52: <TouchableOpacity onPress={() => onSelect(item)} activeOpacity={0.8}>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: import { NCard, NBadge, NEmpty } from '../../../components/ui';`
- `12: status: string;`
- `32: <NEmpty title={AR ? 'لا توجد مواعيد مجدولة اليوم' : 'No appointments scheduled for today'} />`
- `63: label={item.status === 'COMPLETED' ? (AR ? 'مكتمل' : 'Completed') : item.status === 'IN_PROGRESS' ? (AR ? 'جاري الكشف' : 'In Progress') : (AR ? 'مجدول' : 'Scheduled')}`
- `64: variant={item.status === 'COMPLETED' ? 'success' : item.status === 'IN_PROGRESS' ? 'warning' : 'primary'}`
### payment_insurance_relevance
- `4: import { NCard, NBadge, NEmpty } from '../../../components/ui';`
- `53: <NCard style={[styles.aptCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>`
- `67: </NCard>`
- `89: aptCard: {`
### error_empty_loading_retry_cancel
- `4: import { NCard, NBadge, NEmpty } from '../../../components/ui';`
- `32: <NEmpty title={AR ? 'لا توجد مواعيد مجدولة اليوم' : 'No appointments scheduled for today'} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
