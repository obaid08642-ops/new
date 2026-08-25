# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/wishlist.tsx`
- **Member SHA-256:** `64c686f15d84d4219dccf4ed686ace5e91d4d856f38c94ecc423647c506d0fc2`
- **Line count:** 246
- **Read range:** `1-246`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from "expo-router";`
- `26: export default function WishlistScreen() {`
- `83: <TouchableOpacity onPress={() => router.back()}>`
- `98: onPress={() => router.back()}`
- `114: onPress={() => removeFromWishlist(item.id)}`
- `120: onPress={() => addToCart(item)}`
- `162: onPress={() =>`
- `163: router.push({`
### backend_consumers_or_contracts
- `37: const data = await apiFetch('/users/me/wishlist');`
- `47: await apiFetch(`/users/me/wishlist/${id}`, { method: 'POST' });`
- `164: pathname: "/pharmacy/product-detail",`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from "react";`
- `8: StatusBar,`
- `31: const [items, setItems] = useState<any[]>([]);`
- `32: const [addingId, setAddingId] = useState<string | null>(null);`
- `64: console.error(err);`
- `72: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `93: ListEmptyComponent={`
- `94: <View style={styles.empty}>`
- `196: empty: { alignItems: "center", paddingTop: 60, gap: 12 },`
- `197: emptyText: { fontSize: 15, fontWeight: "400" },`
### payment_insurance_relevance
- `16: Card,`
- `59: price: item.price ?? 0,`
- `108: styles.wishCard,`
- `138: <AppText variant="bodySM">{item.price} ر</AppText>`
- `205: wishCard: {`
- `228: wishPrice: { fontSize: 16, fontFamily: "Cairo-ExtraBold" },`
### error_empty_loading_retry_cancel
- `39: } catch (err) {}`
- `48: } catch (err) {`
- `63: } catch (err) {`
- `64: console.error(err);`
- `93: ListEmptyComponent={`
- `94: <View style={styles.empty}>`
- `196: empty: { alignItems: "center", paddingTop: 60, gap: 12 },`
- `197: emptyText: { fontSize: 15, fontWeight: "400" },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
