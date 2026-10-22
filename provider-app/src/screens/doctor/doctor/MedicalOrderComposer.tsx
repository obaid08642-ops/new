import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme, useLang } from '../../../context';
import { NBtn, NCard, NHeader, NScroll, NSearch } from '../../../components/ui';
import { I } from '../../../components/icons';
import { SP, R, FS, FW } from '../../../constants';
import client from '../../../api/client';
import { getServicesCatalog, type CatalogService } from '../../../api/catalogs';
import {
  ComposerState, OrderGroup, PickedItem, VALID_DAYS_OPTIONS, MAX_SESSIONS, addUnique, buildPayload, canSend,
  clampInt, emptyComposer, isVisitedStatus, itemCount, mapOrderError,
} from './medicalOrderLogic';

const SVC: Record<OrderGroup, 'lab' | 'radiology' | 'nursing'> = { labs: 'lab', radiology: 'radiology', nursing: 'nursing' };
const GROUP_LABEL: Record<OrderGroup, { ar: string; en: string }> = {
  labs: { ar: 'التحاليل', en: 'Labs' },
  radiology: { ar: 'الأشعة', en: 'Radiology' },
  nursing: { ar: 'التمريض', en: 'Nursing' },
};

interface RxRow { id: string; patient_id?: string; createdAt?: string; erx?: unknown[] }

/** Doctor's "new medical order" after a visit (board Ord22). The doctor never picks the provider. */
export function MedicalOrderComposer({ apt, onBack }: { apt: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const dir = AR ? 'row-reverse' : 'row';
  const align = AR ? 'right' : 'left';
  const apptId = String(apt?.id || apt?.appointment_id || '');
  const visited = isVisitedStatus(apt?.status);
  const patientId = String(apt?.patient_id ?? apt?.raw?.patient_id ?? '');

  const [s, setS] = useState<ComposerState>(emptyComposer());
  const [tab, setTab] = useState<OrderGroup>('labs');
  const [q, setQ] = useState('');
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [catState, setCatState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [rx, setRx] = useState<RxRow[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    setCatState('loading');
    getServicesCatalog(SVC[tab], true).then((l) => {
      if (!alive) return;
      setCatalog(l);
      setCatState(l.length ? 'ready' : 'error');
    });
    return () => { alive = false; };
  }, [tab]);

  useEffect(() => {
    let alive = true;
    client.get('/prescriptions/doctor/mine').then((r) => {
      const rows: RxRow[] = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      if (alive) setRx(rows.filter((x) => x?.id && patientId && x.patient_id === patientId));
    }).catch(() => { if (alive) setRx([]); });
    return () => { alive = false; };
  }, [patientId]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return catalog.filter((c) => !t || c.ar.toLowerCase().includes(t) || c.en.toLowerCase().includes(t)).slice(0, 30);
  }, [catalog, q]);

  const add = (c: CatalogService) => {
    const item: PickedItem = { catalog_id: c.id, name_ar: c.ar, name_en: c.en };
    setS((p) => tab === 'nursing'
      ? { ...p, nursing: addUnique(p.nursing, { ...item, sessions: 1, interval_days: 1 }) }
      : { ...p, [tab]: addUnique(p[tab], item) });
  };
  const remove = (g: OrderGroup, id: string) => setS((p) => ({ ...p, [g]: (p[g] as PickedItem[]).filter((i) => i.catalog_id !== id) }));
  const patchNursing = (id: string, patch: Partial<{ sessions: number; interval_days: number }>) =>
    setS((p) => ({ ...p, nursing: p.nursing.map((n) => (n.catalog_id === id ? { ...n, ...patch } : n)) }));

  async function send() {
    if (!canSend(s) || sending) return;
    setSending(true); setError(null);
    try {
      await client.post(`/doctors/appointments/${apptId}/medical-order`, buildPayload(s));
      setSent(true);
    } catch (err: any) {
      setError(mapOrderError(err, AR));
    } finally {
      setSending(false);
    }
  }

  const name = (i: { name_ar: string; name_en: string }) => (AR ? i.name_ar : i.name_en);
  const label = (ar: string, en: string) => (AR ? ar : en);

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: SP.xl, justifyContent: 'center' }}>
        <NCard>
          <View accessibilityRole="alert" style={{ alignItems: 'center', gap: SP.md }}>
            <I name="check" size={32} color={theme.success} />
            <Text style={{ color: theme.text, fontSize: FS.lg, fontWeight: FW.bold, textAlign: 'center' }}>{label('وصل الأمر إلى المريض', 'The order reached the patient')}</Text>
            <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: 'center' }}>{label('يظهر في «طلباتي الطبية» مع زر الطلب لكل مجموعة', 'It shows in “My medical orders” with an Order button per group')}</Text>
          </View>
        </NCard>
        <NBtn label={label('رجوع', 'Back')} onPress={onBack} style={{ marginTop: SP.xl }} />
      </View>
    );
  }

  const chip = (active: boolean) => ({
    minHeight: 44, paddingHorizontal: SP.lg, borderRadius: R.full, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: active ? theme.primary : theme.surface2, borderWidth: 1, borderColor: active ? theme.primary : theme.border,
  });
  const chipText = (active: boolean) => ({ color: active ? theme.textInv : theme.text, fontSize: FS.sm, fontWeight: FW.semi });
  const numInput = { minHeight: 44, minWidth: 64, borderWidth: 1, borderColor: theme.border, borderRadius: R.md, paddingHorizontal: SP.md, color: theme.text, backgroundColor: theme.inputBg, textAlign: 'center' as const };

  return (
    <NScroll>
      <NHeader title={label('أمر طبي جديد', 'New medical order')} onBack={onBack} />
      {!visited ? (
        <NCard style={{ backgroundColor: theme.warnBg, borderColor: theme.warn }}>
          <Text style={{ color: theme.warn, fontSize: FS.sm, textAlign: align }}>{label('لا يمكن كتابة أمر طبي قبل أن يتم الكشف', 'You can write an order only after the visit')}</Text>
        </NCard>
      ) : null}

      <NCard style={{ marginBottom: SP.lg }}>
        <Text style={{ color: theme.text, fontSize: FS.lg, fontWeight: FW.bold, textAlign: align }}>{apt?.patient ?? '—'}</Text>
        {apt?.insurance ? <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: align }}>{apt.insurance}</Text> : null}
      </NCard>

      <Text style={{ color: theme.text, fontWeight: FW.semi, textAlign: align, marginBottom: SP.sm }}>{label('مدة صلاحية الأمر', 'Order validity')}</Text>
      <View style={{ flexDirection: dir, gap: SP.sm, marginBottom: SP.lg, flexWrap: 'wrap' }}>
        {VALID_DAYS_OPTIONS.map((d) => (
          <TouchableOpacity key={d} accessibilityRole="button" accessibilityState={{ selected: s.validDays === d }} onPress={() => setS((p) => ({ ...p, validDays: d }))} style={chip(s.validDays === d)}>
            <Text style={chipText(s.validDays === d)}>{d === 180 ? label('6 أشهر', '6 months') : label(`${d} يومًا`, `${d} days`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {rx.length > 0 ? (
        <>
          <Text style={{ color: theme.text, fontWeight: FW.semi, textAlign: align, marginBottom: SP.sm }}>{label('الأدوية (الوصفة الإلكترونية)', 'Medicines (e-prescription)')}</Text>
          <View style={{ flexDirection: dir, gap: SP.sm, marginBottom: SP.lg, flexWrap: 'wrap' }}>
            {rx.map((r) => {
              const on = s.prescriptionId === r.id;
              const when = r.createdAt ? new Date(r.createdAt).toLocaleDateString(AR ? 'ar-SA' : 'en-GB') : r.id.slice(0, 6);
              return (
                <TouchableOpacity key={r.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setS((p) => ({ ...p, prescriptionId: on ? null : r.id }))} style={chip(on)}>
                  <Text style={chipText(on)}>{when}{Array.isArray(r.erx) ? ` · ${r.erx.length}` : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <View style={{ flexDirection: dir, gap: SP.sm, marginBottom: SP.md }}>
        {(Object.keys(GROUP_LABEL) as OrderGroup[]).map((g) => (
          <TouchableOpacity key={g} accessibilityRole="tab" accessibilityState={{ selected: tab === g }} onPress={() => { setTab(g); setQ(''); }} style={chip(tab === g)}>
            <Text style={chipText(tab === g)}>{label(GROUP_LABEL[g].ar, GROUP_LABEL[g].en)}{s[g].length ? ` · ${s[g].length}` : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <NSearch value={q} onChange={setQ} placeholder={label('ابحث في الكتالوج الوطني', 'Search the national catalogue')} />
      <Text style={{ color: theme.textHint, fontSize: FS.xs, textAlign: align, marginVertical: SP.sm }}>{label('من الكتالوج الوطني', 'From the national catalogue')}</Text>
      {catState === 'loading' ? <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.lg }} /> : null}
      {catState === 'error' ? <Text style={{ color: theme.danger, textAlign: align, marginBottom: SP.md }}>{label('تعذّر تحميل الكتالوج، تحقق من الاتصال', 'Could not load the catalogue, check your connection')}</Text> : null}
      {catState === 'ready' && results.length === 0 ? <Text style={{ color: theme.textSub, textAlign: align, marginBottom: SP.md }}>{label('لا نتائج', 'No results')}</Text> : null}
      {catState === 'ready' && results.map((c) => {
        const picked = s[tab].some((i) => i.catalog_id === c.id);
        return (
          <TouchableOpacity key={c.id} accessibilityRole="button" accessibilityState={{ selected: picked }} onPress={() => add(c)} disabled={picked}
            style={{ flexDirection: dir, alignItems: 'center', gap: SP.md, minHeight: 48, borderBottomWidth: 1, borderBottomColor: theme.border, opacity: picked ? 0.5 : 1 }}>
            <I name={picked ? 'check' : 'plus'} size={18} color={theme.primary} />
            <Text style={{ flex: 1, color: theme.text, fontSize: FS.md, textAlign: align }}>{AR ? c.ar : c.en}</Text>
          </TouchableOpacity>
        );
      })}

      {(Object.keys(GROUP_LABEL) as OrderGroup[]).filter((g) => s[g].length > 0).map((g) => (
        <NCard key={g} style={{ marginTop: SP.lg }}>
          <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: align, marginBottom: SP.sm }}>{label(GROUP_LABEL[g].ar, GROUP_LABEL[g].en)} · {s[g].length}</Text>
          {s[g].map((i) => (
            <View key={i.catalog_id} style={{ marginBottom: SP.sm }}>
              <View style={{ flexDirection: dir, alignItems: 'center', gap: SP.md }}>
                <Text style={{ flex: 1, color: theme.text, textAlign: align }}>{name(i)}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={label('حذف البند', 'Remove item')} onPress={() => remove(g, i.catalog_id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <I name="close" size={18} color={theme.danger} />
                </TouchableOpacity>
              </View>
              {g === 'nursing' ? (() => {
                const n = s.nursing.find((x) => x.catalog_id === i.catalog_id)!;
                return (
                  <View style={{ flexDirection: dir, gap: SP.lg, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <View>
                      <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: align }}>{label('عدد الجلسات', 'Number of sessions')}</Text>
                      <TextInput accessibilityLabel={label('عدد الجلسات', 'Number of sessions')} keyboardType="number-pad" value={String(n.sessions)} onChangeText={(v) => patchNursing(n.catalog_id, { sessions: clampInt(v, 1, MAX_SESSIONS, 1) })} style={numInput} />
                    </View>
                    <View>
                      <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: align }}>{label('كل كم يوم', 'Every N days')}</Text>
                      <TextInput accessibilityLabel={label('كل كم يوم', 'Every N days')} keyboardType="number-pad" value={String(n.interval_days)} onChangeText={(v) => patchNursing(n.catalog_id, { interval_days: clampInt(v, 0, 365, 1) })} style={numInput} />
                    </View>
                  </View>
                );
              })() : null}
            </View>
          ))}
          {g === 'nursing' ? <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: align }}>{label('يُنشأ كسلسلة جلسات؛ يدفع المريض الكل أو كل جلسة، ويلغي كل جلسة على حدة', 'Created as a series; the patient pays all or per session and can cancel each session')}</Text> : null}
        </NCard>
      ))}

      <Text style={{ color: theme.text, fontWeight: FW.semi, textAlign: align, marginTop: SP.lg, marginBottom: SP.sm }}>{label('ملاحظة للمريض', 'Note for the patient')}</Text>
      <TextInput
        accessibilityLabel={label('ملاحظة للمريض', 'Note for the patient')}
        multiline value={s.notes} onChangeText={(v) => setS((p) => ({ ...p, notes: v }))}
        placeholder={label('مثال: الصيام ٨ ساعات قبل التحاليل', 'Example: fast for 8 hours before the tests')} placeholderTextColor={theme.textHint}
        style={{ minHeight: 88, borderWidth: 1, borderColor: theme.border, borderRadius: R.md, padding: SP.md, color: theme.text, backgroundColor: theme.inputBg, textAlign: align, textAlignVertical: 'top' }}
      />

      <NCard style={{ marginTop: SP.lg }}>
        <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: align, marginBottom: SP.sm }}>{label('ملخص الأمر', 'Order summary')} · {itemCount(s)}</Text>
        <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: align }}>{label('يصل المريض إشعار وبطاقة في الرئيسية. أنت لا تختار المزوّد', 'The patient gets a notification and a Home card. You do not pick the provider')}</Text>
      </NCard>

      {error ? (
        <NCard style={{ marginTop: SP.lg, backgroundColor: theme.dangerBg, borderColor: theme.danger }}>
          <View accessibilityRole="alert">
            <Text style={{ color: theme.danger, fontWeight: FW.bold, textAlign: align }}>{label('تعذّر إرسال الأمر', 'Could not send the order')}</Text>
            <Text style={{ color: theme.danger, fontSize: FS.sm, textAlign: align }}>{error}</Text>
          </View>
        </NCard>
      ) : null}
      <NBtn
        label={error ? label('إعادة المحاولة', 'Try again') : label('أرسل الأمر للمريض', 'Send order to patient')}
        onPress={send} loading={sending} disabled={!visited || !canSend(s) || !apptId}
        style={{ marginTop: SP.lg, marginBottom: SP.xxl }}
      />
    </NScroll>
  );
}
