// @ts-nocheck
// app/health/refills.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { refillTrackingParams } from '../../src/utils/chronic-refill-contract';

// INITIAL_REFILLS removed

export default function ChronicRefillsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [refills, setRefills] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadRefills = React.useCallback(() => {
    setLoading(true);
    setLoadError(false);
    // Real chronic reminders with refill insights (no simulated values)
    apiFetch('/health/reminders?active=1')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const mapped = list
          .filter((r: any) => r.chronic)
          .map((r: any) => {
            const refillAt = r.refill_date ? new Date(r.refill_date) : null;
            // E2: no fabricated 30-day/pill defaults — fields stay null when the backend doesn't provide them
            const daysLeft = refillAt ? Math.max(0, Math.ceil((refillAt.getTime() - Date.now()) / 86400000)) : (r.days_until_refill ?? null);
            return {
              id: r.id,
              name: pickLocalized(r.medicine_name_ar, r.medicine_name_en) || 'دواء مزمن',
              remainingDays: daysLeft,
              totalDays: r.total_days ?? null,
              quantity: r.pills_remaining ?? null,
              originalQty: r.original_qty ?? null,
              price: null, // price is resolved at order time by the pharmacy basket
            };
          });
        setRefills(mapped);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { loadRefills(); }, [loadRefills]);

  const handleReorder = (id: string) => {
    const med = refills.find(r => r.id === id);
    if (!med) return;

    showLocalizedAlert(
      'تأكيد إعادة الصرف',
      `سيتم إنشاء طلب حقيقي لصرف "${med.name}" وإرساله للصيدليات. تُحدد الصيدلية السعر في السلة قبل الدفع.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'أعد الطلب الآن',
          onPress: async () => {
            setLoadingId(id);
            try {
              const res = await apiFetch(`/health/reminders/${id}/refill`, { method: 'POST' });
              setLoadingId(null);
              const tracking = refillTrackingParams(res);
              if (tracking) {
                // Reload from server — quantities and a next-refill date change only after documented fulfilment.
                loadRefills();
                showLocalizedAlert(
                  'تم إنشاء الطلب',
                  'أُرسل طلب إعادة الصرف للصيدليات. تتغير بيانات الدواء فقط بعد تنفيذ موثق من الصيدلية.',
                  [{ text: 'تتبع الطلب', onPress: () => router.push({ pathname: '/pharmacy/order-tracking', params: tracking }) }, { text: 'حسناً', style: 'cancel' }],
                );
              } else {
                showLocalizedAlert('تعذر إنشاء الطلب', res?.message || 'حدث خطأ غير متوقع');
              }
            } catch (e: any) {
              setLoadingId(null);
              const msg = String(e?.message || '');
              if (msg.includes('no_default_address')) {
                showLocalizedAlert('أضف عنوان التوصيل', 'تحتاج عنواناً مسجلاً قبل إعادة الصرف', [
                  { text: 'إضافة عنوان', onPress: () => router.push('/profile/addresses') }, { text: 'إلغاء', style: 'cancel' },
                ]);
              } else {
                showLocalizedAlert('تعذر إنشاء الطلب', 'تحقق من اتصالك وحاول مجدداً');
              }
            }
          }},
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
            تظهر هذه البيانات من تذكيراتك المسجلة. السعر والتوفر وكمية الصرف تؤكدها الصيدلية داخل الطلب، ولا تتغير بيانات الدواء عند إنشاء الطلب فقط.
          </AppText>
        </Card>

        {/* Refill meds progress indicators */}
        <SectionHeader title="حالة إعادة صرف أدويتك المزمنة" />
        {loading ? <AppText align="center" color={colors.textTertiary}>جاري تحميل الأدوية...</AppText> : null}
        {!loading && loadError ? (
          <Card style={{ alignItems: 'center', gap: 8 }}>
            <Icon name="warning" size={28} color={colors.error} />
            <AppText align="center" color={colors.textSecondary}>تعذر تحميل أدويتك المزمنة — تحقق من اتصالك</AppText>
            <Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={loadRefills} />
          </Card>
        ) : null}
        {!loading && !loadError && refills.length === 0 ? <AppText align="center" color={colors.textTertiary}>لا توجد أدوية مزمنة مسجلة في ملفك الطبي</AppText> : null}
        {refills.map(med => {
          const hasDays = med.remainingDays != null;
          const isCritical = hasDays && med.remainingDays <= 7;
          const showBar = hasDays && med.totalDays != null && med.totalDays > 0;
          const progressPct = showBar ? Math.min(100, (med.remainingDays / med.totalDays) * 100) : 0;
          const barColor = isCritical ? colors.error : colors.success;

          return (
            <Card key={med.id} style={st.medCard}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="h6">{med.name}</AppText>
                {hasDays && (
                  <Badge
                    label={isCritical ? `حرج: ${med.remainingDays} أيام متبقية` : `${med.remainingDays} يوماً متبقياً`}
                    color={barColor}
                  />
                )}
              </View>

              {/* Progress bar — only when real stock figures exist */}
              {showBar && (
                <View style={st.barContainer}>
                  <View style={[st.barBg, { backgroundColor: colors.borderLight } ]}>
                    <View style={[st.barFill, { backgroundColor: barColor, width: `${progressPct}%` }]} />
                  </View>
                  {(med.quantity != null || med.originalQty != null) && (
                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 4 }}>
                      {med.quantity != null && <AppText variant="caption" color={colors.textTertiary}>{med.quantity} حبة متبقية</AppText>}
                      {med.originalQty != null && <AppText variant="caption" color={colors.textTertiary}>العلبة الكاملة: {med.originalQty} حبة</AppText>}
                    </View>
                  )}
                </View>
              )}

              {/* Action area */}
              <View style={[st.actionArea, { borderTopColor: colors.borderLight } ]}>
                <AppText variant="labelSM" color={colors.primary}>{med.price != null ? `${med.price} ر.س / علبة` : 'السعر يُحدد في سلة الصيدلية'}</AppText>
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
import { pickLocalized } from '../../src/utils/localize';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

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
