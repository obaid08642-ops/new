# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/clinic/[id].tsx`
- **Member SHA-256:** `f9297f4d7a5e73637c42ad8747ff6ce9cf5fc9ac1a86a2ebfea80ac4029425d8`
- **Line count:** 111
- **Read range:** `1-111`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router, useLocalSearchParams } from 'expo-router';`
- `60: <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: Math.max(insets.top, 20), left: isRTL ? undefined : 20, right: isRTL ? 20 : undefined, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,2`
- `95: <TouchableOpacity key={doc.id || i} onPress={() => router.push(`/consultations/doctor-profile?doctorId=${doc.id}`)} style={{ width: 140, backgroundColor: colors.surface, borderRadius: 16, padding: 12, alignItems: 'center' }}>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `19: const [data, setData] = useState<any>(null);`
- `20: const [loading, setLoading] = useState(true);`
- `24: setLoading(true);`
- `30: .finally(() => setLoading(false));`
- `33: if (loading) {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `20: const [loading, setLoading] = useState(true);`
- `24: setLoading(true);`
- `29: .catch(() => setData(null))`
- `30: .finally(() => setLoading(false));`
- `33: if (loading) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
