import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Button, Card, IconButton, Input, SegmentedControl } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { nutritionT } from '../../src/i18n/nutrition';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function LogMealScreen() {
  const { meal_type } = useLocalSearchParams<{ meal_type?: MealType }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: any, vars?: any) => nutritionT(lang, key, vars);
  const [mealType, setMealType] = React.useState<MealType>(mealTypes.includes(meal_type as MealType) ? meal_type as MealType : 'snack');
  const [name, setName] = React.useState(''); const [calories, setCalories] = React.useState(''); const [protein, setProtein] = React.useState(''); const [carbs, setCarbs] = React.useState(''); const [fat, setFat] = React.useState(''); const [fiber, setFiber] = React.useState('');
  const [saving, setSaving] = React.useState(false); const [error, setError] = React.useState<string | null>(null);

  const numericPayload = (value: string) => value.trim() === '' ? undefined : Number(value);
  const save = async () => {
    const numericCalories = numericPayload(calories);
    const optional = [protein, carbs, fat, fiber].map(numericPayload);
    if (!name.trim() || numericCalories === undefined) { setError(t('formRequired')); return; }
    if (!Number.isFinite(numericCalories) || numericCalories < 0 || optional.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) { setError(t('formInvalid')); return; }
    setSaving(true); setError(null);
    try {
      await apiFetch('/nutrition/meals', { method: 'POST', body: JSON.stringify({ name: name.trim(), calories: numericCalories, meal_type: mealType, ...(optional[0] !== undefined ? { protein_g: optional[0] } : {}), ...(optional[1] !== undefined ? { carbs_g: optional[1] } : {}), ...(optional[2] !== undefined ? { fat_g: optional[2] } : {}), ...(optional[3] !== undefined ? { fiber_g: optional[3] } : {}) }) });
      router.replace('/nutrition/daily-tracker');
    } catch { setError(t('saveError')); } finally { setSaving(false); }
  };

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><View style={styles.titleWrap}><AppText variant="h3">{t('logMeal')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('nutritionSafety')}</AppText></View><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText></Card>}
      <Animated.View entering={FadeInDown.duration(300)}><Card style={styles.section}><SectionHeading value="1" title={t('mealType')} colors={colors} /><SegmentedControl value={mealType} onChange={(value) => setMealType(value as MealType)} options={mealTypes.map((type) => ({ key: type, label: t(type) }))} /></Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(75).duration(300)}><Card style={styles.section}><SectionHeading value="2" title={t('logMeal')} colors={colors} /><Input value={name} onChangeText={setName} placeholder={t('mealName')} /><Input value={calories} onChangeText={setCalories} placeholder={t('caloriesInput')} keyboardType="decimal-pad" /><AppText variant="caption" color={colors.textTertiary} align="right">{t('mealNameHint')}</AppText></Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(150).duration(300)}><Card style={styles.section}><SectionHeading value="3" title={t('summary')} colors={colors} /><Input value={protein} onChangeText={setProtein} placeholder={t('proteinInput')} keyboardType="decimal-pad" /><Input value={carbs} onChangeText={setCarbs} placeholder={t('carbsInput')} keyboardType="decimal-pad" /><Input value={fat} onChangeText={setFat} placeholder={t('fatInput')} keyboardType="decimal-pad" /><Input value={fiber} onChangeText={setFiber} placeholder={t('fiberInput')} keyboardType="decimal-pad" /></Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(220).duration(300)}><Card style={[styles.notice, { backgroundColor: colors.infoSurface, borderColor: colors.info + '40' }]}><AppText variant="bodySM" color={colors.textSecondary} align="right">{t('nutritionSafety')}</AppText></Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(280).duration(300)}><Button label={saving ? t('saving') : t('saveMeal')} variant="gradient" icon="check_circle" loading={saving} onPress={save} /></Animated.View>
    </ScrollView>
  </View>;
}

function SectionHeading({ value, title, colors }: { value: string; title: string; colors: any }) { return <View style={styles.sectionHeading}><View style={[styles.step, { backgroundColor: colors.primary }]}><AppText variant="labelSM" color="#fff">{value}</AppText></View><AppText variant="h6">{title}</AppText></View>; }
const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }, titleWrap: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 8 }, content: { padding: 16, gap: 14 }, section: { gap: 12 }, sectionHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }, step: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end' }, notice: { borderWidth: 1, alignItems: 'flex-end' } });
