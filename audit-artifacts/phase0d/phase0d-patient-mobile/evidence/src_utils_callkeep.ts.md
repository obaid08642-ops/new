# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/callkeep.ts`
- **Member SHA-256:** `48bfa79d449fcf70ef0041086bb450704bb9968fe488b37c0daed9584c262845`
- **Line count:** 129
- **Read range:** `1-129`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { router } from 'expo-router';`
- `35: cancelButton: 'Cancel',`
- `59: // Register CallKeep listeners`
- `63: router.push({`
- `88: console.log('[CallKeep] CallKeep not initialized, falling back to React Native overlay screen');`
- `89: router.push({`
- `110: router.push({`
### backend_consumers_or_contracts
- `72: await apiFetch(`/calls/${callUUID}/reject`, { method: 'POST' }).catch(() => null);`
### auth_ownership
- `33: alertTitle: 'Permissions required',`
- `38: additionalPermissions: [],`
- `65: params: { sessionId: callUUID },`
- `83: export const displayNativeIncomingCall = async (sessionId: string, callerName: string, hasVideo = true) => {`
- `92: sessionId,`
- `102: sessionId,`
- `113: sessionId,`
- `121: export const endNativeCall = (sessionId: string) => {`
- `125: callKeepInstance.endCall(sessionId);`
### state_transitions
- `18: console.warn('[CallKeep] Failed to load callkeep native module:', e.message);`
- `35: cancelButton: 'Cancel',`
- `57: console.log('[CallKeep] Initialized successfully');`
- `74: console.warn('CallKeep reject endpoint failed', err);`
- `79: console.warn('[CallKeep] Setup failed (likely in Expo Go):', e.message);`
- `109: console.warn('[CallKeep] Failed to display native call:', e);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `17: } catch (e: any) {`
- `18: console.warn('[CallKeep] Failed to load callkeep native module:', e.message);`
- `35: cancelButton: 'Cancel',`
- `72: await apiFetch(`/calls/${callUUID}/reject`, { method: 'POST' }).catch(() => null);`
- `73: } catch (err) {`
- `74: console.warn('CallKeep reject endpoint failed', err);`
- `78: } catch (e: any) {`
- `79: console.warn('[CallKeep] Setup failed (likely in Expo Go):', e.message);`
- `108: } catch (e) {`
- `109: console.warn('[CallKeep] Failed to display native call:', e);`
- `126: } catch {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
