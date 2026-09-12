// @ts-nocheck
// app/nursing/visits.tsx — patient nursing visits (P6-D parity).
// Lists GET /nursing/bookings/mine; tap opens live tracking.
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';

export default function NursingVisitsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const res: any = await apiFetch('/nursing/bookings/mine');
      const list = Array.isArray(res) ? res : res?.data || [];
      setVisits(Array.isArray(list) ? list : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">زيارات التمريض</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <AppText variant="bodySM" color={colors.textSecondary}>تعذر تحميل الزيارات</AppText>
          </Card>
        ) : visits.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Icon name="nurse" size={36} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textSecondary} style={{ marginTop: 8 }}>لا توجد زيارات بعد</AppText>
          </Card>
        ) : visits.map((v: any) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => router.push({ pathname: '/nursing/live-tracking', params: { type: 'patient', bookingId: v.id } })}
          >
            <Card style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="h6">{v.service_name_ar || v.service_name_en || 'زيارة تمريض'}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {v.scheduled_at ? new Date(v.scheduled_at).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'short' }) : ''}
                </AppText>
              </View>
              <AppText variant="caption" color={colors.primary}>{v.state}</AppText>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
});
