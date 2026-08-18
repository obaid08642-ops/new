/**
 * FleetScreen — ambulance fleet management for BOTH dual-model owners:
 * independent ambulance companies and hospitals/clinics running their own fleet.
 * Every vehicle is created as `pending` and can only serve after admin approval;
 * editing an approved vehicle sends it back to review.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import client from '../../api/client';
import { useTheme, useLang, useToast } from '../../context';
import { NBtn, NCard, NInput, NHeader, NScroll, NToggle, NBadge, NEmpty } from '../../components/ui';
import { I } from '../../components/icons';
import { SP, FS, FW } from '../../constants';

const STATUS_META: Record<string, { ar: string; en: string; variant: any }> = {
  pending: { ar: 'بانتظار اعتماد الإدارة', en: 'Pending admin review', variant: 'warning' },
  approved: { ar: 'معتمدة', en: 'Approved', variant: 'success' },
  rejected: { ar: 'مرفوضة', en: 'Rejected', variant: 'danger' },
  suspended: { ar: 'موقوفة', en: 'Suspended', variant: 'danger' },
};

export function FleetScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang(); const AR = lang === 'ar';
  const { show } = useToast();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const res = await client.get('/provider/ambulance/fleet');
      setVehicles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAvailability = async (v: any) => {
    try {
      await client.patch(`/provider/ambulance/fleet/${v.id}`, { is_available: !v.is_available });
      setVehicles(list => list.map(x => x.id === v.id ? { ...x, is_available: !v.is_available } : x));
    } catch {
      show(AR ? 'تعذر تحديث حالة المركبة' : 'Could not update vehicle', 'error');
    }
  };

  const remove = (v: any) => {
    Alert.alert(
      AR ? 'حذف المركبة' : 'Remove vehicle',
      AR ? `حذف ${v.plate_number} نهائياً؟` : `Remove ${v.plate_number} permanently?`,
      [
        { text: AR ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: AR ? 'حذف' : 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/provider/ambulance/fleet/${v.id}`);
              setVehicles(list => list.filter(x => x.id !== v.id));
              show(AR ? 'حُذفت المركبة' : 'Vehicle removed', 'success');
            } catch {
              show(AR ? 'تعذر الحذف' : 'Delete failed', 'error');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' أسطول الإسعاف' : ' Ambulance Fleet'} sub={AR ? 'المركبات تخدم بعد اعتماد الإدارة' : 'Vehicles serve after admin approval'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.lg }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'flex-start' }}>
            <I name="info" size={16} color={theme.info} />
            <Text style={{ flex: 1, fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'كل مركبة جديدة أو معدّلة تُراجع من إدارة نبض قبل دخولها الخدمة واستلام مهام الطوارئ.' : 'Every new or edited vehicle is reviewed by Nabd admin before it can take emergency missions.'}
            </Text>
          </View>
        </NCard>

        {!showForm && (
          <NBtn label={AR ? ' إضافة مركبة' : ' Add Vehicle'} icon="plus" onPress={() => setShowForm(true)} style={{ marginBottom: SP.lg }} />
        )}
        {showForm && (
          <VehicleForm
            onCancel={() => setShowForm(false)}
            onSaved={(v: any) => { setShowForm(false); setVehicles(list => [v, ...list]); }}
          />
        )}

        {loading && <Text style={{ color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{AR ? 'جاري التحميل…' : 'Loading…'}</Text>}
        {loadError && !loading && (
          <View style={{ alignItems: 'center', marginVertical: SP.xl }}>
            <NEmpty title={AR ? 'تعذر تحميل الأسطول' : 'Could not load fleet'} subtitle={AR ? 'تحقق من الاتصال وحاول مجدداً' : 'Check connection and retry'} />
            <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} variant="outline" full={false} onPress={load} />
          </View>
        )}
        {!loading && !loadError && vehicles.length === 0 && !showForm && (
          <NEmpty title={AR ? 'لا مركبات بعد' : 'No vehicles yet'} subtitle={AR ? 'أضف أول سيارة إسعاف لأسطولك' : 'Add your first ambulance'} />
        )}

        {vehicles.map(v => {
          const meta = STATUS_META[v.status] || STATUS_META.pending;
          return (
            <NCard key={v.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <I name="emergency" size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{v.plate_number}</Text>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                    {[v.model, v.year, v.has_icu ? (AR ? 'عناية مركزة' : 'ICU') : null, `${v.paramedic_count || 1} ${AR ? 'مسعف' : 'paramedic(s)'}`].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <NBadge label={AR ? meta.ar : meta.en} variant={meta.variant} />
              </View>
              {v.status === 'rejected' && !!v.admin_notes && (
                <Text style={{ fontSize: FS.sm, color: theme.danger, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {(AR ? 'سبب الرفض: ' : 'Rejection reason: ') + v.admin_notes}
                </Text>
              )}
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginTop: SP.md, gap: SP.md }}>
                <View style={{ flex: 1 }}>
                  <NToggle label={AR ? 'متاحة للمهام' : 'Available for missions'} value={!!v.is_available} onChange={() => toggleAvailability(v)} />
                </View>
                <NBtn label={AR ? 'حذف' : 'Remove'} variant="outline" size="sm" full={false} onPress={() => remove(v)} />
              </View>
            </NCard>
          );
        })}
      </NScroll>
    </View>
  );
}

function VehicleForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (v: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang(); const AR = lang === 'ar';
  const { show } = useToast();
  const [f, setF] = useState({ plate_number: '', model: '', year: '', paramedic_count: '1', has_icu: false, equipment: '', base_city: '' });
  const [errs, setErrs] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const up = (patch: any) => setF(x => ({ ...x, ...patch }));

  const save = async () => {
    const e: any = {};
    if (!f.plate_number || f.plate_number.trim().length < 3) e.plate_number = AR ? 'رقم اللوحة مطلوب' : 'Plate number required';
    setErrs(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const res = await client.post('/provider/ambulance/fleet', {
        plate_number: f.plate_number.trim(),
        model: f.model || undefined,
        year: parseInt(f.year, 10) || undefined,
        paramedic_count: parseInt(f.paramedic_count, 10) || 1,
        has_icu: f.has_icu,
        equipment: f.equipment ? f.equipment.split(/[،,\n]/).map(x => x.trim()).filter(Boolean) : [],
        base_city: f.base_city || undefined,
      });
      show(AR ? 'أُضيفت المركبة — بانتظار اعتماد الإدارة' : 'Vehicle added — pending admin approval', 'success');
      onSaved(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      show(msg === 'plate_number_already_registered'
        ? (AR ? 'رقم اللوحة مسجّل مسبقاً' : 'Plate number already registered')
        : (AR ? 'تعذر حفظ المركبة' : 'Could not save vehicle'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <NCard style={{ marginBottom: SP.lg, borderWidth: 1, borderColor: theme.primary + '40' }}>
      <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
        {AR ? 'مركبة جديدة' : 'New vehicle'}
      </Text>
      <NInput label={AR ? 'رقم اللوحة' : 'Plate number'} value={f.plate_number} onChange={(v: string) => up({ plate_number: v })} error={errs.plate_number} />
      <NInput label={AR ? 'الموديل' : 'Model'} value={f.model} onChange={(v: string) => up({ model: v })} />
      <NInput label={AR ? 'سنة الصنع' : 'Year'} value={f.year} onChange={(v: string) => up({ year: v.replace(/[^0-9]/g, '') })} kbType="numeric" />
      <NInput label={AR ? 'عدد المسعفين' : 'Paramedics'} value={f.paramedic_count} onChange={(v: string) => up({ paramedic_count: v.replace(/[^0-9]/g, '') })} kbType="numeric" />
      <NInput label={AR ? 'مدينة التمركز' : 'Base city'} value={f.base_city} onChange={(v: string) => up({ base_city: v })} />
      <NInput label={AR ? 'التجهيزات (افصل بفاصلة)' : 'Equipment (comma separated)'} value={f.equipment} onChange={(v: string) => up({ equipment: v })} multiline />
      <NToggle label={AR ? 'وحدة عناية مركزة متنقلة' : 'Mobile ICU unit'} value={f.has_icu} onChange={(v: boolean) => up({ has_icu: v })} />
      <View style={{ flexDirection: 'row', gap: SP.md, marginTop: SP.lg }}>
        <View style={{ flex: 1 }}><NBtn label={AR ? 'حفظ' : 'Save'} onPress={save} loading={saving} /></View>
        <View style={{ flex: 1 }}><NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" onPress={onCancel} /></View>
      </View>
    </NCard>
  );
}
