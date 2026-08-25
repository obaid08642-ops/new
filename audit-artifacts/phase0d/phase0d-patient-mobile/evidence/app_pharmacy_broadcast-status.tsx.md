# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/broadcast-status.tsx`
- **Member SHA-256:** `c4ed4e617646a2a3e8066fc98df6436927fa334d1c156b5c817529ea72635027`
- **Line count:** 103
- **Read range:** `1-103`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `12: export default function BroadcastStatusScreen() {`
- `47: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
- `61: <IconButton icon="back" onPress={() => router.back()} />`
- `89: {bid.status === 'pending' && <Button label="قبول هذا العرض" variant="gradient" size="md" loading={acceptingBid === bid.id} disabled={acceptingBid !== null} onPress={() => acceptBid(bid.id)} style={{ marginTop: 14 }} />}`
### backend_consumers_or_contracts
- `1: // app/pharmacy/broadcast-status.tsx — renders only live bids returned for a real order request.`
- `29: const response = await apiFetch(`/orders/bids/request/${orderId}`);`
- `46: await apiFetch(`/orders/bids/${bidId}/accept`, { method: 'POST' });`
- `47: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: // app/pharmacy/broadcast-status.tsx — renders only live bids returned for a real order request.`
- `2: import React, { useEffect, useState } from 'react';`
- `3: import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';`
- `12: export default function BroadcastStatusScreen() {`
- `17: const [bids, setBids] = useState<any[]>([]);`
- `18: const [loading, setLoading] = useState(true);`
- `19: const [acceptingBid, setAcceptingBid] = useState<string | null>(null);`
- `23: setLoading(false);`
- `34: if (active) setLoading(false);`
- `48: } catch (error: any) {`
- `49: showLocalizedAlert('تعذر قبول العرض', error?.message || 'ربما انتهت صلاحية العرض أو تم اختياره مسبقاً.');`
- `57: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
### payment_insurance_relevance
- `8: import { AppText, Card, Button, IconButton } from '../../src/components/ui';`
- `65: <Card style={{ backgroundColor: colors.infoSurface }}>`
- `70: </Card>`
- `72: {!orderId ? <Card><AppText variant="bodySM" color={colors.error}>رقم الطلب غير متاح، لذلك لا يمكن تحميل العروض.</AppText></Card>`
- `74: : bids.length === 0 ? <Card><AppText variant="bodySM" color={colors.textSecondary}>لا توجد عروض متاحة حتى الآن. ستُحدّث القائمة تلقائياً.</AppText></Card>`
- `76: <Card key={bid.id}>`
- `87: <AppText variant="h6" color={colors.primary}>{Number.isFinite(Number(bid.total_price)) ? `${Number(bid.total_price).toFixed(2)} ر.س` : '—'}</AppText>`
- `91: </Card>`
### error_empty_loading_retry_cancel
- `18: const [loading, setLoading] = useState(true);`
- `23: setLoading(false);`
- `31: } catch {`
- `34: if (active) setLoading(false);`
- `48: } catch (error: any) {`
- `49: showLocalizedAlert('تعذر قبول العرض', error?.message || 'ربما انتهت صلاحية العرض أو تم اختياره مسبقاً.');`
- `72: {!orderId ? <Card><AppText variant="bodySM" color={colors.error}>رقم الطلب غير متاح، لذلك لا يمكن تحميل العروض.</AppText></Card>`
- `73: : loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />`
- `89: {bid.status === 'pending' && <Button label="قبول هذا العرض" variant="gradient" size="md" loading={acceptingBid === bid.id} disabled={acceptingBid !== null} onPress={() => acceptBid(bid.id)} style={{ marginTop: 14 }} />}`
- `90: {bid.status !== 'pending' && <AppText variant="caption" color={colors.textTertiary} style={{ marginTop: 14 }}>حالة العرض: {bid.status}</AppText>}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
