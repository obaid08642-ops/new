// @ts-nocheck
// app/health/sleep-score.tsx — REAL daily sleep quality (GET /health/sleep)
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';

const DAY_NAMES = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

const TIPS = [
  { icon: 'sleep', text: 'تجنّب الشاشات قبل النوم بساعة' },
  { icon: 'thermometer', text: 'اضبط درجة حرارة الغرفة بين 18-20°' },
  { icon: 'food', text: 'لا كافيين بعد الساعة 2 م' },
  { icon: 'meditation', text: 'تمارين تنفس خفيفة قبل النوم' },
];

export default function SleepScoreScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/health/sleep?limit=30');
      setReadings(Array.isArray(res) ? res : res?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل بيانات النوم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const last = readings[0] || null;
  const lastScore: number | null = last?.sleep_score ?? null;
  const scoreColor = lastScore == null ? colors.textTertiary : lastScore >= 80 ? '#5BA84F' : lastScore >= 60 ? '#F0A526' : '#F0695C';
  const scoreLabel = lastScore == null ? 'لا توجد قراءة' : lastScore >= 80 ? 'ممتاز' : lastScore >= 60 ? 'جيد' : 'يحتاج تحسين';

  // Last-7-days real score series (most recent per day)
  const week: { day: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const r of readings) {
    const d = new Date(r.measured_at);
    if (isNaN(d.getTime()) || r.sleep_score == null) continue;
    const key = d.toDateString();
    if (seen.has(key)) continue;
    if ((Date.now() - d.getTime()) / 86400000 > 7) continue;
    seen.add(key);
    week.push({ day: DAY_NAMES[d.getDay()], score: r.sleep_score });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>درجة النوم</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {error ? (
            <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>
              <Icon name="warning" size={36} color={colors.textTertiary} />
              <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>
              <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />
            </Card>
          ) : (
            <>
              {/* Score Circle — latest real reading */}
              <Card style={[{ backgroundColor: isDark ? colors.surface : colors.white }]}>
                <View style={styles.scoreSection}>
                  <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                    <AppText variant="h3" color={colors.textPrimary}>{lastScore ?? '—'}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>/ 100</AppText>
                    <AppText variant="bodySM" color={scoreColor} style={{ fontWeight: 'bold' }}>{scoreLabel}</AppText>
                  </View>
                  <View style={styles.scoreStats}>
                    {(last
                      ? [
                          { label: 'إجمالي النوم', val: `${last.duration_hours}س`, icon: 'timer' },
                          { label: 'تاريخ القراءة', val: new Date(last.measured_at).toLocaleDateString(dateLocale()), icon: 'calendar_today' },
                          { label: 'المصدر', val: last.source === 'device' ? 'جهاز قياس' : 'إدخال يدوي', icon: 'watch' },
                        ]
                      : [{ label: 'الحالة', val: 'لا توجد قراءات', icon: 'info' }]
                    ).map((s, i) => (
                      <View key={i} style={styles.scoreStat}>
                        <Icon name={s.icon} size={20} color={colors.primary} />
                        <AppText variant="bodySM">{s.val}</AppText>
                        <AppText variant="caption" color={colors.textSecondary}>{s.label}</AppText>
                      </View>
                    ))}
                  </View>
                </View>
                {!last && (
                  <Button
                    label="سجّل نومك من شاشة متابعة النوم"
                    variant="gradient"
                    icon="bedtime"
                    onPress={() => router.push('/health/sleep-tracker')}
                    style={{ marginTop: 14 }}
                  />
                )}
              </Card>

              {/* Week chart — real scores only */}
              {week.length > 0 && (
                <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Icon name="calendar_today" size={18} color="#F0A526" />
                    <AppText variant="h6">آخر ٧ أيام</AppText>
                  </View>
                  <View style={styles.weekBars}>
                    {week.map((d, i) => {
                      const c = d.score >= 80 ? '#5BA84F' : d.score >= 60 ? '#F0A526' : '#F0695C';
                      return (
                        <View key={i} style={styles.weekBar}>
                          <AppText variant="bodySM">{d.score}</AppText>
                          <View style={[styles.weekBarBg, { backgroundColor: colors.border }]}>
                            <View style={[styles.weekBarFill, { height: `${Math.max(4, d.score)}%`, backgroundColor: c }]} />
                          </View>
                          <AppText variant="bodySM">{d.day}</AppText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Tips — static educational content */}
              <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Icon name="lightbulb" size={18} color="#23B5CE" />
                  <AppText variant="h6">لنوم أفضل</AppText>
                </View>
                {TIPS.map((tip, i) => (
                  <View key={i} style={[styles.tipRow, { borderBottomColor: colors.border }]}>
                    <AppText variant="bodySM">{tip.text}</AppText>
                    <Icon name={tip.icon} size={24} color={colors.primary} />
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scoreSection: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16 },
  scoreCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, justifyContent: 'center', alignItems: 'center', gap: 0 },
  scoreStats: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  scoreStat: { width: '47%', alignItems: 'center', gap: 2 },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  weekBars: { flexDirection: 'row-reverse', alignItems: 'flex-end', height: 100, gap: 6 },
  weekBar: { flex: 1, alignItems: 'center', gap: 4 },
  weekBarBg: { flex: 1, width: '80%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  weekBarFill: { width: '100%', borderRadius: 4 },
  tipRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
});
