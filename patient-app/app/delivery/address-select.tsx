// @ts-nocheck
// app/delivery/address-select.tsx — اختيار عنوان التوصيل مع خريطة حقيقية
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

interface Address {
  id: string;
  label: string;
  street?: string;
  city?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

export default function AddressSelectScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/users/me/addresses');
        const list: Address[] = Array.isArray(data) ? data : [];
        setAddresses(list);
        const def = list.find(a => a.is_default) || list[0];
        if (def) setSelected(def.id);
      } catch {
        // Fallback
        setAddresses([
          { id: '1', label: 'المنزل', street: 'شارع الأمير سلطان، حي السلامة', city: 'جدة', is_default: true },
        ]);
        setSelected('1');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConfirm = useCallback(() => {
    const chosen = addresses.find(a => a.id === selected);
    // Pass chosen address back (can use global state or router params)
    router.back();
  }, [selected, addresses]);

  return (
    <View style={[styles.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">عنوان التوصيل</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        {/* GPS button → opens real location picker */}
        <TouchableOpacity
          style={[styles.gpsBtn, { backgroundColor: colors.primarySurface, borderColor: colors.primary }]}
          onPress={() => router.push('/shared/location-picker')}
          activeOpacity={0.85}
        >
          <Icon name="map-marker-radius" size={22} color={colors.primary} />
          <AppText variant="labelMD" color={colors.primary}>استخدم موقعي الحالي أو حدد على الخريطة</AppText>
        </TouchableOpacity>

        {/* Saved Addresses from Backend */}
        <SectionHeader title="العناوين المحفوظة" />

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }}/>
        ) : addresses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon name="location" size={40} color={colors.textTertiary} />
            <AppText variant="bodyMD" color={colors.textTertiary} align="center">
              لا توجد عناوين محفوظة
            </AppText>
          </View>
        ) : (
          addresses.map(addr => (
            <TouchableOpacity
              key={addr.id}
              onPress={() => setSelected(addr.id)}
              style={[
                styles.addrCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selected === addr.id ? colors.primary : colors.border,
                  borderWidth: selected === addr.id ? 2 : 1,
                },]} >
              <View style={[styles.addrIcon, {
                backgroundColor: selected === addr.id ? colors.primarySurface : colors.surfaceSecondary,
              } ]}>
                <Icon
                  name={addr.label === 'العمل' ? 'hospital' : 'home'}
                  size={22}
                  color={selected === addr.id ? colors.primary : colors.textTertiary}
                />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <AppText variant="h6">{addr.label}</AppText>
                  {addr.is_default && (
                    <View style={[styles.defaultBadge, { backgroundColor: colors.primarySurface } ]}>
                      <AppText variant="caption" color={colors.primary}>افتراضي</AppText>
                    </View>
                  )}
                </View>
                <AppText variant="caption" color={colors.textTertiary}>
                  {addr.street}{addr.city ? `، ${addr.city}` : ''}
                </AppText>
              </View>
              <View style={[styles.radio, { borderColor: selected === addr.id ? colors.primary : colors.border } ]}>
                {selected === addr.id && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Add new → opens full location picker */}
        <TouchableOpacity
          onPress={() => router.push('/shared/location-picker')}
          style={[styles.addNew, { borderColor: colors.primary } ]}>
          <Icon name="add" size={22} color={colors.primary} />
          <AppText variant="labelMD" color={colors.primary}>إضافة عنوان جديد على الخريطة</AppText>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirm button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.border } ]}>
        <Button
          label="تأكيد العنوان"
          variant="primary"
          icon="check_circle"
          onPress={handleConfirm}
          disabled={!selected}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  gpsBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14, borderRadius: 16, borderWidth: 1,
  },
  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 30 },
  addrCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
  addrIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  addNew: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1,
  },
});
