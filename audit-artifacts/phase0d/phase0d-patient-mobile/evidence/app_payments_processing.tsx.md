# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/payments/processing.tsx`
- **Member SHA-256:** `638feb10324c8adb6c975416f575290b9a2e7bca545df46a8ee49b6718522d5f`
- **Line count:** 556
- **Read range:** `1-556`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router, useLocalSearchParams } from 'expo-router';`
- `21: export default function PaymentProcessingScreen() {`
- `27: bookingId: string;`
- `28: bookingKind: string;`
- `33: const { moyasarId, paymentUrl, bookingId, bookingKind, amount, walletTopupId } = params;`
- `149: router.replace({`
- `156: router.replace({`
- `181: router.replace({`
- `184: bookingId: bookingId || '',`
- `185: bookingKind: bookingKind || '',`
- `195: router.replace({`
- `198: bookingId: bookingId || '',`
### backend_consumers_or_contracts
- `144: '/wallet/topup/confirm',`
### auth_ownership
- `313: <Icon name="refresh" size={24} color={colors.primary} />`
- `404: icon="refresh"`
### state_transitions
- `3: import React, { useEffect, useState, useRef, useCallback } from 'react';`
- `19: type PaymentStatus = 'webview' | 'polling' | 'timeout' | 'error';`
- `35: const [phase, setPhase] = useState<PaymentStatus>(`
- `38: const [pollCount, setPollCount] = useState(0);`
- `39: const [statusText, setStatusText] = useState('جاري معالجة الدفع...');`
- `86: // Dot loading animation`
- `117: // Poll payment status from backend`
- `118: const pollPaymentStatus = useCallback(`
- `128: setStatusText('انتهت مهلة التحقق');`
- `135: setStatusText(`
- `143: const res = await apiFetch<{ status: string; balance?: number; amount?: number }>(`
- `148: if (res.status === 'credited') {`
### payment_insurance_relevance
- `2: // app/payments/processing.tsx`
- `10: import { AppText, Card, Button } from '../../src/components/ui';`
- `19: type PaymentStatus = 'webview' | 'polling' | 'timeout' | 'error';`
- `21: export default function PaymentProcessingScreen() {`
- `25: moyasarId: string;`
- `26: paymentUrl: string;`
- `30: walletTopupId?: string;`
- `33: const { moyasarId, paymentUrl, bookingId, bookingKind, amount, walletTopupId } = params;`
- `35: const [phase, setPhase] = useState<PaymentStatus>(`
- `36: paymentUrl ? 'webview' : 'polling'`
- `117: // Poll payment status from backend`
- `118: const pollPaymentStatus = useCallback(`
### error_empty_loading_retry_cancel
- `17: } catch {}`
- `19: type PaymentStatus = 'webview' | 'polling' | 'timeout' | 'error';`
- `40: const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);`
- `86: // Dot loading animation`
- `113: if (pollTimerRef.current) clearTimeout(pollTimerRef.current);`
- `127: setPhase('timeout');`
- `155: if (res.status === 'failed') {`
- `157: pathname: '/payments/failed',`
- `162: pollTimerRef.current = setTimeout(() => pollPaymentStatus(attempt + 1), POLL_INTERVAL);`
- `194: if (res.status === 'failed') {`
- `196: pathname: '/payments/failed',`
- `207: // Status is still pending/initiated - poll again`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
