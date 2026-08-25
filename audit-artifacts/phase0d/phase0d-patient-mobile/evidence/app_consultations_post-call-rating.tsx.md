# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/post-call-rating.tsx`
- **Member SHA-256:** `86e59042c612168ae4784076ddb66c7a956ebd5dacb75a8acc76adb940dbf70c`
- **Line count:** 142
- **Read range:** `1-142`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `15: export default function PostCallRatingScreen() {`
- `35: const submit = async () => {`
- `43: body: JSON.stringify({ booking_kind: 'appointment', booking_id: String(appointmentId), rating, comment, aspects: activeTags })`
- `47: router.replace('/(tabs)/consultations');`
- `59: <TouchableOpacity onPress={() => router.replace('/(tabs)/consultations')} style={{ width: 40, height: 40, justifyContent: 'center' }}>`
- `77: <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>`
- `112: onPress={() => toggleTag(t)}`
- `124: onPress={submit}`
### backend_consumers_or_contracts
- `40: // E2: real endpoint (was non-existent POST /care/appointments/rating with a swallowed catch)`
- `41: await apiFetch('/patient-ux/review', {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';`
- `22: const [rating, setRating] = useState(0);`
- `23: const [comment, setComment] = useState('');`
- `24: const [activeTags, setActiveTags] = useState<string[]>([]);`
- `25: const [loading, setLoading] = useState(false);`
- `37: setLoading(true);`
- `46: setLoading(false);`
- `49: setLoading(false);`
- `56: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `125: disabled={rating === 0 || loading}`
- `127: {loading ? <ActivityIndicator color={colors.bg} /> : <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.bg }}>إرسال التقييم</LocalizedText>}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `25: const [loading, setLoading] = useState(false);`
- `37: setLoading(true);`
- `40: // E2: real endpoint (was non-existent POST /care/appointments/rating with a swallowed catch)`
- `46: setLoading(false);`
- `48: } catch (e: any) {`
- `49: setLoading(false);`
- `125: disabled={rating === 0 || loading}`
- `127: {loading ? <ActivityIndicator color={colors.bg} /> : <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.bg }}>إرسال التقييم</LocalizedText>}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
