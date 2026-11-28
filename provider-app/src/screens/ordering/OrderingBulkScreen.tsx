import React, { useMemo, useState } from 'react';
import { View, Text, Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme, useToast, useLang } from '../../context';
import { NBtn, NCard, NCheckbox, NHeader, NInput, NScroll, NSearch } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import { OrderingApi, type CatalogRow, type ImportResult, type OrderMode } from '../../api/ordering';
import { buildBulkPayload, csvTemplate, itemName, looksLikeCsv, orderingErrorMessage, previewPrice, rejectedToCsv, stripBom, toggleIn, errorCodeOf, type BulkInput } from './logic';
import { Chip, Label, LoadState, Row, fmtMoney, useAR, useKind, useLoad, type OrderingScreenProps } from './common';

type Tool = 'add' | 'price' | 'csv' | 'copy';

// Ord32: bulk tools. add = PUT /items per catalogue row, price = POST bulk-price, csv = GET export + POST import, copy = POST copy-mode.
export function OrderingBulkScreen({ kind, onBack, onNav }: OrderingScreenProps) {
  const AR = useAR();
  const { t: tt } = useLang();
  const { theme } = useTheme();
  const { show } = useToast();
  const k = useKind(kind);
  const [tool, setTool] = useState<Tool>('price');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const items = useLoad(() => (k ? OrderingApi.listItems(k) : Promise.resolve([])), [k]);
  const settings = useLoad(() => OrderingApi.getSettings(), []);
  const catalogue = useLoad(() => (k && tool === 'add' ? OrderingApi.catalogue(k) : Promise.resolve([] as CatalogRow[])), [k, tool === 'add']);

  const modes: OrderMode[] = settings.data?.modes ?? [];
  const [mode, setMode] = useState<OrderMode>('facility');
  const [op, setOp] = useState<BulkInput['op']>('percent');
  const [value, setValue] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [addPicked, setAddPicked] = useState<string[]>([]);
  const [from, setFrom] = useState<OrderMode>('facility');
  const [to, setTo] = useState<OrderMode>('home');
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const all = items.data ?? [];
  const effMode: OrderMode = modes.includes(mode) ? mode : (modes[0] ?? 'facility');
  const bulkInput: BulkInput = { op, value, mode: effMode };
  const scope = picked.length ? all.filter((i) => picked.includes(i.catalog_id)) : all;
  const previews = scope.slice(0, 5).map((i) => ({ i, before: i.prices[effMode], after: previewPrice(i.prices[effMode], bulkInput) }));
  const owned = useMemo(() => new Set(all.map((i) => i.catalog_id)), [all]);
  const catList = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (catalogue.data ?? []).filter((c) => !owned.has(c.id) && (!needle || `${c.name_ar} ${c.name_en}`.toLowerCase().includes(needle)));
  }, [catalogue.data, owned, q]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setErr(null); setOk(null);
    try { const msg = await fn(); setOk(msg); items.reload(); } catch (e) { setErr(orderingErrorMessage(e, AR)); } finally { setBusy(false); }
  };

  const applyPrice = () => {
    if (!k) return;
    const r = buildBulkPayload(k, bulkInput, picked);
    if (!r.body) { setErr(orderingErrorMessage({ message: r.error }, AR)); return; }
    const body = r.body;
    run(async () => { const res = await OrderingApi.bulkPrice(body); return tt('tpv.47dc0ef4', { p1: String(res.updated) }); });
  };
  const addSelected = () => {
    if (!k || !addPicked.length) return;
    run(async () => {
      const res = await Promise.allSettled(addPicked.map((id) => OrderingApi.putItem({ service_kind: k, catalog_id: id })));
      const done = res.filter((x) => x.status === 'fulfilled').length;
      const failed = res.length - done;
      setAddPicked([]); catalogue.reload();
      if (failed && !done) throw (res.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason;
      return AR ? `أُضيف ${done} فحوص${failed ? ` · ${failed} فشلت` : ''}` : `Added ${done} tests${failed ? ` · ${failed} failed` : ''}`;
    });
  };
  const copy = () => {
    if (!k) return;
    if (from === to) { setErr(orderingErrorMessage({ message: 'copy_mode_invalid' }, AR)); return; }
    run(async () => { const res = await OrderingApi.copyMode({ service_kind: k, from, to }); return tt('tpv.cf163b54', { p1: String(res.copied) }); });
  };
  const share = async (text: string) => {
    try { await Share.share({ message: text }); } catch { show(tt('obulk.62001870'), 'error'); }
  };
  const exportCsv = () => {
    if (!k) return;
    run(async () => { const text = await OrderingApi.exportCsv(k); setCsv(text); setResult(null); return tt('obulk.a5ff5e14'); });
  };
  const pickFile = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.[0]) return;
      const text = stripBom(await (await fetch(r.assets[0].uri)).text());
      setCsv(text); setResult(null);
    } catch { setErr(tt('obulk.4703d127')); }
  };
  const importCsv = () => {
    if (!k) return;
    if (!looksLikeCsv(csv)) { setErr(tt('obulk.3a697d0b')); return; }
    run(async () => {
      const res = await OrderingApi.importCsv(k, stripBom(csv));
      setResult(res);
      return tt('tpv.b4a4f9ee', { p1: String(res.imported), p2: String(res.rejected.length) });
    });
  };

  if (!k) return <NScroll><NHeader title={tt('obulk.1c652d9c')} onBack={onBack} /></NScroll>;
  const modeChips = (v: OrderMode, set: (m: OrderMode) => void) => (
    <Row>
      {(['facility', 'home'] as const).filter((m) => modes.includes(m)).map((m) => <Chip key={m} on={v === m} onPress={() => set(m)} label={m === 'home' ? (tt('obulk.8ca476d4')) : (tt('obulk.0255c256'))} />)}
    </Row>
  );

  return (
    <NScroll>
      <NHeader onBack={onBack} title={tt('obulk.1c652d9c')} />
      <LoadState loading={settings.loading || items.loading} error={settings.error || items.error} onRetry={() => { settings.reload(); items.reload(); }}>
        <View style={{ gap: SP.md, paddingTop: SP.md }}>
          <Row>
            <Chip label={tt('obulk.8657fb63')} on={tool === 'price'} onPress={() => { setTool('price'); setErr(null); setOk(null); }} />
            <Chip label={tt('obulk.07e89c10')} on={tool === 'add'} onPress={() => { setTool('add'); setErr(null); setOk(null); }} />
            <Chip label="CSV" on={tool === 'csv'} onPress={() => { setTool('csv'); setErr(null); setOk(null); }} />
            <Chip label={tt('obulk.14ae7ee6')} on={tool === 'copy'} onPress={() => { setTool('copy'); setErr(null); setOk(null); }} />
          </Row>

          {tool === 'price' && (
            <NCard>
              <Label bold>{tt('obulk.fc6946d7')}</Label>
              <Label sub>{tt('obulk.f1cbf600')}</Label>
              {modeChips(effMode, setMode)}
              <Row style={{ marginTop: SP.md }}>
                <Chip label={tt('obulk.526c8460')} on={op === 'percent'} onPress={() => setOp('percent')} />
                <Chip label={tt('obulk.9fbee11f')} on={op === 'set'} onPress={() => setOp('set')} />
              </Row>
              <NInput kbType="numeric" label={tt('obulk.75c4f131')} value={value} onChange={(v) => setValue(v.replace(/[^0-9.\-]/g, ''))} />
              <Label sub>{picked.length ? (tt('tpv.49105892', { p1: String(picked.length) })) : (tt('tpv.64a5ab9e', { p1: String(all.length) }))}</Label>
              {previews.map(({ i, before, after }) => (
                <Row key={i.catalog_id} style={{ justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, color: theme.text, fontSize: FS.sm }}>{itemName(i, AR)}</Text>
                  <Text style={{ color: theme.textSub, fontSize: FS.sm }}>
                    {typeof before === 'number' ? fmtMoney(before, AR) : '-'}{' → '}{typeof after === 'number' ? fmtMoney(after, AR) : '-'}
                  </Text>
                </Row>
              ))}
              <Label sub>{tt('obulk.1c0bc73d')}</Label>
              {all.map((i) => <NCheckbox key={i.catalog_id} label={itemName(i, AR)} value={picked.includes(i.catalog_id)} onChange={() => setPicked(toggleIn(picked, i.catalog_id))} />)}
              <NBtn label={tt('tpv.26031927', { p1: String(scope.length) })} onPress={applyPrice} loading={busy} disabled={!scope.length || !modes.length} style={{ marginTop: SP.md }} />
            </NCard>
          )}

          {tool === 'add' && (
            <NCard>
              <Label bold>{tt('obulk.3c00a2d8')}</Label>
              <Label sub>{tt('obulk.2ed5a101')}</Label>
              <NSearch value={q} onChange={setQ} placeholder={tt('obulk.8fd18e53')} />
              <LoadState loading={catalogue.loading} error={catalogue.error} onRetry={catalogue.reload}>
                {catList.length === 0 && <Label sub>{tt('obulk.7dfea871')}</Label>}
                {catList.slice(0, 60).map((c) => <NCheckbox key={c.id} label={AR ? c.name_ar : c.name_en} value={addPicked.includes(c.id)} onChange={() => setAddPicked(toggleIn(addPicked, c.id))} />)}
              </LoadState>
              <NBtn label={tt('tpv.6e7def5f', { p1: String(addPicked.length) })} onPress={addSelected} loading={busy} disabled={!addPicked.length} style={{ marginTop: SP.md }} />
            </NCard>
          )}

          {tool === 'csv' && (
            <NCard>
              <Label bold>{tt('obulk.825295a8')}</Label>
              <Row>
                <NBtn size="sm" variant="outline" full={false} label={tt('obulk.d22f3b0b')} onPress={exportCsv} loading={busy} />
                <NBtn size="sm" variant="outline" full={false} label={tt('obulk.4e9006df')} onPress={() => { setCsv(csvTemplate()); setResult(null); }} />
                <NBtn size="sm" variant="outline" full={false} label={tt('obulk.274129f0')} onPress={pickFile} />
              </Row>
              <NInput multiline lines={6} label="CSV" placeholder="catalog_id,mode,price" value={csv} onChange={setCsv} /> // i18n-ok: CSV column headers the user must type verbatim, not translatable prose
              <Row>
                <NBtn size="sm" variant="outline" full={false} label={tt('obulk.0357c2f3')} onPress={() => share(csv)} disabled={!csv} />
                <NBtn size="sm" full={false} label={tt('obulk.13269063')} onPress={importCsv} loading={busy} disabled={!csv} />
              </Row>
              {result && result.rejected.length > 0 && (
                <View style={{ marginTop: SP.md }}>
                  {result.rejected.slice(0, 50).map((r) => (
                    <Label key={r.line} sub>{tt('tpv.35e72797', { p1: String(r.line) })}{orderingErrorMessage({ message: r.reason }, AR)}</Label>
                  ))}
                  <NBtn size="sm" variant="outline" full={false} label={tt('obulk.4c51689f')} onPress={() => share(rejectedToCsv(result.rejected))} />
                </View>
              )}
            </NCard>
          )}

          {tool === 'copy' && (
            <NCard>
              <Label bold>{tt('obulk.7f361ff6')}</Label>
              <Label sub>{tt('obulk.ecdb7711')}</Label>
              {modeChips(from, setFrom)}
              <Label sub>{tt('obulk.32c46ecf')}</Label>
              {modeChips(to, setTo)}
              <Label sub>{tt('obulk.fac01444')}</Label>
              <NBtn label={tt('obulk.af211d88')} onPress={copy} loading={busy} disabled={modes.length < 2} style={{ marginTop: SP.md }} />
              {modes.length < 2 && <Label sub>{tt('obulk.77c009ac')}</Label>}
            </NCard>
          )}

          {err && <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{err}</Text>}
          {ok && (
            <NCard accent={theme.success}>
              <Text style={{ color: theme.text, fontWeight: FW.semi, textAlign: AR ? 'right' : 'left' }}>{ok}</Text>
              <NBtn size="sm" variant="outline" full={false} label={tt('obulk.ce02bbfa')} onPress={() => onNav('ordering_items')} style={{ marginTop: SP.sm }} />
            </NCard>
          )}
        </View>
      </LoadState>
    </NScroll>
  );
}
