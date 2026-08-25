# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/wallet/hub.tsx`
- **Member SHA-256:** `ab7d3f0514b46c93e616fbc92e477dd1f6fa5fa5894744fc30271a3c4d754373`
- **Line count:** 458
- **Read range:** `1-458`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { router } from 'expo-router';`
- `23: { id: 'topup', icon: 'add_card', label: 'شحن المحفظة', route: '/wallet/topup' },`
- `24: { id: 'transfer', icon: 'send', label: 'تحويل', route: '/wallet/transfer' },`
- `25: { id: 'history', icon: 'history', label: 'السجل', route: '/wallet/transactions' },`
- `53: export default function WalletHubScreen() {`
- `110: { text: 'إلغاء', style: 'cancel' },`
- `114: onPress: async () => {`
- `136: apiFetch<any>('/wallet/transactions?page=1&limit=4')`
- `146: category: tx.referenceType === 'booking' ? 'استشارة' : tx.referenceType === 'refund' ? 'استرداد' : 'شحن',`
- `176: <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={styles.hBtn}>`
- `181: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `209: onPress={() => router.push(action.route as any)}`
### backend_consumers_or_contracts
- `2: // app/wallet/hub.tsx`
- `23: { id: 'topup', icon: 'add_card', label: 'شحن المحفظة', route: '/wallet/topup' },`
- `24: { id: 'transfer', icon: 'send', label: 'تحويل', route: '/wallet/transfer' },`
- `25: { id: 'history', icon: 'history', label: 'السجل', route: '/wallet/transactions' },`
- `70: apiFetch<any>('/wallet/cards')`
- `89: const res = await apiFetch<any>('/wallet/cards', {`
- `116: const res = await apiFetch<any>(`/wallet/cards/${card.id}`, { method: 'DELETE' });`
- `128: apiFetch<{ balance: number }>('/wallet/balance')`
- `136: apiFetch<any>('/wallet/transactions?page=1&limit=4')`
- `158: apiFetch('/wallet/spending-data')`
- `285: <TouchableOpacity onPress={() => router.push('/wallet/transactions')}>`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState, useRef, useEffect } from 'react';`
- `6: Dimensions, Animated, StatusBar, Modal, TextInput,`
- `58: const [showBalance, setShowBalance] = useState(true);`
- `59: const [activeCard, setActiveCard] = useState(0);`
- `60: const [balance, setBalance] = useState(0);`
- `61: const [transactions, setTransactions] = useState<any[]>([]);`
- `62: const [cards, setCards] = useState<any[]>([]);`
- `63: const [showAddCard, setShowAddCard] = useState(false);`
- `64: const [savingCard, setSavingCard] = useState(false);`
- `65: const [cardHolder, setCardHolder] = useState('');`
- `66: const [cardNumber, setCardNumber] = useState('');`
- `67: const [cardExpiry, setCardExpiry] = useState('');`
### payment_insurance_relevance
- `2: // app/wallet/hub.tsx`
- `15: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `23: { id: 'topup', icon: 'add_card', label: 'شحن المحفظة', route: '/wallet/topup' },`
- `24: { id: 'transfer', icon: 'send', label: 'تحويل', route: '/wallet/transfer' },`
- `25: { id: 'history', icon: 'history', label: 'السجل', route: '/wallet/transactions' },`
- `28: // Credit Card Component`
- `29: const CreditCardView = ({ card, isDark }: any) => (`
- `31: style={styles.creditCard}`
- `33: <View style={styles.cardShimmer} />`
- `34: <View style={styles.cardTop}>`
- `36: <View style={styles.cardTypeBadge}>`
- `37: <AppText variant="bodySM">{card.type.toUpperCase()}</AppText>`
### error_empty_loading_retry_cancel
- `72: .catch(() => {});`
- `101: } catch (err: any) {`
- `110: { text: 'إلغاء', style: 'cancel' },`
- `118: } catch (err: any) {`
- `130: .catch(() => {});`
- `151: .catch(() => {});`
- `155: const [spendingData, setSpendingData] = useState<any[]>([]);`
- `158: apiFetch('/wallet/spending-data')`
- `159: .then((res: any) => setSpendingData(Array.isArray(res) ? res : []))`
- `160: .catch(() => {});`
- `195: {CASHBACK_PENDING > 0 && (`
- `198: {CASHBACK_PENDING} ريال كاشباك قيد الترحيل`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
