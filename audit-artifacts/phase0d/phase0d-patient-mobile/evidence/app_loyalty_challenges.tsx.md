# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/loyalty/challenges.tsx`
- **Member SHA-256:** `fdc5a0846da4b64a7db06d9547ee70a71a7fa7e8d9daa91401659c17802e7aa7`
- **Line count:** 195
- **Read range:** `1-195`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `15: export default function LoyaltyChallengesScreen() {`
- `73: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `125: <TouchableOpacity onPress={() => joinChallenge(item.id)} style={[styles.joinBtn, { backgroundColor: color } ]}>`
### backend_consumers_or_contracts
- `30: const res = await apiFetch('/loyalty/challenges');`
- `52: await apiFetch(`/loyalty/challenges/${id}/join`, { method: 'POST' });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `3: import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';`
- `19: const [challenges, setChallenges] = useState<any[]>([]);`
- `20: const [loading, setLoading] = useState(true);`
- `21: const [joinedList, setJoinedList] = useState<Record<string, boolean>>({});`
- `29: setLoading(true);`
- `34: // Joined state comes from the server (persisted progress record)`
- `37: if (c.joined || c.user_progress > 0 || c.completed) {`
- `43: console.error(err);`
- `46: setLoading(false);`
- `55: console.error(err);`
- `60: if (loading) {`
### payment_insurance_relevance
- `9: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `106: const total = item.target_count || 7;`
- `108: const pct = Math.min(100, Math.round((progress / total) * 100));`
- `112: <View style={[styles.challengeCard, { backgroundColor: isDark ? colors.surface : colors.white, borderWidth: joined ? 1.5 : 0, borderColor: color + '40' } ]}>`
- `148: <AppText variant="bodySM" style={styles.progressFraction}>{progress}/{total}</AppText>`
- `174: challengeCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, gap: 12 },`
### error_empty_loading_retry_cancel
- `20: const [loading, setLoading] = useState(true);`
- `29: setLoading(true);`
- `42: } catch (err) {`
- `43: console.error(err);`
- `46: setLoading(false);`
- `54: } catch (err) {`
- `55: console.error(err);`
- `60: if (loading) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
