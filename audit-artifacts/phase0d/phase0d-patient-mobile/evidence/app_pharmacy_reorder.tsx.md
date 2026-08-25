# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/reorder.tsx`
- **Member SHA-256:** `4b591796241f9ed827cd3b34a69ad652919f87148911d91158279f98e92a1e32`
- **Line count:** 159
- **Read range:** `1-159`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `15: export default function ReorderScreen() {`
- `67: router.replace({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId: nextOrderId } });`
- `81: <IconButton icon="back" onPress={() => router.back()} />`
- `88: <TouchableOpacity onPress={allSelected ? deselectAll : selectAll}>`
- `97: <TouchableOpacity onPress={() => toggle(item.id)} style={[st.checkbox, { borderColor: item.selected ? colors.primary : colors.border, backgroundColor: item.selected ? colors.primary : 'transparent' } ]}>`
- `113: <TouchableOpacity onPress={() => setQty(item.id, item.qty + 1)} style={[st.qtyBtn, { backgroundColor: colors.primary } ]}>`
- `117: <TouchableOpacity onPress={() => setQty(item.id, item.qty - 1)} style={[st.qtyBtn, { backgroundColor: colors.surfaceSecondary } ]}>`
- `127: <Button label="إضافة أصناف جديدة" variant="outline" icon="add" onPress={() => router.push('/(tabs)/pharmacy')} />`
- `144: <Button label="إرسال إعادة الطلب" variant="gradient" size="lg" icon="shopping_cart" loading={loading} onPress={handleOrder} />`
### backend_consumers_or_contracts
- `26: const order = await apiFetch(`/orders/${orderId}`);`
- `58: created = await apiFetch(`/orders/${orderId}/reorder`, { method: 'POST' });`
- `60: created = await apiFetch(`/orders/${orderId}/reorder-partial`, {`
- `67: router.replace({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId: nextOrderId } });`
- `127: <Button label="إضافة أصناف جديدة" variant="outline" icon="add" onPress={() => router.push('/(tabs)/pharmacy')} />`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `3: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Switch } from 'react-native';`
- `19: const [items, setItems] = useState<OrderItem[]>([]);`
- `20: const [loading, setLoading] = useState(false);`
- `54: setLoading(true);`
- `66: if (!nextOrderId) throw new Error('لم يُعد الخادم معرّف الطلب الجديد');`
- `69: console.error(err);`
- `71: setLoading(false);`
- `77: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `144: <Button label="إرسال إعادة الطلب" variant="gradient" size="lg" icon="shopping_cart" loading={loading} onPress={handleOrder} />`
### payment_insurance_relevance
- `8: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `10: interface OrderItem { id: string; name: string; dose: string; qty: number; price: number; selected: boolean }`
- `33: price: i.price || 0,`
- `46: const total = selected.reduce((s, i) => s + i.price * i.qty, 0);`
- `95: <Card key={item.id} style={{ opacity: item.selected ? 1 : 0.5 }}>`
- `107: <AppText variant="h5" color={colors.primary}>{item.price} ر.س</AppText>`
- `123: </Card>`
- `129: <Card>`
- `131: </Card>`
- `140: <AppText variant="h3" color={colors.primary}>{total}</AppText>`
### error_empty_loading_retry_cancel
- `20: const [loading, setLoading] = useState(false);`
- `38: } catch (err) {}`
- `54: setLoading(true);`
- `66: if (!nextOrderId) throw new Error('لم يُعد الخادم معرّف الطلب الجديد');`
- `68: } catch (err) {`
- `69: console.error(err);`
- `71: setLoading(false);`
- `144: <Button label="إرسال إعادة الطلب" variant="gradient" size="lg" icon="shopping_cart" loading={loading} onPress={handleOrder} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
