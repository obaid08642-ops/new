import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, useToast } from '../../context';
import { NBtn, NCard, NBadge, NEmpty, NHeader, NInput, NScroll, NSearch, NSheet, NToggle } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import { OrderingApi, type OrderingItemView } from '../../api/ordering';
import { buildItemPayload, filterItems, isCustom, itemName, lacksPrice, orderingErrorMessage, uncoveredCompanies, type ItemFilter } from './logic';
import { Chip, Label, LoadState, Row, fmtMoney, useAR, useKind, useLoad, type OrderingScreenProps } from './common';

// Ord31: the provider's items, defaults on top, a per-item override sheet. Fields are those of OrderingItemView.
export function OrderingItemsScreen({ kind, onBack, onNav }: OrderingScreenProps) {
  const AR = useAR();
  const { theme } = useTheme();
  const { show } = useToast();
  const k = useKind(kind);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [edit, setEdit] = useState<OrderingItemView | null>(null);

  const items = useLoad(() => (k ? OrderingApi.listItems(k) : Promise.resolve([])), [k]);
  const settings = useLoad(() => OrderingApi.getSettings(), []);
  const insurers = useLoad(() => OrderingApi.insurers(), []);

  const all = items.data ?? [];
  const shown = useMemo(() => filterItems(all, q, filter, AR), [all, q, filter, AR]);
  const nameOf = (id: string) => { const c = insurers.data?.find((x) => x.id === id); return c ? (AR ? c.ar : c.en) : id; };
  const s = settings.data;
  const noPrice = all.filter(lacksPrice).length;
  const custom = all.filter(isCustom).length;

  const replace = (v: OrderingItemView) => items.setData(all.map((x) => (x.catalog_id === v.catalog_id ? v : x)));

  return (
    <NScroll>
      <NHeader onBack={onBack} title={AR ? 'فحوصي وأسعارها' : 'My tests and prices'} />
      <LoadState loading={items.loading || settings.loading} error={items.error || settings.error} onRetry={() => { items.reload(); settings.reload(); }}>
        <View style={{ gap: SP.md, paddingTop: SP.md }}>
          {s && (
            <NCard>
              <Row style={{ justifyContent: 'space-between' }}>
                <Label bold>{AR ? 'إعداداتك الافتراضية' : 'Your defaults'}</Label>
                <NBtn size="xs" variant="outline" full={false} label={AR ? 'تعديل' : 'Edit'} onPress={() => onNav('ordering_settings')} />
              </Row>
              {s.modes.includes('home') && <Label sub>{AR ? `رسوم الزيارة ${fmtMoney(s.home_fee, AR)} · نطاق ${s.home_radius_km ?? '-'} كم` : `Visit fee ${fmtMoney(s.home_fee, AR)} · radius ${s.home_radius_km ?? '-'} km`}</Label>}
              <Label sub>{AR ? `${s.accepted_insurance.filter((x) => x.active).length} شركات تأمين` : `${s.accepted_insurance.filter((x) => x.active).length} insurers`}</Label>
              <Label sub>{AR ? 'كل فحص يرث هذه الإعدادات إلا إذا غيّرتها له' : 'Every test inherits these settings unless you change them for it'}</Label>
            </NCard>
          )}
          <NSearch value={q} onChange={setQ} placeholder={AR ? 'ابحث في فحوصك' : 'Search your tests'} />
          <Row>
            <Chip label={AR ? 'الكل' : 'All'} on={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label={AR ? `بلا سعر · ${noPrice}` : `No price · ${noPrice}`} on={filter === 'noprice'} onPress={() => setFilter('noprice')} />
            <Chip label={AR ? `مخصّص · ${custom}` : `Customised · ${custom}`} on={filter === 'custom'} onPress={() => setFilter('custom')} />
          </Row>
          <Row>
            <NBtn size="sm" variant="outline" full={false} label={AR ? 'أدوات التعديل المجمّع' : 'Bulk tools'} onPress={() => onNav('ordering_bulk')} />
          </Row>

          {all.length === 0 ? (
            <View style={{ minHeight: 260 }}>
              <NEmpty icon="document" title={AR ? 'لم تضف فحوصًا بعد' : 'You have not added tests yet'} actionLabel={AR ? 'أضف من الكتالوج الوطني' : 'Add from the national catalogue'} onAction={() => onNav('ordering_bulk')} />
            </View>
          ) : shown.length === 0 ? (
            <Label sub>{AR ? 'لا توجد نتائج' : 'No results'}</Label>
          ) : shown.map((i) => {
            const miss = uncoveredCompanies(i, s?.accepted_insurance ?? []);
            return (
              <NCard key={i.catalog_id} onPress={() => setEdit(i)} accent={lacksPrice(i) ? theme.warn : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}><Label bold>{itemName(i, AR)}</Label></View>
                  <NBadge size="xs" variant={isCustom(i) ? 'primary' : 'default'} label={isCustom(i) ? (AR ? 'مخصّص' : 'Custom') : (AR ? 'يرث الإعداد' : 'Inherits')} />
                </Row>
                {i.turnaround_hours != null && <Label sub>{AR ? `النتيجة خلال ${i.turnaround_hours} ساعات` : `Result within ${i.turnaround_hours} hours`}</Label>}
                {miss.length > 0 && <Label sub>{AR ? 'غير مغطى من: ' : 'Not covered by: '}{miss.map(nameOf).join(', ')}</Label>}
                {i.modes.length === 0 || (i.modes.length === 1 && i.modes[0] === 'facility' && s?.modes.includes('home'))
                  ? <Label sub>{AR ? 'المركز فقط' : 'Facility only'}</Label> : null}
                <Row>
                  {(['facility', 'home'] as const).filter((m) => i.modes.includes(m)).map((m) => (
                    <Text key={m} style={{ fontSize: FS.sm, color: typeof i.prices[m] === 'number' ? theme.text : theme.warn, fontWeight: FW.semi }}>
                      {m === 'home' ? (AR ? 'منزلي: ' : 'Home: ') : (AR ? 'في المنشأة: ' : 'Facility: ')}
                      {typeof i.prices[m] === 'number' ? fmtMoney(i.prices[m] as number, AR) : (AR ? 'أضف السعر' : 'Add price')}
                    </Text>
                  ))}
                </Row>
              </NCard>
            );
          })}
        </View>
      </LoadState>
      {edit && k && s && (
        <ItemSheet kind={k} item={edit} modes={s.modes} nameOf={nameOf} defaults={s.accepted_insurance}
          onClose={() => setEdit(null)}
          onSaved={(v) => { replace(v); setEdit(null); show(AR ? 'تم الحفظ' : 'Saved', 'success'); }} />
      )}
    </NScroll>
  );
}

function ItemSheet({ kind, item, modes, defaults, nameOf, onClose, onSaved }: {
  kind: import('../../api/ordering').ServiceKind; item: OrderingItemView; modes: import('../../api/ordering').OrderMode[];
  defaults: import('../../api/ordering').InsurerClasses[]; nameOf: (id: string) => string; onClose: () => void; onSaved: (v: OrderingItemView) => void;
}) {
  const AR = useAR();
  const { theme } = useTheme();
  const [facility, setFacility] = useState(item.prices.facility != null ? String(item.prices.facility) : '');
  const [home, setHome] = useState(item.prices.home != null ? String(item.prices.home) : '');
  const [turnaround, setTurnaround] = useState(item.turnaround_hours != null ? String(item.turnaround_hours) : '');
  const [prepAr, setPrepAr] = useState(item.preparation?.ar ?? '');
  const [prepEn, setPrepEn] = useState(item.preparation?.en ?? '');
  const [available, setAvailable] = useState(item.available);
  const [homeAllowed, setHomeAllowed] = useState(item.modes.includes('home'));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const offersHome = modes.includes('home');
  const offersFacility = modes.includes('facility');
  // The item view carries no "portable" flag: a radiology item that inherits modes and shows no home is treated as centre-only.
  const lockedHome = kind === 'radiology' && item.inherited.modes && !item.modes.includes('home');
  const miss = uncoveredCompanies(item, defaults);

  const save = async () => {
    const r = buildItemPayload(kind, item, { facility, home, turnaround, prep_ar: prepAr, prep_en: prepEn, available, homeAllowed: lockedHome ? false : homeAllowed }, modes, !lockedHome);
    if (r.error) { setErr(orderingErrorMessage({ message: r.error }, AR)); return; }
    setSaving(true); setErr(null);
    try { onSaved(await OrderingApi.putItem(r.body)); } catch (e) { setErr(orderingErrorMessage(e, AR)); } finally { setSaving(false); }
  };
  const reset = async () => {
    setSaving(true); setErr(null);
    try { onSaved(await OrderingApi.putItem({ service_kind: kind, catalog_id: item.catalog_id, modes: null, prices: {}, accepted_insurance: null, turnaround_hours: null, preparation: null, available: true })); }
    catch (e) { setErr(orderingErrorMessage(e, AR)); } finally { setSaving(false); }
  };

  return (
    <NSheet visible onClose={onClose} title={AR ? 'تخصيص الفحص' : 'Customise this test'}>
      <Label bold>{itemName(item, AR)}</Label>
      <Label sub>{AR ? 'اترك الحقل فارغًا ليرث الإعداد الافتراضي' : 'Leave a field empty to inherit the default'}</Label>
      {offersFacility && <NInput kbType="numeric" label={AR ? 'السعر في المنشأة' : 'Price at the facility'} value={facility} onChange={(v) => setFacility(v.replace(/[^0-9.]/g, ''))} />}
      {offersHome && !lockedHome && homeAllowed && <NInput kbType="numeric" label={AR ? 'السعر في المنزل' : 'Price at home'} value={home} onChange={(v) => setHome(v.replace(/[^0-9.]/g, ''))} />}
      {offersHome && (
        <>
          <NToggle label={AR ? 'السماح بالمنزل' : 'Allow at home'} value={lockedHome ? false : homeAllowed} onChange={setHomeAllowed} />
          {lockedHome && <><Label bold>{AR ? 'الأشعة المنزلية متاحة للأجهزة المحمولة فقط' : 'Home radiology is for portable units only'}</Label><Label sub>{AR ? 'هذا الفحص يُجرى في المركز فقط، ولا يمكن تفعيل المنزل له' : 'This scan is done at the centre only; home cannot be turned on'}</Label></>}
        </>
      )}
      {miss.length > 0 && <Label sub>{AR ? 'غير مغطى من: ' : 'Not covered by: '}{miss.map(nameOf).join(', ')}</Label>}
      <NInput kbType="numeric" label={AR ? 'مدة ظهور النتيجة (ساعات)' : 'Result turnaround (hours)'} value={turnaround} onChange={(v) => setTurnaround(v.replace(/[^0-9.]/g, ''))} />
      <NInput multiline lines={2} label={AR ? 'نص التحضير (عربي)' : 'Preparation text (Arabic)'} value={prepAr} onChange={setPrepAr} />
      <NInput multiline lines={2} label={AR ? 'نص التحضير (إنجليزي)' : 'Preparation text (English)'} value={prepEn} onChange={setPrepEn} />
      <NToggle label={AR ? 'متاح للمرضى' : 'Available to patients'} value={available} onChange={setAvailable} />
      {err && <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: FS.sm, textAlign: AR ? 'right' : 'left', marginVertical: SP.sm }}>{err}</Text>}
      <View style={{ gap: SP.sm, marginTop: SP.md }}>
        <NBtn label={AR ? 'حفظ' : 'Save'} onPress={save} loading={saving} />
        <NBtn variant="outline" label={AR ? 'العودة للافتراضي' : 'Reset to default'} onPress={reset} disabled={saving} />
      </View>
    </NSheet>
  );
}
