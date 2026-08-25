# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/loyalty/rewards.tsx`
- **Member SHA-256:** `c5f536dd500febb91bc42829a5a207b40a7b16d1a4bd055850f1b374ddf8e2e7`
- **Line count:** 162
- **Read range:** `1-162`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `14: export default function LoyaltyRewardsScreen() {`
- `53: { text: 'إلغاء', style: 'cancel' },`
- `56: onPress: async () => {`
- `96: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `134: onPress={() => handleClaimReward(r)}`
### backend_consumers_or_contracts
- `30: const acc = await apiFetch('/loyalty/account');`
- `33: const catalog = await apiFetch('/loyalty/rewards');`
- `59: const res = await apiFetch(`/loyalty/rewards/${reward.id}/claim`, { method: 'POST' });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `3: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';`
- `18: const [points, setPoints] = useState(0);`
- `19: const [rewards, setRewards] = useState<any[]>([]);`
- `20: const [loading, setLoading] = useState(true);`
- `21: const [claimingId, setClaimingId] = useState<string | null>(null);`
- `29: setLoading(true);`
- `36: console.error(err);`
- `39: setLoading(false);`
- `53: { text: 'إلغاء', style: 'cancel' },`
- `70: console.error(err);`
- `81: if (loading) {`
### payment_insurance_relevance
- `9: import { AppText, Card, Button, IconButton, SectionHeader } from '../../src/components/ui';`
- `102: <Card style={{ alignItems: 'center', backgroundColor: colors.warningSurface }}>`
- `108: </Card>`
- `121: <Card key={r.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 14 }}>`
- `146: </Card>`
- `159: balanceCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, padding: 16, marginTop: 4 },`
### error_empty_loading_retry_cancel
- `20: const [loading, setLoading] = useState(true);`
- `29: setLoading(true);`
- `35: } catch (err) {`
- `36: console.error(err);`
- `39: setLoading(false);`
- `53: { text: 'إلغاء', style: 'cancel' },`
- `69: } catch (err) {`
- `70: console.error(err);`
- `81: if (loading) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
