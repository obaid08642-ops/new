# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/chat-with-pharmacist.tsx`
- **Member SHA-256:** `3f8ed490c5795c997eb8864840f032fc645b34747ccc87bc9733bb3a602e4712`
- **Line count:** 549
- **Read range:** `1-549`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `31: import { useLocalSearchParams } from 'expo-router';`
- `35: export default function ChatWithPharmacistScreen() {`
- `45: // M1-32: real chat contract — booking thread via /chat/threads/booking (was non-existent /chat/history)`
- `60: const threadRes: any = await apiFetch(`/chat/threads/booking`, {`
- `62: body: JSON.stringify({ booking_id: orderId, booking_kind: 'pharmacy' }),`
- `152: if (result.canceled || !result.assets?.[0]) return;`
- `163: const up = await apiFetch<any>('/media/upload', { method: 'POST', body: formData });`
- `188: { text: 'إلغاء', style: 'cancel' },`
- `191: onPress: () => {`
- `192: router.push('/pharmacy/cart');`
- `227: onPress={handleConfirmOrder}`
### backend_consumers_or_contracts
- `53: apiFetch(`/orders/${orderId}`)`
- `60: const threadRes: any = await apiFetch(`/chat/threads/booking`, {`
- `68: const data: any = await apiFetch(`/chat/threads/${tid}/messages`);`
- `124: apiFetch(`/chat/threads/${threadId}/messages`, {`
- `168: await apiFetch(`/chat/threads/${threadId}/messages`, {`
- `192: router.push('/pharmacy/cart');`
### auth_ownership
- `42: const [sessionExpired, setSessionExpired] = useState(false);`
- `74: sender: m.sender_role === 'pharmacist' ? 'pharmacist' : 'me',`
- `84: setSessionExpired(true);`
- `88: id: 'session-end',`
- `112: if (!msg.trim() || sessionExpired) return;`
- `144: const perm = await ImagePicker.requestCameraPermissionsAsync();`
- `148: const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();`
- `334: <View style={[styles.onlineDot, { backgroundColor: sessionExpired ? colors.textTertiary : colors.success }]} />`
- `335: <AppText variant="caption" color={sessionExpired ? colors.textTertiary : colors.success}>`
- `336: {sessionExpired ? "غير متصل" : pharmacist.pharmacy}`
- `343: {remainingSeconds <= 120 && !sessionExpired && (`
- `369: {sessionExpired ? (`
### state_transitions
- `2: import React, { useState, useEffect, useRef } from 'react';`
- `3: import { View, StyleSheet, StatusBar, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';`
- `27: status: 'متصل',`
- `39: const [msg, setMsg] = useState('');`
- `40: const [messages, setMessages] = useState<ChatMessage[]>([]);`
- `41: const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);`
- `42: const [sessionExpired, setSessionExpired] = useState(false);`
- `46: const [threadId, setThreadId] = useState('');`
- `47: const [pharmacist, setPharmacist] = useState(PHARMACIST_DEFAULT);`
- `56: if (ord?.pharmacy_name) setPharmacist({ name: ord.pharmacy_name, pharmacy: ord.pharmacy_name, status: 'متصل' });`
- `122: // M1-32: persist the message to the real thread — mark failed honestly on error`
- `128: setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, failed: true } : m));`
### payment_insurance_relevance
- `9: import { AppText, Card, IconButton, Button } from '../../src/components/ui';`
- `16: type: 'text' | 'price' | 'system';`
- `17: priceData?: {`
- `18: items: { name: string; qty: number; price: number }[];`
- `19: total: number;`
- `105: const formatTime = (totalSeconds: number): string => {`
- `106: const minutes = Math.floor(totalSeconds / 60);`
- `107: const seconds = totalSeconds % 60;`
- `199: const renderPriceCard = (priceData: NonNullable<ChatMessage['priceData']>) => (`
- `200: <View style={[styles.priceCard, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: colors.borderLight } ]}>`
- `201: <View style={styles.priceCardHeader}>`
- `205: <View style={[styles.priceCardDivider, { backgroundColor: colors.borderLight }]} />`
### error_empty_loading_retry_cancel
- `58: .catch(() => {});`
- `78: } catch (err) {}`
- `122: // M1-32: persist the message to the real thread — mark failed honestly on error`
- `127: }).catch(() => {`
- `128: setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, failed: true } : m));`
- `132: setTimeout(() => {`
- `152: if (result.canceled || !result.assets?.[0]) return;`
- `171: }).catch(() => {`
- `172: setMessages(prev => prev.map(m => m.id === imgMsg.id ? { ...m, failed: true } : m));`
- `176: } catch (err: any) {`
- `188: { text: 'إلغاء', style: 'cancel' },`
- `250: style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: colors.error, borderRadius: 10 }}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
