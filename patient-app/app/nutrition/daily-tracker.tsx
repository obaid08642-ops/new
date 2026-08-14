// @ts-nocheck
// app/nutrition/daily-tracker.tsx — Connected to /nutrition/daily-summary, /nutrition/meals, /nutrition/water
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

interface DailySummary {
  total_calories: number;
  total_water_ml: number;
  total_exercise_minutes: number;
  target_calories: number;
  target_water_ml: number;
  meals: { name: string; calories: number; meal_type: string; logged_at: string }[];
  water_logs: { amount_ml: number; logged_at: string }[];
}

export default function DailyTrackerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiFetch<DailySummary>(`/nutrition/daily-summary?date=${today}`);
      setSummary(data);
    } catch (e: any) {
      // Fallback: show empty state
      setSummary({ total_calories: 0, total_water_ml: 0, total_exercise_minutes: 0, target_calories: 2000, target_water_ml: 2000, meals: [], water_logs: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const onRefresh = () => { setRefreshing(true); loadSummary(); };

  const addWater = async (amount_ml: number) => {
    try {
      await apiFetch('/nutrition/water', { method: 'POST', body: JSON.stringify({ amount_ml }) });
      loadSummary();
    } catch { Alert.alert('خطأ', 'تعذر تسجيل الماء'); }
  };

  const totalCal = summary?.total_calories ?? 0;
  const targetCal = summary?.target_calories ?? 2000;
  const totalWaterMl = summary?.total_water_ml ?? 0;
  const targetWaterMl = summary?.target_water_ml ?? 2000;
  const waterGlasses = Math.round(totalWaterMl / 250);
  const targetGlasses = Math.round(targetWaterMl / 250);

  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
  const MEAL_LABELS: Record<string, string> = { breakfast: 'الفطور', lunch: 'الغداء', dinner: 'العشاء' };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">التتبع اليومي</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Calories Progress Ring */}
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <AppText variant="caption" color={colors.textTertiary}>السعرات اليوم</AppText>
          <View style={[st.ring, { borderColor: totalCal > targetCal ? colors.error : colors.success } ]}>
            <AppText variant="h2" color={totalCal > targetCal ? colors.error : colors.success}>{totalCal}</AppText>
            <AppText variant="caption" color={colors.textTertiary}>/ {targetCal}</AppText>
          </View>
          {loading ? (
            <AppText variant="bodySM" color={colors.textTertiary}>جاري التحميل...</AppText>
          ) : (
            <AppText variant="bodySM" color={colors.textSecondary}>
              {totalCal >= targetCal ? 'وصلت هدفك!' : `باقي ${targetCal - totalCal} سعرة`}
            </AppText>
          )}
        </Card>

        {/* Meals */}
        <SectionHeader title="الوجبات" />
        {MEAL_TYPES.map((type) => {
          const meal = summary?.meals.find(m => m.meal_type === type);
          return (
            <Card
              key={type}
              onPress={() => !meal ? router.push({ pathname: '/nutrition/log-meal', params: { meal_type: type } } as any) : 'transparent'}
              style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}
            >
              <View style={[st.mealIcon, { backgroundColor: meal ? colors.successSurface : colors.surfaceSecondary } ]}>
                <Icon name={meal ? 'check-circle' : 'add'} size={22} color={meal ? colors.success : colors.textTertiary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                <AppText variant="h6">{MEAL_LABELS[type]}</AppText>
                {meal ? (
                  <AppText variant="caption" color={colors.textTertiary}>{meal.name}</AppText>
                ) : (
                  <AppText variant="caption" color={colors.primary}>اضغط لتسجيل الوجبة</AppText>
                )}
              </View>
              {meal && <Badge label={`${meal.calories} kcal`} color={colors.accent} />}
            </Card>
          );
        })}

        {/* Water Tracker */}
        <Card>
          <SectionHeader title="الماء" />
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: Math.max(targetGlasses, 8) }).map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => addWater(250)}>
                    <Icon name="water" size={28} color={i < waterGlasses ? '#10B981' : colors.border} />
                  </TouchableOpacity>
                ))}
              </View>
              <AppText variant="bodySM" color={colors.textTertiary} style={{ marginTop: 6 }}>
                {waterGlasses}/{targetGlasses} أكواب ({totalWaterMl} مل)
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10 }}>
            {[{ label: 'كوب (250)', ml: 250 }, { label: 'قنينة (500)', ml: 500 }].map(s => (
              <TouchableOpacity key={s.ml} onPress={() => addWater(s.ml)}
                style={{ flex: 1, backgroundColor: colors.primarySurface, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <AppText variant="bodySM" color={colors.primary}>+ {s.label}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Exercise */}
        <Card onPress={() => router.push('/nutrition/exercise-plan')} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <View style={[st.mealIcon, { backgroundColor: colors.primarySurface } ]}>
            <Icon name="run" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <AppText variant="h6">التمارين</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              {summary?.total_exercise_minutes ? `${summary.total_exercise_minutes} دقيقة اليوم` : 'لم تسجّل تمرين اليوم'}
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>

        <Button label="تحليل وجبة بالـ AI" variant="outline" icon="robot" onPress={() => router.push('/nutrition/calorie-analyzer')} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  ring: { width: 110, height: 110, borderRadius: 55, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  mealIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
