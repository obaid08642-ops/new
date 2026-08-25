# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/booking-success.tsx`
- **Member SHA-256:** `1ff1bac23e34ee88aaaf59f644a67412d086866390303bd8af402a7386628c98`
- **Line count:** 110
- **Read range:** `1-110`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { useRouter, useLocalSearchParams, Stack } from 'expo-router';`
- `20: export default function BookingSuccess() {`
- `21: const router = useRouter();`
- `23: const { serviceType = 'clinic', bookingId, reference, total } = useLocalSearchParams();`
- `24: const bookingReference = typeof reference === 'string' && reference ? reference : (typeof bookingId === 'string' ? bookingId : '—');`
- `25: const bookingTotal = typeof total === 'string' && total ? total : null;`
- `48: <Stack.Screen options={{ headerShown: false }} />`
- `68: <Animated.View entering={ZoomIn.duration(600).delay(800)} style={[styles.bookingDetails, { backgroundColor: colors.surface, borderColor: colors.border } ]}>`
- `71: <AppText style={{ fontWeight: 'bold', color: colors.textPrimary }}>{bookingReference}</AppText>`
- `73: {bookingTotal && (`
- `79: {bookingTotal} ر.س`
- `88: <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, marginBottom: 16 }]} onPress={() => router.replace('/diagnostics/orders' as never)}>`
### backend_consumers_or_contracts
- `88: <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, marginBottom: 16 }]} onPress={() => router.replace('/diagnostics/orders' as never)}>`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';`
- `20: export default function BookingSuccess() {`
### payment_insurance_relevance
- `23: const { serviceType = 'clinic', bookingId, reference, total } = useLocalSearchParams();`
- `25: const bookingTotal = typeof total === 'string' && total ? total : null;`
- `73: {bookingTotal && (`
- `77: <Icon name="cash" size={18} color={colors.primary} />`
- `79: {bookingTotal} ر.س`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
