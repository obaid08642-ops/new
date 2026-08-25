# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/copay.tsx`
- **Member SHA-256:** `7ff35a2661d65523f577e5f01561f6d34bf1c5070dd9e3366186e808dc92fe10`
- **Line count:** 134
- **Read range:** `1-134`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { useLocalSearchParams, router } from 'expo-router';`
- `15: export default function InsuranceCopayScreen() {`
- `56: // Hosted checkout/verified payment event is the only path that can settle`
- `58: router.replace({ pathname: '/payments/processing', params: { moyasarId: txn.id, paymentUrl: txn.checkout_url || '', bookingId: copayRequest.id, bookingKind: 'insurance', amount: String(txn.amount ?? dueAmount) } });`
- `60: alert(isRTL ? 'فشل إتمام الدفع — تحقق من وسيلة الدفع وحاول مجدداً' : 'Payment failed — check your payment method and retry');`
- `102: onPress={handlePay}`
### backend_consumers_or_contracts
- `31: const rows = await apiFetch<any[]>('/insurance/requests/my');`
- `54: const txn = await apiFetch<any>(`/payments/intent/insurance/${copayRequest.id}`, { method: 'POST', headers: paymentIntentHeaders('insurance', copayRequest.id) });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `21: const [loading, setLoading] = useState(false);`
- `22: const [success, setSuccess] = useState(false);`
- `23: const [copayRequest, setCopayRequest] = useState<any>(null);`
- `24: const [loadError, setLoadError] = useState('');`
- `26: // Resolve the real COPAY_PENDING insurance request (written by the provider's`
- `32: const pending = (rows || [])`
- `33: .filter((r: any) => r.state === 'COPAY_PENDING')`
- `35: if (pending.length) setCopayRequest(pending[0]);`
- `36: else setLoadError(isRTL ? 'لا توجد مطالبة تأمين بانتظار الدفع حالياً' : 'No insurance copay is currently pending');`
- `38: setLoadError(isRTL ? 'تعذر تحميل مطالبة التأمين' : 'Failed to load the insurance request');`
- `48: alert(isRTL ? 'لا توجد مطالبة بانتظار الدفع' : 'No pending copay request');`
### payment_insurance_relevance
- `10: import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';`
- `15: export default function InsuranceCopayScreen() {`
- `23: const [copayRequest, setCopayRequest] = useState<any>(null);`
- `26: // Resolve the real COPAY_PENDING insurance request (written by the provider's`
- `27: // insurance decision / gatekeeper) — the payment must reference its id.`
- `31: const rows = await apiFetch<any[]>('/insurance/requests/my');`
- `33: .filter((r: any) => r.state === 'COPAY_PENDING')`
- `35: if (pending.length) setCopayRequest(pending[0]);`
- `36: else setLoadError(isRTL ? 'لا توجد مطالبة تأمين بانتظار الدفع حالياً' : 'No insurance copay is currently pending');`
- `38: setLoadError(isRTL ? 'تعذر تحميل مطالبة التأمين' : 'Failed to load the insurance request');`
- `44: const dueAmount = copayRequest?.copay_amount ?? (amount ? parseFloat(amount as string) : 0);`
- `46: const handlePay = async () => {`
### error_empty_loading_retry_cancel
- `21: const [loading, setLoading] = useState(false);`
- `24: const [loadError, setLoadError] = useState('');`
- `26: // Resolve the real COPAY_PENDING insurance request (written by the provider's`
- `32: const pending = (rows || [])`
- `33: .filter((r: any) => r.state === 'COPAY_PENDING')`
- `35: if (pending.length) setCopayRequest(pending[0]);`
- `36: else setLoadError(isRTL ? 'لا توجد مطالبة تأمين بانتظار الدفع حالياً' : 'No insurance copay is currently pending');`
- `37: } catch {`
- `38: setLoadError(isRTL ? 'تعذر تحميل مطالبة التأمين' : 'Failed to load the insurance request');`
- `48: alert(isRTL ? 'لا توجد مطالبة بانتظار الدفع' : 'No pending copay request');`
- `51: setLoading(true);`
- `55: if (!txn?.id) throw new Error('payment_intent_failed');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
