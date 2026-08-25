# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/InsuranceRequestsScreen.tsx`
- **Member SHA-256:** `ac809655973b76f48db7f6da1f69cf896860e4f545470e55dcb62f1ac86aae98`
- **Line count:** 284
- **Read range:** `1-284`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `27: export function InsuranceRequestsScreen({ onBack }: { onBack: () => void }) {`
- `43: const [submitting, setSubmitting] = useState(false);`
- `70: const submitDecision = async () => {`
- `88: setSubmitting(true);`
- `96: show(e?.message || (AR ? 'تعذر إرسال القرار' : 'Failed to submit decision'), 'error');`
- `98: setSubmitting(false);`
- `129: actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}`
- `177: onPress={() => openDecision(req)}`
- `207: onPress={() => setMode(opt.k as DecisionMode)}`
- `266: label={submitting ? (AR ? 'جارٍ الإرسال…' : 'Submitting…') : (AR ? 'تأكيد القرار' : 'Confirm Decision')}`
- `267: onPress={submitDecision}`
- `268: disabled={!mode || submitting}`
### backend_consumers_or_contracts
- `6: * Backend: GET  /insurance/requests/provider/queue`
- `7: *          POST /insurance/requests/:id/decide`
- `15: import client from '../../api/client';`
- `49: const res = await client.get('/insurance/requests/provider/queue');`
- `90: const res = await client.post(`/insurance/requests/${target.id}/decide`, body);`
### auth_ownership
- `11: import { View, Text, TouchableOpacity, Modal, TextInput, RefreshControl, ActivityIndicator } from 'react-native';`
- `35: const [refreshing, setRefreshing] = useState(false);`
- `45: const load = useCallback(async (isRefresh = false) => {`
- `46: if (isRefresh) setRefreshing(true); else setLoading(true);`
- `57: setRefreshing(false);`
- `110: <NScroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}>`
### state_transitions
- `10: import React, { useCallback, useEffect, useState } from 'react';`
- `13: import { NHeader, NCard, NBtn, NScroll, NBadge, NEmpty, NSkeleton } from '../../components/ui';`
- `19: const STATE_META: Record<string, { ar: string; en: string; variant: string }> = {`
- `20: PENDING_PROVIDER_REVIEW: { ar: 'بانتظار قرارك', en: 'Awaiting your decision', variant: 'warn' },`
- `21: APPROVED_FULL: { ar: 'قبول كلي', en: 'Fully approved', variant: 'success' },`
- `22: COPAY_PENDING: { ar: 'بانتظار دفع المريض', en: 'Awaiting patient copay', variant: 'info' },`
- `23: COPAY_PAID: { ar: 'تم الدفع — ابدأ الخدمة', en: 'Paid — start service', variant: 'success' },`
- `24: REJECTED: { ar: 'مرفوض', en: 'Rejected', variant: 'danger' },`
- `33: const [items, setItems] = useState<any[]>([]);`
- `34: const [loading, setLoading] = useState(true);`
- `35: const [refreshing, setRefreshing] = useState(false);`
- `36: const [loadErr, setLoadErr] = useState<string | null>(null);`
### payment_insurance_relevance
- `3: * NABDAH PLUS – M4 · PROVIDER INSURANCE REQUESTS QUEUE (BR-2)`
- `5: *   قبول كلي · قبول جزئي (نسبة copay) · رفض مع سبب`
- `6: * Backend: GET  /insurance/requests/provider/queue`
- `7: *          POST /insurance/requests/:id/decide`
- `13: import { NHeader, NCard, NBtn, NScroll, NBadge, NEmpty, NSkeleton } from '../../components/ui';`
- `22: COPAY_PENDING: { ar: 'بانتظار دفع المريض', en: 'Awaiting patient copay', variant: 'info' },`
- `23: COPAY_PAID: { ar: 'تم الدفع — ابدأ الخدمة', en: 'Paid — start service', variant: 'success' },`
- `27: export function InsuranceRequestsScreen({ onBack }: { onBack: () => void }) {`
- `41: const [copayPct, setCopayPct] = useState('');`
- `49: const res = await client.get('/insurance/requests/provider/queue');`
- `53: const msg = e?.message || (AR ? 'تعذر تحميل طلبات التأمين' : 'Failed to load insurance requests');`
- `66: setCopayPct('');`
### error_empty_loading_retry_cancel
- `13: import { NHeader, NCard, NBtn, NScroll, NBadge, NEmpty, NSkeleton } from '../../components/ui';`
- `20: PENDING_PROVIDER_REVIEW: { ar: 'بانتظار قرارك', en: 'Awaiting your decision', variant: 'warn' },`
- `22: COPAY_PENDING: { ar: 'بانتظار دفع المريض', en: 'Awaiting patient copay', variant: 'info' },`
- `34: const [loading, setLoading] = useState(true);`
- `46: if (isRefresh) setRefreshing(true); else setLoading(true);`
- `52: } catch (e: any) {`
- `53: const msg = e?.message || (AR ? 'تعذر تحميل طلبات التأمين' : 'Failed to load insurance requests');`
- `56: setLoading(false);`
- `76: show(AR ? 'أدخل نسبة copay بين 1 و 99' : 'Enter a copay percent between 1 and 99', 'error');`
- `83: show(AR ? 'سبب الرفض إلزامي' : 'Rejection reason is required', 'error');`
- `95: } catch (e: any) {`
- `96: show(e?.message || (AR ? 'تعذر إرسال القرار' : 'Failed to submit decision'), 'error');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
