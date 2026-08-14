// @ts-nocheck
// app/ai/monthly-report.tsx
// <MaterialIcons name="smart-toy" size={24} color={resolveColor('var(--p)', isDark)} /> التقرير الصحي الشهري بالذكاء الاصطناعي
import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

const MONTH_SCORES = {
  overall: 78,
  vitals: 82,
  medications: 91,
  activity: 65,
  sleep: 74,
  nutrition: 70,
};

const SCORE_COLOR = (score: number) =>
  score >= 80 ? '#5BA84F' : score >= 60 ? '#F0A526' : '#F0695C';

const AI_ANALYSIS = [
  {
    category: 'ضغط الدم 🫀',
    trend: 'تحسّن',
    trendDir: 'up',
    color: '#5BA84F',
    detail: 'انخفض متوسط ضغطك من 135/88 إلى 128/82 خلال يونيو. تحسّن ملحوظ بنسبة 8%.',
    recommendation: 'استمر في الأدوية الحالية وتقليل الملح في الطعام',
  },
  {
    category: 'سكر الدم ',
    trend: 'مستقر',
    trendDir: 'stable',
    color: '#F0A526',
    detail: 'HbA1c عند 6.8% — ضمن الهدف العلاجي. بعض الارتفاعات بعد الغداء.',
    recommendation: 'اقلّص الكارب في وجبة الغداء وامشِ 20 دقيقة بعدها',
  },
  {
    category: 'النشاط البدني',
    trend: 'يحتاج تحسين',
    trendDir: 'down',
    color: '#F0695C',
    detail: 'متوسط 4,200 خطوة/يوم — أقل من الهدف 10,000. أسبوعان بدون رياضة.',
    recommendation: 'ابدأ بـ 15 دقيقة مشي يومي وزِدها تدريجياً',
  },
  {
    category: 'النوم ',
    trend: 'جيد',
    trendDir: 'stable',
    color: '#5BA84F',
    detail: 'متوسط 7.1 ساعة/ليلة. جودة النوم 74% — تحسّن عن الشهر السابق (68%).',
    recommendation: 'الاستمرار في روتين النوم الحالي يُعطي نتائج ممتازة',
  },
];

const APPOINTMENTS_SUMMARY = [
  { type: 'استشارة قلب', doctor: 'د. أحمد السيد', date: '5 يونيو', status: 'completed', notes: 'تعديل جرعة دواء الضغط' },
  { type: 'تحليل HbA1c', lab: 'مختبر الدقة', date: '15 يونيو', status: 'completed', notes: '6.8% — طبيعي' },
  { type: 'استشارة تغذية', doctor: 'د. سارة الحربي', date: '28 يونيو', status: 'upcoming', notes: 'مراجعة الخطة الغذائية' },
];

export default function AIMonthlyReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const [expandedItem, setExpandedItem] = useState<string | null>('ضغط الدم 🫀');

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 12 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={20} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h6" color="#fff">تقريرك الشهري</AppText>
          <View style={{ width: 32 }}/>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 12 }}>
          <View style={{ backgroundColor: '#23B5CE20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <AppText variant="bodySM" color="#23B5CE">يونيو 2026</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
             <AppText variant="h6" color={SCORE_COLOR(MONTH_SCORES.overall)}>{MONTH_SCORES.overall}/100</AppText>
             <AppText variant="caption" color="#9CA3AF">الدرجة الشاملة</AppText>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Sub-scores */}
        <View style={[styles.subScoresCard, { backgroundColor: isDark ? colors.surface : colors.white, margin: 16 } ]}>
          <AppText variant="bodySM">تفصيل الدرجات</AppText>
          {[
            { label: 'العلامات الحيوية', key: 'vitals', icon: 'trending_up' },
            { label: 'الالتزام بالأدوية', key: 'medications', icon: 'medication' },
            { label: 'النشاط البدني', key: 'activity', icon: 'run' },
            { label: 'جودة النوم', key: 'sleep', icon: 'sleep' },
            { label: 'التغذية', key: 'nutrition', icon: 'food' },
          ].map((item) => {
            const score = MONTH_SCORES[item.key as keyof typeof MONTH_SCORES];
            return (
              <View key={item.key} style={styles.subScoreRow}>
                <AppText variant="bodySM">{score}</AppText>
                <View style={[styles.subScoreBar, { backgroundColor: colors.border } ]}>
                  <View style={[styles.subScoreFill, { width: `${score}%`, backgroundColor: SCORE_COLOR(score) }]} />
                </View>
                <AppText variant="bodySM">{item.icon}</AppText>
                <AppText variant="bodySM">{item.label}</AppText>
              </View>
            );
          })}
        </View>

        {/* AI Analysis */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <AppText variant="bodySM">
            تحليل AI المفصّل <MaterialIcons name="smart-toy" size={24} color={resolveColor('var(--p)', isDark)} />
          </AppText>
          {AI_ANALYSIS.map((item) => (
            <TouchableOpacity
              key={item.category}
              onPress={() => setExpandedItem(expandedItem === item.category ? null : item.category)}
              style={[styles.analysisCard, { backgroundColor: isDark ? colors.surface : colors.white }]}
              activeOpacity={0.85}
            >
              <View style={styles.analysisHeader}>
                <Icon name="info" size={20} color={colors.primary} />
                <View style={styles.analysisHeaderInfo}>
                  <View style={[styles.trendBadge, { backgroundColor: item.color + '15' } ]}>
                    <AppText variant="bodySM">
                      {item.trendDir === 'up' ? '↑' : item.trendDir === 'down' ? '↓' : '→'} {item.trend}
                    </AppText>
                  </View>
                  <AppText variant="bodySM">{item.category}</AppText>
                </View>
              </View>
              {expandedItem === item.category && (
                <View style={[styles.analysisBody, { borderTopColor: colors.border } ]}>
                  <AppText variant="bodySM">{item.detail}</AppText>
                  <View style={[styles.recBox, { backgroundColor: item.color + '10' } ]}>
                    <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="info" size={16} color={colors.primary} /><AppText variant="bodySM">{item.recommendation}</AppText></View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Appointments Summary */}
        <View style={[styles.appointsCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16 } ]}>
          <AppText variant="bodySM">المواعيد هذا الشهر</AppText>
          {APPOINTMENTS_SUMMARY.map((apt, i) => (
            <View key={i} style={[styles.aptRow, { borderBottomColor: colors.border } ]}>
              <View style={[styles.aptStatus, { backgroundColor: apt.status === 'completed' ? '#DCFCE7' : '#EBF3FF' } ]}>
                <AppText variant="bodySM">
                  {apt.status === 'completed' ? ' مكتمل' : 'قادم'}
                </AppText>
              </View>
              <View style={styles.aptInfo}>
                <AppText variant="bodySM">{apt.type}</AppText>
                <AppText variant="bodySM">
                  {apt.doctor || apt.lab} • {apt.date}
                </AppText>
                <AppText variant="bodySM">{apt.notes}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/health/trends')} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <View style={styles.actionBtn}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="trending_up" size={16} color={colors.primary} /><AppText variant="bodySM">عرض المؤشرات التاريخية</AppText></View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
            style={[styles.secondaryBtn, { borderColor: colors.border } ]}>
            <AppText variant="bodySM">
              <MaterialIcons name="calendar-today" size={24} color={resolveColor('var(--p)', isDark)} /> احجز متابعة مع الطبيب
            </AppText>
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
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' } as any,
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  monthBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'center', marginBottom: 14 },
  month: { color: '#fff', fontSize: 13, fontWeight: '700' } as any,
  overallScore: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 14 },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  scoreNum: { fontSize: 28, fontFamily: 'Cairo-ExtraBold', lineHeight: 32 } as any,
  scoreOutOf: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '400' } as any,
  scoreDetails: { flex: 1, alignItems: 'flex-end', gap: 4 },
  scoreTitle: { color: '#fff', fontSize: 14, fontWeight: '800' } as any,
  scoreLabel: { fontSize: 14, fontWeight: '800' } as any,
  scoreChange: { color: '#4ADE80', fontSize: 12, fontWeight: '700' } as any,
  subScoresCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  subScoreRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
  subScoreLabel: { fontSize: 12, fontWeight: '700', width: 110, textAlign: 'right' },
  subScoreIcon: { fontSize: 18 } as any,
  subScoreBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  subScoreFill: { height: '100%', borderRadius: 4 },
  subScoreNum: { fontSize: 13, fontWeight: '800', width: 30, textAlign: 'right' },
  analysisCard: { borderRadius: 18, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  analysisHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 14 },
  analysisHeaderInfo: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  analysisCategory: { fontSize: 14, fontWeight: '800' } as any,
  trendBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  trend: { fontSize: 11, fontWeight: '700' } as any,
  analysisBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, gap: 10, paddingTop: 12 },
  analysisDetail: { fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 } as any,
  recBox: { borderRadius: 12, padding: 10 },
  rec: { fontSize: 12, fontWeight: '700', textAlign: 'right', lineHeight: 18 } as any,
  appointsCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  aptRow: { flexDirection: 'row-reverse', gap: 10, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'flex-start' },
  aptInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  aptType: { fontSize: 13, fontWeight: '800' } as any,
  aptMeta: { fontSize: 11, fontWeight: '400' } as any,
  aptNotes: { fontSize: 12, fontWeight: '400' } as any,
  aptStatus: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  aptStatusAlt: { fontSize: 10, fontWeight: '700' } as any,
  actionBtn: { height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionBtnAlt: { color: '#fff', fontSize: 15, fontWeight: '800' } as any,
  secondaryBtn: { borderRadius: 16, borderWidth: 1.5, height: 50, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnAlt: { fontSize: 14, fontWeight: '700' } as any,
});
