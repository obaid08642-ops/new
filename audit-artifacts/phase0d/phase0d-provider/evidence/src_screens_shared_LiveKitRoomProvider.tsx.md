# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/LiveKitRoomProvider.tsx`
- **Member SHA-256:** `3a63053a168797a4f4f2ad3c6ca676ba9d8187ce651a1ca978dd46bafa7f26b6`
- **Line count:** 79
- **Read range:** `1-79`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: route: { params: { roomId: string } };`
- `19: navigation.goBack();`
- `31: <TouchableOpacity style={[styles.btn, { backgroundColor: theme.red }]} onPress={handleEndCall}>`
- `39: export const LiveKitRoomProvider = ({ route, navigation }: LiveKitRoomProviderProps) => {`
- `40: const { roomId } = route.params;`
### backend_consumers_or_contracts
- `47: const res = await apiFetch(`/calls/${roomId}/join`, { method: 'POST' });`
### auth_ownership
- `42: const [token, setToken] = useState<string | null>(null);`
- `45: const fetchToken = async () => {`
- `48: setToken(res.token);`
- `50: // Token fetch failed — room join will gracefully timeout`
- `53: fetchToken();`
- `56: if (!token) return <View style={styles.center}><ActivityIndicator size="large" /></View>;`
- `61: token={token}`
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `42: const [token, setToken] = useState<string | null>(null);`
- `50: // Token fetch failed — room join will gracefully timeout`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `49: } catch (err) {`
- `50: // Token fetch failed — room join will gracefully timeout`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
