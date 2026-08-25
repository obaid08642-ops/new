# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/returns/new-request.tsx`
- **Member SHA-256:** `508c731a6db9082334dded5e4a0774c02dc62d7000c5f15dc9f365e2c1d2225e`
- **Line count:** 347
- **Read range:** `1-347`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { router } from 'expo-router';`
- `35: const REFUND_METHODS = [`
- `50: export default function NewReturnRequestScreen() {`
- `59: const [refundMethod, setRefundMethod] = useState('wallet');`
- `61: const [isSubmitting, setIsSubmitting] = useState(false);`
- `63: const handleSubmit = async () => {`
- `64: setIsSubmitting(true);`
- `73: refundMethod,`
- `77: setIsSubmitting(false);`
- `80: setIsSubmitting(false);`
- `98: <TouchableOpacity onPress={() => router.replace('/returns/hub')} style={styles.doneBtn}>`
- `101: <TouchableOpacity onPress={() => router.replace('/(tabs)')}><AppText variant="bodySM">الرئيسية</AppText></TouchableOpacity>`
### backend_consumers_or_contracts
- `66: await apiFetch('/pharmacy/returns', {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from 'react';`
- `35: const REFUND_METHODS = [`
- `54: const [step, setStep] = useState<'type' | 'details' | 'confirm' | 'success'>('type');`
- `55: const [serviceType, setServiceType] = useState('');`
- `56: const [selectedReason, setSelectedReason] = useState('');`
- `57: const [orderId, setOrderId] = useState('');`
- `58: const [details, setDetails] = useState('');`
- `59: const [refundMethod, setRefundMethod] = useState('wallet');`
- `60: const [attachedDocs, setAttachedDocs] = useState<string[]>([]);`
- `61: const [isSubmitting, setIsSubmitting] = useState(false);`
- `73: refundMethod,`
- `78: setStep('success');`
### payment_insurance_relevance
- `13: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `24: { id: 'insurance', label: 'مطالبة تأمين', icon: 'shield', color: '#F0A526' },`
- `32: insurance: ['دفع زائد', 'خطأ في الحساب', 'خدمة غير مغطاة', 'سبب آخر'],`
- `35: const REFUND_METHODS = [`
- `36: { id: 'wallet', label: 'محفظة نبض', icon: 'wallet', duration: 'فوري' },`
- `37: { id: 'card', label: 'البطاقة الأصلية', icon: 'card', duration: '3-5 أيام' },`
- `47: insurance: { rate: 100, conditions: 'في حالة ثبوت خطأ في الحساب' },`
- `59: const [refundMethod, setRefundMethod] = useState('wallet');`
- `73: refundMethod,`
- `141: style={[styles.typeCard, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: serviceType === t.id ? t.color : 'transparent', borderWidth: serviceType === t.id ? 2 : 0 }]}`
- `143: <View style={styles.typeCardLeft}>`
- `178: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
### error_empty_loading_retry_cancel
- `79: } catch (e) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
