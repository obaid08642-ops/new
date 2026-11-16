import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme, useToast, useLang } from '../../context';
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
  const { t: tt } = useLang();
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

  if (!k) return <NScroll><NHeader title={tt('oset.44bd35c7')} onBack={onBack} /><Label sub>{tt('oset.68604433')}</Label></NScroll>;

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
      show(tt('oset.8cf3aa92'), 'success');
      onNav('ordering_items');
    } catch (e) { setStepError(orderingErrorMessage(e, AR)); } finally { setSaving(false); }
  };

  const modeCard = (m: OrderMode, title: string, sub: string) => (
    <NCard onPress={() => toggleMode(m)} accent={s!.modes.includes(m) ? theme.primary : undefined} style={{ marginBottom: SP.md }}>
      <Label bold>{title}</Label>
      <Label sub>{sub}</Label>
      <Text style={{ color: s!.modes.includes(m) ? theme.primary : theme.textHint, fontWeight: FW.semi, textAlign: AR ? 'right' : 'left' }}>
        {s!.modes.includes(m) ? (tt('oset.c51dd876')) : (tt('oset.3a33b038'))}
      </Text>
    </NCard>
  );

  const sum = draft ? insuranceSummary(draft.accepted_insurance) : { companies: 0, classes: 0 };
  const nameOf = (id: string) => { const c = insurers.data?.find((x) => x.id === id); return c ? (AR ? c.ar : c.en) : id; };

  return (
    <NScroll>
      <NHeader onBack={step === 1 ? onBack : () => setStep(step - 1)} step={step} total={TOTAL}
        title={[tt('oset.2b49ca14'), tt('oset.5e936739'), tt('oset.4b22364d'), tt('oset.c56daf3d')][step - 1]}
        sub={tt('oset.44bd35c7')} />
      <LoadState loading={settings.loading} error={settings.error} onRetry={settings.reload}>
        {s && (
          <View style={{ gap: SP.md, paddingTop: SP.md }}>
            {step === 1 && (<>
              {modeCard('home', tt('oset.69ba9eb5'), tt('oset.d7fb4772'))}
              {modeCard('facility', tt('oset.0255c256'), tt('oset.c7d92582'))}
              {s.modes.includes('home') && (<>
                <NPriceInput label={tt('oset.94dd25eb')} value={fee} onChange={(v) => { setStepError(null); setFee(v); }} />
                <Label sub>{tt('oset.00d66e06')}</Label>
                <Label bold>{tt('oset.e151b46e')}</Label>
                <Row>
                  {RADII.map((r) => <Chip key={r} label={tt('tpy.0a77475e', { p1: String(r) })} on={parseAmount(radius) === r} onPress={() => { setStepError(null); setRadius(String(r)); }} />)}
                </Row>
                <NInput kbType="numeric" value={radius} onChange={(v) => { setStepError(null); setRadius(v.replace(/[^0-9.]/g, '')); }} label={tt('oset.11e1a075')} />
                <Label sub>{tt('oset.dd8ad388')}</Label>
              </>)}
            </>)}

            {step === 2 && (<>
              <NSearch value={q} onChange={setQ} placeholder={tt('oset.873fc521')} />
              <LoadState loading={insurers.loading} error={insurers.error} onRetry={insurers.reload}>
                {list.length === 0 && <Label sub>{tt('oset.3c84d492')}</Label>}
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
                          <Chip label={tt('oset.611e519d')} on={cur.length === c.classes.length}
                            onPress={() => patch({ accepted_insurance: setInsurerClasses(s.accepted_insurance, c.id, cur.length === c.classes.length ? [] : c.classes) })} />
                        )}
                      </Row>
                    </NCard>
                  );
                })}
              </LoadState>
              <Label sub>{tt('tpy.ec19a3d6', { p1: String(sum.companies), p2: String(sum.classes) })}</Label>
            </>)}

            {step === 3 && (<>
              <NToggle label={tt('oset.70a5ac6f')} sub={tt('oset.bf07182e')} value={s.auto_accept} onChange={(v) => patch({ auto_accept: v })} />
              {s.modes.includes('facility') && (
                <NToggle label={tt('oset.ab513fe3')} sub={tt('oset.17d1edf9')} value={s.walk_in} onChange={(v) => patch({ walk_in: v })} />
              )}
              {s.modes.includes('home') && <Label sub>{tt('oset.2794f73f')}</Label>}
            </>)}

            {step === 4 && (<>
              <Label bold>{tt('oset.c2e39a71')}</Label>
              <Row>
                <Chip label={tt('oset.81665b9c')} on={s.staff_genders.includes('male')} onPress={() => patch({ staff_genders: toggleIn(s.staff_genders, 'male') })} />
                <Chip label={tt('oset.2f85e528')} on={s.staff_genders.includes('female')} onPress={() => patch({ staff_genders: toggleIn(s.staff_genders, 'female') })} />
              </Row>
              <Label sub>{tt('oset.320e6dc6')}</Label>
              <NCard>
                <Label bold>{tt('oset.292017df')}</Label>
                <Label>{tt('oset.0b4b5c90')}{s.modes.map((m) => (m === 'home' ? (tt('oset.8ca476d4')) : (tt('oset.0b2554a1')))).join(' + ') || '-'}</Label>
                {s.modes.includes('home') && <Label>{tt('oset.b2c00419')}{fmtMoney(parseAmount(fee) ?? 0, AR)}{' · '}{tt('tpy.0a77475e', { p1: String(radius || '-') })}</Label>}
                <Label>{tt('oset.a7e2891e')}{tt('tpy.ec19a3d6', { p1: String(sum.companies), p2: String(sum.classes) })}</Label>
                {draft && draft.accepted_insurance.map((x) => <Label key={x.company_id} sub>{nameOf(x.company_id)}{': '}{x.classes.join(', ')}</Label>)}
                <Label>{tt('oset.e0e910f2')}{s.auto_accept ? (tt('oset.c51dd876')) : (tt('oset.3e566413'))}</Label>
              </NCard>
              <Label sub>{tt('oset.d0b04cba')}</Label>
            </>)}

            {stepError && <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{stepError}</Text>}
            <Row style={{ justifyContent: 'space-between' }}>
              {step < TOTAL
                ? <NBtn label={tt('oset.65c136c7')} onPress={next} />
                : <NBtn label={tt('oset.d67c6709')} onPress={save} loading={saving} />}
            </Row>
          </View>
        )}
      </LoadState>
    </NScroll>
  );
}
