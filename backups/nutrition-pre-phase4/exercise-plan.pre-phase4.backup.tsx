// @ts-nocheck
// Exercise plan — REAL AI-generated weekly workout (POST /ai/generate-exercise-plan).
// EPIC4/S21: the previous version rendered a hardcoded gym plan for everyone
// (the home/outdoor toggle changed nothing). Now the plan is generated from
// the user's actual goal/level/location via the AI gateway.
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SegmentedControl } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const GOALS = [
  { key: 'لياقة عامة', label: 'لياقة عامة' },
  { key: 'خسارة وزن', label: 'خسارة وزن' },
  { key: 'بناء عضلات', label: 'بناء عضلات' },
  { key: 'تحسين التحمل', label: 'تحسين التحمل' },
];
const LEVELS = [
  { key: 'مبتدئ', label: 'مبتدئ' },
  { key: 'متوسط', label: 'متوسط' },
  { key: 'متقدم', label: 'متقدم' },
];
const DAYS = [2, 3, 4, 5];

export default function ExercisePlanScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [location, setLocation] = useState('gym');
  const [goal, setGoal] = useState('لياقة عامة');
  const [level, setLevel] = useState('مبتدئ');
  const [days, setDays] = useState(3);
  const [plan, setPlan] = useState<any[] | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/ai/generate-exercise-plan', {
        method: 'POST',
        body: JSON.stringify({ goal, level, days_per_week: days, location }),
      });
      const list = Array.isArray(res?.plan) ? res.plan : [];
      if (list.length === 0) {
        setError('تعذر توليد الخطة حالياً — حاول مرة أخرى');
        setPlan(null);
      } else {
        setPlan(list);
        setTips(Array.isArray(res?.tips) ? res.tips : []);
      }
    } catch (e) {
      console.error(e);
      setError('تعذر توليد الخطة حالياً — تحقق من الاتصال');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">خطة التمارين</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        <Card style={{ backgroundColor: colors.primarySurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
            <Icon name="robot" size={24} color={colors.primary} />
            <AppText variant="h6" color={colors.primary}>خطة مخصصة بالـ AI بناءً على أهدافك</AppText>
          </View>
        </Card>

        {/* Goal */}
        <View style={{ gap: 8 }}>
          <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'right' }}>هدفك</AppText>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {GOALS.map((g) => (
              <Badge
                key={g.key}
                label={g.label}
                color={goal === g.key ? colors.primary : colors.textTertiary}
                onPress={() => setGoal(g.key)}
              />
            ))}
          </View>
        </View>

        {/* Level */}
        <View style={{ gap: 8 }}>
          <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'right' }}>مستواك</AppText>
          <SegmentedControl value={level} onChange={setLevel} options={LEVELS.map((l) => ({ key: l.key, label: l.label }))} />
        </View>

        {/* Days per week */}
        <View style={{ gap: 8 }}>
          <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'right' }}>أيام التمرين أسبوعياً</AppText>
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            {DAYS.map((d) => (
              <Badge
                key={d}
                label={`${d} أيام`}
                color={days === d ? colors.primary : colors.textTertiary}
                onPress={() => setDays(d)}
              />
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={{ gap: 8 }}>
          <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'right' }}>مكان التمرين</AppText>
          <SegmentedControl value={location} onChange={setLocation} options={[
            { key: 'gym', label: 'الجيم', icon: 'run' },
            { key: 'home', label: 'البيت', icon: 'home' },
            { key: 'outdoor', label: 'خارجي', icon: 'walk' },
          ]} />
        </View>

        <Button
          label={plan ? 'إعادة توليد الخطة' : 'ولّد خطتي'}
          icon="robot"
          loading={loading}
          onPress={generate}
        />

        {loading && (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" color={colors.textTertiary}>جاري بناء خطة تناسبك…</AppText>
          </View>
        )}

        {!!error && (
          <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
            <Icon name="warning" size={28} color={colors.warning} />
            <AppText variant="bodySM" color={colors.textSecondary}>{error}</AppText>
          </Card>
        )}

        {Array.isArray(plan) && plan.map((day, i) => (
          <Card key={i}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="h5">{day.day}</AppText>
                <AppText variant="bodySM" color={colors.textTertiary}>{day.muscle}</AppText>
              </View>
              {!!day.duration && <Badge label={`${day.duration} دقيقة`} color={colors.secondary} icon="clock" />}
            </View>
            {(day.exercises || []).map((ex, j) => (
              <View key={j} style={{ flexDirection: 'row-reverse', gap: 8, paddingVertical: 5, alignItems: 'center' }}>
                <Icon name="check_circle" size={14} color={colors.success} />
                <AppText variant="bodySM" color={colors.textSecondary}>{ex}</AppText>
              </View>
            ))}
          </Card>
        ))}

        {tips.length > 0 && (
          <Card>
            <AppText variant="h6" style={{ marginBottom: 8 }}>نصائح المدرب</AppText>
            {tips.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row-reverse', gap: 8, paddingVertical: 4, alignItems: 'flex-start' }}>
                <Icon name="sparkles" size={14} color={colors.primary} style={{ marginTop: 2 }} />
                <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1, textAlign: 'right' }}>{t}</AppText>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
});
