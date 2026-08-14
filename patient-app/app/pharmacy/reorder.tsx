// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input, SegmentedControl, SectionHeader } from '../../src/components/ui';

interface OrderItem { id: string; name: string; dose: string; qty: number; price: number; selected: boolean }

import { apiFetch } from '../../src/utils/api';

export default function ReorderScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [delivery, setDelivery] = useState('delivery');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const order = await apiFetch(`/orders/${orderId}`);
        if (order && order.items) {
          const mapped = order.items.map((i: any) => ({
            id: i.medicine_id || i.id,
            name: i.name_ar || i.name || 'Unknown',
            dose: i.strength || '',
            qty: i.qty || 1,
            price: i.price || 0,
            selected: true
          }));
          setItems(mapped);
        }
      } catch (err) {}
    })();
  }, [orderId]);

  const toggle = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const setQty = (id: string, n: number) => setItems(p => p.map(i => i.id === id ? { ...i, qty: Math.max(1, n) } : i));

  const selected = items.filter(i => i.selected);
  const total = selected.reduce((s, i) => s + i.price * i.qty, 0);

  const selectAll = () => setItems(p => p.map(i => ({ ...i, selected: true })));
  const deselectAll = () => setItems(p => p.map(i => ({ ...i, selected: false })));
  const allSelected = items.every(i => i.selected);

  const handleOrder = async () => {
    setLoading(true);
    try {
      if (allSelected) {
        await apiFetch(`/orders/${orderId}/reorder`, 'POST');
      } else {
        await apiFetch(`/orders/${orderId}/reorder-partial`, 'POST', {
          items: selected.map(i => ({ medicine_id: i.id, qty: i.qty }))
        });
      }
      router.push('/payments/processing');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">إعادة الطلب</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 180 }}>
        {/* Select all / deselect */}
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="h5">أصناف الطلب السابق</AppText>
          <TouchableOpacity onPress={allSelected ? deselectAll : selectAll}>
            <AppText variant="labelMD" color={colors.primary}>{allSelected ? 'إلغاء الكل' : 'تحديد الكل'}</AppText>
          </TouchableOpacity>
        </View>

        {/* Items */}
        {items.map(item => (
          <Card key={item.id} style={{ opacity: item.selected ? 1 : 0.5 }}>
            <View style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => toggle(item.id)} style={[st.checkbox, { borderColor: item.selected ? colors.primary : colors.border, backgroundColor: item.selected ? colors.primary : 'transparent' } ]}>
                {item.selected && <Icon name="check" size={14} color="#fff" />}
              </TouchableOpacity>
              <View style={[st.itemIcon, { backgroundColor: colors.primarySurface } ]}>
                <Icon name="medication" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                <AppText variant="h6">{item.name}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>{item.dose}</AppText>
              </View>
              <AppText variant="h5" color={colors.primary}>{item.price} ر.س</AppText>
            </View>

            {/* Qty controls */}
            {item.selected && (
              <View style={[st.qtyRow, { borderColor: colors.border, marginTop: 10 } ]}>
                <TouchableOpacity onPress={() => setQty(item.id, item.qty + 1)} style={[st.qtyBtn, { backgroundColor: colors.primary } ]}>
                  <Icon name="add" size={16} color="#fff" />
                </TouchableOpacity>
                <AppText variant="h5">{item.qty}</AppText>
                <TouchableOpacity onPress={() => setQty(item.id, item.qty - 1)} style={[st.qtyBtn, { backgroundColor: colors.surfaceSecondary } ]}>
                  <Icon name="remove" size={16} color={colors.primary} />
                </TouchableOpacity>
                <AppText variant="caption" color={colors.textTertiary} style={{ marginRight: 8 }}>الكمية</AppText>
              </View>
            )}
          </Card>
        ))}

        {/* Add new items */}
        <Button label="إضافة أصناف جديدة" variant="outline" icon="add" onPress={() => router.push('/(tabs)/pharmacy')} />

        {/* Delivery method */}
        <Card>
          <SectionHeader title="طريقة الاستلام" />
          <SegmentedControl value={delivery} onChange={setDelivery} options={[
            { key: 'delivery', label: 'توصيل', icon: 'navigate' },
            { key: 'pickup', label: 'استلام من الصيدلية', icon: 'location' },
          ]} />
          {delivery === 'delivery' && (
            <Input value={address} onChangeText={setAddress} placeholder="عنوان التوصيل" icon="location" style={{ marginTop: 10 }}/>
          )}
        </Card>

        {/* Payment */}
        <Card>
          <SectionHeader title="طريقة الدفع" />
          <SegmentedControl value="card" onChange={() => {}} options={[
            { key: 'card', label: 'بطاقة', icon: 'card' },
            { key: 'wallet', label: 'المحفظة', icon: 'wallet' },
            { key: 'cod', label: 'عند الاستلام', icon: 'wallet' },
          ]} />
        </Card>
      </ScrollView>

      {/* Bottom bar */}
      {selected.length > 0 && (
        <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 }}>
            <AppText variant="bodySM" color={colors.textSecondary}>{selected.length} أصناف</AppText>
            <View style={{ flexDirection: 'row-reverse', gap: 4, alignItems: 'baseline' }}>
              <AppText variant="h3" color={colors.primary}>{total}</AppText>
              <AppText variant="bodySM" color={colors.textTertiary}>ر.س</AppText>
            </View>
          </View>
          <Button label="تأكيد إعادة الطلب" variant="gradient" size="lg" icon="shopping_cart" loading={loading} onPress={handleOrder} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qtyRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 12, padding: 4, alignSelf: 'flex-start' },
  qtyBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
