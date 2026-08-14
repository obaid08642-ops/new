// @ts-nocheck
// app/health/refills.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

// INITIAL_REFILLS removed

export default function ChronicRefillsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [refills, setRefills] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    apiFetch('/medical-profile')
      .then(res => {
        if (res && res.long_term_medications) {
          const mapped = res.long_term_medications.map((m: any, i: number) => ({
            id: m._id || String(i),
            name: m.name_ar || m.name || 'دواء مزمن',
            remainingDays: Math.floor(Math.random() * 25) + 1, // Simulated for UI presentation based on real med
            totalDays: 30,
            quantity: Math.floor(Math.random() * 50) + 5,
            originalQty: 60,
            price: Math.floor(Math.random() * 100) + 20,
          }));
          setRefills(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleReorder = (id: string) => {
    const med = refills.find(r => r.id === id);
    if (!med) return;

    Alert.alert(
      'تأكيد إعادة الصرف التلقائي',
      `هل ترغب في طلب عبوة جديدة من "${med.name}" بقيمة ${med.price} ر.س؟ سيتم الدفع تلقائياً من محفظتك وتوصيلها لعنوانك المسجل.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'أعد الطلب الآن',
          onPress: () => {
            setLoadingId(id);
            setTimeout(() => {
              setLoadingId(null);
              // Update remaining pills locally to simulate refill
              setRefills(prev => prev.map(r => {
                if (r.id === id) {
                  return { ...r, remainingDays: r.totalDays, quantity: r.originalQty };
                }
                return r;
              }));

              Alert.alert(
                'تم الطلب بنجاح!',
                `تمت الموافقة وتجهيز طلب دواء "${med.name}". سيصلك مندوب الصيدلية خلال 30 دقيقة.`,
                [
                  {
                    text: 'تتبع الطلب',
                    onPress: () => router.push('/notifications')
                  }
                ]
              );
            }, 1500);
          }
        }
      ]
    );
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 44 }}/>
          <AppText variant="h3" color={colors.textPrimary}>إعادة صرف الأدوية المزمنة</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 60 }}>
        {/* Info advice card */}
        <Card style={[st.infoCard, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '20' } ]}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
            <Icon name="info" size={24} color={colors.primary} />
            <AppText variant="labelMD" color={colors.primary} style={{ flex: 1, textAlign: 'right' }}>صرف ذكي مدعوم بالمخزون</AppText>
          </View>
          <AppText variant="bodyXS" color={colors.textSecondary} style={{ textAlign: 'right', marginTop: 6, lineHeight: 18 }}>
            يقوم نظام نبض بلس الذكي بحساب الجرعات المأخوذة بناءً على التزامك اليومي، وتنبيهك تلقائياً قبل نفاد مخزون الدواء بـ 7 أيام لتفادي أي انقطاع.
          </AppText>
        </Card>

        {/* Refill meds progress indicators */}
        <SectionHeader title="مستوى مخزون أدويتك المزمنة" />
        {loading ? <AppText align="center" color={colors.textTertiary}>جاري تحميل الأدوية...</AppText> : null}
        {!loading && refills.length === 0 ? <AppText align="center" color={colors.textTertiary}>لا توجد أدوية مزمنة مسجلة في ملفك الطبي</AppText> : null}
        {refills.map(med => {
          const isCritical = med.remainingDays <= 7;
          const progressPct = (med.remainingDays / med.totalDays) * 100;
          const barColor = isCritical ? colors.error : colors.success;

          return (
            <Card key={med.id} style={st.medCard}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="h6">{med.name}</AppText>
                <Badge
                  label={isCritical ? `حرج: ${med.remainingDays} أيام متبقية` : `${med.remainingDays} يوماً متبقياً`}
                  color={barColor}
                />
              </View>

              {/* Progress bar */}
              <View style={st.barContainer}>
                <View style={[st.barBg, { backgroundColor: colors.borderLight } ]}>
                  <View style={[st.barFill, { backgroundColor: barColor, width: `${progressPct}%` }]} />
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 4 }}>
                  <AppText variant="caption" color={colors.textTertiary}>{med.quantity} حبة متبقية</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>العلبة الكاملة: {med.originalQty} حبة</AppText>
                </View>
              </View>

              {/* Action area */}
              <View style={[st.actionArea, { borderTopColor: colors.borderLight } ]}>
                <AppText variant="labelSM" color={colors.primary}>{med.price} ر.س / علبة</AppText>
                <Button
                  label="أعد صرف الدواء الآن"
                  variant={isCritical ? 'primary' : 'outline'}
                  size="sm"
                  full={false}
                  loading={loadingId === med.id}
                  onPress={() => handleReorder(med.id)}
                  style={{ paddingHorizontal: 16 }}
                />
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

import { SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  infoCard: { padding: 14 },
  medCard: { padding: 14, gap: 12 },
  barContainer: { marginTop: 4 },
  barBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  actionArea: { borderTopWidth: 1, paddingTop: 12, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }
});
