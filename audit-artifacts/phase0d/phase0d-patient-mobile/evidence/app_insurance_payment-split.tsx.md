# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/payment-split.tsx`
- **Member SHA-256:** `77234a94abb1ec6afe1b168c279b854e3a7adebcb7a7d1ec628096844768d2da`
- **Line count:** 76
- **Read range:** `1-76`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `13: export default function InsurancePaymentSplitScreen() {`
- `20: const [submitting, setSubmitting] = useState(false);`
- `39: setSubmitting(true); setError('');`
- `43: } else if (action === 'checkout_copay') {`
- `46: router.replace({ pathname: '/payments/processing', params: { moyasarId: txn.id, paymentUrl: txn.checkout_url || '', bookingId: request.id, bookingKind: 'insurance', amount: String(txn.amount) } });`
- `50: } finally { setSubmitting(false); }`
- `54: const title = action === 'provider_review' ? 'بانتظار مراجعة مزود الخدمة' : action === 'settle_zero_copay' ? 'موافقة كاملة من التأمين' : action === 'checkout_copay' ? 'دفع التحمل المعتمد' : action === 'paid' ? 'تم تسجيل دفع التحمل' : 'حالة `
- `55: const detail = action === 'provider_review' ? 'لم يُحدد مزود الخدمة التغطية بعد، لذلك لا يمكن تأكيد حجز أو دفع الآن.' : action === 'settle_zero_copay' ? 'لا يوجد مبلغ مستحق عليك. أكّد الاستمرار لتسجيل الموافقة الكاملة.' : action === 'checko`
- `60: <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.borderLight, backgroundColor: colors.surface }]}><View style={{ width: 40 }} /><AppText variant="h4">ملخص التأمين</AppText><IconButton icon="back" onPress`
- `62: {!!error && <Card style={{ alignItems: 'center', gap: 10 }}><Icon name="warning" size={32} color={colors.error} /><AppText align="center" color={colors.textSecondary}>{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="s`
- `66: {action === 'provider_review' && <Button label="تحديث الحالة" variant="outline" onPress={() => void load()} />}`
### backend_consumers_or_contracts
- `1: // app/insurance/payment-split.tsx — server-owned insurance copay summary`
- `11: import { insurancePaymentAction, parseInsuranceCopayRequest, type InsuranceCopayRequest } from '../../src/utils/insurance-copay-contract';`
- `27: setRequest(parseInsuranceCopayRequest(await apiFetch(`/insurance/requests/${requestId}`)));`
- `41: await apiFetch(`/insurance/requests/${request.id}/pay-copay`, { method: 'POST', body: JSON.stringify({}) });`
- `44: const txn = await apiFetch<any>(`/payments/intent/insurance/${request.id}`, { method: 'POST', headers: paymentIntentHeaders('insurance', request.id) });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useCallback, useEffect, useState } from 'react';`
- `3: import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from 'react-native';`
- `18: const [request, setRequest] = useState<InsuranceCopayRequest | null>(null);`
- `19: const [loading, setLoading] = useState(true);`
- `20: const [submitting, setSubmitting] = useState(false);`
- `21: const [error, setError] = useState('');`
- `24: if (!requestId) { setError('معرّف طلب التأمين غير متوفر. ارجع إلى الحجز أو سجل المطالبات.'); setLoading(false); return; }`
- `26: setLoading(true); setError('');`
- `29: setRequest(null); setError('تعذر تحميل طلب التأمين. تحقق من صلاحيتك أو أعد المحاولة.');`
- `30: } finally { setLoading(false); }`
- `39: setSubmitting(true); setError('');`
- `45: if (!txn?.id) throw new Error('payment_intent_failed');`
### payment_insurance_relevance
- `1: // app/insurance/payment-split.tsx — server-owned insurance copay summary`
- `8: import { AppText, Button, Card, IconButton } from '../../src/components/ui';`
- `10: import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';`
- `11: import { insurancePaymentAction, parseInsuranceCopayRequest, type InsuranceCopayRequest } from '../../src/utils/insurance-copay-contract';`
- `13: export default function InsurancePaymentSplitScreen() {`
- `18: const [request, setRequest] = useState<InsuranceCopayRequest | null>(null);`
- `27: setRequest(parseInsuranceCopayRequest(await apiFetch(`/insurance/requests/${requestId}`)));`
- `37: const action = insurancePaymentAction(request);`
- `40: if (action === 'settle_zero_copay') {`
- `41: await apiFetch(`/insurance/requests/${request.id}/pay-copay`, { method: 'POST', body: JSON.stringify({}) });`
- `43: } else if (action === 'checkout_copay') {`
- `44: const txn = await apiFetch<any>(`/payments/intent/insurance/${request.id}`, { method: 'POST', headers: paymentIntentHeaders('insurance', request.id) });`
### error_empty_loading_retry_cancel
- `19: const [loading, setLoading] = useState(true);`
- `21: const [error, setError] = useState('');`
- `24: if (!requestId) { setError('معرّف طلب التأمين غير متوفر. ارجع إلى الحجز أو سجل المطالبات.'); setLoading(false); return; }`
- `26: setLoading(true); setError('');`
- `28: } catch {`
- `29: setRequest(null); setError('تعذر تحميل طلب التأمين. تحقق من صلاحيتك أو أعد المحاولة.');`
- `30: } finally { setLoading(false); }`
- `39: setSubmitting(true); setError('');`
- `45: if (!txn?.id) throw new Error('payment_intent_failed');`
- `48: } catch {`
- `49: setError('تعذر متابعة التحمل. لم يُسجّل أي دفع محلياً؛ حاول لاحقاً أو راجع حالة الطلب.');`
- `57: if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><ActivityIndicator color={colors.primary} size="large" /></View>;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
