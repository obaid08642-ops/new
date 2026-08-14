// @ts-nocheck
// AI-powered diet plan builder (weight loss/gain/healthy)
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const GOALS: { key: string; label: string; icon: IconName; color: string; desc: string }[] = [
  { key: 'lose', label: 'إنقاص وزن', icon: 'trendingDown', color: '#F0695C', desc: 'خطة حمية متوازنة لخسارة الوزن بشكل صحي' },
  { key: 'gain', label: 'زيادة وزن', icon: 'trending_up', color: '#16A34A', desc: 'نظام غني بالبروتين والسعرات لبناء الكتلة العضلية' },
  { key: 'maintain', label: 'نمط صحي', icon: 'favorite', color: '#23B5CE', desc: 'نظام متوازن للحفاظ على صحتك ونشاطك' },
  { key: 'muscle', label: 'بناء عضلات', icon: 'run', color: '#7A6BEA', desc: 'تغذية مركزة على البروتين مع نظام تمرين' },
];

const DIETS = ['عادي', 'نباتي', 'كيتو', 'منخفض الكربوهيدرات', 'خالي من الجلوتين', 'حلال فقط'];

export default function AIPlanBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [form, setForm] = useState({ weight: '', height: '', age: '', targetWeight: '' });
  const [gender, setGender] = useState('male');
  const [activity, setActivity] = useState('moderate');
  const [diet, setDiet] = useState('عادي');
  const [allergies, setAllergies] = useState('');
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch<any>('/ai/generate-diet-plan', {
        method: 'POST',
        body: JSON.stringify({
          goal,
          gender,
          weight: Number(form.weight) || 70,
          height: Number(form.height) || 170,
          age: Number(form.age) || 30,
          targetWeight: Number(form.targetWeight) || 70,
          activity,
          diet,
          allergies,
        }),
      });

      // Update backend profile target parameters as well
      await apiFetch('/nutrition/profile', {
        method: 'POST',
        body: JSON.stringify({
          goal: goal === 'maintain' ? 'healthy_lifestyle' : goal === 'lose' ? 'weight_loss' : goal === 'gain' ? 'muscle_gain' : 'healthy_lifestyle',
          height_cm: Number(form.height) || 170,
          weight_kg: Number(form.weight) || 70,
          target_weight_kg: Number(form.targetWeight) || 70,
          daily_calorie_target: res.calories || 2000,
          activity_level: activity === 'low' ? 'sedentary' : activity === 'moderate' ? 'moderate' : 'active',
        }),
      }).catch(() => {});

      setPlan(res);
      setStep(3);
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل إنشاء الخطة الغذائية. يرجى المحاولة لاحقاً.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 } ]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }}/>
          <View style={{ alignItems: 'center' }}>
            <AppText variant="h4" color="#fff">بناء خطة غذائية بالـ AI</AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">الخطوة {Math.min(step + 1, 3)} من 3</AppText>
          </View>
          <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => step > 0 ? setStep(s => s - 1) : router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Step 0: Choose goal */}
        {step === 0 && (
          <>
            <SectionHeader title="اختر هدفك" />
            {GOALS.map(g => (
              <Card key={g.key} onPress={() => { setGoal(g.key); setStep(1); }} style={[st.goalCard, goal === g.key && { borderColor: g.color, borderWidth: 2 } ]}>
                <View style={[st.goalIcon, { backgroundColor: g.color + '18' } ]}><Icon name={g.icon} size={28} color={g.color} /></View>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                  <AppText variant="h5">{g.label}</AppText>
                  <AppText variant="bodyXS" color={colors.textTertiary}>{g.desc}</AppText>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Step 1: Body info */}
        {step === 1 && (
          <>
            <SectionHeader title="بيانات الجسم" />
            <SegmentedControl value={gender} onChange={setGender} options={[{ key: 'male', label: 'ذكر' }, { key: 'female', label: 'أنثى' }]} />
            <View style={st.row2}>
              <Input value={form.weight} onChangeText={v => set('weight', v)} placeholder="الوزن (كغ)" keyboardType="numeric" icon="weight" style={{ flex: 1 }} />
              <Input value={form.height} onChangeText={v => set('height', v)} placeholder="الطول (سم)" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }} />
            </View>
            <View style={st.row2}>
              <Input value={form.age} onChangeText={v => set('age', v)} placeholder="العمر" keyboardType="numeric" icon="calendar" style={{ flex: 1 }} />
              <Input value={form.targetWeight} onChangeText={v => set('targetWeight', v)} placeholder="الوزن المستهدف" keyboardType="numeric" icon="success" style={{ flex: 1 }} />
            </View>

            <SectionHeader title="مستوى النشاط" />
            <SegmentedControl value={activity} onChange={setActivity} options={[
              { key: 'low', label: 'منخفض' }, { key: 'moderate', label: 'متوسط' }, { key: 'high', label: 'عالي' },
            ]} />

            <Button label="التالي" variant="gradient" size="lg" onPress={() => setStep(2)} style={{ marginTop: 16 }} />
          </>
        )}

        {/* Step 2: Diet preferences */}
        {step === 2 && (
          <>
            <SectionHeader title="تفضيلات غذائية" />
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {DIETS.map(d => (
                <TouchableOpacity key={d} onPress={() => setDiet(d)} style={[st.dietChip, { backgroundColor: diet === d ? colors.primary : colors.surfaceSecondary, borderColor: diet === d ? colors.primary : colors.border } ]}>
                  <AppText variant="labelSM" color={diet === d ? '#fff' : colors.textPrimary}>{d}</AppText>
                </TouchableOpacity>
              ))}
            </View>

            <Input value={allergies} onChangeText={setAllergies} placeholder="حساسية أو أطعمة ممنوعة (اختياري)" icon="warning" />

            <Button label="إنشاء الخطة بالـ AI" variant="gradient" size="lg" icon="robot" loading={generating} onPress={generate} style={{ marginTop: 16 }}/>
          </>
        )}

        {/* Step 3: Generated plan */}
        {step === 3 && plan && (
          <>
            <Card style={{ backgroundColor: colors.successSurface }}>
              <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
                <Icon name="robot" size={24} color={colors.success} />
                <AppText variant="h5" color={colors.success}>خطتك جاهزة!</AppText>
              </View>
            </Card>

            {/* Macros summary */}
            <Card>
              <SectionHeader title="الهدف اليومي" />
              <View style={st.macrosRow}>
                {[
                  { label: 'سعرات', value: plan.calories, unit: 'kcal', color: '#F0A526' },
                  { label: 'بروتين', value: plan.protein, unit: 'g', color: '#F0695C' },
                  { label: 'كربوهيدرات', value: plan.carbs, unit: 'g', color: '#23B5CE' },
                  { label: 'دهون', value: plan.fat, unit: 'g', color: '#16A34A' },
                ].map((m, i) => (
                  <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                    <AppText variant="h4" color={m.color}>{m.value}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>{m.unit}</AppText>
                    <AppText variant="labelSM" color={colors.textSecondary}>{m.label}</AppText>
                  </View>
                ))}
              </View>
            </Card>

            {/* Meals */}
            {plan.meals.map((meal: any, i: number) => (
              <Card key={i}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <AppText variant="h6">{meal.time}</AppText>
                  <Badge label={`${meal.cal} kcal`} color={colors.accent} />
                </View>
                {meal.items.map((item: string, j: number) => (
                  <View key={j} style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center', paddingVertical: 4 }}>
                    <Icon name="check_circle" size={14} color={colors.success} />
                    <AppText variant="bodySM" color={colors.textSecondary}>{item}</AppText>
                  </View>
                ))}
              </Card>
            ))}

            <Button label="حفظ الخطة" variant="gradient" size="lg" icon="download" onPress={() => router.push('/nutrition/nutrition-plan')} />
            <Button label="إنشاء خطة تمارين مناسبة" variant="outline" icon="run" onPress={() => router.push('/nutrition/exercise-plan')} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hdrRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  goalCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  goalIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row2: { flexDirection: 'row-reverse', gap: 10 },
  dietChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  macrosRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8 },
});
