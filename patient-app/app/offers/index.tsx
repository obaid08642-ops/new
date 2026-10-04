// @ts-nocheck
// app/offers/index.tsx — كل العروض والباقات النشطة
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function OffersListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    setLoadError(false);
    apiFetch('/home/offers')
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data;
        setOffers(Array.isArray(list) ? list : []);
      })
      .catch(() => { setOffers([]); setLoadError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">العروض والباقات</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : offers.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }}>
          <Icon name="tag" size={56} color={colors.textTertiary} />
          <AppText variant="h5" align="center">{loadError ? 'تعذر تحميل العروض' : 'لا توجد عروض متاحة حالياً'}</AppText>
          <AppText variant="bodySM" color={colors.textTertiary} align="center">
            {loadError ? 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى' : 'تابعنا — تُضاف عروض جديدة باستمرار'}
          </AppText>
          {loadError && <AppText variant="labelMD" color={colors.primary} onPress={load}>إعادة المحاولة</AppText>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
          {offers.map((o: any, i: number) => (
            <TouchableOpacity key={o.id || i} activeOpacity={0.85} onPress={() => o.id && router.push(`/offers/${o.id}`)}>
              <Card style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
                    <AppText variant="h5">{o.t}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>{o.prov}</AppText>
                  </View>
                  <Badge label={`خصم ${o.disc}`} color="#fff" bg="#FF4B55" />
                </View>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8 }}>
                  <AppText variant="h3" color={colors.primary}>{o.price} ر.س</AppText>
                  <AppText variant="bodySM" color={colors.textTertiary} style={{ textDecorationLine: 'line-through' }}>{o.old} ر.س</AppText>
                  {o.rating != null && (
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3, marginRight: 'auto' }}>
                      <Icon name="star" size={13} color={colors.gold} />
                      <AppText variant="caption" color={colors.textSecondary}>{o.rating}</AppText>
                    </View>
                  )}
                </View>
                {!!o.sponsored && (
                  <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: 'right' }}>إعلان ممول</AppText>
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
});
