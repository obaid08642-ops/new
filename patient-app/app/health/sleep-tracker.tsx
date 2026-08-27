// @ts-nocheck
// app/health/sleep-tracker.tsx — REAL sleep data (GET/POST /health/sleep)
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const QUALITY_COLORS = { excellent: '#5BA84F', good: '#23B5CE', fair: '#F0A526', poor: '#F0695C' };
const QUALITY_LABELS = { excellent: 'ممتاز', good: 'جيد', fair: 'متوسط', poor: 'ضعيف' };
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const qualityOf = (score?: number | null) =>
  score == null ? 'fair' : score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

export default function SleepTrackerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState('');
  const [score, setScore] = useState('');

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

  // Last-7-days series from real readings (most recent reading per day)
  const week: { day: string; hours: number; quality: string }[] = [];
  const seenDays = new Set<string>();
  for (const r of readings) {
    const d = new Date(r.measured_at);
    if (isNaN(d.getTime())) continue;
    const key = d.toDateString();
    if (seenDays.has(key)) continue;
    const ageDays = (Date.now() - d.getTime()) / 86400000;
    if (ageDays > 7) continue;
    seenDays.add(key);
    week.push({ day: DAY_NAMES[d.getDay()], hours: r.duration_hours, quality: qualityOf(r.sleep_score) });
  }
  const avgSleep = week.length ? (week.reduce((s, d) => s + d.hours, 0) / week.length).toFixed(1) : null;

  const addReading = async () => {
    const h = parseFloat(hours);
    const s = parseInt(score, 10);
    if (isNaN(h) || h <= 0 || h > 24) { showLocalizedAlert('تحقق', 'أدخل ساعات نوم صحيحة (0-24)'); return; }
    if (isNaN(s) || s < 0 || s > 100) { showLocalizedAlert('تحقق', 'أدخل تقييم جودة بين 0 و 100'); return; }
    try {
      setSaving(true);
      await apiFetch('/health/sleep', {
        method: 'POST',
        body: JSON.stringify({ duration_hours: h, sleep_score: s, source: 'manual' }),
      });
      setHours(''); setScore('');
      await load();
    } catch (e: any) {
      showLocalizedAlert('خطأ', e?.message || 'تعذر حفظ القراءة');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>متابعة النوم</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {error ? (
          <Card style={{ marginHorizontal: 16, marginTop: 12, alignItems: 'center', gap: 10, padding: 24 }}>
            <Icon name="warning" size={36} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>
            <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />
          </Card>
        ) : (
          <>
            {/* Last recorded night */}
            <Card style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: isDark ? colors.surface : colors.white }}>
              {last ? (
                <View style={styles.sleepSummary}>
                  <View style={styles.sleepBedTime}>
                    <AppText variant="caption" color={colors.textSecondary}>آخر تسجيل</AppText>
                    <AppText variant="h6" color={colors.textPrimary}>
                      {new Date(last.measured_at).toLocaleDateString(dateLocale())}
                    </AppText>
                  </View>
                  <View style={styles.sleepDuration}>
                    <AppText variant="h1" color={colors.primary}>{last.duration_hours}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>ساعات النوم</AppText>
                    <View style={[styles.sleepQualityBadge, { backgroundColor: QUALITY_COLORS[qualityOf(last.sleep_score)] + '22', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 }]}>
                      <Icon name="sparkles" size={16} color={QUALITY_COLORS[qualityOf(last.sleep_score)]} />
                      <AppText variant="caption" style={{ color: QUALITY_COLORS[qualityOf(last.sleep_score)], fontWeight: 'bold' }}>
                        {QUALITY_LABELS[qualityOf(last.sleep_score)]}{last.sleep_score != null ? ` (${last.sleep_score})` : ''}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.sleepBedTime}>
                    <AppText variant="caption" color={colors.textSecondary}>المصدر</AppText>
                    <AppText variant="h6" color={colors.textPrimary}>{last.source === 'device' ? 'جهاز' : 'يدوي'}</AppText>
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                  <Icon name="nights_stay" size={40} color={colors.textTertiary} />
                  <AppText variant="bodySM" color={colors.textTertiary} align="center">
                    لا توجد قراءات نوم مسجلة بعد — سجّل أول قراءة بالأسفل
                  </AppText>
                </View>
              )}
            </Card>

            {/* Weekly chart — real data only */}
            {week.length > 0 && (
              <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 12 }]}>
                <View style={[styles.weekHeader, { marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Icon name="calendar_today" size={20} color="#F0A526" />
                    <AppText variant="h6">آخر ٧ أيام</AppText>
                  </View>
                  {avgSleep && <AppText variant="bodySM" color={colors.textSecondary}>متوسط {avgSleep}h</AppText>}
                </View>
                <View style={styles.weekBars}>
                  {week.map((day, i) => {
                    const height = Math.max(8, (day.hours / 10) * 80);
                    const qColor = QUALITY_COLORS[day.quality as keyof typeof QUALITY_COLORS];
                    return (
                      <View key={i} style={styles.dayBar}>
                        <AppText variant="bodySM">{day.hours}h</AppText>
                        <View style={[styles.bar, { height, backgroundColor: qColor + 'CC' }]} />
                        <AppText variant="bodySM">{day.day.slice(0, 5)}</AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Log a reading */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 12, gap: 10 }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Icon name="edit" size={20} color={colors.primary} />
                <AppText variant="h6">تسجيل نوم الليلة</AppText>
              </View>
              <Input value={hours} onChangeText={setHours} placeholder="عدد الساعات (مثال: 7.5)" icon="bedtime" keyboardType="numeric" />
              <Input value={score} onChangeText={setScore} placeholder="تقييم الجودة من 100 (مثال: 80)" icon="sparkles" keyboardType="numeric" />
              <Button label="حفظ القراءة" variant="gradient" icon="check_circle" loading={saving} onPress={addReading} />
            </View>

            {/* Sleep Tips — static educational content */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 12 }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Icon name="lightbulb" size={20} color="#23B5CE" />
                <AppText variant="h6">نصائح تحسين النوم</AppText>
              </View>
              {[
                { icon: 'bedtime', text: 'اذهب للنوم في نفس الوقت يومياً' },
                { icon: 'phone_iphone', text: 'تجنب الشاشات قبل النوم بساعة' },
                { icon: 'thermostat', text: 'الحفاظ على درجة حرارة باردة' },
                { icon: 'coffee', text: 'تجنب الكافيين بعد الساعة 3 م' },
              ].map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Icon name={tip.icon} size={20} color={colors.primary} />
                  <AppText variant="bodySM">{tip.text}</AppText>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sleepSummary: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sleepBedTime: { alignItems: 'center', gap: 4 },
  sleepDuration: { alignItems: 'center', gap: 4 },
  sleepQualityBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  weekHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  weekBars: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'flex-end', minHeight: 110 },
  dayBar: { alignItems: 'center', gap: 4 },
  bar: { width: 28, borderRadius: 8 },
});
