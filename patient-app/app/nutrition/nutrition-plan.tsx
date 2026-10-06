import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, Card, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { nutritionT } from '../../src/i18n/nutrition';
import { ScreenState } from '../../src/components/ScreenStates';

type PlanDay = { day?: number | string; meals?: string[] };
type Plan = { id: string; source: string; created_at: string; days: PlanDay[]; notice?: string; book_nutritionist?: { specialty: string } };

/**
 * R12.nutrition-plan: the patient's AI nutrition plan. The plan is generated from the
 * patient's own nutrition profile by the backend AI gateway, saved, and shown here —
 * never invented on the device. A nutritionist follow-up is always one tap away.
 */
export default function NutritionPlanScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: any, vars?: any) => nutritionT(lang, key, vars);
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/nutrition/plan');
      setPlan(res?.data || res || null);
    } catch (e) {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  React.useEffect(() => {
    load();
  }, [load]);

  const generate = React.useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await apiFetch('/nutrition/plan/generate', { method: 'POST', body: '{}' });
      setPlan(res?.data || res || null);
    } catch (e) {
      setError(t('planError'));
    } finally {
      setGenerating(false);
    }
  }, [generating, lang]);

  const days: PlanDay[] = Array.isArray(plan?.days) ? plan.days : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.primary }]}>
        <IconButton icon="back" bg="rgba(255,255,255,0.16)" color="#fff" onPress={() => router.back()} />
        <View style={styles.titleWrap}>
          <AppText variant="h3" color="#fff">{t('planTitle')}</AppText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText>
        </View>
      ) : (
        <ScreenState loading={false} error={error} empty={false} emptyTitle={t('planEmpty')} onRetry={load}>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
            {days.length === 0 ? (
              <Card style={styles.empty}>
                <Icon name="food" size={40} color={colors.primary} />
                <AppText variant="h6" align="center">{t('planEmpty')}</AppText>
              </Card>
            ) : (
              <>
                {days.map((d, i) => (
                  <Animated.View key={String(d?.day ?? i)} entering={FadeInDown.delay(i * 60).duration(320)}>
                    <Card style={styles.dayCard}>
                      <View style={styles.planDayRow}>
                        <AppText variant="h6">{t('planDay')} {String(d?.day ?? '')}</AppText>
                      </View>
                      {Array.isArray(d?.meals) && d.meals.length > 0 ? (
                        <View style={styles.meals}>
                          {d.meals.map((m, j) => (
                            <AppText key={j} variant="bodySM" style={styles.mealText}>
                              {String(m)}
                            </AppText>
                          ))}
                        </View>
                      ) : null}
                    </Card>
                  </Animated.View>
                ))}
                {plan?.notice ? (
                  <AppText variant="caption" color={colors.textTertiary} style={styles.notice}>
                    {plan.notice}
                  </AppText>
                ) : null}
              </>
            )}

            <View style={styles.actions}>
              <Button
                label={t('planGenerate')}
                loading={generating}
                onPress={generate}
                icon="sparkles"
              />
              <Button
                label={t('planNutritionist')}
                variant="outline"
                onPress={() => router.push('/search?view=doctors&specialty=nutrition')}
                icon="stethoscope"
              />
            </View>
          </ScrollView>
        </ScreenState>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  titleWrap: { flex: 1, alignItems: 'center' },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { alignItems: 'center', gap: 12, padding: 28 },
  dayCard: { gap: 10, borderWidth: 1 },
  planDayRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  meals: { gap: 6 },
  mealText: { color: '#3F5A52', lineHeight: 22 },
  notice: { lineHeight: 20, textAlign: 'center' },
  actions: { gap: 10, marginTop: 6 },
});
