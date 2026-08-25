# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/health-id.tsx`
- **Member SHA-256:** `1d0cfcbe85f1375d9ff9d77ba18ce6435acb60041e4d167825b2d61dc34027d3`
- **Line count:** 284
- **Read range:** `1-284`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `23: export default function HealthIDScreen() {`
- `76: // Share cancelled or not available`
- `86: <IconButton icon="share" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={handleShare} />`
- `88: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `199: <TouchableOpacity onPress={() => router.push('/health/emergency-contacts')}>`
- `213: onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`)}>`
- `246: onPress={() => router.push('/health/edit-profile')}`
### backend_consumers_or_contracts
- `37: apiFetch('/users/me/profile').catch(() => null),`
- `38: apiFetch('/health/emergency-contacts').catch(() => []),`
- `39: apiFetch('/health/chronic-meds').catch(() => []),`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useEffect, useState } from 'react';`
- `4: import { View, StyleSheet, ScrollView, TouchableOpacity, Share, StatusBar, ActivityIndicator, Linking } from 'react-native';`
- `28: const [loading, setLoading] = useState(true);`
- `29: const [profile, setProfile] = useState<any>(null);`
- `30: const [contacts, setContacts] = useState<any[]>([]);`
- `31: const [meds, setMeds] = useState<any[]>([]);`
- `45: setLoading(false);`
- `75: } catch (error) {`
- `76: // Share cancelled or not available`
- `82: <StatusBar barStyle="light-content" />`
- `92: {loading ? (`
### payment_insurance_relevance
- `98: {/* Main ID Card */}`
- `99: <View style={[styles.idCard, { backgroundColor: '#1E3A5F' }]}>`
- `100: <View style={styles.cardShimmer1} />`
- `101: <View style={styles.cardShimmer2} />`
- `103: <View style={styles.cardHeader}>`
- `104: <View style={styles.cardLogo}>`
- `110: <View style={styles.cardContent}>`
- `111: <View style={styles.cardAvatar}>`
- `114: <View style={styles.cardUserInfo}>`
- `157: <View style={[styles.criticalCard, { backgroundColor: '#FEE2E2' }]}>`
- `178: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
- `197: <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>`
### error_empty_loading_retry_cancel
- `28: const [loading, setLoading] = useState(true);`
- `37: apiFetch('/users/me/profile').catch(() => null),`
- `38: apiFetch('/health/emergency-contacts').catch(() => []),`
- `39: apiFetch('/health/chronic-meds').catch(() => []),`
- `45: setLoading(false);`
- `75: } catch (error) {`
- `76: // Share cancelled or not available`
- `92: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
