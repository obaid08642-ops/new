# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/shared/location-picker.tsx`
- **Member SHA-256:** `1e0157c50ebd0c70fe29732d03a9cb07e3fb52fba39b72247aa7bc1594512557`
- **Line count:** 871
- **Read range:** `1-871`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: import { router, useLocalSearchParams } from "expo-router";`
- `41: export default function LocationPickerScreen() {`
- `180: router.back();`
- `193: router.back();`
- `221: onPress={() => router.back()}`
- `248: onPress={() => setMode(tab.key as any)}`
- `297: onPress={goToMyLocation}`
- `333: onPress={() => setMode("new")}`
- `353: onPress={() => setSelectedAddress(addr)}`
- `439: onPress={() => setMode("new")}`
- `514: onPress={goToMyLocation}`
- `561: onPress={goToMyLocation}`
### backend_consumers_or_contracts
- `82: const data = await apiFetch("/users/me/addresses");`
- `170: const saved = await apiFetch("/users/me/addresses", {`
### auth_ownership
- `99: const { status } = await Location.requestForegroundPermissionsAsync();`
### state_transitions
- `4: import React, { useState, useRef, useCallback, useEffect } from "react";`
- `48: const [mode, setMode] = useState<"saved" | "map" | "new">("saved");`
- `49: const [loading, setLoading] = useState(false);`
- `50: const [locating, setLocating] = useState(false);`
- `51: const [saving, setSaving] = useState(false);`
- `53: const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);`
- `54: const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(`
- `58: // Map pin state`
- `59: const [region, setRegion] = useState<Region>({`
- `65: const [pin, setPin] = useState({ lat: 24.7136, lng: 46.6753 });`
- `66: const [reverseAddress, setReverseAddress] = useState("");`
- `69: const [newAddr, setNewAddr] = useState({`
### payment_insurance_relevance
- `160: const payload = {`
- `172: body: JSON.stringify(payload),`
- `178: await setSelectedAddress({ ...payload, id: (saved && saved.id) || `local-${Date.now()}` });`
- `355: styles.addrCard,`
- `778: addrCard: {`
### error_empty_loading_retry_cancel
- `49: const [loading, setLoading] = useState(false);`
- `80: setLoading(true);`
- `87: } catch {`
- `90: setLoading(false);`
- `129: } catch {}`
- `132: } catch {`
- `153: } catch {}`
- `181: } catch (e) {`
- `316: {loading ? (`
- `322: <View style={styles.emptyWrap}>`
- `757: emptyWrap: { alignItems: "center", gap: 12, paddingVertical: 40 },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
