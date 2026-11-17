/**
 * Doctor Operations Screens — Phase-1 API integrations:
 * Leaves/vacations · Prescription templates · Saved diagnoses · Patient blacklist
 * All backed by /provider/ops/doctor/* (live-verified APIs).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { I } from '../../components/icons';
import { NBtn, NCard, NBadge, NHeader, NScroll, NInput, NSecHeader, NEmpty } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import client from '../../api/client';

// ── 1. LEAVES / VACATIONS ────────────────────────────────────────────────────
export function DoctorLeavesScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
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
      setFailed(false);
      const res = await client.get('/provider/ops/doctor/leave');
      setLeaves(res.data || []);
    } catch { setLeaves([]); setFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!start || !end) { show(tt('dops.92818856'), 'error'); return; }
    setSaving(true);
    try {
      const res: any = await client.post('/provider/ops/doctor/leave', { start_date: start, end_date: end, type, note: note || undefined });
      // a doctor linked to a facility waits for the facility: patients can book those days until it approves
      show(res?.data?.leave?.status === 'pending_facility'
        ? (tt('dops.45012ee7'))
        : (tt('dops.cb86279a')), 'success');
      setStart(''); setEnd(''); setNote('');
      load();
    } catch (e: any) {
      show(e?.response?.data?.message || (tt('dops.5897a49c')), 'error');
    } finally { setSaving(false); }
  };

  const cancel = async (id: string) => {
    try {
      await client.delete(`/provider/ops/doctor/leave/${id}`);
      show(tt('dops.bbc086b6'), 'success');
      load();
    } catch { show(tt('dops.49fc351a'), 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('dops.0bfe50e0')} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
            {tt('dops.055c39fe')}
          </Text>
        </NCard>

        <NSecHeader title={tt('dops.b469b033')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.md }}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t.k} onPress={() => setType(t.k)}
              style={[s.chip, { backgroundColor: type === t.k ? theme.primary : theme.surface2, borderColor: type === t.k ? theme.primary : theme.border }]}>
              <Text style={{ color: type === t.k ? theme.textInv : theme.text, fontWeight: FW.semi }}>{AR ? t.ar : t.en}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
          <View style={{ flex: 1 }}><NInput label={tt('dops.c68c62d0')} value={start} onChange={setStart} placeholder="2026-08-10" /></View>
          <View style={{ flex: 1 }}><NInput label={tt('dops.1c55eb40')} value={end} onChange={setEnd} placeholder="2026-08-15" /></View>
        </View>
        <NInput label={tt('dops.9e8fd92b')} value={note} onChange={setNote} />
        <NBtn label={tt('dops.1a9ca023')} onPress={add} loading={saving} style={{ marginTop: SP.sm, marginBottom: SP.xl }} />

        <NSecHeader title={tt('tpb.839e89ca', { p1: String(leaves.length) })} />
        {loading && <ActivityIndicator color={theme.primary} />}
        {!loading && failed && <NEmpty icon="alert" title={tt('dops.f7e5ce2f')} subtitle={tt('dops.55571c7b')} actionLabel={tt('dops.cf333076')} onAction={() => load()} />}
        {!loading && !failed && leaves.length === 0 && <NEmpty title={tt('dops.78fc7c1e')} subtitle={tt('dops.690f43c8')} />}
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
                {l.status === 'pending_facility' && (
                  <Text style={{ fontSize: FS.xs, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
                    {tt('dops.e4c01ddf')}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => cancel(l.id)}>
                <Text style={{ color: theme.danger, fontWeight: FW.bold }}>{tt('dops.210b779f')}</Text>
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
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState('');
  const [items, setItems] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      const res = await client.get('/provider/ops/doctor/templates');
      setTemplates(res.data || []);
    } catch { setTemplates([]); setFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim() || !items.trim()) { show(tt('dops.56dd30f7'), 'error'); return; }
    setSaving(true);
    try {
      const parsed = items.split('\n').filter(Boolean).map((line) => {
        const [med, dose] = line.split(' - ');
        return { name: (med || '').trim(), dose: (dose || '').trim() };   // the same shape the e-prescription screen saves and reads
      });
      await client.post('/provider/ops/doctor/templates', { name: name.trim(), items: parsed });
      show(tt('dops.eb529bcb'), 'success');
      setName(''); setItems('');
      load();
    } catch (e: any) {
      show(e?.response?.data?.message || (tt('dops.88940ee7')), 'error');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await client.delete(`/provider/ops/doctor/templates/${id}`);
      load();
    } catch { show(tt('dops.4c47e1eb'), 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('dops.c1df5a77')} onBack={onBack} />
      <NScroll pad>
        <NSecHeader title={tt('dops.81df4f3c')} />
        <NInput label={tt('dops.da32bdb6')} value={name} onChange={setName} placeholder={tt('dops.7a542b12')} />
        <NInput
          label={tt('dops.a5e2c89d')}
          value={items} onChange={setItems} multiline
          placeholder={'Paracetamol 500 - 1x3\nVitamin C - 1x1'}
        />
        <NBtn label={tt('dops.bad887bb')} onPress={add} loading={saving} style={{ marginTop: SP.sm, marginBottom: SP.xl }} />

        <NSecHeader title={tt('tpb.b9f2dbf1', { p1: String(templates.length) })} />
        {loading && <ActivityIndicator color={theme.primary} />}
        {!loading && failed && <NEmpty icon="alert" title={tt('dops.f7e5ce2f')} subtitle={tt('dops.55571c7b')} actionLabel={tt('dops.cf333076')} onAction={() => load()} />}
        {!loading && !failed && templates.length === 0 && <NEmpty title={tt('dops.79f121a6')} subtitle={tt('dops.955c22d1')} />}
        {templates.map((t: any) => (
          <NCard key={t.id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{t.name}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {(t.items || []).map((i: any) => `${i.name || i.med || ''}${i.dose ? ` (${i.dose})` : ''}`).join(' + ')}
                </Text>
                {t.usage_count > 0 && <NBadge label={`${tt('qqm.55081f9a')} ×${t.usage_count}`} variant="info" size="xs" />}
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
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icd, setIcd] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      setFailed(false);
      const res = await client.get('/provider/ops/doctor/diagnoses', { params: q ? { search: q } : {} });
      setRows(res.data || []);
    } catch { setRows([]); setFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!nameAr.trim()) { show(tt('dops.4a88f756'), 'error'); return; }
    setSaving(true);
    try {
      await client.post('/provider/ops/doctor/diagnoses', { name_ar: nameAr.trim(), name_en: nameEn.trim() || undefined, icd: icd.trim() || undefined });
      show(tt('dops.cffa9226'), 'success');
      setNameAr(''); setNameEn(''); setIcd('');
      load();
    } catch (e: any) {
      show(e?.response?.data?.message || (tt('dops.88940ee7')), 'error');
    } finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('dops.d3f4ba56')} onBack={onBack} />
      <NScroll pad>
        <NSecHeader title={tt('dops.972af300')} />
        <NInput label={tt('dops.b6e20c82')} value={nameAr} onChange={setNameAr} placeholder={AR ? 'مثال: التهاب الحلق' : ''} />
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
          <View style={{ flex: 2 }}><NInput label={tt('dops.60629813')} value={nameEn} onChange={setNameEn} placeholder={tt('phx.e43eaf37')} /></View>
          <View style={{ flex: 1 }}><NInput label="ICD" value={icd} onChange={setIcd} placeholder="J02.9" /></View>
        </View>
        <NBtn label={tt('dops.b626c218')} onPress={add} loading={saving} style={{ marginTop: SP.sm, marginBottom: SP.xl }} />

        <NInput label={tt('dops.f61f44ef')} value={search} onChange={(v: string) => { setSearch(v); load(v); }} placeholder={tt('dops.d724665e')} />
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: SP.md }} />}
        {!loading && failed && <NEmpty icon="alert" title={tt('dops.f7e5ce2f')} subtitle={tt('dops.55571c7b')} actionLabel={tt('dops.cf333076')} onAction={() => load()} />}
        {!loading && !failed && rows.length === 0 && <NEmpty title={tt('dops.35850b7d')} />}
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
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      const res = await client.get('/provider/ops/doctor/blacklist');
      setRows(res.data || []);
    } catch { setRows([]); setFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const unblock = async (patientId: string) => {
    try {
      await client.delete(`/provider/ops/doctor/blacklist/${patientId}`);
      show(tt('dops.655ae42a'), 'success');
      load();
    } catch { show(tt('dops.c418fbb6'), 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('dops.b9597423')} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
            {tt('dops.39877d2f')}
          </Text>
        </NCard>
        {loading && <ActivityIndicator color={theme.primary} />}
        {!loading && failed && <NEmpty icon="alert" title={tt('dops.f7e5ce2f')} subtitle={tt('dops.55571c7b')} actionLabel={tt('dops.cf333076')} onAction={() => load()} />}
        {!loading && !failed && rows.length === 0 && (
          <NEmpty title={tt('dops.15dc7ecd')} subtitle={tt('dops.08a5f3a6')} />
        )}
        {rows.map((b: any) => (
          <NCard key={b.patient_id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                  {b.patient_name || b.patient_id}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {b.reason || (tt('dops.589ccf01'))} · {String(b.createdAt || '').slice(0, 10)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => unblock(b.patient_id)}>
                <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{tt('dops.2ad51061')}</Text>
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
