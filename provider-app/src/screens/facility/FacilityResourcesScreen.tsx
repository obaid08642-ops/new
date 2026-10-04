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
  const { lang } = useLang();
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
      show(AR ? 'أدخل اسم المورد' : 'Enter resource name', 'error');
      return;
    }
    setSaving(true);
    try {
      await client.post('/facility/resources', { name_ar: nameAr.trim(), name_en: nameEn.trim(), type: addType });
      show(AR ? 'تمت إضافة المورد' : 'Resource added', 'success');
      setNameAr(''); setNameEn(''); setShowAdd(false);
      fetchAll();
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'فشل إضافة المورد' : 'Failed to add resource'), 'error');
    } finally { setSaving(false); }
  };

  const toggleStatus = async (res: any) => {
    const next = res.status === 'active' ? 'maintenance' : 'active';
    setBusyId(res.id);
    try {
      await client.put(`/facility/resources/${res.id}`, { status: next });
      fetchAll();
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'فشل تحديث الحالة' : 'Status update failed'), 'error');
    } finally { setBusyId(null); }
  };

  const filtered = filterType === 'all' ? resources : resources.filter(r => r.type === filterType);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة الموارد' : 'Resource Management'} onBack={onBack} />

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
            <NSecHeader title={AR ? 'الموارد المسجلة' : 'Registered Resources'} />
            <TouchableOpacity style={{ padding: SP.xs }} onPress={() => setShowAdd(v => !v)}>
              <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{showAdd ? (AR ? 'إلغاء' : 'Cancel') : (AR ? '+ إضافة مورد' : '+ Add Resource')}</Text>
            </TouchableOpacity>
          </View>

          {showAdd && (
            <NCard style={{ marginBottom: SP.lg }}>
              <NInput label={AR ? 'الاسم بالعربية' : 'Arabic name'} placeholder={AR ? 'مثال: غرفة عمليات ب' : 'e.g. OR B'} value={nameAr} onChange={setNameAr} />
              <NInput label={AR ? 'الاسم بالإنجليزية' : 'English name'} placeholder="e.g. Operating Room B" value={nameEn} onChange={setNameEn} />
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.md }}>
                {TYPES.filter(t => t.id !== 'all').map(t => (
                  <TouchableOpacity key={t.id} onPress={() => setAddType(t.id)}
                    style={{ paddingHorizontal: SP.md, paddingVertical: 6, borderRadius: R.full, backgroundColor: addType === t.id ? theme.primary : theme.surface2 }}>
                    <Text style={{ fontSize: FS.xs, color: addType === t.id ? '#FFF' : theme.text }}>{AR ? t.ar : t.en}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <NBtn label={AR ? 'حفظ المورد' : 'Save Resource'} loading={saving} onPress={handleAdd} />
            </NCard>
          )}

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />
          ) : filtered.length === 0 ? (
            <NEmpty title={AR ? 'لا توجد موارد مسجلة' : 'No resources registered'} subtitle={AR ? 'أضف غرف العمليات والعيادات والأجهزة لإدارتها' : 'Add ORs, clinics and equipment to manage them'} />
          ) : filtered.map(res => (
            <NCard key={res.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? res.name_ar : res.name_en}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                    {AR
                      ? (res.type === 'or' ? 'غرفة عمليات' : res.type === 'consultation' ? 'عيادة' : 'معدات')
                      : (res.type === 'or' ? 'Operating Room' : res.type === 'consultation' ? 'Clinic' : 'Equipment')}
                  </Text>
                </View>
                <NBadge
                  label={res.status === 'active' ? (AR ? 'نشط' : 'Active') : (AR ? 'صيانة' : 'Maintenance')}
                  variant={res.status === 'active' ? 'success' : 'warning'}
                />
              </View>

              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
                <TouchableOpacity disabled={busyId === res.id} onPress={() => toggleStatus(res)}>
                  <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>
                    {res.status === 'active' ? (AR ? 'تحويل للصيانة' : 'Set Maintenance') : (AR ? 'إعادة التفعيل' : 'Reactivate')}
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
