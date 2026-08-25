# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/components/LocationPickerModal.tsx`
- **Member SHA-256:** `a9d77a05620215e0936d16968e29a1dc7bc574ead27f23a1e78fcfece894bc03`
- **Line count:** 129
- **Read range:** `1-129`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `89: onPress={(e) => setSelected({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}`
- `99: onPress={handleGetCurrentLocation}`
- `115: <TouchableOpacity style={{ padding: SP.md, borderRadius: R.md, backgroundColor: theme.border, flex: 1, marginHorizontal: SP.xs }} onPress={onClose}>`
- `116: <Text style={{ color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>{AR ? 'إلغاء' : 'Cancel'}</Text>`
- `118: <TouchableOpacity style={{ padding: SP.md, borderRadius: R.md, backgroundColor: theme.primary, flex: 1, marginHorizontal: SP.xs }} onPress={() => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `42: const { status } = await Location.requestForegroundPermissionsAsync();`
- `44: setLocError(AR ? 'تم رفض إذن الموقع — فعّله من إعدادات الجهاز' : 'Location permission denied — enable it in device settings');`
### state_transitions
- `1: import React, { useState, useEffect, useRef } from 'react';`
- `24: const [selected, setSelected] = useState(initialLocation || DEFAULT_LOC);`
- `25: const [locating, setLocating] = useState(false);`
- `26: const [locError, setLocError] = useState<string | null>(null);`
- `40: setLocError(null);`
- `42: const { status } = await Location.requestForegroundPermissionsAsync();`
- `43: if (status !== 'granted') {`
- `44: setLocError(AR ? 'تم رفض إذن الموقع — فعّله من إعدادات الجهاز' : 'Location permission denied — enable it in device settings');`
- `50: setLocError(AR ? 'تعذر تحديد موقعك الحالي' : 'Could not determine your current location');`
- `56: // Reset state every time the modal opens; try current location only when no`
- `60: setLocError(null);`
- `107: {locError && (`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: const [locError, setLocError] = useState<string | null>(null);`
- `40: setLocError(null);`
- `44: setLocError(AR ? 'تم رفض إذن الموقع — فعّله من إعدادات الجهاز' : 'Location permission denied — enable it in device settings');`
- `49: } catch (e) {`
- `50: setLocError(AR ? 'تعذر تحديد موقعك الحالي' : 'Could not determine your current location');`
- `60: setLocError(null);`
- `67: setTimeout(() => mapRef.current?.animateToRegion({`
- `107: {locError && (`
- `108: <Text style={{ color: '#dc2626', fontSize: FS.sm, marginBottom: SP.sm, textAlign: 'center' }}>{locError}</Text>`
- `116: <Text style={{ color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>{AR ? 'إلغاء' : 'Cancel'}</Text>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
