import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, useToast, useLang } from '../../context';
import { NBtn, NCard, NBadge, NEmpty, NHeader, NInput, NScroll, NSearch, NSheet, NToggle } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import { OrderingApi, type OrderingItemView } from '../../api/ordering';
import { buildItemPayload, filterItems, isCustom, itemName, lacksPrice, orderingErrorMessage, uncoveredCompanies, type ItemFilter } from './logic';
import { Chip, Label, LoadState, Row, fmtMoney, useAR, useKind, useLoad, type OrderingScreenProps } from './common';

// Ord31: the provider's items, defaults on top, a per-item override sheet. Fields are those of OrderingItemView.
export function OrderingItemsScreen({ kind, onBack, onNav }: OrderingScreenProps) {
  const AR = useAR();
  const { t: tt } = useLang();
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
      <NHeader onBack={onBack} title={tt('oitems.d6c0bd39')} />
      <LoadState loading={items.loading || settings.loading} error={items.error || settings.error} onRetry={() => { items.reload(); settings.reload(); }}>
        <View style={{ gap: SP.md, paddingTop: SP.md }}>
          {s && (
            <NCard>
              <Row style={{ justifyContent: 'space-between' }}>
                <Label bold>{tt('oitems.94b81cfb')}</Label>
                <NBtn size="xs" variant="outline" full={false} label={tt('oitems.4cbb34bf')} onPress={() => onNav('ordering_settings')} />
              </Row>
              {s.modes.includes('home') && <Label sub>{tt('oitems.visitFeeRadius', { p1: fmtMoney(s.home_fee, AR), p2: String(s.home_radius_km ?? '-') })}</Label>}
              <Label sub>{tt('tpx.02176b51', { p1: String(s.accepted_insurance.filter((x) => x.active).length) })}</Label>
              <Label sub>{tt('oitems.a92b19e7')}</Label>
            </NCard>
          )}
          <NSearch value={q} onChange={setQ} placeholder={tt('oitems.3231675f')} />
          <Row>
            <Chip label={tt('oitems.eabe5f68')} on={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label={tt('tpx.beaa9076', { p1: String(noPrice) })} on={filter === 'noprice'} onPress={() => setFilter('noprice')} />
            <Chip label={tt('tpx.9b2417bd', { p1: String(custom) })} on={filter === 'custom'} onPress={() => setFilter('custom')} />
          </Row>
          <Row>
            <NBtn size="sm" variant="outline" full={false} label={tt('oitems.1c652d9c')} onPress={() => onNav('ordering_bulk')} />
          </Row>

          {all.length === 0 ? (
            <View style={{ minHeight: 260 }}>
              <NEmpty icon="document" title={tt('oitems.7bf4e517')} actionLabel={tt('oitems.ba22fcf4')} onAction={() => onNav('ordering_bulk')} />
            </View>
          ) : shown.length === 0 ? (
            <Label sub>{tt('oitems.a73cfee3')}</Label>
          ) : shown.map((i) => {
            const miss = uncoveredCompanies(i, s?.accepted_insurance ?? []);
            return (
              <NCard key={i.catalog_id} onPress={() => setEdit(i)} accent={lacksPrice(i) ? theme.warn : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}><Label bold>{itemName(i, AR)}</Label></View>
                  <NBadge size="xs" variant={isCustom(i) ? 'primary' : 'default'} label={isCustom(i) ? (tt('oitems.4e209203')) : (tt('oitems.1e654237'))} />
                </Row>
                {i.turnaround_hours != null && <Label sub>{tt('tpx.06794a1b', { p1: String(i.turnaround_hours) })}</Label>}
                {miss.length > 0 && <Label sub>{tt('oitems.f7caa7cc')}{miss.map(nameOf).join(', ')}</Label>}
                {i.modes.length === 0 || (i.modes.length === 1 && i.modes[0] === 'facility' && s?.modes.includes('home'))
                  ? <Label sub>{tt('oitems.fc6eee88')}</Label> : null}
                <Row>
                  {(['facility', 'home'] as const).filter((m) => i.modes.includes(m)).map((m) => (
                    <Text key={m} style={{ fontSize: FS.sm, color: typeof i.prices[m] === 'number' ? theme.text : theme.warn, fontWeight: FW.semi }}>
                      {m === 'home' ? (tt('oitems.f3c1891a')) : (tt('oitems.cba37453'))}
                      {typeof i.prices[m] === 'number' ? fmtMoney(i.prices[m] as number, AR) : (tt('oitems.d42d313e'))}
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
          onSaved={(v) => { replace(v); setEdit(null); show(tt('oitems.b5437442'), 'success'); }} />
      )}
    </NScroll>
  );
}

function ItemSheet({ kind, item, modes, defaults, nameOf, onClose, onSaved }: {
  kind: import('../../api/ordering').ServiceKind; item: OrderingItemView; modes: import('../../api/ordering').OrderMode[];
  defaults: import('../../api/ordering').InsurerClasses[]; nameOf: (id: string) => string; onClose: () => void; onSaved: (v: OrderingItemView) => void;
}) {
  const AR = useAR();
  const { t: tt } = useLang();
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
    <NSheet visible onClose={onClose} title={tt('oitems.8e83b2a8')}>
      <Label bold>{itemName(item, AR)}</Label>
      <Label sub>{tt('oitems.3e5bdf4b')}</Label>
      {offersFacility && <NInput kbType="numeric" label={tt('oitems.e036bf9b')} value={facility} onChange={(v) => setFacility(v.replace(/[^0-9.]/g, ''))} />}
      {offersHome && !lockedHome && homeAllowed && <NInput kbType="numeric" label={tt('oitems.360b4b3f')} value={home} onChange={(v) => setHome(v.replace(/[^0-9.]/g, ''))} />}
      {offersHome && (
        <>
          <NToggle label={tt('oitems.442b246c')} value={lockedHome ? false : homeAllowed} onChange={setHomeAllowed} />
          {lockedHome && <><Label bold>{tt('oitems.f8d49180')}</Label><Label sub>{tt('oitems.dc8d28f2')}</Label></>}
        </>
      )}
      {miss.length > 0 && <Label sub>{tt('oitems.f7caa7cc')}{miss.map(nameOf).join(', ')}</Label>}
      <NInput kbType="numeric" label={tt('oitems.3d3881e1')} value={turnaround} onChange={(v) => setTurnaround(v.replace(/[^0-9.]/g, ''))} />
      <NInput multiline lines={2} label={tt('oitems.45d4aeed')} value={prepAr} onChange={setPrepAr} />
      <NInput multiline lines={2} label={tt('oitems.d43fc1a6')} value={prepEn} onChange={setPrepEn} />
      <NToggle label={tt('oitems.5a0183a1')} value={available} onChange={setAvailable} />
      {err && <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: FS.sm, textAlign: AR ? 'right' : 'left', marginVertical: SP.sm }}>{err}</Text>}
      <View style={{ gap: SP.sm, marginTop: SP.md }}>
        <NBtn label={tt('oitems.0360038b')} onPress={save} loading={saving} />
        <NBtn variant="outline" label={tt('oitems.dab87afa')} onPress={reset} disabled={saving} />
      </View>
    </NSheet>
  );
}
