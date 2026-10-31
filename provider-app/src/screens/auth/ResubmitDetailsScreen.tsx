import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NBtn, NInput, NHeader } from '../../components/ui';
import { SP, FS } from '../../constants';
import client from '../../api/client';
import { DETAIL_FIELDS, changedDetails, detailProblems, detailsFromProfile, type DetailField, type Details } from '../../utils/resubmitDetails';

const LABELS: Record<DetailField, [string, string]> = {
  name_ar: ['الاسم بالعربية', 'Name (Arabic)'],
  name_en: ['الاسم بالإنجليزية', 'Name (English)'],
  license_number: ['رقم الترخيص', 'Licence number'],
  license_expiry_date: ['تاريخ انتهاء الترخيص (YYYY-MM-DD)', 'Licence expiry date (YYYY-MM-DD)'],
  iban: ['رقم الآيبان', 'IBAN'],
  bank_account_name: ['اسم صاحب الحساب البنكي', 'Bank account holder'],
  city: ['المدينة', 'City'],
};

/** Correct the registration details a reviewer pointed at, then go back to the status screen to resubmit. Saves through POST /provider-onboarding/step2. */
export function ResubmitDetailsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [initial, setInitial] = useState<Details | null>(null);
  const [edited, setEdited] = useState<Details | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bad, setBad] = useState<DetailField[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoadFailed(false);
    client.get('/provider-onboarding/progress').then((res) => {
      const d = detailsFromProfile(res?.data?.data || res?.data);
      setInitial(d); setEdited(d);
    }).catch(() => setLoadFailed(true));
  };
  useEffect(load, []);

  const save = async () => {
    if (!initial || !edited) return;
    const changed = changedDetails(initial, edited);
    if (!Object.keys(changed).length) { show(AR ? 'لم تغيّر أي بيانات' : 'You have not changed anything', 'info'); return; }
    const problems = detailProblems(changed);
    setBad(problems);
    if (problems.length) { show(AR ? 'راجع الحقول المحددة' : 'Check the highlighted fields', 'error'); return; }
    setSaving(true);
    try {
      await client.post('/provider-onboarding/step2', changed);
      show(AR ? 'حُفظت البيانات، يمكنك الآن إعادة الإرسال' : 'Saved. You can resubmit now', 'success');
      onBack();
    } catch (e) {
      const m = (e as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message;
      show(typeof m === 'string' && m ? m : (AR ? 'تعذر حفظ البيانات' : 'Could not save the details'), 'error');
    } finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تصحيح بيانات الطلب' : 'Fix your details'} onBack={onBack} />
      {loadFailed ? (
        <View style={{ padding: SP.xl, gap: SP.md }}>
          <Text style={{ color: theme.text, fontSize: FS.md, textAlign: AR ? 'right' : 'left' }}>{AR ? 'تعذر تحميل بياناتك' : 'Could not load your details'}</Text>
          <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} onPress={load} />
        </View>
      ) : !edited ? (
        <View style={{ padding: SP.xl }}><ActivityIndicator color={theme.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }} keyboardShouldPersistTaps="handled">
          {DETAIL_FIELDS.map((f) => (
            <NInput key={f} label={LABELS[f][AR ? 0 : 1]} value={edited[f]} onChange={(v) => { setEdited({ ...edited, [f]: v }); if (bad.includes(f)) setBad(bad.filter((x) => x !== f)); }}
              caps={f === 'iban' ? 'characters' : 'none'} kbType={f === 'license_expiry_date' ? 'numbers-and-punctuation' : undefined}
              error={bad.includes(f) ? (AR ? 'قيمة غير صحيحة' : 'Not valid') : undefined} />
          ))}
          <NBtn label={AR ? 'حفظ' : 'Save'} loading={saving} onPress={save} />
        </ScrollView>
      )}
    </View>
  );
}

export default ResubmitDetailsScreen;
