import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button, IconButton, Input } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type ProfileItem = { id: string; name?: string; label?: string; description?: string; [key: string]: any };
type Profile = { chronic_diseases?: ProfileItem[]; allergies?: ProfileItem[] };
const itemText = (item: ProfileItem) => item.name || item.label || item.description || 'عنصر غير مسمى';

export default function ConditionsAllergiesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [profile, setProfile] = React.useState<Profile>({});
  const [condition, setCondition] = React.useState('');
  const [allergy, setAllergy] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const response: any = await apiFetch('/medical-profile'); const doc = response?.data || response || {}; setProfile({ chronic_diseases: Array.isArray(doc.chronic_diseases) ? doc.chronic_diseases : [], allergies: Array.isArray(doc.allergies) ? doc.allergies : [] }); }
    catch { setError('تعذر تحميل الملف الطبي.'); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const add = async (list: 'chronic-diseases' | 'allergies', value: string) => {
    const name = value.trim(); if (!name) { setError('اكتب الاسم قبل الإضافة.'); return; }
    setAction(`add-${list}`); setError(null);
    try { await apiFetch(`/medical-profile/${list}`, { method: 'POST', body: JSON.stringify({ name }) }); list === 'allergies' ? setAllergy('') : setCondition(''); await load(); }
    catch { setError('تعذر حفظ العنصر في الملف الطبي.'); }
    finally { setAction(null); }
  };
  const remove = async (list: 'chronic-diseases' | 'allergies', id: string) => {
    setAction(`delete-${id}`); setError(null);
    try { await apiFetch(`/medical-profile/${list}/${id}`, { method: 'DELETE' }); await load(); }
    catch { setError('تعذر حذف العنصر من الملف الطبي.'); }
    finally { setAction(null); }
  };

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">الأمراض والحساسية</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل الملف الطبي…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <Card style={[styles.notice, { backgroundColor: colors.warningSurface }]}><AppText variant="caption" color={colors.textSecondary} align="right">تُحفظ العناصر التي تدخلها في ملفك الطبي. لا تعتبر هذه الشاشة تشخيصاً ولا بديلاً عن الرعاية المهنية.</AppText></Card>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}
      <ItemSection title="الأمراض المزمنة" value={condition} onChange={setCondition} placeholder="أدخل اسماً كما ورد في سجلك" items={profile.chronic_diseases || []} addLabel="إضافة مرض" adding={action === 'add-chronic-diseases'} onAdd={() => add('chronic-diseases', condition)} onRemove={(id) => remove('chronic-diseases', id)} action={action} colors={colors} />
      <ItemSection title="الحساسية" value={allergy} onChange={setAllergy} placeholder="أدخل الحساسية المعروفة" items={profile.allergies || []} addLabel="إضافة حساسية" adding={action === 'add-allergies'} onAdd={() => add('allergies', allergy)} onRemove={(id) => remove('allergies', id)} action={action} colors={colors} />
    </ScrollView>}
  </View>;
}

function ItemSection({ title, value, onChange, placeholder, items, addLabel, adding, onAdd, onRemove, action, colors }: { title: string; value: string; onChange: (value: string) => void; placeholder: string; items: ProfileItem[]; addLabel: string; adding: boolean; onAdd: () => void; onRemove: (id: string) => void; action: string | null; colors: any }) {
  return <Card style={styles.section}><AppText variant="h6" align="right">{title}</AppText><Input value={value} onChangeText={onChange} placeholder={placeholder} /><Button label={addLabel} variant="outline" size="sm" full={false} loading={adding} onPress={onAdd} />{items.length === 0 ? <AppText variant="caption" color={colors.textTertiary} align="right">لا توجد عناصر مسجلة.</AppText> : items.map((item) => <View key={item.id} style={[styles.item, { borderTopColor: colors.borderLight }]}><AppText variant="bodySM" style={{ flex: 1, textAlign: 'right' }}>{itemText(item)}</AppText><Button label="حذف" variant="ghost" size="sm" full={false} loading={action === `delete-${item.id}`} onPress={() => onRemove(item.id)} /></View>)}</Card>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, notice: { alignItems: 'flex-end' }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, section: { gap: 10, alignItems: 'flex-end' }, item: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, width: '100%', paddingTop: 10, borderTopWidth: 1 } });
