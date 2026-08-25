# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/prefetch.ts`
- **Member SHA-256:** `8ff84f13b559adf83b8db47cf1a07a9e25ddc841c5194ca98300ed783cd4df37`
- **Line count:** 69
- **Read range:** `1-69`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `55: /** Doctor opened → preload booking-adjacent data in idle time. */`
### backend_consumers_or_contracts
- `19: const data = await apiFetch(endpoint);`
- `28: Image.prefetch(valid, 'memory-disk').catch(() => {});`
- `59: prefetchApi(`/care/appointments?doctor_id=${doctorId}`, `doctor_appts_${doctorId}`);`
### auth_ownership
- `11: * - Deduplicated: each key prefetches once per session`
- `50: /** Catalog shown → warm hot medicines for instant startup search next session. */`
### state_transitions
- `6: * Predictive loading (production-grade) — prefetch BEFORE the user taps.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `6: * Predictive loading (production-grade) — prefetch BEFORE the user taps.`
- `8: * - API prefetch: warms the offline cache (stale-while-revalidate pattern)`
- `20: await AsyncStorage.setItem(`@nabdah_offline_${cacheKey}`, JSON.stringify({ data, ts: Date.now() }));`
- `21: } catch { /* prefetch is opportunistic — never throws */ }`
- `28: Image.prefetch(valid, 'memory-disk').catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
