# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/PermissionsManager.ts`
- **Member SHA-256:** `a85ef81ad3b05b23b4571d410ccf8a8a7748b148de57943af39da06d3ea6f5d6`
- **Line count:** 164
- **Read range:** `1-164`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * Single access point; never call expo-location/camera/etc. directly in screens.`
- `72: cancelLabel: 'إلغاء',`
- `133: { text: 'إلغاء', style: 'cancel' },`
- `134: { text: 'فتح الإعدادات', onPress: () => Linking.openSettings() },`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: * Permissions Manager — Centralized permission handling for all app features.`
- `18: export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';`
- `20: export type PermissionKey =`
- `32: // Permissions Manager`
- `34: class PermissionsManager {`
- `35: private cache = new Map<PermissionKey, PermissionStatus>();`
- `37: /** Request a permission — shows native dialog if needed */`
- `38: async request(key: PermissionKey): Promise<PermissionStatus> {`
- `42: const { status } = await Camera.requestCameraPermissionsAsync();`
- `43: return this.cache.set('camera', status as PermissionStatus), status as PermissionStatus;`
- `46: const { status } = await Camera.requestMicrophonePermissionsAsync();`
- `47: return this.cache.set('microphone', status as PermissionStatus), status as PermissionStatus;`
### state_transitions
- `18: export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';`
- `35: private cache = new Map<PermissionKey, PermissionStatus>();`
- `38: async request(key: PermissionKey): Promise<PermissionStatus> {`
- `42: const { status } = await Camera.requestCameraPermissionsAsync();`
- `43: return this.cache.set('camera', status as PermissionStatus), status as PermissionStatus;`
- `46: const { status } = await Camera.requestMicrophonePermissionsAsync();`
- `47: return this.cache.set('microphone', status as PermissionStatus), status as PermissionStatus;`
- `50: const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();`
- `51: return this.cache.set('gallery', status as PermissionStatus), status as PermissionStatus;`
- `54: const { status } = await Location.requestForegroundPermissionsAsync();`
- `55: return this.cache.set('location', status as PermissionStatus), status as PermissionStatus;`
- `58: const { status } = await Location.requestBackgroundPermissionsAsync();`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `72: cancelLabel: 'إلغاء',`
- `80: } catch {`
- `116: } catch {`
- `133: { text: 'إلغاء', style: 'cancel' },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
