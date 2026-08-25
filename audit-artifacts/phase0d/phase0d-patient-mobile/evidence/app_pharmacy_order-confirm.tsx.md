# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/order-confirm.tsx`
- **Member SHA-256:** `9f086041c0174ab84abb1e11c8e2725bfe86ef1efd5996912caed2a22bba0322`
- **Line count:** 219
- **Read range:** `1-219`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * app/pharmacy/order-confirm.tsx  [NEW SCREEN]`
- `4: * Pharmacy Confirmation Screen.`
- `5: * Shown after a pharmacy accepts the order (from waiting screen).`
- `14: import { router, useLocalSearchParams } from 'expo-router';`
- `22: export default function OrderConfirmScreen() {`
- `55: router.push({ pathname: '/pharmacy/payment', params: { orderId, total: order?.total || 0 } });`
- `66: router.replace({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId } });`
- `87: <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 }}>`
- `178: onPress={handleApprove}`
- `192: onPress={handleReject}`
### backend_consumers_or_contracts
- `3: * app/pharmacy/order-confirm.tsx  [NEW SCREEN]`
- `38: const data = await apiFetch(`/orders/${orderId}`);`
- `54: await apiFetch(`/orders/${orderId}/approve-basket`, { method: 'POST' });`
- `55: router.push({ pathname: '/pharmacy/payment', params: { orderId, total: order?.total || 0 } });`
- `65: await apiFetch(`/orders/${orderId}/reject-basket`, { method: 'POST', body: JSON.stringify({ reason: 'patient-rejected-price' }) });`
- `66: router.replace({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId } });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: import React, { useEffect, useState } from 'react';`
- `29: const [order, setOrder] = useState<any>(null);`
- `30: const [loadError, setLoadError] = useState(false);`
- `31: const [loading, setLoading] = useState(true);`
- `32: const [approving, setApproving] = useState(false);`
- `41: // API unavailable — show error state (no demo data in production)`
- `43: setLoadError(true);`
- `45: setLoading(false);`
- `53: // E2: was catch{} then navigate anyway — payment for an unapproved basket. Now we stay on failure.`
- `65: await apiFetch(`/orders/${orderId}/reject-basket`, { method: 'POST', body: JSON.stringify({ reason: 'patient-rejected-price' }) });`
- `72: if (loading) {`
- `82: if (loadError) {`
### payment_insurance_relevance
- `6: * - Shows pharmacy name, available items, final price.`
- `7: * - Patient can approve → goes to payment, or reject → back to searching.`
- `53: // E2: was catch{} then navigate anyway — payment for an unapproved basket. Now we stay on failure.`
- `55: router.push({ pathname: '/pharmacy/payment', params: { orderId, total: order?.total || 0 } });`
- `65: await apiFetch(`/orders/${orderId}/reject-basket`, { method: 'POST', body: JSON.stringify({ reason: 'patient-rejected-price' }) });`
- `111: <View style={[styles.pharmacyCard, { backgroundColor: colors.s, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>`
- `141: <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 15, color: '#23B5CE' }}>{(item.price * item.qty).toFixed(2)} ر.س</LocalizedText>`
- `156: {/* Price Summary */}`
- `160: <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.n }}>{order.subtotal?.toFixed(2)} ر.س</LocalizedText>`
- `169: <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 20, color: '#23B5CE' }}>{order.total?.toFixed(2)} ر.س</LocalizedText>`
- `185: <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>payments</LocalizedText>`
- `206: pharmacyCard: { padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', marginBottom: 24 },`
### error_empty_loading_retry_cancel
- `30: const [loadError, setLoadError] = useState(false);`
- `31: const [loading, setLoading] = useState(true);`
- `40: } catch {`
- `41: // API unavailable — show error state (no demo data in production)`
- `43: setLoadError(true);`
- `45: setLoading(false);`
- `53: // E2: was catch{} then navigate anyway — payment for an unapproved basket. Now we stay on failure.`
- `56: } catch (e: any) {`
- `67: } catch (e: any) {`
- `72: if (loading) {`
- `82: if (loadError) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
