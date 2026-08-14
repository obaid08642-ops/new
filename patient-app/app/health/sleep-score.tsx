// @ts-nocheck
// app/health/sleep-score.tsx
//  تقييم جودة النوم اليومي
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

const SLEEP_DATA = {
  score: 78,
  totalHours: 7.2,
  bedTime: '11:30 م',
  wakeTime: '6:45 ص',
  deepSleep: 1.8,
  remSleep: 1.4,
  lightSleep: 3.8,
  awakenings: 2,
};

const WEEK = [
  { day: 'أحد', score: 82, hours: 7.5 },
  { day: 'اثنين', score: 65, hours: 6.0 },
  { day: 'ثلاثاء', score: 90, hours: 8.1 },
  { day: 'أربعاء', score: 74, hours: 7.0 },
  { day: 'خميس', score: 55, hours: 5.8 },
  { day: 'جمعة', score: 88, hours: 8.0 },
  { day: 'سبت', score: 78, hours: 7.2 },
];

const TIPS = [
  { icon: 'moon', text: 'تجنّب الشاشات قبل النوم بساعة' },
  { icon: 'thermometer', text: 'اضبط درجة حرارة الغرفة بين 18-20°' },
  { icon: 'food', text: 'لا كافيين بعد الساعة 2 م' },
  { icon: 'meditation', text: 'تمارين تنفس خفيفة قبل النوم' },
];

export default function SleepScoreScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  

  const scoreColor = SLEEP_DATA.score >= 80 ? '#5BA84F' : SLEEP_DATA.score >= 60 ? '#F0A526' : '#F0695C';
  const scoreLabel = SLEEP_DATA.score >= 80 ? 'ممتاز' : SLEEP_DATA.score >= 60 ? 'جيد' : 'يحتاج تحسين';

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 44 }}/>
          <AppText variant="h3" color={colors.textPrimary}>درجة النوم</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Score Circle */}
        <Card style={[{ backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={styles.scoreSection}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor } ]}>
              <AppText variant="h3" color={colors.textPrimary}>{SLEEP_DATA.score}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>/ 100</AppText>
              <AppText variant="bodySM" color={scoreColor} style={{ fontWeight: 'bold' }}>{scoreLabel}</AppText>
            </View>
            <View style={styles.scoreStats}>
              {[
                { label: 'إجمالي النوم', val: `${SLEEP_DATA.totalHours}س`, icon: 'timer' },
                { label: 'وقت النوم', val: SLEEP_DATA.bedTime, icon: 'bedtime' },
                { label: 'وقت الاستيقاظ', val: SLEEP_DATA.wakeTime, icon: 'alarm' },
                { label: 'الاستيقاظات', val: SLEEP_DATA.awakenings.toString(), icon: 'self_improvement' },
              ].map((s, i) => (
                <View key={i} style={styles.scoreStat}>
                  <Icon name={s.icon} size={20} color={colors.primary} />
                  <AppText variant="bodySM">{s.val}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>{s.label}</AppText>
                </View>
              ))}
            </View>
          </View>
        </Card>


        {/* Sleep phases */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon name="nights_stay" size={18} color={colors.primary} />
            <AppText variant="h6">مراحل النوم</AppText>
          </View>
          {[
            { label: 'نوم عميق', val: SLEEP_DATA.deepSleep, max: SLEEP_DATA.totalHours, color: '#23B5CE', ideal: '1.5-2 ساعة' },
            { label: 'نوم REM', val: SLEEP_DATA.remSleep, max: SLEEP_DATA.totalHours, color: '#7A6BEA', ideal: '1.5-2 ساعة' },
            { label: 'نوم خفيف', val: SLEEP_DATA.lightSleep, max: SLEEP_DATA.totalHours, color: '#A5B4FC', ideal: '3-4 ساعات' },
          ].map((phase, i) => (
            <View key={i} style={styles.phaseRow}>
              <View style={styles.phaseRight}>
                <AppText variant="bodySM">{phase.ideal}</AppText>
                <AppText variant="bodySM">{phase.val}س</AppText>
              </View>
              <View style={[styles.phaseBar, { backgroundColor: colors.border } ]}>
                <View style={[styles.phaseFill, { width: `${(phase.val / phase.max) * 100}%`, backgroundColor: phase.color }]} />
              </View>
              <AppText variant="bodySM">{phase.label}</AppText>
            </View>
          ))}
        </View>

        {/* Week chart */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon name="calendar_today" size={18} color="#F0A526" />
            <AppText variant="h6">هذا الأسبوع</AppText>
          </View>
          <View style={styles.weekBars}>
            {WEEK.map((d, i) => {
              const c = d.score >= 80 ? '#5BA84F' : d.score >= 60 ? '#F0A526' : '#F0695C';
              return (
                <View key={i} style={styles.weekBar}>
                  <AppText variant="bodySM">{d.score}</AppText>
                  <View style={[styles.weekBarBg, { backgroundColor: colors.border } ]}>
                    <View style={[styles.weekBarFill, { height: `${d.score}%`, backgroundColor: c }]} />
                  </View>
                  <AppText variant="bodySM">{d.day}</AppText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Tips */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon name="lightbulb" size={18} color="#23B5CE" />
            <AppText variant="h6">لنوم أفضل</AppText>
          </View>
          {TIPS.map((tip, i) => (
            <View key={i} style={[styles.tipRow, { borderBottomColor: colors.border } ]}>
              <AppText variant="bodySM">{tip.text}</AppText>
              <Icon name={tip.icon} size={24} color={colors.primary} />
            </View>
          ))}
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
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  scoreSection: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16 },
  scoreCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', gap: 0 },
  scoreNum: { fontSize: 32, fontFamily: 'Cairo-ExtraBold', lineHeight: 36 },
  scoreOf: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '400' },
  scoreLabel: { fontSize: 12, fontWeight: '800' },
  scoreStats: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  scoreStat: { width: '47%', alignItems: 'center', gap: 2 },
  scoreStatIcon: { fontSize: 16 },
  scoreStatVal: { color: '#fff', fontSize: 13, fontFamily: 'Cairo-ExtraBold' },
  scoreStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '400', textAlign: 'center' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 14 },
  phaseRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 },
  phaseLabel: { fontSize: 12, fontWeight: '700', width: 70, textAlign: 'right' },
  phaseBar: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  phaseFill: { height: '100%', borderRadius: 5 },
  phaseRight: { alignItems: 'center', gap: 1, width: 50 },
  phaseVal: { fontSize: 13, fontFamily: 'Cairo-ExtraBold' },
  phaseIdeal: { fontSize: 8, fontWeight: '400' },
  weekBars: { flexDirection: 'row-reverse', alignItems: 'flex-end', height: 100, gap: 6 },
  weekBar: { flex: 1, alignItems: 'center', gap: 4 },
  weekScore: { fontSize: 9, fontWeight: '800' },
  weekBarBg: { flex: 1, width: '80%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  weekBarFill: { width: '100%', borderRadius: 4 },
  weekDay: { fontSize: 8, fontWeight: '400', textAlign: 'center' },
  tipRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  tipIcon: { fontSize: 22 },
  tip: { flex: 1, fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
});
