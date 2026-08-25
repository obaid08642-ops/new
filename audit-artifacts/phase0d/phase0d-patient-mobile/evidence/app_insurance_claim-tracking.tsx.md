# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/claim-tracking.tsx`
- **Member SHA-256:** `a79760f4d4912737820feed13aee9ee42789ad87c8e0f440617d08481a3988de`
- **Line count:** 154
- **Read range:** `1-154`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `18: submitted: { label: 'مُرسل', color: '#7A6BEA', bg: '#EDE9FE', icon: 'upload' },`
- `21: export default function ClaimTrackingScreen() {`
- `48: <TouchableOpacity onPress={() => router.push('/insurance/submit-claim')} style={[styles.newClaimBtn, { backgroundColor: '#1a1a2e' } ]}>`
- `53: <TouchableOpacity onPress={() => router.back()}>`
- `108: <TouchableOpacity onPress={() => router.push('/support/chat')}><AppText variant="bodySM" color={colors.primary}>تقديم اعتراض عبر الدعم</AppText></TouchableOpacity>`
- `112: <TouchableOpacity onPress={() => router.push('/insurance/refund-status')}`
- `113: style={[styles.refundBtn, { backgroundColor: '#EBF3FF' } ]}>`
- `152: refundBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },`
- `153: refundBtnText: { fontSize: 13, fontWeight: '700' },`
### backend_consumers_or_contracts
- `2: // app/insurance/claim-tracking.tsx`
- `30: const res = await apiFetch('/insurance/claims/my');`
- `48: <TouchableOpacity onPress={() => router.push('/insurance/submit-claim')} style={[styles.newClaimBtn, { backgroundColor: '#1a1a2e' } ]}>`
- `112: <TouchableOpacity onPress={() => router.push('/insurance/refund-status')}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `13: const STATUS_CONFIG = {`
- `14: approved: { label: 'موافق عليه', color: '#5BA84F', bg: '#DCFCE7', icon: 'check_circle' },`
- `17: rejected: { label: 'مرفوض', color: '#F0695C', bg: '#FEE2E2', icon: 'error' },`
- `24: const [claims, setClaims] = React.useState<any[]>([]);`
- `25: const [loading, setLoading] = React.useState(true);`
- `34: console.warn('Failed to fetch claims');`
- `36: setLoading(false);`
- `73: const sc = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];`
- `77: <View style={[styles.statusBadge, { backgroundColor: sc.bg } ]}>`
- `105: {item.status === 'rejected' && (item as any).rejectionReason && (`
- `107: <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="error" size={16} color={colors.primary} /><AppText variant="bodySM">سبب الرفض: {(item as any).rejectionReason}</AppText></View>`
- `111: {item.status === 'approved' && (`
### payment_insurance_relevance
- `2: // app/insurance/claim-tracking.tsx`
- `9: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `16: reimbursed: { label: 'تم الاسترداد', color: '#23B5CE', bg: '#EBF3FF', icon: 'wallet' },`
- `30: const res = await apiFetch('/insurance/claims/my');`
- `42: const totalCovered = claims.reduce((s, c) => s + (c.covered || 0), 0);`
- `43: const totalAmount = claims.reduce((s, c) => s + (c.amount || 0), 0);`
- `48: <TouchableOpacity onPress={() => router.push('/insurance/submit-claim')} style={[styles.newClaimBtn, { backgroundColor: '#1a1a2e' } ]}>`
- `62: <View style={styles.statItem}><AppText variant="bodySM">{totalCovered} ر</AppText><AppText variant="bodySM">مغطّى</AppText></View>`
- `64: <View style={styles.statItem}><AppText variant="bodySM">{totalAmount - totalCovered} ر</AppText><AppText variant="bodySM">دفعته</AppText></View>`
- `75: <View style={[styles.claimCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `112: <TouchableOpacity onPress={() => router.push('/insurance/refund-status')}`
- `113: style={[styles.refundBtn, { backgroundColor: '#EBF3FF' } ]}>`
### error_empty_loading_retry_cancel
- `17: rejected: { label: 'مرفوض', color: '#F0695C', bg: '#FEE2E2', icon: 'error' },`
- `25: const [loading, setLoading] = React.useState(true);`
- `33: } catch (e) {`
- `34: console.warn('Failed to fetch claims');`
- `36: setLoading(false);`
- `107: <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="error" size={16} color={colors.primary} /><AppText variant="bodySM">سبب الرفض: {(item as any).rejectionReason}</AppText></View>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
