# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/hooks/useOfflineData.ts`
- **Member SHA-256:** `dbaba91c2e55de06d07553756e1b57205b57f2a9b4cbdef437d1ba949a80d144`
- **Line count:** 85
- **Read range:** `1-85`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `38: const fresh = await apiFetch(endpoint);`
### auth_ownership
- `14: * Usage: const { data, loading, fromCache, refresh } = useOfflineData('medicines', '/medicines?limit=50');`
- `66: const refresh = useCallback(() => load(true), [load]);`
- `68: return { data, loading, fromCache, refresh };`
### state_transitions
- `1: import { useEffect, useRef, useState, useCallback } from 'react';`
- `14: * Usage: const { data, loading, fromCache, refresh } = useOfflineData('medicines', '/medicines?limit=50');`
- `17: const [data, setData] = useState<T | null>(null);`
- `18: const [loading, setLoading] = useState(true);`
- `19: const [fromCache, setFromCache] = useState(false);`
- `45: // offline or server error — cached copy already shown if present`
- `48: if (mounted.current && !isResync) setLoading(false);`
- `57: const unsub = NetInfo.addEventListener((state) => {`
- `58: if (state.isConnected) load(true);`
- `68: return { data, loading, fromCache, refresh };`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: * Offline-first data hook — Phase 5 (Offline Support).`
- `11: *   2. OFFLINE/failure → return last cached copy instantly (stale-while-revalidate).`
- `14: * Usage: const { data, loading, fromCache, refresh } = useOfflineData('medicines', '/medicines?limit=50');`
- `16: export function useOfflineData<T = any>(cacheKey: string, endpoint: string, options?: { ttlMs?: number }) {`
- `18: const [loading, setLoading] = useState(true);`
- `21: const storageKey = `@nabdah_offline_${cacheKey}`;`
- `33: } catch { /* cache miss is fine */ }`
- `44: } catch {`
- `45: // offline or server error — cached copy already shown if present`
- `48: if (mounted.current && !isResync) setLoading(false);`
- `68: return { data, loading, fromCache, refresh };`
- `74: await AsyncStorage.setItem(`@nabdah_offline_${cacheKey}`, JSON.stringify({ data, ts: Date.now() }));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
