# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/nursing/live-tracking.tsx`
- **Member SHA-256:** `cd94c389753d95787efbfef4fd30fb9c161cb09f30a1928f800434d5951ada30`
- **Line count:** 414
- **Read range:** `1-414`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { useRouter, useLocalSearchParams } from "expo-router";`
- `73: const router = useRouter();`
- `75: const { type, bookingId } = useLocalSearchParams(); // 'nurse' or 'patient'`
- `81: if (!bookingId) return;`
- `85: const res = await apiFetch(`/nursing/visits/${bookingId}/tracking`);`
- `95: }, [bookingId]);`
- `131: <TouchableOpacity style={{ backgroundColor: '#23B5CE', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 }} onPress={() => router.push('/(tabs)')}>`
- `181: onPress={() => router.push("/(tabs)")}`
- `249: onPress={() => {`
- `260: onPress={() => {`
### backend_consumers_or_contracts
- `85: const res = await apiFetch(`/nursing/visits/${bookingId}/tracking`);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `77: const [eta, setEta] = useState<number | null>(null);`
- `78: const [trackingData, setTrackingData] = useState<any>(null);`
- `89: } catch { /* keep last known state; next poll retries */ }`
- `99: if (trackingData?.status === 'COMPLETED') {`
- `211: <LocalizedText style={styles.statusTitle}>`
- `216: <LocalizedText style={styles.statusDesc}>`
- `361: statusTitle: {`
- `368: statusDesc: {`
### payment_insurance_relevance
- `199: {/* TRACKING CARD (BOTTOM) */}`
### error_empty_loading_retry_cancel
- `89: } catch { /* keep last known state; next poll retries */ }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
