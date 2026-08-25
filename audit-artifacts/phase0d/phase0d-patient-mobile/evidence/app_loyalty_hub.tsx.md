# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/loyalty/hub.tsx`
- **Member SHA-256:** `8ffee0c60c11cc9b788089525e77ebe8628efe5a88b369acd586a60c3daa9878`
- **Line count:** 430
- **Read range:** `1-430`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { router } from 'expo-router';`
- `33: export default function LoyaltyHubScreen() {`
- `65: const txRes = await apiFetch('/loyalty/transactions?page=1');`
- `113: <IconButton icon="info" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/loyalty/leaderboard')} />`
- `114: <IconButton icon="redeem" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/loyalty/rewards')} />`
- `117: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `206: <TouchableOpacity key={t} onPress={() => setActiveTab(t)}`
- `268: onPress={() => router.push('/loyalty/rewards')}`
- `289: onPress={async () => {`
### backend_consumers_or_contracts
- `61: const acc = await apiFetch('/loyalty/account');`
- `65: const txRes = await apiFetch('/loyalty/transactions?page=1');`
- `68: const configRes = await apiFetch('/loyalty/config').catch(() => null);`
- `74: const rewardsRes = await apiFetch('/loyalty/rewards').catch(() => null);`
- `294: await apiFetch(`/loyalty/rewards/${rid}/claim`, { method: 'POST' });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState, useRef, useEffect } from 'react';`
- `6: Dimensions, Animated, StatusBar, ActivityIndicator, Alert`
- `37: const [points, setPoints] = useState(0);`
- `38: const [tierName, setTierName] = useState('bronze');`
- `39: const [claiming, setClaiming] = useState<string | null>(null);`
- `40: const [loading, setLoading] = useState(true);`
- `41: const [activities, setActivities] = useState<any[]>([]);`
- `42: const [tiers, setTiers] = useState<any[]>(DEFAULT_TIERS);`
- `43: const [earnWays, setEarnWays] = useState<any[]>(DEFAULT_EARN_WAYS);`
- `44: const [rewards, setRewards] = useState<any[]>([]);`
- `46: const [activeTab, setActiveTab] = useState<'earn' | 'redeem' | 'activity'>('earn');`
- `60: setLoading(true);`
### payment_insurance_relevance
- `13: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `122: {/* Hero Card */}`
- `134: {/* Cash equivalent */}`
- `135: <View style={[styles.cashEquiv, { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 } ]}>`
- `136: <Icon name="payments" size={16} color="#10B981" />`
- `217: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `233: <View key={i} style={[styles.earnCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
- `244: <View style={[styles.nextTierCard, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: nextTier.color + '40' } ]}>`
- `245: <View style={styles.nextTierCardContent}>`
- `246: <View style={styles.nextTierCardLeft}>`
- `254: <View style={styles.nextTierCardRight}>`
- `285: <View key={i} style={[styles.rewardCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>`
### error_empty_loading_retry_cancel
- `40: const [loading, setLoading] = useState(true);`
- `60: setLoading(true);`
- `68: const configRes = await apiFetch('/loyalty/config').catch(() => null);`
- `74: const rewardsRes = await apiFetch('/loyalty/rewards').catch(() => null);`
- `85: } catch (err) {`
- `86: console.error(err);`
- `88: setLoading(false);`
- `97: if (loading) {`
- `297: } catch (err: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
