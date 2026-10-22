import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme, useToast } from '../../context';
import { NBtn, NCard, NHeader, NScroll, NToggle, NPriceInput, NSearch, NInput } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import { OrderingApi, type InsurerOption, type OrderMode, type OrderingSettings } from '../../api/ordering';
import { buildSettingsPayload, insuranceSummary, orderingErrorMessage, parseAmount, setInsurerClasses, toggleIn, validateSettings } from './logic';
import { Chip, Label, LoadState, Row, fmtMoney, useAR, useKind, useLoad, type OrderingScreenProps } from './common';

const RADII = [3, 5, 8, 12];
const TOTAL = 4;

// Ord30: 4-step provider setup wizard. Every field is a real field of PUT /provider/ordering/settings.
export function OrderingSettingsScreen({ kind, onBack, onNav }: OrderingScreenProps) {
  const AR = useAR();
  const { theme } = useTheme();
  const { show } = useToast();
  const k = useKind(kind);
  const [step, setStep] = useState(1);
  const [s, setS] = useState<OrderingSettings | null>(null);
  const [fee, setFee] = useState('');
  const [radius, setRadius] = useState('');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const settings = useLoad(() => OrderingApi.getSettings(), []);
  const insurers = useLoad(() => OrderingApi.insurers(), []);

  useEffect(() => {
    if (settings.data && !s) {
      setS(settings.data);
      setFee(settings.data.home_fee ? String(settings.data.home_fee) : '');
      setRadius(settings.data.home_radius_km ? String(settings.data.home_radius_km) : '');
    }
  }, [settings.data, s]);

  const draft: OrderingSettings | null = useMemo(() => s && { ...s, home_fee: parseAmount(fee) ?? 0, home_radius_km: parseAmount(radius) ?? null }, [s, fee, radius]);
  const list: InsurerOption[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (insurers.data ?? []).filter((c) => !needle || `${c.ar} ${c.en}`.toLowerCase().includes(needle));
  }, [insurers.data, q]);

  if (!k) return <NScroll><NHeader title={AR ? 'إعداد خدماتك' : 'Set up your services'} onBack={onBack} /><Label sub>{AR ? 'هذه الميزة للمختبرات والأشعة والتمريض فقط' : 'Only for labs, radiology and nursing'}</Label></NScroll>;

  const patch = (p: Partial<OrderingSettings>) => { setStepError(null); setS((x) => (x ? { ...x, ...p } : x)); };
  const toggleMode = (m: OrderMode) => patch({ modes: toggleIn(s!.modes, m) as OrderMode[] });

  const next = () => {
    if (!draft) return;
    const v = validateSettings(draft);
    if (step <= 2 && !v.ok) { setStepError(orderingErrorMessage({ message: v.code }, AR)); return; }
    setStepError(null);
    setStep(step + 1);
  };

  const save = async () => {
    if (!draft) return;
    const v = validateSettings(draft);
    if (!v.ok) { setStepError(orderingErrorMessage({ message: v.code }, AR)); return; }
    setSaving(true);
    try {
      await OrderingApi.putSettings(buildSettingsPayload(draft));
      show(AR ? 'تم حفظ إعداداتك' : 'Your setup is saved', 'success');
      onNav('ordering_items');
    } catch (e) { setStepError(orderingErrorMessage(e, AR)); } finally { setSaving(false); }
  };

  const modeCard = (m: OrderMode, title: string, sub: string) => (
    <NCard onPress={() => toggleMode(m)} accent={s!.modes.includes(m) ? theme.primary : undefined} style={{ marginBottom: SP.md }}>
      <Label bold>{title}</Label>
      <Label sub>{sub}</Label>
      <Text style={{ color: s!.modes.includes(m) ? theme.primary : theme.textHint, fontWeight: FW.semi, textAlign: AR ? 'right' : 'left' }}>
        {s!.modes.includes(m) ? (AR ? 'مفعّل' : 'On') : (AR ? 'غير مفعّل' : 'Off')}
      </Text>
    </NCard>
  );

  const sum = draft ? insuranceSummary(draft.accepted_insurance) : { companies: 0, classes: 0 };
  const nameOf = (id: string) => { const c = insurers.data?.find((x) => x.id === id); return c ? (AR ? c.ar : c.en) : id; };

  return (
    <NScroll>
      <NHeader onBack={step === 1 ? onBack : () => setStep(step - 1)} step={step} total={TOTAL}
        title={[AR ? 'طريقة الخدمة' : 'How you serve', AR ? 'التأمين' : 'Insurance', AR ? 'القبول والدوام' : 'Acceptance', AR ? 'الطاقم والمراجعة' : 'Staff and review'][step - 1]}
        sub={AR ? 'إعداد خدماتك' : 'Set up your services'} />
      <LoadState loading={settings.loading} error={settings.error} onRetry={settings.reload}>
        {s && (
          <View style={{ gap: SP.md, paddingTop: SP.md }}>
            {step === 1 && (<>
              {modeCard('home', AR ? 'زيارة منزلية' : 'Home visit', AR ? 'فريقك يذهب إلى المريض' : 'Your team goes to the patient')}
              {modeCard('facility', AR ? 'في المنشأة' : 'At the facility', AR ? 'المريض يأتي إليك' : 'The patient comes to you')}
              {s.modes.includes('home') && (<>
                <NPriceInput label={AR ? 'رسوم الزيارة المنزلية' : 'Home-visit fee'} value={fee} onChange={(v) => { setStepError(null); setFee(v); }} />
                <Label sub>{AR ? 'تظهر للمريض منفصلة عن أسعار الفحوص' : 'Shown to the patient separately from test prices'}</Label>
                <Label bold>{AR ? 'نطاق الخدمة' : 'Service radius'}</Label>
                <Row>
                  {RADII.map((r) => <Chip key={r} label={AR ? `${r} كم` : `${r} km`} on={parseAmount(radius) === r} onPress={() => { setStepError(null); setRadius(String(r)); }} />)}
                </Row>
                <NInput kbType="numeric" value={radius} onChange={(v) => { setStepError(null); setRadius(v.replace(/[^0-9.]/g, '')); }} label={AR ? 'نطاق آخر (كم، حتى 50)' : 'Other radius (km, up to 50)'} />
                <Label sub>{AR ? 'يراك المريض داخل هذا النطاق فقط' : 'Patients see you only inside this radius'}</Label>
              </>)}
            </>)}

            {step === 2 && (<>
              <NSearch value={q} onChange={setQ} placeholder={AR ? 'ابحث عن شركة تأمين' : 'Search insurance company'} />
              <LoadState loading={insurers.loading} error={insurers.error} onRetry={insurers.reload}>
                {list.length === 0 && <Label sub>{AR ? 'لا توجد شركات مطابقة' : 'No matching companies'}</Label>}
                {list.map((c) => {
                  const cur = s.accepted_insurance.find((x) => x.company_id === c.id)?.classes ?? [];
                  return (
                    <NCard key={c.id} style={{ marginBottom: SP.sm }}>
                      <Label bold>{AR ? c.ar : c.en}</Label>
                      <Row>
                        {c.classes.map((cl) => (
                          <Chip key={cl} label={cl} on={cur.includes(cl)} onPress={() => patch({ accepted_insurance: setInsurerClasses(s.accepted_insurance, c.id, toggleIn(cur, cl)) })} />
                        ))}
                        {c.classes.length > 0 && (
                          <Chip label={AR ? 'اختيار كل الفئات' : 'Select all classes'} on={cur.length === c.classes.length}
                            onPress={() => patch({ accepted_insurance: setInsurerClasses(s.accepted_insurance, c.id, cur.length === c.classes.length ? [] : c.classes) })} />
                        )}
                      </Row>
                    </NCard>
                  );
                })}
              </LoadState>
              <Label sub>{AR ? `${sum.companies} شركات · ${sum.classes} فئات` : `${sum.companies} companies · ${sum.classes} classes`}</Label>
            </>)}

            {step === 3 && (<>
              <NToggle label={AR ? 'القبول التلقائي' : 'Auto-accept'} sub={AR ? 'تقبل الطلب العاجل فور وصوله وتظهر أولًا للمرضى القريبين' : 'Accepts an urgent request on arrival and shows first to nearby patients'} value={s.auto_accept} onChange={(v) => patch({ auto_accept: v })} />
              {s.modes.includes('facility') && (
                <NToggle label={AR ? 'بدون موعد (رمز QR)' : 'Walk-in (QR code)'} sub={AR ? 'الحجز في المنشأة' : 'Booking at the facility'} value={s.walk_in} onChange={(v) => patch({ walk_in: v })} />
              )}
              {s.modes.includes('home') && <Label sub>{AR ? 'الزيارات المنزلية تُحجز في نوافذ مدتها ساعتان' : 'Home visits are booked in 2-hour windows'}</Label>}
            </>)}

            {step === 4 && (<>
              <Label bold>{AR ? 'جنس الطاقم المتاح' : 'Staff genders available'}</Label>
              <Row>
                <Chip label={AR ? 'رجال' : 'Men'} on={s.staff_genders.includes('male')} onPress={() => patch({ staff_genders: toggleIn(s.staff_genders, 'male') })} />
                <Chip label={AR ? 'نساء' : 'Women'} on={s.staff_genders.includes('female')} onPress={() => patch({ staff_genders: toggleIn(s.staff_genders, 'female') })} />
              </Row>
              <Label sub>{AR ? 'يستخدمه المريض عند تفضيل جنس الممرض أو الفني' : 'Used when the patient prefers a nurse or technician gender'}</Label>
              <NCard>
                <Label bold>{AR ? 'مراجعة سريعة' : 'Quick review'}</Label>
                <Label>{AR ? 'طرق الخدمة: ' : 'Modes: '}{s.modes.map((m) => (m === 'home' ? (AR ? 'منزلي' : 'Home') : (AR ? 'منشأة' : 'Facility'))).join(' + ') || '-'}</Label>
                {s.modes.includes('home') && <Label>{AR ? 'الزيارة المنزلية: ' : 'Home visit: '}{fmtMoney(parseAmount(fee) ?? 0, AR)}{' · '}{AR ? `${radius || '-'} كم` : `${radius || '-'} km`}</Label>}
                <Label>{AR ? 'التأمين: ' : 'Insurance: '}{AR ? `${sum.companies} شركات · ${sum.classes} فئات` : `${sum.companies} companies · ${sum.classes} classes`}</Label>
                {draft && draft.accepted_insurance.map((x) => <Label key={x.company_id} sub>{nameOf(x.company_id)}{': '}{x.classes.join(', ')}</Label>)}
                <Label>{AR ? 'القبول التلقائي: ' : 'Auto-accept: '}{s.auto_accept ? (AR ? 'مفعّل' : 'On') : (AR ? 'متوقف' : 'Off')}</Label>
              </NCard>
              <Label sub>{AR ? 'تضيف الأسعار في الخطوة التالية، ويمكنك تعديل كل شيء لاحقًا' : 'You add prices next, and can change everything later'}</Label>
            </>)}

            {stepError && <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{stepError}</Text>}
            <Row style={{ justifyContent: 'space-between' }}>
              {step < TOTAL
                ? <NBtn label={AR ? 'التالي' : 'Next'} onPress={next} />
                : <NBtn label={AR ? 'ابدأ استقبال الطلبات' : 'Start receiving orders'} onPress={save} loading={saving} />}
            </Row>
          </View>
        )}
      </LoadState>
    </NScroll>
  );
}
