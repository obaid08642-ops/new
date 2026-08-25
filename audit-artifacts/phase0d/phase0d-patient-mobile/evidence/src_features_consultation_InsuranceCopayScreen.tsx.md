# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/features/consultation/InsuranceCopayScreen.tsx`
- **Member SHA-256:** `72559f2049f107f476e90e589c9517ab3040233e245035356a486087bec938b1`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export function InsuranceCopayScreen({ route, navigation }: any) {`
- `5: const { copayAmount, approvalCode } = route.params || { copayAmount: 0, approvalCode: '' };`
- `17: <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('PaymentGateway')}>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `4: export function InsuranceCopayScreen({ route, navigation }: any) {`
- `5: const { copayAmount, approvalCode } = route.params || { copayAmount: 0, approvalCode: '' };`
- `12: <View style={styles.card}>`
- `13: <Text style={styles.amount}>{copayAmount} SAR</Text>`
- `17: <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('PaymentGateway')}>`
- `18: <Text style={styles.payText}>دفع نسبة التحمل</Text>`
- `28: card: { backgroundColor: '#fff', padding: 30, borderRadius: 15, elevation: 2, alignItems: 'center', marginBottom: 30, width: '100%' },`
- `31: payBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },`
- `32: payText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
