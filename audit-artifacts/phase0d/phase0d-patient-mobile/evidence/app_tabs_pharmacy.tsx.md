# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(tabs)/pharmacy.tsx`
- **Member SHA-256:** `644fa36e715a437e734b75e70b2533acc36526965a3d948bb29ea1759c9748d1`
- **Line count:** 609
- **Read range:** `1-609`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: * Main pharmacy browsing screen.`
- `14: import { router, useLocalSearchParams } from 'expo-router';`
- `47: // ── Receive filters from filter screen ──────────────────────`
- `176: // (visible product ids feed swipe navigation on the product page)`
- `183: // Check extra filters from filter screen`
- `221: {/* ─── Top Section (Scrolls with page) ─── */}`
- `236: onPress={() => router.push('/pharmacy/barcode-scanner')}`
- `248: onPress={() => setViewCols(v => (v === 1 ? 2 : 1))}`
- `259: onPress={() => router.push('/pharmacy/filters')}`
- `276: onPress={() => router.push('/pharmacy/scan-prescription')}`
- `300: onPress={() => router.push('/pharmacy/order-history')}`
- `330: } ]} onPress={() => setActiveCat(c.id)}`
### backend_consumers_or_contracts
- `3: * app/(tabs)/pharmacy.tsx`
- `69: const data = await apiFetch('/medicines/categories');`
- `131: const data = await apiFetch(ep);`
- `236: onPress={() => router.push('/pharmacy/barcode-scanner')}`
- `259: onPress={() => router.push('/pharmacy/filters')}`
- `276: onPress={() => router.push('/pharmacy/scan-prescription')}`
- `300: onPress={() => router.push('/pharmacy/order-history')}`
- `374: onPress={() => router.push('/pharmacy/manual-order')}`
- `391: onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: pickDbField(m, 'name') || m.name } })}`
- `448: onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: pickDbField(m, 'name') || m.name } })}`
- `538: onPress={() => router.push('/pharmacy/cart')}`
### auth_ownership
- `125: // Offline-first: show last cached copy instantly, then refresh`
### state_transitions
- `9: import React, { useState, useEffect, useRef, useCallback } from 'react';`
- `12: ActivityIndicator, Animated, Platform, FlatList, StatusBar, Image, Alert,`
- `58: const [activeCat, setActiveCat] = useState('all');`
- `59: const [categoriesData, setCategoriesData] = useState<any[]>(CATEGORIES);`
- `60: const [medicines, setMedicines] = useState<any[]>([]);`
- `61: const [loading, setLoading] = useState(true);`
- `62: const [searchQuery, setSearchQuery] = useState('');`
- `63: const [viewCols, setViewCols] = useState<1 | 2>(1); // 1 = wide row cards, 2 = two-per-row grid`
- `101: // Toast animation state`
- `110: setLoading(true);`
- `138: setLoading(false);`
- `352: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
### payment_insurance_relevance
- `7: * - Inline quantity controls on product cards.`
- `22: import RotatingCardImage from '@/components/RotatingCardImage';`
- `53: filter_min_price?: string;`
- `54: filter_max_price?: string;`
- `63: const [viewCols, setViewCols] = useState<1 | 2>(1); // 1 = wide row cards, 2 = two-per-row grid`
- `98: (params.filter_min_price || params.filter_max_price) ? 1 : 0,`
- `119: if (params.filter_min_price)  q.append('min_price', params.filter_min_price);`
- `120: if (params.filter_max_price)  q.append('max_price', params.filter_max_price);`
- `142: }, [searchQuery, activeCat, params.filter_category, params.filter_forms, params.filter_brands, params.filter_rx, params.filter_min_price, params.filter_max_price, params.filter_sort]);`
- `166: price: m.price || m.p || 0,`
- `187: let matchPrice = true;`
- `188: const priceVal = m.price || m.p || 0;`
### error_empty_loading_retry_cancel
- `61: const [loading, setLoading] = useState(true);`
- `86: } catch (err) {`
- `110: setLoading(true);`
- `124: const ck = `@nabdah_offline_cat_${q.toString()}`;`
- `125: // Offline-first: show last cached copy instantly, then refresh`
- `129: } catch {}`
- `134: AsyncStorage.setItem(ck, JSON.stringify({ data: rows, ts: Date.now() })).catch(() => {});`
- `135: } catch {`
- `136: // Offline — cached copy (if any) already shown above; never mock data`
- `138: setLoading(false);`
- `326: styles.catChip,`
- `362: ListEmptyComponent={`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
