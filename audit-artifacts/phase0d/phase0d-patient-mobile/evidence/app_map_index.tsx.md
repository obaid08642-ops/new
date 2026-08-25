# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/map/index.tsx`
- **Member SHA-256:** `1cea88a14f50d5529fa085dc846dc5d72f1e0b658948e72f585c39d13aa95791`
- **Line count:** 775
- **Read range:** `1-775`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: import { router } from 'expo-router';`
- `145: // MAIN SCREEN`
- `147: export default function MapScreen() {`
- `365: onPress={() => {`
- `375: onPress={e => {`
- `392: onPress={goToMyLocation}`
- `412: onPress={() => router.back()}`
- `428: onSubmitEditing={() => { Keyboard.dismiss(); setShowResults(false); }}`
- `431: <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}>`
- `449: idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => selectSearchResult(item)}`
- `477: onPress={() => { setSelectedType(type.id); Keyboard.dismiss(); setShowResults(false); }} style={[`
- `504: onPress={() => openSheet(prov)}`
### backend_consumers_or_contracts
- `173: const res = await apiFetch(`/providers/map?${query.toString()}`);`
- `216: const ins = await apiFetch('/user/insurance');`
- `640: router.push('/(tabs)/pharmacy');`
- `646: router.push('/(tabs)/nursing');`
### auth_ownership
- `228: const { status } = await Location.requestForegroundPermissionsAsync();`
- `308: const { status } = await Location.requestForegroundPermissionsAsync();`
### state_transitions
- `3: import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';`
- `11: StatusBar,`
- `155: const [providers, setProviders] = useState<any[]>([]);`
- `156: const [selectedType, setSelectedType] = useState('all');`
- `157: const [searchQuery, setSearchQuery] = useState('');`
- `158: const [searchResults, setSearchResults] = useState<any[]>([]);`
- `159: const [showResults, setShowResults] = useState(false);`
- `160: const [selectedProvider, setSelectedProvider] = useState<any | null>(null);`
- `161: const [showSheet, setShowSheet] = useState(false);`
- `162: const [userInsurance, setUserInsurance] = useState<string | null>(null);`
- `163: const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);`
- `228: const { status } = await Location.requestForegroundPermissionsAsync();`
### payment_insurance_relevance
- `162: const [userInsurance, setUserInsurance] = useState<string | null>(null);`
- `178: // E2: no fabricated stats/coords — rating/distance/eta/price stay null when unknown,`
- `189: reviews: p.reviews_count ?? p.total_reviews ?? 0,`
- `193: price: p.consultation_fee ?? p.price ?? null,`
- `197: insurance: p.accepted_insurance || p.insurance_providers || [],`
- `210: // ── Fetch providers + insurance on mount`
- `214: // Fetch insurance`
- `216: const ins = await apiFetch('/user/insurance');`
- `217: if (alive) setUserInsurance(ins?.data?.provider ?? ins?.provider ?? null);`
- `492: {/* ══ BOTTOM QUICK CARDS ══════════════════════════════ */}`
- `507: styles.quickCard,`
- `589: ...(selectedProvider.price != null && selectedProvider.price > 0`
### error_empty_loading_retry_cancel
- `207: } catch { /* keep fallback */ }`
- `218: } catch (_) {}`
- `243: } catch {`
- `295: setTimeout(() => openSheet(p), 600);`
- `317: } catch (_) {}`
- `615: <Icon name="error_outline" size={20} color="#F0695C" />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
