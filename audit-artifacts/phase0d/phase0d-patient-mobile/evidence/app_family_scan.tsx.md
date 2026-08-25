# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/scan.tsx`
- **Member SHA-256:** `e6391edd94c1d70b2f0e72cccd5a118632de845df4df932c6ceec016bde058b7`
- **Line count:** 95
- **Read range:** `1-95`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `23: export default function FamilyScanScreen() {`
- `39: router.replace({ pathname: '/family/join', params: { code } });`
- `48: <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />`
- `59: <Button label="منح إذن الكاميرا" variant="gradient" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 16 }} />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: import { CameraView, useCameraPermissions } from 'expo-camera';`
- `26: const [permission, requestPermission] = useCameraPermissions();`
- `52: {!permission ? (`
- `54: ) : !permission.granted ? (`
- `59: <Button label="منح إذن الكاميرا" variant="gradient" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 16 }} />`
### state_transitions
- `3: import React, { useRef, useState } from 'react';`
- `4: import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';`
- `27: const [invalid, setInvalid] = useState(false);`
- `44: <StatusBar barStyle="light-content" />`
### payment_insurance_relevance
- `11: // Extract the invite code from a scanned payload:`
### error_empty_loading_retry_cancel
- `35: setTimeout(() => setInvalid(false), 2000);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
