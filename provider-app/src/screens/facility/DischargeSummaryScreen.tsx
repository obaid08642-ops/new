import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NScroll, NBtn, NBadge } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function DischargeSummaryScreen({ onBack, admission }: { onBack: () => void; admission?: any }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
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
      show(tt('dis.864d4a14'), 'warning');
      return;
    }
    if (!diagnosis.trim()) {
      show(tt('dis.9c86db5f'), 'warning');
      return;
    }
    setSaving(true);
    try {
      await client.put(`/facility/beds/discharge/${selected.id}`, {
        diagnosis: diagnosis.trim(),
        medications: medications.trim(),
        instructions: instructions.trim(),
      });
      show(tt('dis.0fbef45b'), 'success');
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (tt('dis.53cd4a5b')), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('dis.ae28f4b8')} onBack={onBack} />

      <NScroll>
        <View style={{ padding: SP.xl }}>
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
          ) : !selected ? (
            <>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                {tt('dis.65e66637')}
              </Text>
              {admissions.length === 0 ? (
                <NCard style={{ padding: SP.lg, alignItems: 'center' }}>
                  <Text style={{ color: theme.textSub, textAlign: 'center' }}>
                    {tt('dis.98dd02ad')}
                  </Text>
                </NCard>
              ) : admissions.map((a: any) => (
                <TouchableOpacity key={a.id} onPress={() => setSelected(a)}>
                  <NCard style={{ marginBottom: SP.sm }}>
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                          {a.patient_name || (tt('dis.c8b7f288'))}
                        </Text>
                        <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>
                          {tt('dis.8ce7d640')}{a.admitted_at ? new Date(a.admitted_at).toISOString().slice(0, 10) : ''}
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
                  <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('dis.98a9ddda')}</Text>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                    {selected.patient_name || (tt('dis.c8b7f288'))}
                  </Text>
                </View>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('dis.b1e3870c')}</Text>
                  <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{selected.id}</Text>
                </View>
              </NCard>

              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {tt('dis.59fdfe4a')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
                  color: theme.text, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
                  marginBottom: SP.lg
                }}
                placeholder={tt('dis.c91031ed')}
                placeholderTextColor={theme.textSub}
                multiline
                value={diagnosis}
                onChangeText={setDiagnosis}
              />

              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {tt('dis.0c467415')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
                  color: theme.text, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
                  marginBottom: SP.lg
                }}
                placeholder={tt('dis.e70aea6c')}
                placeholderTextColor={theme.textSub}
                multiline
                value={medications}
                onChangeText={setMedications}
              />

              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {tt('dis.a8b942eb')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
                  color: theme.text, height: 100, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
                  marginBottom: SP.xl
                }}
                placeholder={tt('dis.8e955181')}
                placeholderTextColor={theme.textSub}
                multiline
                value={instructions}
                onChangeText={setInstructions}
              />

              <NBtn
                label={saving ? (tt('dis.fd6801f2')) : (tt('dis.cd255151'))}
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
