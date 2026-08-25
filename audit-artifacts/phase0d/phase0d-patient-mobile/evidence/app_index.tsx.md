# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/index.tsx`
- **Member SHA-256:** `e7ef3b39ab55d2eb22f6b8ef9c44f740e18a1e5475aa56554bf44edb0e9915a6`
- **Line count:** 64
- **Read range:** `1-64`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `29: router.replace("/(auth)/welcome");`
- `31: router.replace("/(tabs)");`
- `34: router.replace("/(auth)/welcome");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `24: // Preserve authenticated and guest sessions; the splash must never clear patient data.`
- `25: const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN).catch(() => null);`
- `28: if (!token && !isGuest) {`
### state_transitions
- `18: const t = setTimeout(checkAppState, 2600); // let logo animation play`
- `22: const checkAppState = async () => {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `18: const t = setTimeout(checkAppState, 2600); // let logo animation play`
- `19: return () => clearTimeout(t);`
- `25: const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN).catch(() => null);`
- `33: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
