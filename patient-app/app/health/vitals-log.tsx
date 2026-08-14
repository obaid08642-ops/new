// @ts-nocheck
// vitals-log.tsx — Add vitals reading with time + charts (day/week/month/year)
// BP, Sugar (random/cumulative/fasting/postprandial), weight, heart rate
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { apiFetch } from '../../src/utils/api';

type VitalType = 'bp' | 'sugar' | 'weight' | 'heart';
type SugarType = 'random' | 'cumulative' | 'fasting' | 'postprandial';
type Period = 'day' | 'week' | 'month' | 'year';

const VITAL_CONFIG: Record<VitalType, { label: string; icon: IconName; color: string; unit: string }> = {
  bp: { label: 'ضغط الدم', icon: 'pulse', color: '#23B5CE', unit: 'mmHg' },
  sugar: { label: 'السكر', icon: 'bloodtype', color: '#7A6BEA', unit: 'mg/dL' },
  weight: { label: 'الوزن', icon: 'weight', color: '#16A34A', unit: 'كغ' },
  heart: { label: 'ضربات القلب', icon: 'monitor_heart', color: '#F0695C', unit: 'نبضة/دقيقة' },
};

const SUGAR_TYPES: { key: SugarType; label: string }[] = [
  { key: 'random', label: 'عشوائي' },
  { key: 'fasting', label: 'صائم' },
  { key: 'postprandial', label: 'بعد الأكل' },
  { key: 'cumulative', label: 'تراكمي HbA1c' },
];

// Chart data fetched dynamically

export default function VitalsLogScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest, requireAuth } = useGuestGuard();
  if (isGuest) { requireAuth(); return null; }
  const { colors, isDark } = useApp();
  const [vital, setVital] = useState<VitalType>('bp');
  const [period, setPeriod] = useState<Period>('week');
  const [sugarType, setSugarType] = useState<SugarType>('random');
  const [showAdd, setShowAdd] = useState(false);
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [saving, setSaving] = useState(false);

  const [chartData, setChartData] = useState<Record<Period, number[]>>({ day: [], week: [], month: [], year: [] });
  const [recentReadings, setRecentReadings] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const [cRes, rRes] = await Promise.all([
          apiFetch(`/health/vitals/chart?vital=${vital}`).catch(() => null),
          apiFetch(`/health/vitals/recent?vital=${vital}`).catch(() => null),
        ]);
        if (cRes) setChartData(cRes);
        if (rRes) setRecentReadings(Array.isArray(rRes) ? rRes : rRes?.data || []);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [vital]);

  const config = VITAL_CONFIG[vital];
  const data = chartData[period] || [];
  const maxVal = data.length ? Math.max(...data) : 0;
  const minVal = data.length ? Math.min(...data) : 0;
  const avg = data.length ? Math.round(data.reduce((a, b) => a + b, 0) / data.length) : 0;
  const screenW = Dimensions.get('window').width - 64;

  const handleSave = async () => {
    if (!value1) return;
    setSaving(true);
    try {
      const payload: any = {
        type: vital,
        time_of_day: timeOfDay,
        recorded_at: new Date().toISOString(),
      };
      if (vital === 'bp') {
        payload.systolic = parseFloat(value1);
        payload.diastolic = parseFloat(value2);
      } else if (vital === 'sugar') {
        payload.value = parseFloat(value1);
        payload.sugar_type = sugarType;
      } else if (vital === 'weight') {
        payload.value = parseFloat(value1);
      } else if (vital === 'heart') {
        payload.value = parseFloat(value1);
      }
      await apiFetch('/health/vitals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowAdd(false);
      setValue1('');
      setValue2('');
      setErrorMessage(null);
      // Fetch updated readings here if necessary
    } catch (e: any) {
      setErrorMessage(e.message || 'فشل حفظ القراءة. تحقق من الاتصال.');
    } finally {
      setSaving(false);
    }
  };

  const periodLabels: Record<Period, string> = { day: 'اليوم', week: 'الأسبوع', month: 'الشهر', year: 'السنة' };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => setShowAdd(true)} />
          <AppText variant="h3" color={colors.textPrimary}>سجل القراءات</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {/* Vital type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse', gap: 8 }}>
          {(Object.keys(VITAL_CONFIG) as VitalType[]).map(k => {
            const v = VITAL_CONFIG[k];
            const active = vital === k;
            return (
              <TouchableOpacity key={k} onPress={() => setVital(k)} style={[st.vitalChip, { backgroundColor: active ? v.color : colors.surfaceSecondary, borderColor: active ? v.color : colors.border } ]}>
                <Icon name={v.icon} size={18} color={active ? '#fff' : v.color} />
                <AppText variant="labelSM" color={active ? '#fff' : colors.textPrimary}>{v.label}</AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sugar type if sugar selected */}
        {vital === 'sugar' && (
          <SegmentedControl value={sugarType} onChange={v => setSugarType(v as SugarType)} options={SUGAR_TYPES.map(s => ({ key: s.key, label: s.label }))} />
        )}

        {/* Summary */}
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row-reverse', gap: 20 }}>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="caption" color={colors.textTertiary}>المتوسط</AppText>
              <AppText variant="h3" color={config.color}>{avg}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>{config.unit}</AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="caption" color={colors.textTertiary}>أعلى</AppText>
              <AppText variant="h4" color={colors.error}>{maxVal}</AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="caption" color={colors.textTertiary}>أدنى</AppText>
              <AppText variant="h4" color={colors.success}>{minVal}</AppText>
            </View>
          </View>
          <Badge label={avg < 130 ? 'طبيعي' : 'مرتفع'} color={avg < 130 ? colors.success : colors.warning} />
        </Card>

        {/* Period tabs */}
        <SegmentedControl value={period} onChange={v => setPeriod(v as Period)} options={[
          { key: 'day', label: 'يوم' }, { key: 'week', label: 'أسبوع' },
          { key: 'month', label: 'شهر' }, { key: 'year', label: 'سنة' },
        ]} />

        {/* Chart visualization */}
        <Card>
          <SectionHeader title={`${config.label} — آخر ${periodLabels[period]}`} />
          <View style={st.chart}>
            {data.map((val, i) => {
              const h = ((val - minVal + 5) / (maxVal - minVal + 10)) * 120;
              const barW = Math.max(4, (screenW / data.length) - 3);
              return (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <AppText variant="caption" color={colors.textTertiary} style={{ fontSize: 8 }}>{val}</AppText>
                  <View style={[st.bar, { height: h, width: barW, backgroundColor: val > 130 ? colors.error + '80' : config.color + '60', borderRadius: barW / 2 }]} />
                </View>
              );
            })}
          </View>
        </Card>

        {/* Recent readings */}
        <SectionHeader title="آخر القراءات" />
        {recentReadings.map((r, i) => (
          <Card key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
            <View style={[st.readingIcon, { backgroundColor: config.color + '18' } ]}>
              <Icon name={config.icon} size={20} color={config.color} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
              <AppText variant="h5" color={config.color}>{r.val} {config.unit}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>{r.time}</AppText>
            </View>
            <Badge label={r.status} color={r.statusColor} />
          </Card>
        ))}

        {/* Links */}
        <Card onPress={() => router.push('/health/conditions-allergies')} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <View style={[st.readingIcon, { backgroundColor: colors.warningSurface } ]}><Icon name="warning" size={20} color={colors.warning} /></View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <AppText variant="h6">الأمراض والحساسية</AppText>
            <AppText variant="caption" color={colors.textTertiary}>أضف أمراضك المزمنة وحساسيتك</AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
      </ScrollView>

      {/* Add reading modal */}
      {showAdd && (
        <View style={[st.overlay, { backgroundColor: colors.overlay } ]}>
          <View style={[st.sheet, { backgroundColor: colors.surface } ]}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="h4">إضافة قراءة</AppText>
              <IconButton icon="close" onPress={() => setShowAdd(false)} />
            </View>

            <AppText variant="labelMD" color={colors.textTertiary} style={{ marginTop: 12 }}>{config.label}</AppText>
            
            {errorMessage && (
              <View style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 }}>
                <Text style={{ color: '#EF4444', textAlign: 'right' }}>{errorMessage}</Text>
              </View>
            )}

            {vital === 'bp' ? (
              <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 8 }}>
                <Input value={value1} onChangeText={setValue1} placeholder="الانقباضي" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }}/>
                <AppText variant="h3" color={colors.textTertiary} style={{ alignSelf: 'center' }}>/</AppText>
                <Input value={value2} onChangeText={setValue2} placeholder="الانبساطي" keyboardType="numeric" icon="trendingDown" style={{ flex: 1 }}/>
              </View>
            ) : (
              <Input value={value1} onChangeText={setValue1} placeholder={`القراءة (${config.unit})`} keyboardType="numeric" icon={config.icon} style={{ marginTop: 8 }}/>
            )}

            {vital === 'sugar' && (
              <SegmentedControl value={sugarType} onChange={v => setSugarType(v as SugarType)} options={SUGAR_TYPES.map(s => ({ key: s.key, label: s.label }))} />
            )}

            <SegmentedControl value={timeOfDay} onChange={setTimeOfDay} options={[
              { key: 'morning', label: 'صباحاً', icon: 'sun' },
              { key: 'afternoon', label: 'ظهراً', icon: 'clock' },
              { key: 'evening', label: 'مساءً', icon: 'moon' },
            ]} />

            <Button label="حفظ القراءة" variant="gradient" size="lg" icon="check_circle" loading={saving} onPress={handleSave} style={{ marginTop: 16 }}/>
          </View>
        </View>
      )}
    </View>

  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  vitalChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150, marginTop: 10 },
  bar: { minHeight: 8 },
  readingIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12 },
});
