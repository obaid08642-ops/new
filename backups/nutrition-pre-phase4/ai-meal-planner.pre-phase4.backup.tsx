// @ts-nocheck
// app/nutrition/ai-meal-planner.tsx
// خطة الأكل الذكية بالذكاء الاصطناعي — مخصصة لحالتك الصحية
import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, StatusBar, Share, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const { width } = Dimensions.get('window');

const GOALS = [
  { id: 'lose', label: 'خسارة وزن', icon: 'trendingDown', color: '#F0695C' },
  { id: 'maintain', label: 'الحفاظ على الوزن', icon: 'weight', color: '#F0A526' },
  { id: 'gain', label: 'زيادة كتلة عضلية', icon: 'run', color: '#23B5CE' },
  { id: 'diabetes', label: 'التحكم بالسكري', icon: 'bloodtype', color: '#7A6BEA' },
  { id: 'heart', label: 'صحة القلب', icon: 'monitor_heart', color: '#F0695C' },
  { id: 'energy', label: 'رفع الطاقة', icon: 'flash', color: '#5BA84F' },
];

// Data fetched dynamically

export default function AIMealPlannerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [step, setStep] = useState<'setup' | 'generating' | 'plan'>('setup');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['diabetes']);
  const [selectedDay, setSelectedDay] = useState('السبت');
  const [calories, setCalories] = useState<number | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<any>({});
  const [insights, setInsights] = useState<any[]>([]);

  const toggleGoal = (id: string) => {
    setSelectedGoals(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const generatePlan = async () => {
    setStep('generating');
    try {
      // E2: use the patient's real profile metrics when available — never plan for a fabricated 30y/75kg person
      let profile: any = null;
      try { profile = await apiFetch('/nutrition/profile'); } catch {}
      const body: any = { goal: selectedGoals[0] || 'maintain' };
      if (profile?.gender) body.gender = profile.gender;
      if (profile?.weight_kg) body.weight = profile.weight_kg;
      if (profile?.height_cm) body.height = profile.height_cm;
      if (profile?.age) body.age = profile.age;
      if (profile?.target_weight_kg) body.targetWeight = profile.target_weight_kg;
      if (profile?.activity_level) body.activity = profile.activity_level;
      if (profile?.diet_type) body.diet = profile.diet_type;
      if (profile?.allergies) body.allergies = Array.isArray(profile.allergies) ? profile.allergies.join('، ') : profile.allergies;
      // E2: the calorie chip the user picked was never sent — wire it in
      if (calories) body.target_calories = calories;

      const res = await apiFetch<any>('/ai/generate-diet-plan', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res && res.meals) {
        setCalories(typeof res.calories === 'number' ? res.calories : null);
        const mappedDay = res.meals.map((m: any) => ({
          meal: m.time?.split(' ')[0] || 'وجبة',
          items: m.items,
          cals: typeof m.cal === 'number' ? m.cal : null,
          emoji: m.time.includes('فطور') || m.time.includes('الفطور') ? '' : m.time.includes('غداء') || m.time.includes('الغداء') ? '' : '',
        }));
        const newPlan: any = {};
        ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].forEach(day => {
          newPlan[day] = mappedDay;
        });
        setWeeklyPlan(newPlan);
        setInsights(res.insights || []);
      }
      setStep('plan');
    } catch (e: any) {
      showLocalizedAlert('تعذّر إنشاء الخطة', e?.message || 'حدث خطأ أثناء توليد الخطة الغذائية — حاول مرة أخرى');
      setStep('setup');
    }
  };

  const dayMeals = weeklyPlan[selectedDay] || [];
  const dayTotal = dayMeals.reduce((s: number, m: any) => s + (m.cals || 0), 0);

  if (step === 'generating') {
    return (
      <View style={[styles.generatingContainer, { backgroundColor: '#1E1B4B' } ]}>
        <Icon name="robot" size={20} color={colors.primary} />
        <AppText variant="bodySM">جاري إنشاء خطتك الغذائية...</AppText>
        <AppText variant="bodySM">الذكاء الاصطناعي يحلل حالتك الصحية وأهدافك</AppText>
        {['تحليل المؤشرات الصحية', 'حساب الاحتياجات الغذائية', 'اختيار الوجبات المناسبة', 'توازن المغذيات الكبرى'].map((s, i) => (
          <View key={i} style={styles.genStep}>
            <Icon name="check_circle" size={20} color={colors.primary} />
            <AppText variant="bodySM">{s}</AppText>
          </View>
        ))}
      </View>
    );
  }

  if (step === 'plan') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.hBtn} onPress={() => setStep('setup')}>
              <Icon name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
            <AppText variant="bodySM">خطتك الغذائية الأسبوعية</AppText>
            <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
              <Icon name="back" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.planStats}>
            <View style={styles.planStat}><AppText variant="bodySM">{calories ?? '—'}</AppText><AppText variant="bodySM">سعرة/يوم</AppText></View>
            <View style={styles.planStatDiv} />
            <View style={styles.planStat}><AppText variant="bodySM">120جم</AppText><AppText variant="bodySM">بروتين</AppText></View>
            <View style={styles.planStatDiv} />
            <View style={styles.planStat}><AppText variant="bodySM">7</AppText><AppText variant="bodySM">أيام</AppText></View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* AI Insights */}
          {insights.length > 0 && (
            <View style={[styles.insightsCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 16 } ]}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="info" size={16} color={colors.primary} /><AppText variant="bodySM">رؤى الذكاء الاصطناعي</AppText></View>
              {insights.map((ins, i) => (
                <View key={i} style={[styles.insightRow, { borderBottomColor: colors.border } ]}>
                  <AppText variant="bodySM">{ins.text}</AppText>
                  <AppText variant="bodySM">{ins.icon}</AppText>
                </View>
              ))}
            </View>
          )}

          {/* Day Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.daySelector} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {Object.keys(weeklyPlan).concat(['السبت', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']).map(day => (
              <TouchableOpacity key={day} onPress={() => setSelectedDay(day)}
                style={[styles.dayChip, selectedDay === day && { backgroundColor: '#5BA84F' } ]}>
                <AppText variant="bodySM">{day}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Day Meals */}
          <View style={[styles.dayCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16 } ]}>
            <View style={styles.dayCardHeader}>
              <AppText variant="bodySM">{dayTotal} سعرة</AppText>
              <AppText variant="bodySM">{selectedDay}</AppText>
            </View>
            {dayMeals.map((meal, i) => (
              <View key={i} style={[styles.mealRow, { borderBottomColor: colors.border } ]}>
                <View style={styles.mealLeft}>
                  <AppText variant="bodySM">{meal.cals ?? '—'}</AppText>
                  <AppText variant="bodySM">سعرة</AppText>
                </View>
                <View style={styles.mealInfo}>
                  <AppText variant="bodySM">{meal.meal}</AppText>
                  <AppText variant="bodySM">
                    {meal.items.join(' • ')}
                  </AppText>
                </View>
                <AppText variant="bodySM">{meal.emoji}</AppText>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.exportBtn, { borderColor: colors.border }]}
              onPress={() => {
                if (!dayMeals.length) return;
                const lines = dayMeals.map((m: any) => `${m.meal}: ${(m.items || []).join('، ')}${m.cals != null ? ` (${m.cals} سعرة)` : ''}`);
                Share.share({
                  message: `خطتي الغذائية ليوم ${selectedDay} — تطبيق نبض\nالإجمالي: ${dayTotal} سعرة\n\n${lines.join('\n')}`,
                }).catch(() => {});
              }}
            >
              <Icon name="share" size={16} color={colors.primary} />
              <AppText variant="bodySM">مشاركة خطة اليوم</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Setup screen
  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">خطة غذائية ذكية</AppText>
          <View style={{ width: 36 }}/>
        </View>
        <AppText variant="bodySM">أخبرنا بأهدافك وسيضع AI خطتك المثالية</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile Summary */}
        <View style={[styles.profileCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">ملفك الصحي المُدخل </AppText>
          <View style={styles.profileGrid}>
            {[
              { label: 'العمر', val: '34 سنة' },
              { label: 'الطول', val: '186 سم' },
              { label: 'الوزن', val: '78 كجم' },
              { label: 'BMI', val: '22.4 طبيعي' },
              { label: 'نشاط', val: 'متوسط' },
              { label: 'حساسية', val: 'بنسلين' },
            ].map((p, i) => (
              <View key={i} style={[styles.profileItem, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
                <AppText variant="bodySM">{p.val}</AppText>
                <AppText variant="bodySM">{p.label}</AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Goals */}
        <View style={[styles.goalsCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">ما هدفك الغذائي؟ </AppText>
          <View style={styles.goalsGrid}>
            {GOALS.map(goal => (
              <TouchableOpacity key={goal.id} onPress={() => toggleGoal(goal.id)}
                style={[styles.goalBtn, selectedGoals.includes(goal.id) && { backgroundColor: goal.color, borderColor: goal.color } ]}>
                <AppText variant="bodySM">{goal.icon}</AppText>
                <AppText variant="bodySM">
                  {goal.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Calorie preference */}
        <View style={[styles.calCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">الهدف اليومي من السعرات</AppText>
          <View style={styles.calRow}>
            {[1600, 1800, 2100, 2400, 2800].map(cal => (
              <TouchableOpacity key={cal} onPress={() => setCalories(cal)}
                style={[styles.calChip, calories === cal && { backgroundColor: '#5BA84F', borderColor: '#5BA84F' } ]}>
                <AppText variant="bodySM">{cal}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity onPress={generatePlan} disabled={selectedGoals.length === 0}
          activeOpacity={0.85} style={{ opacity: selectedGoals.length === 0 ? 0.5 : 1 }}>
          <View style={styles.generateBtn}>
            <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="robot" size={16} color={colors.primary} /><AppText variant="bodySM">إنشاء الخطة الغذائية</AppText></View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  generatingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  genTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  genSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '400', textAlign: 'center' },
  genStep: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  genStepIcon: { fontSize: 14 },
  genStepText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '400' },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '400', textAlign: 'center' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  planStats: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12 },
  planStat: { flex: 1, alignItems: 'center', gap: 2 },
  planStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  planStatNum: { color: '#fff', fontSize: 16, fontFamily: 'Cairo-ExtraBold' },
  planStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '400' },
  insightsCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  insightRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  insightIcon: { fontSize: 18 },
  insightText: { flex: 1, fontSize: 12, fontWeight: '400', textAlign: 'right', lineHeight: 18 },
  daySelector: { marginVertical: 12 },
  dayChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.06)' },
  dayChipText: { fontSize: 12, fontWeight: '700' },
  dayCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  dayCardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayTotalCal: { fontSize: 14, fontWeight: '800' },
  mealRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  mealEmoji: { fontSize: 24 },
  mealInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  mealName: { fontSize: 13, fontWeight: '800' },
  mealItems: { fontSize: 11, fontWeight: '400', textAlign: 'right', lineHeight: 16 },
  mealLeft: { alignItems: 'center', gap: 1, width: 40 },
  mealCals: { fontSize: 14, fontFamily: 'Cairo-ExtraBold' },
  mealCalsLabel: { fontSize: 9, fontWeight: '400' },
  actions: { flexDirection: 'row-reverse', gap: 10, marginHorizontal: 16, marginTop: 12 },
  exportBtn: { flex: 1, borderRadius: 14, borderWidth: 1.5, height: 46, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 6 },
  exportBtnText: { fontSize: 13, fontWeight: '700' },
  profileCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  profileGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  profileItem: { borderRadius: 12, padding: 10, alignItems: 'center', gap: 2, minWidth: 80 },
  profileVal: { fontSize: 13, fontWeight: '800' },
  profileLabel: { fontSize: 9, fontWeight: '400' },
  goalsCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  goalsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  goalBtn: { borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', padding: 12, alignItems: 'center', gap: 4, minWidth: 100 },
  goalIcon: { fontSize: 24 },
  goalLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  calCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  calRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  calChip: { borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 14, paddingVertical: 8 },
  calText: { fontSize: 13, fontWeight: '800' },
  generateBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
