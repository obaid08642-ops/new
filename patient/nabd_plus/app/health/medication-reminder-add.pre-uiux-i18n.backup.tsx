import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button, IconButton, Input, SegmentedControl } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const TIME_OPTIONS = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];
const currentZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

type ExistingReminder = { id: string; medicine_name_ar?: string; dose?: string; dosage_count?: number; times?: string[]; frequency?: string; duration_days?: number; chronic?: boolean; instructions_ar?: string; pills_remaining?: number; refill_date?: string | null; time_zone?: string };

export default function MedicationReminderAddScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === 'string' && id.length > 0;
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [name, setName] = React.useState('');
  const [dose, setDose] = React.useState('قرص واحد');
  const [count, setCount] = React.useState('1');
  const [times, setTimes] = React.useState<string[]>(['08:00']);
  const [frequency, setFrequency] = React.useState('daily');
  const [duration, setDuration] = React.useState('30');
  const [chronic, setChronic] = React.useState(false);
  const [pillsRemaining, setPillsRemaining] = React.useState('0');
  const [refillDate, setRefillDate] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [timeZone, setTimeZone] = React.useState(currentZone());
  const [loading, setLoading] = React.useState(editing);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!editing) return;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const response: any = await apiFetch('/health/reminders');
        const rows: ExistingReminder[] = Array.isArray(response) ? response : response?.data || [];
        const item = rows.find((row) => row.id === id);
        if (!item) throw new Error('not_found');
        setName(item.medicine_name_ar || ''); setDose(item.dose || ''); setCount(String(item.dosage_count ?? 1));
        setTimes(item.times?.length ? item.times : ['08:00']); setFrequency(item.frequency || 'daily');
        setDuration(String(item.duration_days ?? 0)); setChronic(Boolean(item.chronic)); setInstructions(item.instructions_ar || '');
        setPillsRemaining(String(item.pills_remaining ?? 0)); setRefillDate(item.refill_date ? String(item.refill_date).slice(0, 10) : ''); setTimeZone(item.time_zone || currentZone());
      } catch { setError('تعذر تحميل التذكير المراد تعديله.'); }
      finally { setLoading(false); }
    };
    load();
  }, [editing, id]);

  const toggleTime = (time: string) => setTimes((current) => current.includes(time) ? current.filter((item) => item !== time) : [...current, time].sort());
  const save = async () => {
    const dosage_count = Number(count);
    const duration_days = chronic ? 0 : Number(duration);
    const pills_remaining = Number(pillsRemaining || 0);
    if (!name.trim() || !dose.trim() || times.length === 0) { setError('أدخل اسم الدواء والجرعة واختر موعداً واحداً على الأقل.'); return; }
    if (!Number.isFinite(dosage_count) || dosage_count <= 0 || !Number.isInteger(duration_days) || duration_days < 0 || !Number.isInteger(pills_remaining) || pills_remaining < 0) { setError('تحقق من عدد الوحدات والمدة والمخزون قبل الحفظ.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = { medicine_name_ar: name.trim(), dose: dose.trim(), dosage_count, times, time_zone: timeZone.trim(), frequency, duration_days, chronic, pills_remaining, refill_date: refillDate.trim() || undefined, instructions_ar: instructions.trim() || undefined };
      await apiFetch(editing ? `/health/reminders/${id}` : '/health/reminders', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      router.replace('/health/medication-reminder-list');
    } catch { setError('تعذر حفظ التذكير. لم يتم تغيير موعد أو جرعة.'); }
    finally { setSaving(false); }
  };

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">{editing ? 'تعديل تذكير الدواء' : 'إضافة تذكير دواء'}</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل التذكير…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText></Card>}
      <Card style={styles.section}><AppText variant="h6" align="right">الدواء والجرعة</AppText><Input value={name} onChangeText={setName} placeholder="اسم الدواء كما هو موصوف لك" /><Input value={dose} onChangeText={setDose} placeholder="مثال: قرص واحد بعد الطعام" /><Input value={count} onChangeText={setCount} placeholder="عدد الوحدات لكل جرعة" keyboardType="numeric" /><AppText variant="caption" color={colors.textTertiary} align="right">لا يغير التطبيق جرعتك. اتبع الوصفة أو تعليمات مقدم الرعاية.</AppText></Card>
      <Card style={styles.section}><AppText variant="h6" align="right">المواعيد</AppText><View style={styles.times}>{TIME_OPTIONS.map((time) => { const selected = times.includes(time); return <TouchableOpacity key={time} onPress={() => toggleTime(time)} style={[styles.time, { backgroundColor: selected ? colors.primary : colors.surfaceSecondary, borderColor: selected ? colors.primary : colors.border }]}><AppText variant="labelSM" color={selected ? '#fff' : colors.textPrimary}>{time}</AppText></TouchableOpacity>; })}</View><Input value={timeZone} onChangeText={setTimeZone} placeholder="المنطقة الزمنية، مثال: Asia/Riyadh" /><AppText variant="caption" color={colors.textTertiary} align="right">تُحفظ المنطقة الزمنية لتسجيل الجرعة في اليوم الصحيح. لا يثبت ذلك وصول إشعار على جهازك.</AppText></Card>
      <Card style={styles.section}><AppText variant="h6" align="right">التكرار والمدة</AppText><SegmentedControl value={frequency} onChange={setFrequency} options={[{ key: 'daily', label: 'يومياً' }, { key: 'weekly', label: 'أسبوعياً' }, { key: 'as_needed', label: 'عند الحاجة' }]} /><SegmentedControl value={chronic ? 'chronic' : 'limited'} onChange={(value) => setChronic(value === 'chronic')} options={[{ key: 'limited', label: 'مدة محددة' }, { key: 'chronic', label: 'دواء مزمن' }]} />{!chronic && <Input value={duration} onChangeText={setDuration} placeholder="المدة بالأيام" keyboardType="numeric" />}</Card>
      {chronic && <Card style={styles.section}><AppText variant="h6" align="right">متابعة إعادة التعبئة</AppText><Input value={pillsRemaining} onChangeText={setPillsRemaining} placeholder="عدد الوحدات المتبقية (اختياري)" keyboardType="numeric" /><Input value={refillDate} onChangeText={setRefillDate} placeholder="تاريخ المتابعة YYYY-MM-DD (اختياري)" /><AppText variant="caption" color={colors.textTertiary} align="right">إعادة التعبئة تتطلب مراجعة الطلب والعنوان؛ لا ينشئ التطبيق طلباً أو يعدل الوصفة تلقائياً.</AppText></Card>}
      <Card style={styles.section}><AppText variant="h6" align="right">تعليمات إضافية</AppText><Input value={instructions} onChangeText={setInstructions} placeholder="ملاحظات من الوصفة (اختياري)" multiline /></Card>
      <Button label={editing ? 'حفظ التعديلات' : 'حفظ التذكير'} variant="gradient" icon="check_circle" loading={saving} onPress={save} />
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, section: { gap: 12 }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end' }, times: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }, time: { minWidth: 70, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 } });
