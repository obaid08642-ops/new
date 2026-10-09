import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Input, Segmented } from '../../../../packages/ui-native/src';
import { Gate } from '../consult/ConsultKit';
import { HealthTabs, MetricGrid, MetricTile, Notice, Panel, Pill, Row, bodyOf, rowsOf, useRemote, useTab } from '../health/HealthKit';
import { useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { CareBar, ltr, CareHero, CareScreen, FormCard, PrimaryAction, localDateKey, numberOrUndefined, LIME_TONE } from './CareKit';

/**
 * Nutrition (board CareHub, merge map section 5): one hub with the tabs Today (calories, macros, water, meals) and Target
 * (the profile form) in `?tab=`, and the log-meal form. GET /nutrition/daily-summary?date, GET /nutrition/meals?date,
 * POST /nutrition/water, GET/POST /nutrition/profile, POST /nutrition/meals. The Plan tab waits for an endpoint
 * (GET /nutrition/plan does not exist) and is not drawn.
 */

export const NUTRITION_HUB = '/nutrition/hub' as Href;
export const NUTRITION_LOG_MEAL = '/nutrition/log-meal' as Href;

const TABS = ['today', 'target'] as const;
type Tab = (typeof TABS)[number];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

interface Meal {
  id?: string;
  _id?: string;
  name: string;
  calories: number;
  meal_type: MealType;
  protein_g?: number;
  logged_at?: string;
}
interface Summary {
  calories: { consumed: number; target: number | null };
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  water: { consumed_ml: number; target_ml: number | null };
  meals_count: number;
}
interface Profile {
  goal?: string;
  activity_level?: string;
  height_cm?: number;
  weight_kg?: number;
  target_weight_kg?: number;
  daily_calorie_target?: number;
  daily_water_target_ml?: number;
  dietary_restrictions?: string[];
  allergies?: string[];
  bmi?: number | null;
}

const MEAL_ICON = { breakfast: 'bowl-food', lunch: 'bowl-food', dinner: 'bowl-food', snack: 'bowl-food' } as const;
const GOALS = ['weight_loss', 'maintain', 'muscle_gain', 'healthy_lifestyle'] as const;
const ACTIVITIES = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;

export function NutritionHubView() {
  const { k } = useScreenUi();
  const [tab, setTab] = useTab<Tab>(TABS, 'today');
  return (
    <CareScreen title={k('care.nut.title')} testID="nutrition-hub">
      <HealthTabs testID="nutrition-tabs" tabs={[{ key: 'today', label: k('care.nut.tabToday') }, { key: 'target', label: k('care.nut.tabTarget') }]} value={tab} onChange={setTab} />
      {tab === 'today' ? <TodayTab onSetTarget={() => setTab('target')} /> : <TargetTab onSaved={() => setTab('today')} />}
    </CareScreen>
  );
}

function TodayTab({ onSetTarget }: { onSetTarget: () => void }) {
  const { k, theme, num } = useScreenUi();
  const date = localDateKey();
  const remote = useRemote(
    async () => {
      const [summary, meals] = await Promise.all([apiFetch(`/nutrition/daily-summary?date=${date}`), apiFetch(`/nutrition/meals?date=${date}`)]);
      return { summary: bodyOf<Summary>(summary), meals: rowsOf<Meal>(meals) };
    },
    [date],
    'nutrition:today',
  );
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = remote.data?.summary;
  const meals = remote.data?.meals ?? [];

  const addWater = async (amount: number) => {
    setBusy(amount);
    setError(null);
    try {
      await apiFetch('/nutrition/water', { method: 'POST', body: JSON.stringify({ amount_ml: amount }) });
      await remote.reload(true);
    } catch (e) {
      logError('nutrition:water', e);
      setError(k('care.nut.saveError'));
    } finally {
      setBusy(null);
    }
  };

  const target = summary?.calories?.target ?? null;
  const consumed = summary?.calories?.consumed ?? 0;
  const waterTarget = summary?.water?.target_ml ?? null;
  const waterNow = summary?.water?.consumed_ml ?? 0;

  return (
    <Gate status={remote.status} onRetry={() => void remote.reload()}>
      {summary ? (
        <>
          <CareHero
            testID="nutrition-summary"
            tone={LIME_TONE}
            ring={{ value: target ? consumed / target : 0, label: k('care.nut.calories'), valueText: target ? `${num(Math.min(100, Math.round((consumed / target) * 100)))}%` : '—', caption: k('care.nut.calories') }}
            title={k('care.nut.summary')}
            lines={target ? [ltr(`${num(consumed)} / ${num(target)} kcal`), `${k('care.nut.remaining')}: ${num(Math.max(0, target - consumed))}`] : [`${ltr(`${num(consumed)} kcal`)} ${k('care.nut.consumed')}`, k('care.nut.noTarget')]}
          >
            {!target ? <Button label={k('care.nut.setup')} size="md" variant="outline" onPress={onSetTarget} theme={theme} testID="nutrition-set-target" /> : null}
          </CareHero>
          <MetricGrid>
            <MetricTile label={k('care.nut.protein')} value={num(summary.macros?.protein_g ?? 0)} unit="g" icon="heart" tone="mint" />
            <MetricTile label={k('care.nut.carbs')} value={num(summary.macros?.carbs_g ?? 0)} unit="g" icon="bowl-food" tone="amber" />
            <MetricTile label={k('care.nut.fat')} value={num(summary.macros?.fat_g ?? 0)} unit="g" icon="drop" tone="violet" />
          </MetricGrid>
          <FormCard title={k('care.nut.waterLog')}>
            <CareBar value={waterTarget ? waterNow / waterTarget : 0} tone="blue" label={k('care.nut.waterLog')} />
            <Pill tone="info" label={waterTarget ? ltr(`${num(waterNow)} / ${num(waterTarget)} ml`) : k('care.nut.waterProgress', { value: num(waterNow) })} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button label={k('care.nut.addMl', { amount: num(250) })} size="md" variant="outline" fullWidth loading={busy === 250} disabled={busy !== null} onPress={() => void addWater(250)} theme={theme} testID="nutrition-water-250" />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={k('care.nut.addMl', { amount: num(500) })} size="md" fullWidth loading={busy === 500} disabled={busy !== null} onPress={() => void addWater(500)} theme={theme} testID="nutrition-water-500" />
              </View>
            </View>
            {error ? <Notice tone="danger" text={error} /> : null}
          </FormCard>
          <FormCard title={k('care.nut.mealHistory')}>
            {meals.length === 0 ? (
              <Notice tone="info" text={k('care.nut.noMeals')} />
            ) : (
              <Panel>
                {meals.map((meal, i) => (
                  <Row
                    key={meal.id ?? meal._id ?? `${meal.name}-${meal.logged_at}`}
                    icon={MEAL_ICON[meal.meal_type] ?? 'bowl-food'}
                    tone={LIME_TONE}
                    title={meal.name}
                    subtitle={`${ltr(`${num(meal.calories)} kcal`)}${meal.protein_g ? ` · ${ltr(`${num(meal.protein_g)} g`)} ${k('care.nut.protein')}` : ''}`}
                    trailing={<Pill tone="neutral" label={k(`care.nut.${meal.meal_type}`)} />}
                    last={i === meals.length - 1}
                  />
                ))}
              </Panel>
            )}
          </FormCard>
          <PrimaryAction label={k('care.nut.logMeal')} onPress={() => router.push(NUTRITION_LOG_MEAL)} testID="nutrition-log-meal" />
          <Notice tone="info" text={k('care.nut.nutritionSafety')} />
        </>
      ) : (
        <Notice tone="info" text={k('care.nut.noData')} />
      )}
    </Gate>
  );
}

const snakeToCopy = (value: string) => (value === 'healthy_lifestyle' ? 'healthy' : value.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()));

function TargetTab({ onSaved }: { onSaved: () => void }) {
  const { k, theme } = useScreenUi();
  const remote = useRemote(async () => bodyOf<Profile>(await apiFetch('/nutrition/profile')), [], 'nutrition:profile');
  const [goal, setGoal] = useState('healthy_lifestyle');
  const [activity, setActivity] = useState('moderate');
  const [field, setField] = useState({ height: '', weight: '', targetWeight: '', calories: '', water: '', restrictions: '', allergies: '' });
  const [bmi, setBmi] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof field) => (value: string) => setField((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const p = remote.data;
    if (!p) return;
    const text = (v: number | null | undefined) => (v == null ? '' : String(v));
    setGoal(p.goal || 'healthy_lifestyle');
    setActivity(p.activity_level || 'moderate');
    setField({ height: text(p.height_cm), weight: text(p.weight_kg), targetWeight: text(p.target_weight_kg), calories: text(p.daily_calorie_target), water: text(p.daily_water_target_ml), restrictions: (p.dietary_restrictions || []).join(', '), allergies: (p.allergies || []).join(', ') });
    setBmi(p.bmi ?? null);
  }, [remote.data]);

  const list = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
  const finite = (value: string) => value.trim() !== '' && Number.isFinite(Number(value));

  const save = async () => {
    if (![field.height, field.weight, field.targetWeight, field.calories, field.water].every(finite)) {
      setError(k('care.nut.formRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = { goal, activity_level: activity, height_cm: Number(field.height), weight_kg: Number(field.weight), target_weight_kg: Number(field.targetWeight), daily_calorie_target: Number(field.calories), daily_water_target_ml: Number(field.water), dietary_restrictions: list(field.restrictions), allergies: list(field.allergies) };
      const saved = bodyOf<Profile>(await apiFetch('/nutrition/profile', { method: 'POST', body: JSON.stringify(body) }));
      setBmi(saved.bmi ?? null);
      onSaved();
    } catch (e) {
      logError('nutrition:profile-save', e);
      setError(k('care.nut.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Gate status={remote.status} onRetry={() => void remote.reload()}>
      <FormCard step={1} title={k('care.nut.goal')}>
        <Segmented label={k('care.nut.goal')} value={goal} onChange={setGoal} options={GOALS.map((v) => ({ value: v, label: k(`care.nut.${snakeToCopy(v)}`) }))} theme={theme} />
        <Segmented label={k('care.nut.activity')} value={activity} onChange={setActivity} options={ACTIVITIES.map((v) => ({ value: v, label: k(`care.nut.${snakeToCopy(v)}`) }))} theme={theme} />
      </FormCard>
      <FormCard step={2} title={k('care.nut.bodyGoals')}>
        <Input label={k('care.nut.height')} value={field.height} onChange={set('height')} keyboardType="decimal" theme={theme} testID="nutrition-height" />
        <Input label={k('care.nut.weight')} value={field.weight} onChange={set('weight')} keyboardType="decimal" theme={theme} testID="nutrition-weight" />
        <Input label={k('care.nut.targetWeight')} value={field.targetWeight} onChange={set('targetWeight')} keyboardType="decimal" theme={theme} testID="nutrition-target-weight" />
        {bmi != null ? <Pill tone="neutral" label={`BMI ${bmi}`} /> : null}
      </FormCard>
      <FormCard step={3} title={k('care.nut.summary')}>
        <Input label={k('care.nut.calorieTarget')} value={field.calories} onChange={set('calories')} keyboardType="number" theme={theme} testID="nutrition-calories" />
        <Input label={k('care.nut.waterTarget')} value={field.water} onChange={set('water')} keyboardType="number" theme={theme} testID="nutrition-water" />
      </FormCard>
      <FormCard step={4} title={k('care.nut.dietaryRestrictions')}>
        <Input label={k('care.nut.dietaryRestrictions')} value={field.restrictions} onChange={set('restrictions')} theme={theme} testID="nutrition-restrictions" />
        <Input label={k('care.nut.allergies')} value={field.allergies} onChange={set('allergies')} theme={theme} testID="nutrition-allergies" />
      </FormCard>
      <Notice tone="info" text={k('care.nut.setupHint')} />
      {error ? <Notice tone="danger" text={error} testID="nutrition-error" /> : null}
      <PrimaryAction label={saving ? k('care.nut.saving') : k('care.nut.save')} loading={saving} onPress={() => void save()} testID="nutrition-save" />
    </Gate>
  );
}

export function LogMealView({ initialType }: { initialType?: string }) {
  const { k, theme } = useScreenUi();
  const [mealType, setMealType] = useState<MealType>(MEAL_TYPES.includes(initialType as MealType) ? (initialType as MealType) : 'snack');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [macro, setMacro] = useState({ protein: '', carbs: '', fat: '', fiber: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof macro) => (value: string) => setMacro((m) => ({ ...m, [key]: value }));

  const save = async () => {
    const kcal = numberOrUndefined(calories);
    const optional = [macro.protein, macro.carbs, macro.fat, macro.fiber].map(numberOrUndefined);
    if (!name.trim() || kcal === undefined) {
      setError(k('care.nut.mealRequired'));
      return;
    }
    if (!Number.isFinite(kcal) || kcal < 0 || optional.some((v) => v !== undefined && (!Number.isFinite(v) || v < 0))) {
      setError(k('care.nut.formInvalid'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const [protein_g, carbs_g, fat_g, fiber_g] = optional;
      await apiFetch('/nutrition/meals', { method: 'POST', body: JSON.stringify({ name: name.trim(), calories: kcal, meal_type: mealType, ...(protein_g !== undefined ? { protein_g } : {}), ...(carbs_g !== undefined ? { carbs_g } : {}), ...(fat_g !== undefined ? { fat_g } : {}), ...(fiber_g !== undefined ? { fiber_g } : {}) }) });
      router.replace(NUTRITION_HUB);
    } catch (e) {
      logError('nutrition:log-meal', e);
      setError(k('care.nut.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CareScreen title={k('care.nut.logMeal')} testID="log-meal" footer={<PrimaryAction label={saving ? k('care.nut.saving') : k('care.nut.saveMeal')} loading={saving} onPress={() => void save()} testID="log-meal-save" />}>
      <FormCard step={1} title={k('care.nut.mealType')}>
        <Segmented label={k('care.nut.mealType')} value={mealType} onChange={(v) => setMealType(v as MealType)} options={MEAL_TYPES.map((v) => ({ value: v, label: k(`care.nut.${v}`) }))} theme={theme} />
      </FormCard>
      <FormCard step={2} title={k('care.nut.logMeal')}>
        <Input label={k('care.nut.mealName')} value={name} onChange={setName} hint={k('care.nut.mealNameHint')} theme={theme} testID="log-meal-name" />
        <Input label={k('care.nut.caloriesInput')} value={calories} onChange={setCalories} keyboardType="decimal" theme={theme} testID="log-meal-calories" />
      </FormCard>
      <FormCard step={3} title={k('care.nut.summary')}>
        <Input label={k('care.nut.proteinInput')} value={macro.protein} onChange={set('protein')} keyboardType="decimal" theme={theme} />
        <Input label={k('care.nut.carbsInput')} value={macro.carbs} onChange={set('carbs')} keyboardType="decimal" theme={theme} />
        <Input label={k('care.nut.fatInput')} value={macro.fat} onChange={set('fat')} keyboardType="decimal" theme={theme} />
        <Input label={k('care.nut.fiberInput')} value={macro.fiber} onChange={set('fiber')} keyboardType="decimal" theme={theme} />
      </FormCard>
      <Notice tone="info" text={k('care.nut.nutritionSafety')} />
      {error ? <Notice tone="danger" text={error} testID="log-meal-error" /> : null}
    </CareScreen>
  );
}
