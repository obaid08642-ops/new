// @ts-nocheck
// chronic-medications.tsx — Chronic meds + auto-reorder reminder
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';

import { apiFetch } from '../../src/utils/api';

export default function ChronicMedicationsScreen() {
  const insets = useSafeAreaInsets();
  // Guests CAN view chronic medications — device-bound guest account.
  const { colors, isDark } = useApp();
  const [meds, setMeds] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchMeds = async () => {
      try {
        const res = await apiFetch('/health/chronic-meds');
        setMeds(Array.isArray(res) ? res : res?.data || []);
      } catch (e) {
        console.log('Error fetching chronic meds', e);
      }
    };
    fetchMeds();
  }, []);

  const toggleReorder = (id: string) => setMeds(p => p.map(m => m.id === id ? { ...m, reorderEnabled: !m.reorderEnabled } : m));

  const orderFromPharmacy = (med: any) => {
    // Route to pharmacy with pre-filled order
    router.push({ pathname: '/(tabs)/pharmacy', params: { search: med.name } });
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/medication-reminder-add')} />
          <AppText variant="h3" color={colors.textPrimary}>الأدوية المزمنة</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {/* Info card */}
        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={20} color={colors.info} />
            <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>
              الأدوية المزمنة تُطلب كل شهر. فعّل تذكير إعادة الطلب ليصلك تنبيه قبل نفاد الدواء مع زر طلب مباشر للصيدلية.
            </AppText>
          </View>
        </Card>

        {meds.map(m => {
          const pct = (m.remaining / m.total) * 100;
          const low = m.remaining <= 7;
          return (
            <Card key={m.id}>
              <View style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
                <View style={[st.icon, { backgroundColor: low ? colors.errorSurface : colors.primarySurface } ]}>
                  <Icon name="medication" size={24} color={low ? colors.error : colors.primary} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                  <AppText variant="h5">{m.name}</AppText>
                  <AppText variant="bodyXS" color={colors.textTertiary}>{m.dose} · {m.freq}</AppText>
                  <Badge label={m.condition} color={colors.secondary} />
                </View>
              </View>

              {/* Remaining pills bar */}
              <View style={{ marginTop: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                  <AppText variant="labelSM" color={low ? colors.error : colors.textSecondary}>
                    {low ? 'قارب على النفاد!' : 'المتبقي'}
                  </AppText>
                  <AppText variant="labelMD" color={low ? colors.error : colors.primary}>{m.remaining}/{m.total} حبة</AppText>
                </View>
                <View style={[st.bar, { backgroundColor: colors.surfaceSecondary } ]}>
                  <View style={[st.barFill, { width: `${pct}%`, backgroundColor: low ? colors.error : colors.success }]} />
                </View>
              </View>

              {/* Reorder toggle */}
              <View style={[st.reorderRow, { borderTopColor: colors.borderLight } ]}>
                <Switch value={m.reorderEnabled} onValueChange={() => toggleReorder(m.id)} trackColor={{ false: colors.border, true: colors.warning }} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="labelSM">تذكير إعادة الطلب</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>تنبيه قبل 5 أيام من النفاد</AppText>
                </View>
                <Icon name="bell" size={18} color={m.reorderEnabled ? colors.warning : colors.textTertiary} />
              </View>

              {/* Order button for low stock */}
              {low && (
                <Button label="طلب من الصيدلية الآن" variant="primary" icon="shopping_cart" size="sm" onPress={() => orderFromPharmacy(m)} style={{ marginTop: 8 }} />
              )}
            </Card>
          );
        })}

        <Button label="إضافة دواء مزمن جديد" variant="outline" icon="add" onPress={() => router.push('/health/medication-reminder-add')} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  reorderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
});
