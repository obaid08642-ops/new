// @ts-nocheck
// app/health/sleep-tracker.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

const SLEEP_STAGES = [
  { label: 'نوم عميق', hours: 1.8, color: '#6366F1', pct: 25 },
  { label: 'نوم خفيف', hours: 3.2, color: '#7A6BEA', pct: 44 },
  { label: 'حركة العيون السريعة', hours: 1.4, color: '#A78BFA', pct: 19 },
  { label: 'صحيان', hours: 0.8, color: '#C4B5FD', pct: 12 },
];

const WEEK_DATA = [
  { day: 'الأحد', hours: 7.5, quality: 'good' },
  { day: 'الاثنين', hours: 6.2, quality: 'fair' },
  { day: 'الثلاثاء', hours: 8.1, quality: 'excellent' },
  { day: 'الأربعاء', hours: 5.8, quality: 'poor' },
  { day: 'الخميس', hours: 7.2, quality: 'good' },
  { day: 'الجمعة', hours: 8.5, quality: 'excellent' },
  { day: 'السبت', hours: 7.2, quality: 'good' },
];

const QUALITY_COLORS = { excellent: '#5BA84F', good: '#23B5CE', fair: '#F0A526', poor: '#F0695C' };
const QUALITY_LABELS = { excellent: 'ممتاز', good: 'جيد', fair: 'متوسط', poor: 'ضعيف' };

export default function SleepTrackerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const avgSleep = (WEEK_DATA.reduce((s, d) => s + d.hours, 0) / WEEK_DATA.length).toFixed(1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 44 }}/>
          <AppText variant="h3" color={colors.textPrimary}>متابعة النوم</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Card style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: isDark ? colors.surface : colors.white }}>
          <View style={styles.sleepSummary}>
            <View style={styles.sleepBedTime}>
              <AppText variant="caption" color={colors.textSecondary}>الاستيقاظ</AppText>
              <AppText variant="h6" color={colors.textPrimary}>6:30 ص</AppText>
            </View>
            <View style={styles.sleepDuration}>
              <AppText variant="h1" color={colors.primary}>7.2</AppText>
              <AppText variant="caption" color={colors.textSecondary}>ساعات الليلة</AppText>
              <View style={[styles.sleepQualityBadge, { backgroundColor: '#DCFCE7', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 } ]}>
                <Icon name="sparkles" size={16} color="#16A34A" />
                <AppText variant="caption" style={{ color: '#16A34A', fontWeight: 'bold' }}>جيد</AppText>
              </View>
            </View>
            <View style={styles.sleepBedTime}>
              <AppText variant="caption" color={colors.textSecondary}>النوم</AppText>
              <AppText variant="h6" color={colors.textPrimary}>11:18 م</AppText>
            </View>
          </View>
        </Card>


        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 16 } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Icon name="nights_stay" size={20} color={colors.primary} />
            <AppText variant="h6">مراحل النوم الليلية</AppText>
          </View>
          {SLEEP_STAGES.map((stage, i) => (
            <View key={i} style={styles.stageRow}>
              <AppText variant="bodySM">{stage.hours}h</AppText>
              <View style={[styles.stageBarBg, { backgroundColor: colors.border } ]}>
                <View style={[styles.stageBarFill, { width: `${stage.pct}%`, backgroundColor: stage.color }]} />
              </View>
              <AppText variant="bodySM">{stage.label}</AppText>
            </View>
          ))}
        </View>

        {/* Weekly Chart */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 12 } ]}>
          <View style={[styles.weekHeader, { marginBottom: 16 } ]}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Icon name="calendar_today" size={20} color="#F0A526" />
              <AppText variant="h6">أسبوع النوم</AppText>
            </View>
            <AppText variant="bodySM" color={colors.textSecondary}>متوسط {avgSleep}h</AppText>
          </View>
          <View style={styles.weekBars}>
            {WEEK_DATA.map((day, i) => {
              const height = (day.hours / 10) * 80;
              const qColor = QUALITY_COLORS[day.quality as keyof typeof QUALITY_COLORS];
              return (
                <View key={i} style={styles.dayBar}>
                  <AppText variant="bodySM">{day.hours}h</AppText>
                  <View style={[styles.bar, { height: height, backgroundColor: qColor + 'CC' }]} />
                  <AppText variant="bodySM">{day.day.slice(0, 3)}</AppText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Sleep Tips */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 12 } ]}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  sleepSummary: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sleepBedTime: { alignItems: 'center', gap: 4 },
  sleepTimeLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '400' },
  sleepTime: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sleepDuration: { alignItems: 'center', gap: 4 },
  sleepDurationNum: { color: '#fff', fontSize: 42, fontFamily: 'Cairo-ExtraBold', lineHeight: 46 },
  sleepDurationLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '400' },
  sleepQualityBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  sleepQualityText: { color: '#16A34A', fontSize: 11, fontWeight: '700' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 14 },
  stageRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 },
  stageLabel: { fontSize: 12, fontWeight: '400', width: 120, textAlign: 'right' },
  stageBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  stageBarFill: { height: '100%', borderRadius: 4 },
  stageHours: { fontSize: 12, fontWeight: '800', width: 30 },
  weekHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  weekAvg: { fontSize: 14, fontWeight: '800' },
  weekBars: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'flex-end', height: 110 },
  dayBar: { alignItems: 'center', gap: 4 },
  dayHours: { fontSize: 9, fontWeight: '400' },
  bar: { width: 28, borderRadius: 8 },
  dayName: { fontSize: 9, fontWeight: '400' },
  tip: { fontSize: 13, fontWeight: '400', textAlign: 'right', paddingVertical: 5, lineHeight: 20 },
});
