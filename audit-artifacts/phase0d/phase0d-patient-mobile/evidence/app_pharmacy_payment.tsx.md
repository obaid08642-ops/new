# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/payment.tsx`
- **Member SHA-256:** `779f54f75a7a18a253bab5b1ad7367d2f2db82314905033f31aa476f9d525759`
- **Line count:** 259
- **Read range:** `1-259`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: * Payment screen — REAL Moyasar hosted-checkout flow (same canonical flow as consultations).`
- `7: * - POST /payments/intent/pharmacy/:orderId → hosted checkout → /payments/processing`
- `15: import { router, useLocalSearchParams } from 'expo-router';`
- `25: export default function PharmacyPaymentScreen() {`
- `55: // Amount ALWAYS comes from the server — never from route params or client math.`
- `69: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
- `74: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
- `80: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
- `87: router.push({`
- `91: paymentUrl: txn.checkout_url || '',`
- `92: bookingId: orderId,`
- `93: bookingKind: 'pharmacy',`
### backend_consumers_or_contracts
- `3: * app/pharmacy/payment.tsx`
- `7: * - POST /payments/intent/pharmacy/:orderId → hosted checkout → /payments/processing`
- `41: const data = await apiFetch(`/orders/${orderId}`);`
- `69: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
- `74: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
- `80: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
- `85: const txn = await apiFetch<any>(`/payments/intent/pharmacy/${orderId}`, { method: 'POST', headers: paymentIntentHeaders('pharmacy', orderId) });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: *   (or the provider-set insurance copay for approved insurance orders).`
- `8: *   which polls /payments/verify until paid/failed. No simulated outcomes.`
- `10: import React, { useState, useEffect, useCallback } from 'react';`
- `33: const [order, setOrder] = useState<any>(null);`
- `34: const [loading, setLoading] = useState(true);`
- `35: const [loadError, setLoadError] = useState(false);`
- `36: const [processing, setProcessing] = useState(false);`
- `40: setLoadError(false);`
- `45: setLoadError(true);`
- `47: setLoading(false);`
- `54: const insuranceApproved = order?.insurance_status === 'APPROVED' || order?.insurance_status === 'PARTIAL_APPROVAL';`
- `60: const alreadyPaid = order?.payment_status === 'paid';`
### payment_insurance_relevance
- `3: * app/pharmacy/payment.tsx`
- `4: * Payment screen — REAL Moyasar hosted-checkout flow (same canonical flow as consultations).`
- `5: * - Loads the order from the server; amount displayed is ALWAYS the server-side total`
- `6: *   (or the provider-set insurance copay for approved insurance orders).`
- `7: * - POST /payments/intent/pharmacy/:orderId → hosted checkout → /payments/processing`
- `8: *   which polls /payments/verify until paid/failed. No simulated outcomes.`
- `21: import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';`
- `25: export default function PharmacyPaymentScreen() {`
- `53: const isInsurance = order?.payment_method === 'insurance';`
- `54: const insuranceApproved = order?.insurance_status === 'APPROVED' || order?.insurance_status === 'PARTIAL_APPROVAL';`
- `56: const serverTotal = isInsurance ? Number(order?.insurance_copay || 0) : Number(order?.total || 0);`
- `57: // Split wallet+card: wallet portion was already debited at order creation.`
### error_empty_loading_retry_cancel
- `8: *   which polls /payments/verify until paid/failed. No simulated outcomes.`
- `34: const [loading, setLoading] = useState(true);`
- `35: const [loadError, setLoadError] = useState(false);`
- `40: setLoadError(false);`
- `43: } catch {`
- `45: setLoadError(true);`
- `47: setLoading(false);`
- `86: if (!txn || !txn.id) throw new Error('intent_failed');`
- `97: } catch (err: any) {`
- `104: if (loading) {`
- `120: <TouchableOpacity onPress={() => { setLoading(true); loadOrder(); }} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }}>`
- `175: {/* Insurance pending review */}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
