# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/utils/PushNotifications.ts`
- **Member SHA-256:** `3bd07a15a69daa856b4215f17b1a54bbb9b373b864c02880c8db762a156bca13`
- **Line count:** 48
- **Read range:** `1-48`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `18: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `22: const { status } = await Notifications.requestPermissionsAsync();`
- `32: await Notifications.getExpoPushTokenAsync({`
- `35: // Token obtained — backend registration handled by notifications.ts`
- `37: // Push token unavailable (Expo Go limitation / simulator) — silently skip`
### state_transitions
- `18: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `19: let finalStatus = existingStatus;`
- `21: if (existingStatus !== 'granted') {`
- `22: const { status } = await Notifications.requestPermissionsAsync();`
- `23: finalStatus = status;`
- `26: if (finalStatus !== 'granted') return;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `36: } catch (e) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
