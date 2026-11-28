import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NSecHeader, NScroll, NBadge, NInput, NEmpty } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

const TYPES = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'or', ar: 'غرف العمليات', en: 'ORs' },
  { id: 'consultation', ar: 'العيادات', en: 'Clinics' },
  { id: 'other', ar: 'المعدات والأجهزة', en: 'Equipment' },
];

export function FacilityResourcesScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [addType, setAddType] = useState('consultation');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await client.get('/facility/resources');
      setResources(Array.isArray(res.data) ? res.data : []);
    } catch { setResources([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async () => {
    if (!nameAr.trim() && !nameEn.trim()) {
      show(tt('fres.84b832e7'), 'error');
      return;
    }
    setSaving(true);
    try {
      await client.post('/facility/resources', { name_ar: nameAr.trim(), name_en: nameEn.trim(), type: addType });
      show(tt('fres.b35dd6e4'), 'success');
      setNameAr(''); setNameEn(''); setShowAdd(false);
      fetchAll();
    } catch (err: any) {
      show(err?.response?.data?.message || (tt('fres.dc20ab21')), 'error');
    } finally { setSaving(false); }
  };

  const toggleStatus = async (res: any) => {
    const next = res.status === 'active' ? 'maintenance' : 'active';
    setBusyId(res.id);
    try {
      await client.put(`/facility/resources/${res.id}`, { status: next });
      fetchAll();
    } catch (err: any) {
      show(err?.response?.data?.message || (tt('fres.f95c9521')), 'error');
    } finally { setBusyId(null); }
  };

  const filtered = filterType === 'all' ? resources : resources.filter(r => r.type === filterType);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('fres.3cfef923')} onBack={onBack} />

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: SP.md, gap: SP.sm, backgroundColor: theme.surface }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TYPES.map(f => (
            <TouchableOpacity key={f.id} onPress={() => setFilterType(f.id)}
              style={{
                paddingHorizontal: SP.md, paddingVertical: 6, borderRadius: R.full, marginRight: SP.sm,
                backgroundColor: filterType === f.id ? theme.primary : theme.surface2,
              }}>
              <Text style={{ fontSize: FS.xs, color: filterType === f.id ? '#FFF' : theme.text }}>
                {AR ? f.ar : f.en}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <NScroll>
        <View style={{ padding: SP.xl }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.lg }}>
            <NSecHeader title={tt('fres.94af421c')} />
            <TouchableOpacity style={{ padding: SP.xs }} onPress={() => setShowAdd(v => !v)}>
              <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{showAdd ? (tt('fres.210b779f')) : (tt('fres.2564f298'))}</Text>
            </TouchableOpacity>
          </View>

          {showAdd && (
            <NCard style={{ marginBottom: SP.lg }}>
              <NInput label={tt('fres.f459eb09')} placeholder={tt('fres.4e11e219')} value={nameAr} onChange={setNameAr} />
              <NInput label={tt('fres.7a61d176')} placeholder={tt('phx.05c78d6c')} value={nameEn} onChange={setNameEn} />
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.md }}>
                {TYPES.filter(t => t.id !== 'all').map(t => (
                  <TouchableOpacity key={t.id} onPress={() => setAddType(t.id)}
                    style={{ paddingHorizontal: SP.md, paddingVertical: 6, borderRadius: R.full, backgroundColor: addType === t.id ? theme.primary : theme.surface2 }}>
                    <Text style={{ fontSize: FS.xs, color: addType === t.id ? '#FFF' : theme.text }}>{AR ? t.ar : t.en}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <NBtn label={tt('fres.42aedd79')} loading={saving} onPress={handleAdd} />
            </NCard>
          )}

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />
          ) : filtered.length === 0 ? (
            <NEmpty title={tt('fres.a195ac89')} subtitle={tt('fres.17b668d0')} />
          ) : filtered.map(res => (
            <NCard key={res.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? res.name_ar : res.name_en}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                    {tt(res.type === 'or' ? 'facilityResources.typeOr' : res.type === 'consultation' ? 'facilityResources.typeConsultation' : 'facilityResources.typeEquipment')}
                  </Text>
                </View>
                <NBadge
                  label={res.status === 'active' ? (tt('fres.03886b8f')) : (tt('fres.0a85597b'))}
                  variant={res.status === 'active' ? 'success' : 'warning'}
                />
              </View>

              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
                <TouchableOpacity disabled={busyId === res.id} onPress={() => toggleStatus(res)}>
                  <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>
                    {res.status === 'active' ? (tt('fres.2a9b3a92')) : (tt('fres.86577b01'))}
                  </Text>
                </TouchableOpacity>
              </View>
            </NCard>
          ))}
        </View>
      </NScroll>
    </View>
  );
}

