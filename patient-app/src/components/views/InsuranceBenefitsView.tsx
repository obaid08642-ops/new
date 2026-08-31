// @ts-nocheck
// app/insurance/benefits-summary.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../../src/context/AppContext';
import { Icon } from '../../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../../src/components/ui';

// Benefits fetched dynamically

export default function InsuranceBenefitsView() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  const [benefits, setBenefits] = React.useState<any[]>([]);

  React.useEffect(() => {
    import('../../../src/utils/api').then(({ apiFetch }) => {
      apiFetch('/insurance/benefits-summary')
        .then(res => setBenefits(Array.isArray(res) ? res : []))
        .catch(() => {});
    });
  }, []);

  const totalUsed = benefits.reduce((s, b) => s + b.usedAmount, 0);
  const totalLimit = 500000;

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h4" color="#fff">ملخص المزايا</AppText>
          <View style={{ width: 36 }}/>
        </View>
        <View style={styles.totalCard}>
          <View style={styles.totalRight}>
            <AppText variant="caption" color="rgba(255,255,255,0.7)">الحد السنوي الكلي</AppText>
            <AppText variant="h5" color="#fff">{(totalLimit / 1000).toFixed(0)}k ريال</AppText>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalLeft}>
            <AppText variant="caption" color="rgba(255,255,255,0.7)">المتبقي</AppText>
            <AppText variant="h5" color="#fff">{((totalLimit - totalUsed) / 1000).toFixed(0)}k</AppText>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalLeft}>
            <AppText variant="caption" color="rgba(255,255,255,0.7)">مستخدم</AppText>
            <AppText variant="h5" color="#fff">{(totalUsed / 1000).toFixed(1)}k</AppText>
          </View>
        </View>
        <View style={styles.masterBar}>
          <View style={[styles.masterFill, { width: `${(totalUsed / totalLimit) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {benefits.map((b, i) => {
          const usedPct = (b.usedAmount / b.annualLimit) * 100;
          const badgeColor = b.coverage >= 80 ? '#16A34A' : b.coverage >= 60 ? '#D97706' : '#EF4444';
          const badgeBg = b.coverage >= 80 ? '#DCFCE7' : b.coverage >= 60 ? '#FEF3C7' : '#FEE2E2';
          return (
            <View key={i} style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } ]}>
              <View style={styles.benefitHeader}>
                <View style={styles.benefitRight}>
                  <View style={[styles.covPctBadge, { backgroundColor: badgeBg } ]}>
                    <AppText variant="labelSM" color={badgeColor}>
                      تغطية {b.coverage}%
                    </AppText>
                  </View>
                  <View style={styles.remainingInfo}>
                    <AppText variant="labelMD" color={colors.textPrimary}>
                      {b.remaining >= 1000 ? `${(b.remaining / 1000).toFixed(0)}k` : b.remaining} ر.س
                    </AppText>
                    <AppText variant="caption" color={colors.textTertiary}>متبقي</AppText>
                  </View>
                </View>
                <View style={styles.benefitLeft}>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="h6" color={colors.textPrimary}>{b.service}</AppText>
                    {b.limitCount && (
                      <AppText variant="caption" color={colors.textTertiary}>
                        {b.usedCount}/{b.limitCount} زيارة
                      </AppText>
                    )}
                  </View>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySurface, justifyContent: 'center', alignItems: 'center' }}>
                    <Icon name={b.icon as any} size={18} color={colors.primary} />
                  </View>
                </View>
              </View>
              <View style={[styles.benefitBar, { backgroundColor: colors.borderLight } ]}>
                <View style={[styles.benefitFill, {
                  width: `${Math.min(usedPct, 100)}%`,
                  backgroundColor: usedPct >= 80 ? '#F0695C' : usedPct > 50 ? '#F0A526' : '#5BA84F'
                }]} />
              </View>
              <View style={styles.benefitAmounts}>
                <AppText variant="caption" color={colors.textTertiary}>
                  الحد: {b.annualLimit >= 1000 ? `${(b.annualLimit / 1000).toFixed(0)}k` : b.annualLimit} ر.س
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  مستخدم: {b.usedAmount} ر.س ({Math.round(usedPct)}%)
                </AppText>
              </View>
            </View>
          );
        })}

        {/* Renewal Info */}
        <View style={[styles.renewalCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">تجديد البوليصة</AppText>
          <AppText variant="bodySM">ينتهي في 31 ديسمبر 2024</AppText>
          <AppText variant="bodySM">
            سيتم إعادة تعيين جميع الحدود عند التجديد
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  totalCard: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12, marginBottom: 10 },
  totalRight: { flex: 1, alignItems: 'center', gap: 2 },
  totalLeft: { flex: 1, alignItems: 'center', gap: 2 },
  totalDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  totalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '400' },
  totalNum: { color: '#fff', fontSize: 16, fontFamily: 'Cairo-ExtraBold' },
  masterBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  masterFill: { height: '100%', backgroundColor: '#5BA84F', borderRadius: 4 },
  benefitCard: { borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, gap: 8 },
  benefitHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  benefitLeft: { alignItems: 'flex-end', gap: 2 },
  benefitRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitIcon: { fontSize: 22 },
  benefitName: { fontSize: 14, fontWeight: '800' },
  visitLimit: { fontSize: 10, fontWeight: '400' },
  covPctBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  covPct: { fontSize: 10, fontWeight: '700' },
  remainingInfo: { alignItems: 'center', gap: 0 },
  remainingNum: { fontSize: 14, fontFamily: 'Cairo-ExtraBold' },
  remainingLabel: { fontSize: 9, fontWeight: '400' },
  benefitBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  benefitFill: { height: '100%', borderRadius: 3 },
  benefitAmounts: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  benefitLimit: { fontSize: 10, fontWeight: '400' },
  benefitUsed: { fontSize: 10, fontWeight: '400' },
  renewalCard: { borderRadius: 16, padding: 14, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  renewalTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right' },
  renewalDate: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  renewalNote: { fontSize: 12, fontWeight: '400', textAlign: 'right' },
});
