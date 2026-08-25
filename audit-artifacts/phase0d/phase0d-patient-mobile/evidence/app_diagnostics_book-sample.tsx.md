# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/book-sample.tsx`
- **Member SHA-256:** `91b3e24e3f399b743a132571996129ebae210791c7da598d29315b8c97fe59fc`
- **Line count:** 60
- **Read range:** `1-60`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: // app/diagnostics/book-sample.tsx — routes the legacy entrypoint into the live provider-selection flow.`
- `4: import { router } from 'expo-router';`
- `11: export default function BookSampleScreen() {`
- `22: <IconButton icon="back" onPress={() => router.back()} />`
- `50: <Button label="الذهاب إلى السلة" variant="gradient" size="lg" icon="cart" onPress={() => router.replace('/diagnostics/cart')} />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';`
- `18: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `37: <Icon name="check_circle" size={16} color={colors.success} />`
### payment_insurance_relevance
- `8: import { AppText, Card, Button, IconButton, SectionHeader } from '../../src/components/ui';`
- `26: <Card style={{ backgroundColor: colors.infoSurface }}>`
- `31: </Card>`
- `33: <Card>`
- `41: </Card>`
- `43: <Card>`
- `46: </Card>`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
