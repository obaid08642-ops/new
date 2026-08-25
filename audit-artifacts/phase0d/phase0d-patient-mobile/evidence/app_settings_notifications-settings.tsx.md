# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/notifications-settings.tsx`
- **Member SHA-256:** `769171a9bf784d0f0397e3feea673c5e845e9fe53ef74773431148849c4955b3`
- **Line count:** 358
- **Read range:** `1-358`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from "expo-router";`
- `82: export default function NotificationsSettingsScreen() {`
- `197: <IconButton icon="back" onPress={() => router.back()} />`
### backend_consumers_or_contracts
- `108: apiFetch('/users/me/notification-settings', {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `3: import { View, StyleSheet, ScrollView, StatusBar, Switch } from "react-native";`
- `86: const [settings, setSettings] = useState<Record<string, boolean>>({`
- `155: { backgroundColor: colors.errorSurface },`
- `158: <Icon name="lock" size={12} color={colors.error} />`
- `159: <AppText variant="caption" color={colors.error}>`
- `183: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
### payment_insurance_relevance
- `9: import { AppText, Card, IconButton } from "../../src/components/ui";`
- `41: key: "offers",`
- `90: offers: true,`
- `230: <Card style={styles.settingsCard}>`
- `239: </Card>`
- `247: <Card style={styles.settingsCard}>`
- `256: </Card>`
- `313: settingsCard: {`
### error_empty_loading_retry_cancel
- `101: .catch(() => {});`
- `111: }).catch(() => {});`
- `155: { backgroundColor: colors.errorSurface },`
- `158: <Icon name="lock" size={12} color={colors.error} />`
- `159: <AppText variant="caption" color={colors.error}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
