# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/approval-pending.tsx`
- **Member SHA-256:** `b48b1921bf72a7c6658dff4c17549310ea83e990963d054e875d839b55301229`
- **Line count:** 191
- **Read range:** `1-191`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `11: export default function InsuranceApprovalPendingScreen() {`
- `22: // Poll the real insurance-approval request linked to this booking — never auto-approve.`
- `26: const TERMINAL_REJECTED = ['REJECTED', 'DECLINED', 'CANCELLED'];`
- `36: req = params.bookingId`
- `37: ? arr.find((r: any) => r.booking_id === params.bookingId)`
- `57: }, [params.requestId, params.bookingId]);`
- `87: <Button label="متابعة حالة الطلبات" variant="ghost" icon="refresh" onPress={() => router.push('/insurance/claim-tracking')} />`
- `103: <Button label={`ادفع كاش — ${totalAmount} ر.س`} variant="gradient" icon="card" onPress={() => router.push('/payments/processing')} />`
- `105: <Button label="اتصل بشركة التأمين" variant="outline" icon="call" onPress={() => router.replace('/(tabs)/consultations')} />`
- `106: <Button label="إلغاء" variant="ghost" icon="close" onPress={() => router.back()} />`
- `177: <Button label={copayAmount !== null && copayAmount > 0 ? `تأكيد ودفع ${copayAmount} ر.س` : 'تأكيد'} variant="gradient" size="lg" icon="check_circle" onPress={() => router.push('/payments/processing')} />`
### backend_consumers_or_contracts
- `32: req = await apiFetch(`/insurance/requests/${params.requestId}`).catch(() => null);`
- `34: const list = await apiFetch('/insurance/requests/my').catch(() => []);`
- `48: apiFetch('/users/me/profile').then((p: any) => {`
- `87: <Button label="متابعة حالة الطلبات" variant="ghost" icon="refresh" onPress={() => router.push('/insurance/claim-tracking')} />`
### auth_ownership
- `87: <Button label="متابعة حالة الطلبات" variant="ghost" icon="refresh" onPress={() => router.push('/insurance/claim-tracking')} />`
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `3: import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';`
- `11: export default function InsuranceApprovalPendingScreen() {`
- `15: const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');`
- `16: const [copayPercent, setCopayPercent] = useState<number | null>(null);`
- `17: const [copayAmountReal, setCopayAmountReal] = useState<number | null>(null);`
- `18: const [companyName, setCompanyName] = useState<string | null>(null);`
- `19: const [policyNumber, setPolicyNumber] = useState<string | null>(null);`
- `25: const TERMINAL_APPROVED = ['COPAY_PENDING', 'COPAY_PAID', 'APPROVED', 'CONFIRMED'];`
- `26: const TERMINAL_REJECTED = ['REJECTED', 'DECLINED', 'CANCELLED'];`
- `43: if (TERMINAL_APPROVED.includes(req.state)) setStatus('approved');`
- `44: else if (TERMINAL_REJECTED.includes(req.state)) setStatus('rejected');`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `11: export default function InsuranceApprovalPendingScreen() {`
- `16: const [copayPercent, setCopayPercent] = useState<number | null>(null);`
- `17: const [copayAmountReal, setCopayAmountReal] = useState<number | null>(null);`
- `20: const totalAmount = Number(params.amount) || 0;`
- `22: // Poll the real insurance-approval request linked to this booking — never auto-approve.`
- `25: const TERMINAL_APPROVED = ['COPAY_PENDING', 'COPAY_PAID', 'APPROVED', 'CONFIRMED'];`
- `32: req = await apiFetch(`/insurance/requests/${params.requestId}`).catch(() => null);`
- `34: const list = await apiFetch('/insurance/requests/my').catch(() => []);`
- `41: if (req.copay_percent !== undefined && req.copay_percent !== null) setCopayPercent(Number(req.copay_percent));`
- `42: if (req.copay_amount !== undefined && req.copay_amount !== null) setCopayAmountReal(Number(req.copay_amount));`
- `50: setCompanyName(p?.insurance?.provider || null);`
### error_empty_loading_retry_cancel
- `11: export default function InsuranceApprovalPendingScreen() {`
- `15: const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');`
- `25: const TERMINAL_APPROVED = ['COPAY_PENDING', 'COPAY_PAID', 'APPROVED', 'CONFIRMED'];`
- `26: const TERMINAL_REJECTED = ['REJECTED', 'DECLINED', 'CANCELLED'];`
- `32: req = await apiFetch(`/insurance/requests/${params.requestId}`).catch(() => null);`
- `34: const list = await apiFetch('/insurance/requests/my').catch(() => []);`
- `45: } catch { /* keep polling */ }`
- `52: }).catch(() => {});`
- `62: if (status === 'pending') {`
- `96: <View style={[st.iconWrap, { backgroundColor: colors.errorSurface } ]}>`
- `97: <Icon name="close" size={40} color={colors.error} />`
- `99: <AppText variant="h3" align="center" color={colors.error}>لم تتم الموافقة</AppText>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
