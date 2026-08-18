// @ts-nocheck
// app/ai/monthly-report.tsx — التقرير الصحي الشهري (مبني على بيانات المستخدم الحقيقية فقط)
// E2: was 100% fabricated — fake health scores (78/100), fake BP trends ("تحسّن"),
// fake appointments and fake AI recommendations. In a medical app that is a safety
// hazard. Now every number on this screen is derived from the patient's real data:
//   /care/appointments · /health/vitals/summary · /health/chronic-meds · /health/trends
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function MonthlyReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [meds, setMeds] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [expandedVital, setExpandedVital] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [appts, vit, md, tr] = await Promise.all([
        apiFetch('/care/appointments').catch(() => []),
        apiFetch('/health/vitals/summary').catch(() => []),
        apiFetch('/health/chronic-meds').catch(() => []),
        apiFetch('/health/trends').catch(() => []),
      ]);
      if (!alive) return;
      setAppointments(Array.isArray(appts) ? appts : appts?.data || []);
      setVitals(Array.isArray(vit) ? vit : vit?.data || []);
      setMeds(Array.isArray(md) ? md : md?.data || []);
      setTrends(Array.isArray(tr) ? tr : tr?.data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const now = new Date();
  const monthLabel = `${AR_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const monthAppts = useMemo(() => appointments.filter((a: any) => {
    const d = a?.scheduled_at ? new Date(a.scheduled_at) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [appointments]);

  const completedCount = monthAppts.filter((a: any) => ['COMPLETED', 'completed'].includes(a?.state || a?.status)).length;
  const upcomingCount = monthAppts.filter((a: any) => {
    const d = a?.scheduled_at ? new Date(a.scheduled_at) : null;
    return d && d.getTime() > now.getTime() && !['CANCELLED', 'cancelled'].includes(a?.state || a?.status);
  }).length;

  const hasAnyData = monthAppts.length > 0 || vitals.length > 0 || meds.length > 0 || trends.some((t: any) => t?.data?.length);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="bodySM" color={colors.textSecondary} style={{ marginTop: 12 }}>جاري تجميع تقريرك من بياناتك...</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn} accessibilityLabel="رجوع">
            <Icon name="back" size={20} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h6" color="#fff">تقريرك الشهري</AppText>
          <View style={{ width: 32 }} />
        </View>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <View style={{ backgroundColor: '#23B5CE20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <AppText variant="bodySM" color="#23B5CE">{monthLabel}</AppText>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {!hasAnyData && (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>
            <Icon name="analytics" size={44} color={colors.textTertiary} />
            <AppText variant="h6" style={{ marginTop: 10 }}>لا توجد بيانات كافية بعد</AppText>
            <AppText variant="bodySM" color={colors.textSecondary} align="center" style={{ marginTop: 6, lineHeight: 20 }}>
              سجّل قياساتك الحيوية واحجز مواعيدك من التطبيق، وسيُبنى تقريرك الشهري تلقائياً من بياناتك الحقيقية.
            </AppText>
            <TouchableOpacity onPress={() => router.push('/health/vitals-log')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <AppText variant="bodySM" color="#fff">تسجيل قياس الآن</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Month at a glance — real counts */}
        {hasAnyData && (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>
            <AppText variant="bodySM" style={{ marginBottom: 12 }}>هذا الشهر بنظرة</AppText>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <AppText variant="h4" color={colors.primary}>{monthAppts.length}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>موعد</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText variant="h4" color="#5BA84F">{completedCount}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>مكتمل</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText variant="h4" color="#F0A526">{upcomingCount}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>قادم</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText variant="h4" color={colors.primary}>{meds.length}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>دواء مزمن</AppText>
              </View>
            </View>
          </View>
        )}

        {/* Real vitals from the patient's own log */}
        {vitals.length > 0 && (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>
            <AppText variant="bodySM" style={{ marginBottom: 12 }}>آخر قياساتك الحيوية</AppText>
            {vitals.map((v: any, i: number) => (
              <View key={v.id || v.type || i} style={[styles.vitalRow, { borderBottomColor: colors.border }]}>
                <AppText variant="bodySM">{v.value ?? v.latest ?? '—'} {v.unit || ''}</AppText>
                <AppText variant="bodySM">{pickLocalized(v.name_ar, v.name) || v.type}</AppText>
              </View>
            ))}
          </View>
        )}

        {/* Real trends — expandable, only when the series has data */}
        {trends.filter((t: any) => t?.data?.length).length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <AppText variant="bodySM" style={{ marginBottom: 8 }}>اتجاهاتك الصحية</AppText>
            {trends.filter((t: any) => t?.data?.length).map((t: any) => {
              const key = t.id || t.name;
              const points = t.data || [];
              const first = Number(points[0]?.value ?? points[0]);
              const last = Number(points[points.length - 1]?.value ?? points[points.length - 1]);
              const dir = !isFinite(first) || !isFinite(last) || first === last ? 'stable' : last > first ? 'up' : 'down';
              const dirColor = dir === 'stable' ? '#5BA84F' : '#F0A526';
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setExpandedVital(expandedVital === key ? null : key)}
                  style={[styles.analysisCard, { backgroundColor: isDark ? colors.surface : colors.white }]}
                  activeOpacity={0.85}
                >
                  <View style={styles.analysisHeader}>
                    <Icon name="trending_up" size={20} color={colors.primary} />
                    <View style={styles.analysisHeaderInfo}>
                      <View style={[styles.trendBadge, { backgroundColor: dirColor + '15' }]}>
                        <AppText variant="bodySM">{dir === 'up' ? '↑ ارتفاع' : dir === 'down' ? '↓ انخفاض' : '→ مستقر'}</AppText>
                      </View>
                      <AppText variant="bodySM">{pickLocalized(t.name_ar, t.name) || key}</AppText>
                    </View>
                  </View>
                  {expandedVital === key && (
                    <View style={[styles.analysisBody, { borderTopColor: colors.border }]}>
                      <AppText variant="bodySM" color={colors.textSecondary}>
                        {points.length} قراءة مسجلة — أول قراءة {isFinite(first) ? first : '—'} وآخر قراءة {isFinite(last) ? last : '—'} {t.unit || ''}
                      </AppText>
                      <TouchableOpacity onPress={() => router.push('/health/trends')} style={[styles.recBox, { backgroundColor: colors.primary + '10' }]}>
                        <AppText variant="bodySM" color={colors.primary}>عرض الرسم البياني الكامل</AppText>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Real appointments this month */}
        {monthAppts.length > 0 && (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16 }]}>
            <AppText variant="bodySM" style={{ marginBottom: 8 }}>المواعيد هذا الشهر</AppText>
            {monthAppts.map((apt: any, i: number) => {
              const d = apt?.scheduled_at ? new Date(apt.scheduled_at) : null;
              const done = ['COMPLETED', 'completed'].includes(apt?.state || apt?.status);
              return (
                <View key={apt.id || i} style={[styles.aptRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.aptStatus, { backgroundColor: done ? '#DCFCE7' : '#EBF3FF' }]}>
                    <AppText variant="bodySM">{done ? 'مكتمل' : 'قادم'}</AppText>
                  </View>
                  <View style={styles.aptInfo}>
                    <AppText variant="bodySM">{apt.doctor?.name || apt.doctor_name || apt.specialty || 'موعد طبي'}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {d ? d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' }) : ''}
                      {d ? ` — ${d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/health/trends')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
            <AppText variant="bodySM" color="#fff">عرض المؤشرات التاريخية</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <AppText variant="bodySM">احجز متابعة مع الطبيب</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 20, padding: 16, margin: 16, marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyCard: { borderRadius: 20, padding: 24, margin: 16, alignItems: 'center', gap: 4 },
  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: 2 },
  vitalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  analysisCard: { borderRadius: 18, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  analysisHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 14 },
  analysisHeaderInfo: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  trendBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  analysisBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, gap: 10, paddingTop: 12 },
  recBox: { borderRadius: 12, padding: 10, alignItems: 'center' },
  aptRow: { flexDirection: 'row-reverse', gap: 10, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'flex-start' },
  aptInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  aptStatus: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  primaryBtn: { height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  secondaryBtn: { borderRadius: 16, borderWidth: 1.5, height: 50, justifyContent: 'center', alignItems: 'center' },
});
