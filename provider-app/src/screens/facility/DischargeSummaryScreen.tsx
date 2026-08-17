import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NScroll, NBtn, NBadge } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function DischargeSummaryScreen({ onBack, admission }: { onBack: () => void; admission?: any }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [admissions, setAdmissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(admission || null);
  const [loading, setLoading] = useState(!admission);
  const [saving, setSaving] = useState(false);

  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (admission) return;
    client.get('/facility/beds/admissions')
      .then(res => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setAdmissions(rows.filter((r: any) => r.status === 'active'));
      })
      .catch(() => setAdmissions([]))
      .finally(() => setLoading(false));
  }, [admission]);

  const handleSave = async () => {
    if (!selected?.id) {
      show(AR ? 'اختر المريض أولاً' : 'Select a patient first', 'warning');
      return;
    }
    if (!diagnosis.trim()) {
      show(AR ? 'اكتب التشخيص النهائي' : 'Enter the final diagnosis', 'warning');
      return;
    }
    setSaving(true);
    try {
      await client.put(`/facility/beds/discharge/${selected.id}`, {
        diagnosis: diagnosis.trim(),
        medications: medications.trim(),
        instructions: instructions.trim(),
      });
      show(AR ? 'تم حفظ ملخص الخروج وإخراج المريض' : 'Discharge summary saved and patient discharged', 'success');
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر حفظ ملخص الخروج' : 'Could not save discharge summary'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'ملخص الخروج (Discharge)' : 'Discharge Summary'} onBack={onBack} />

      <NScroll>
        <View style={{ padding: SP.xl }}>
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
          ) : !selected ? (
            <>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'اختر المريض المقيم:' : 'Select admitted patient:'}
              </Text>
              {admissions.length === 0 ? (
                <NCard style={{ padding: SP.lg, alignItems: 'center' }}>
                  <Text style={{ color: theme.textSub, textAlign: 'center' }}>
                    {AR ? 'لا يوجد مرضى مقيمون حالياً' : 'No patients currently admitted'}
                  </Text>
                </NCard>
              ) : admissions.map((a: any) => (
                <TouchableOpacity key={a.id} onPress={() => setSelected(a)}>
                  <NCard style={{ marginBottom: SP.sm }}>
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                          {a.patient_name || (AR ? 'مريض' : 'Patient')}
                        </Text>
                        <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>
                          {AR ? 'دخول: ' : 'Admitted: '}{a.admitted_at ? new Date(a.admitted_at).toISOString().slice(0, 10) : ''}
                        </Text>
                      </View>
                      <NBadge label={a.status} variant="warning" size="xs" />
                    </View>
                  </NCard>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <NCard style={{ marginBottom: SP.xl }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'المريض:' : 'Patient:'}</Text>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                    {selected.patient_name || (AR ? 'مريض' : 'Patient')}
                  </Text>
                </View>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'رقم الإقامة:' : 'Admission:'}</Text>
                  <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{selected.id}</Text>
                </View>
              </NCard>

              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'التشخيص النهائي' : 'Final Diagnosis'}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
                  color: theme.text, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
                  marginBottom: SP.lg
                }}
                placeholder={AR ? 'اكتب التشخيص...' : 'Enter diagnosis...'}
                placeholderTextColor={theme.textSub}
                multiline
                value={diagnosis}
                onChangeText={setDiagnosis}
              />

              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'الأدوية الموصوفة' : 'Prescribed Medications'}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
                  color: theme.text, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
                  marginBottom: SP.lg
                }}
                placeholder={AR ? 'أدخل الأدوية...' : 'Enter medications...'}
                placeholderTextColor={theme.textSub}
                multiline
                value={medications}
                onChangeText={setMedications}
              />

              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'تعليمات ما بعد الخروج' : 'Post-Discharge Instructions'}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
                  color: theme.text, height: 100, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
                  marginBottom: SP.xl
                }}
                placeholder={AR ? 'تعليمات الراحة والمراجعة...' : 'Rest and follow-up instructions...'}
                placeholderTextColor={theme.textSub}
                multiline
                value={instructions}
                onChangeText={setInstructions}
              />

              <NBtn
                label={saving ? (AR ? 'جاري الحفظ...' : 'Saving...') : (AR ? 'حفظ ملخص الخروج' : 'Save Discharge Summary')}
                onPress={handleSave}
                disabled={saving}
              />
            </>
          )}
        </View>
      </NScroll>
    </View>
  );
}
