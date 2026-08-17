/**
 * Doctor Operations Screens — Phase-1 API integrations:
 * Leaves/vacations · Prescription templates · Saved diagnoses · Patient blacklist
 * All backed by /provider/ops/doctor/* (live-verified APIs).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView, Alert,
} from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { I } from '../../components/icons';
import { NBtn, NCard, NBadge, NHeader, NScroll, NInput, NSecHeader, NEmpty } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import client from '../../api/client';

// ── 1. LEAVES / VACATIONS ────────────────────────────────────────────────────
export function DoctorLeavesScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState('vacation');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const TYPES = [
    { k: 'vacation', ar: 'إجازة', en: 'Vacation' },
    { k: 'leave', ar: 'إذن', en: 'Leave' },
    { k: 'break', ar: 'استراحة', en: 'Break' },
    { k: 'emergency_closing', ar: 'إغلاق طارئ', en: 'Emergency Closing' },
  ];

  const load = useCallback(async () => {
    try {
      const res = await client.get('/provider/ops/doctor/leave');
      setLeaves(res.data || []);
    } catch { setLeaves([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!start || !end) { show(AR ? 'حدد تاريخ البداية والنهاية' : 'Set start and end dates', 'error'); return; }
    setSaving(true);
    try {
      await client.post('/provider/ops/doctor/leave', { start_date: start, end_date: end, type, note: note || undefined });
      show(AR ? 'أُضيفت الإجازة — لن يستطيع المرضى الحجز فيها' : 'Leave added — patients cannot book during it', 'success');
      setStart(''); setEnd(''); setNote('');
      load();
    } catch (e: any) {
      show(e?.response?.data?.message || (AR ? 'فشل الإضافة' : 'Failed to add'), 'error');
    } finally { setSaving(false); }
  };

  const cancel = async (id: string) => {
    try {
      await client.delete(`/provider/ops/doctor/leave/${id}`);
      show(AR ? 'أُلغيت الإجازة' : 'Leave cancelled', 'success');
      load();
    } catch { show(AR ? 'فشل الإلغاء' : 'Cancel failed', 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' إجازاتي وإغلاقاتي' : ' Leaves & Closings'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
            {AR ? 'أي حجز داخل فترة الإجازة يُمنع تلقائياً. صيغة التاريخ: YYYY-MM-DD' : 'Bookings inside leave periods are blocked automatically. Date format: YYYY-MM-DD'}
          </Text>
        </NCard>

        <NSecHeader title={AR ? 'إضافة إجازة' : 'Add Leave'} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.md }}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t.k} onPress={() => setType(t.k)}
              style={[s.chip, { backgroundColor: type === t.k ? theme.primary : theme.surface2, borderColor: type === t.k ? theme.primary : theme.border }]}>
              <Text style={{ color: type === t.k ? '#FFF' : theme.text, fontWeight: FW.semi }}>{AR ? t.ar : t.en}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
          <View style={{ flex: 1 }}><NInput label={AR ? 'من (YYYY-MM-DD)' : 'From'} value={start} onChange={setStart} placeholder="2026-08-10" /></View>
          <View style={{ flex: 1 }}><NInput label={AR ? 'إلى (YYYY-MM-DD)' : 'To'} value={end} onChange={setEnd} placeholder="2026-08-15" /></View>
        </View>
        <NInput label={AR ? 'ملاحظة (اختياري)' : 'Note (optional)'} value={note} onChange={setNote} />
        <NBtn label={AR ? 'إضافة الإجازة' : 'Add Leave'} onPress={add} loading={saving} style={{ marginTop: SP.sm, marginBottom: SP.xl }} />

        <NSecHeader title={AR ? `إجازاتي (${leaves.length})` : `My Leaves (${leaves.length})`} />
        {loading && <ActivityIndicator color={theme.primary} />}
        {!loading && leaves.length === 0 && <NEmpty title={AR ? 'لا إجازات مسجلة' : 'No leaves'} subtitle={AR ? 'إجازاتك القادمة تظهر هنا' : 'Your upcoming leaves appear here'} />}
        {leaves.map((l: any) => (
          <NCard key={l.id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                  {String(l.start_date).slice(0, 10)} → {String(l.end_date).slice(0, 10)}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {(TYPES.find(t => t.k === l.type) || TYPES[1])[AR ? 'ar' : 'en']}{l.note ? ` · ${l.note}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => cancel(l.id)}>
                <Text style={{ color: theme.danger, fontWeight: FW.bold }}>{AR ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

// ── 2. PRESCRIPTION TEMPLATES ────────────────────────────────────────────────
export function PrescriptionTemplatesScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [items, setItems] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await client.get('/provider/ops/doctor/templates');
      setTemplates(res.data || []);
    } catch { setTemplates([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim() || !items.trim()) { show(AR ? 'الاسم والأدوية مطلوبان' : 'Name and items required', 'error'); return; }
    setSaving(true);
    try {
      const parsed = items.split('\n').filter(Boolean).map((line) => {
        const [med, dose] = line.split(' - ');
        return { med: (med || '').trim(), dose: (dose || '').trim() };
      });
      await client.post('/provider/ops/doctor/templates', { name: name.trim(), items: parsed });
      show(AR ? 'حُفظ القالب' : 'Template saved', 'success');
      setName(''); setItems('');
      load();
    } catch (e: any) {
      show(e?.response?.data?.message || (AR ? 'فشل الحفظ' : 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await client.delete(`/provider/ops/doctor/templates/${id}`);
      load();
    } catch { show(AR ? 'فشل الحذف' : 'Delete failed', 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' قوالب الوصفات' : ' Prescription Templates'} onBack={onBack} />
      <NScroll pad>
        <NSecHeader title={AR ? 'قالب جديد' : 'New Template'} />
        <NInput label={AR ? 'اسم القالب' : 'Template name'} value={name} onChange={setName} placeholder={AR ? 'مثال: باقة البرد' : 'e.g. Flu pack'} />
        <NInput
          label={AR ? 'الأدوية — كل سطر: اسم الدواء - الجرعة' : 'Items — one per line: medicine - dose'}
          value={items} onChange={setItems} multiline
          placeholder={'Paracetamol 500 - 1x3\nVitamin C - 1x1'}
        />
        <NBtn label={AR ? 'حفظ القالب' : 'Save Template'} onPress={add} loading={saving} style={{ marginTop: SP.sm, marginBottom: SP.xl }} />

        <NSecHeader title={AR ? `قوالبي (${templates.length})` : `My Templates (${templates.length})`} />
        {loading && <ActivityIndicator color={theme.primary} />}
        {!loading && templates.length === 0 && <NEmpty title={AR ? 'لا قوالب بعد' : 'No templates yet'} subtitle={AR ? 'وفّر وقتك بقوالب جاهزة للحالات المتكررة' : 'Save time with reusable templates'} />}
        {templates.map((t: any) => (
          <NCard key={t.id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{t.name}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {(t.items || []).map((i: any) => `${i.med}${i.dose ? ` (${i.dose})` : ''}`).join(' + ')}
                </Text>
                {t.usage_count > 0 && <NBadge label={`${AR ? 'استُخدم' : 'used'} ×${t.usage_count}`} variant="info" size="xs" />}
              </View>
              <TouchableOpacity onPress={() => remove(t.id)}>
                <I name="trash" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

// ── 3. SAVED DIAGNOSES ───────────────────────────────────────────────────────
export function SavedDiagnosesScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icd, setIcd] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      const res = await client.get('/provider/ops/doctor/diagnoses', { params: q ? { search: q } : {} });
      setRows(res.data || []);
    } catch { setRows([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!nameAr.trim()) { show(AR ? 'اسم التشخيص بالعربي مطلوب' : 'Arabic diagnosis name required', 'error'); return; }
    setSaving(true);
    try {
      await client.post('/provider/ops/doctor/diagnoses', { name_ar: nameAr.trim(), name_en: nameEn.trim() || undefined, icd: icd.trim() || undefined });
      show(AR ? 'حُفظ التشخيص' : 'Diagnosis saved', 'success');
      setNameAr(''); setNameEn(''); setIcd('');
      load();
    } catch (e: any) {
      show(e?.response?.data?.message || (AR ? 'فشل الحفظ' : 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' التشخيصات المحفوظة' : ' Saved Diagnoses'} onBack={onBack} />
      <NScroll pad>
        <NSecHeader title={AR ? 'تشخيص جديد' : 'New Diagnosis'} />
        <NInput label={AR ? 'الاسم بالعربي *' : 'Arabic name *'} value={nameAr} onChange={setNameAr} placeholder={AR ? 'مثال: التهاب الحلق' : ''} />
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
          <View style={{ flex: 2 }}><NInput label={AR ? 'الاسم بالإنجليزي' : 'English name'} value={nameEn} onChange={setNameEn} placeholder="Pharyngitis" /></View>
          <View style={{ flex: 1 }}><NInput label="ICD" value={icd} onChange={setIcd} placeholder="J02.9" /></View>
        </View>
        <NBtn label={AR ? 'حفظ التشخيص' : 'Save Diagnosis'} onPress={add} loading={saving} style={{ marginTop: SP.sm, marginBottom: SP.xl }} />

        <NInput label={AR ? 'بحث' : 'Search'} value={search} onChange={(v: string) => { setSearch(v); load(v); }} placeholder={AR ? 'ابحث في تشخيصاتك…' : 'Search your diagnoses…'} />
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: SP.md }} />}
        {!loading && rows.length === 0 && <NEmpty title={AR ? 'لا تشخيصات محفوظة' : 'No saved diagnoses'} />}
        {rows.map((d: any) => (
          <NCard key={d.id} style={{ marginBottom: SP.sm, marginTop: SP.xs }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{d.name_ar}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {d.name_en || ''}{d.icd ? ` · ICD: ${d.icd}` : ''}{d.usage_count > 0 ? ` · ×${d.usage_count}` : ''}
                </Text>
              </View>
            </View>
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

// ── 4. PATIENT BLACKLIST ─────────────────────────────────────────────────────
export function DoctorBlacklistScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await client.get('/provider/ops/doctor/blacklist');
      setRows(res.data || []);
    } catch { setRows([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const unblock = async (patientId: string) => {
    try {
      await client.delete(`/provider/ops/doctor/blacklist/${patientId}`);
      show(AR ? 'أُزيل من القائمة — يستطيع الحجز مجدداً' : 'Unblocked — patient can book again', 'success');
      load();
    } catch { show(AR ? 'فشلت الإزالة' : 'Unblock failed', 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? ' قائمة الحظر' : ' Patient Blacklist'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
            {AR
              ? 'المرضى المحظورون لا يستطيعون حجز مواعيد معك. الحظر يتم من ملف المريض أو بعد الاستشارة.'
              : 'Blacklisted patients cannot book appointments with you. Blocking is done from the patient file or after consultations.'}
          </Text>
        </NCard>
        {loading && <ActivityIndicator color={theme.primary} />}
        {!loading && rows.length === 0 && (
          <NEmpty title={AR ? 'لا محظورون' : 'No blocked patients'} subtitle={AR ? 'قائمتك نظيفة — تظهر هنا أي حالات حظر مستقبلية' : 'Your list is clear'} />
        )}
        {rows.map((b: any) => (
          <NCard key={b.patient_id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                  {b.patient_name || b.patient_id}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {b.reason || (AR ? 'بدون سبب مسجل' : 'No reason recorded')} · {String(b.createdAt || '').slice(0, 10)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => unblock(b.patient_id)}>
                <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'رفع الحظر' : 'Unblock'}</Text>
              </TouchableOpacity>
            </View>
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5 },
});
