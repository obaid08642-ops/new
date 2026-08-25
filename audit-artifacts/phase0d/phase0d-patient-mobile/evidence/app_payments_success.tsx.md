# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/payments/success.tsx`
- **Member SHA-256:** `ff3ab74ce43dcbfc82c382da78a65f87325a5acc705dd11f188f7c0742e000cf`
- **Line count:** 142
- **Read range:** `1-142`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router, useLocalSearchParams } from 'expo-router';`
- `14: export default function PaymentSuccessScreen() {`
- `20: const isPharmacy = (params.bookingKind as string) === 'pharmacy';`
- `73: onPress={() => {`
- `82: <TouchableOpacity onPress={() => {`
- `84: const apptId = (params.bookingId || params.appointmentId || '') as string;`
- `85: if (apptId) router.push({ pathname: '/consultations/booking-pending', params: { appointmentId: apptId, visitType: vt } });`
- `86: else if (vt === 'clinic') router.push('/consultations/clinic-location');`
- `87: else if (vt === 'home') router.push('/consultations/home-visit-tracking');`
- `88: else router.push({ pathname: '/consultations/booking-success', params: { visitType: vt } });`
- `98: onPress={() => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: (params.bookingId || '') as string } })}`
- `107: onPress={() => router.replace('/wallet/hub')}`
### backend_consumers_or_contracts
- `98: onPress={() => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: (params.bookingId || '') as string } })}`
- `107: onPress={() => router.replace('/wallet/hub')}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: // app/payments/success.tsx`
- `14: export default function PaymentSuccessScreen() {`
- `46: <Animated.View style={[styles.successIcon, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>`
- `85: if (apptId) router.push({ pathname: '/consultations/booking-pending', params: { appointmentId: apptId, visitType: vt } });`
- `88: else router.push({ pathname: '/consultations/booking-success', params: { visitType: vt } });`
- `129: successIcon: { width: 110, height: 110, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },`
- `130: successTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },`
- `131: successAmount: { color: '#fff', fontSize: 36, fontFamily: 'Cairo-ExtraBold' },`
- `132: successSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '400' },`
### payment_insurance_relevance
- `2: // app/payments/success.tsx`
- `11: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `14: export default function PaymentSuccessScreen() {`
- `21: const isWalletTopup = params.wallet === 'true';`
- `37: const serviceName = (params.serviceName as string) || (isPharmacy ? 'طلب الصيدلية' : isWalletTopup ? 'شحن المحفظة' : 'الخدمة');`
- `39: const refNumber = (params.moyasarId as string) ? String(params.moyasarId).slice(0, 18) : '—';`
- `60: { label: 'طريقة الدفع', val: (params.paymentMethod || params.method) as string || 'بطاقة بنكية' },`
- `75: message: `إيصال دفع — تطبيق نبض\nرقم المرجع: ${refNumber}\nالتاريخ: ${new Date().toLocaleString(dateLocale())}\nطريقة الدفع: ${(params.paymentMethod || params.method) as string || 'بطاقة بنكية'}\nالحالة: ناجح`,`
- `105: {isWalletTopup && (`
- `107: onPress={() => router.replace('/wallet/hub')}`
### error_empty_loading_retry_cancel
- `76: }).catch(() => {});`
- `85: if (apptId) router.push({ pathname: '/consultations/booking-pending', params: { appointmentId: apptId, visitType: vt } });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
