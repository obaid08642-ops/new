# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/Header.tsx`
- **Member SHA-256:** `7fa84355053d44be077ea9db11aae9cc763b07c798d244fac23502c9c81199ef`
- **Line count:** 247
- **Read range:** `1-247`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { router, usePathname } from 'expo-router';`
- `15: const currentScreen = pathname;`
- `20: const canGoBack = router.canGoBack();`
- `21: const goBack = () => router.back();`
- `45: const mainScreens = ['/', '/(tabs)', '/index'];`
- `47: // If not a main screen, render the sleek transparent back button`
- `48: if (!mainScreens.includes(currentScreen) && !currentScreen.startsWith('/(tabs)')) {`
- `52: <TouchableOpacity onPress={goBack} style={[styles.iconButton, { alignSelf: isRTL ? 'flex-end' : 'flex-start', backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)', borderRadius: 20, shadowColor: '#000', shadowOffset: { widt`
- `89: <TouchableOpacity onPress={goBack} style={styles.iconButton}>`
- `98: onPress={toggleDark}`
- `111: onPress={() => setLangMenuVisible(true)}`
- `131: onPress={() => router.push('/notifications')}`
### backend_consumers_or_contracts
- `17: // Format pathname as title, e.g. "/pharmacy" -> "Pharmacy"`
- `131: onPress={() => router.push('/notifications')}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState } from 'react';`
- `2: import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Modal, TouchableWithoutFeedback } from 'react-native';`
- `26: const [langMenuVisible, setLangMenuVisible] = useState(false);`
- `51: <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingTop: Math.max(insets.top, StatusBar.currentHeight || 44), paddingHorizontal: 16 }}>`
- `231: top: Platform.OS === 'ios' ? 90 : (StatusBar.currentHeight || 24) + 46,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
