// @ts-nocheck
// medication-reminder-add.tsx — Add medication reminder
// pills/day, times, duration (days/weeks/months/permanent), chronic flag
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';

const FREQ_OPTIONS = [
  { key: 'daily', label: 'يومياً' },
  { key: 'weekly', label: 'أسبوعياً' },
  { key: 'monthly', label: 'شهرياً' },
];

const DURATION_OPTIONS = [
  { key: '7', label: '7 أيام' },
  { key: '14', label: '14 يوم' },
  { key: '30', label: 'شهر' },
  { key: '90', label: '3 أشهر' },
  { key: 'permanent', label: 'دائم (مزمن)' },
];

const TIME_PRESETS = ['06:00 ص', '08:00 ص', '12:00 م', '02:00 م', '06:00 م', '08:00 م', '10:00 م'];

export default function MedicationReminderAddScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest, requireAuth } = useGuestGuard();
  if (isGuest) { requireAuth(); return null; }
  const { colors, isDark } = useApp();
  const [name, setName] = useState('');
  const [pillsPerDose, setPillsPerDose] = useState('1');
  const [timesPerDay, setTimesPerDay] = useState('2');
  const [freq, setFreq] = useState('daily');
  const [duration, setDuration] = useState('30');
  const [isChronic, setIsChronic] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['08:00 ص', '08:00 م']);
  const [notes, setNotes] = useState('');
  const [beforeFood, setBeforeFood] = useState(true);
  const [reorderReminder, setReorderReminder] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleTime = (t: string) => {
    setSelectedTimes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    setSaving(true);
    // In production: save to AsyncStorage/API + schedule expo-notifications
    setTimeout(() => {
      setSaving(false);
      router.back();
    }, 800);
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 44 }}/>
          <AppText variant="h3" color={colors.textPrimary}>إضافة تذكير دواء</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Drug name */}
        <Card>
          <SectionHeader title="اسم الدواء" />
          <Input value={name} onChangeText={setName} placeholder="مثال: بنادول إكسترا 500mg" icon="medication" />
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10 }}>
            <Button label="البحث في الصيدلية" variant="ghost" icon="search" size="sm" full={false} onPress={() => router.push('/(tabs)/pharmacy')} />
            <Button label="من وصفة طبية" variant="ghost" icon="prescriptions" size="sm" full={false} onPress={() => router.push('/health/prescriptions')} />
          </View>
        </Card>

        {/* Dosage */}
        <Card>
          <SectionHeader title="الجرعة" />
          <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="labelSM" color={colors.textTertiary} style={{ marginBottom: 6 }}>عدد الحبات لكل جرعة</AppText>
              <View style={[st.stepper, { borderColor: colors.border } ]}>
                <TouchableOpacity onPress={() => setPillsPerDose(String(Math.max(0.5, parseFloat(pillsPerDose) - 0.5)))} style={[st.stepBtn, { backgroundColor: colors.surfaceSecondary } ]}>
                  <Icon name="remove" size={18} color={colors.primary} />
                </TouchableOpacity>
                <AppText variant="h4">{pillsPerDose}</AppText>
                <TouchableOpacity onPress={() => setPillsPerDose(String(parseFloat(pillsPerDose) + 0.5))} style={[st.stepBtn, { backgroundColor: colors.primary } ]}>
                  <Icon name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="labelSM" color={colors.textTertiary} style={{ marginBottom: 6 }}>عدد المرات يومياً</AppText>
              <View style={[st.stepper, { borderColor: colors.border } ]}>
                <TouchableOpacity onPress={() => setTimesPerDay(String(Math.max(1, parseInt(timesPerDay) - 1)))} style={[st.stepBtn, { backgroundColor: colors.surfaceSecondary } ]}>
                  <Icon name="remove" size={18} color={colors.primary} />
                </TouchableOpacity>
                <AppText variant="h4">{timesPerDay}</AppText>
                <TouchableOpacity onPress={() => setTimesPerDay(String(parseInt(timesPerDay) + 1))} style={[st.stepBtn, { backgroundColor: colors.primary } ]}>
                  <Icon name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>

        {/* Timing */}
        <Card>
          <SectionHeader title="مواعيد الجرعات" />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {TIME_PRESETS.map(t => {
              const active = selectedTimes.includes(t);
              return (
                <TouchableOpacity key={t} onPress={() => toggleTime(t)} style={[st.timeChip, { backgroundColor: active ? colors.primary : colors.surfaceSecondary, borderColor: active ? colors.primary : colors.border } ]}>
                  <Icon name="clock" size={14} color={active ? '#fff' : colors.textTertiary} />
                  <AppText variant="labelSM" color={active ? '#fff' : colors.textPrimary}>{t}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Before/after food */}
        <Card>
          <SectionHeader title="تعليمات" />
          <SegmentedControl value={beforeFood ? 'before' : 'after'} onChange={v => setBeforeFood(v === 'before')} options={[
            { key: 'before', label: 'قبل الأكل', icon: 'clock' },
            { key: 'after', label: 'بعد الأكل', icon: 'food' },
            { key: 'any', label: 'أي وقت', icon: 'check' },
          ]} />
        </Card>

        {/* Frequency */}
        <Card>
          <SectionHeader title="التكرار" />
          <SegmentedControl value={freq} onChange={setFreq} options={FREQ_OPTIONS.map(o => ({ key: o.key, label: o.label }))} />
        </Card>

        {/* Duration */}
        <Card>
          <SectionHeader title="المدة" />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {DURATION_OPTIONS.map(d => {
              const active = duration === d.key || (isChronic && d.key === 'permanent');
              return (
                <TouchableOpacity key={d.key} onPress={() => { setDuration(d.key); setIsChronic(d.key === 'permanent'); }} style={[st.durChip, { backgroundColor: active ? colors.primary : colors.surfaceSecondary, borderColor: active ? colors.primary : colors.border } ]}>
                  <AppText variant="labelSM" color={active ? '#fff' : colors.textPrimary}>{d.label}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Chronic medication options */}
        {isChronic && (
          <Card style={{ backgroundColor: colors.warningSurface }}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="h6">تذكير إعادة الطلب</AppText>
                <AppText variant="bodyXS" color={colors.textTertiary}>تذكير قبل نفاد الدواء لإعادة طلبه من الصيدلية</AppText>
              </View>
              <Switch value={reorderReminder} onValueChange={setReorderReminder} trackColor={{ false: colors.border, true: colors.warning }} />
            </View>
            {reorderReminder && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}>
                  <Icon name="bell" size={16} color={colors.warning} />
                  <AppText variant="bodySM" color={colors.textSecondary}>سنذكّرك قبل 5 أيام من نفاد الدواء</AppText>
                </View>
                <View style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}>
                  <Icon name="shopping_cart" size={16} color={colors.warning} />
                  <AppText variant="bodySM" color={colors.textSecondary}>زر "طلب" يوجهك مباشرة للصيدلية</AppText>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Notes */}
        <Input value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية (اختياري)" icon="edit" multiline />
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <Button label="حفظ التذكير" variant="gradient" size="lg" icon="bell" loading={saving} onPress={handleSave} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  stepper: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 14, padding: 4 },
  stepBtn: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  timeChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  durChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
