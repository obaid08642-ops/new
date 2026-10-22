import React, { useMemo, useState } from 'react';
import { View, Text, Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme, useToast } from '../../context';
import { NBtn, NCard, NCheckbox, NHeader, NInput, NScroll, NSearch } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import { OrderingApi, type CatalogRow, type ImportResult, type OrderMode } from '../../api/ordering';
import { buildBulkPayload, csvTemplate, itemName, looksLikeCsv, orderingErrorMessage, previewPrice, rejectedToCsv, stripBom, toggleIn, errorCodeOf, type BulkInput } from './logic';
import { Chip, Label, LoadState, Row, fmtMoney, useAR, useKind, useLoad, type OrderingScreenProps } from './common';

type Tool = 'add' | 'price' | 'csv' | 'copy';

// Ord32: bulk tools. add = PUT /items per catalogue row, price = POST bulk-price, csv = GET export + POST import, copy = POST copy-mode.
export function OrderingBulkScreen({ kind, onBack, onNav }: OrderingScreenProps) {
  const AR = useAR();
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
    run(async () => { const res = await OrderingApi.bulkPrice(body); return AR ? `تم تطبيق التغيير على ${res.updated} فحوص` : `Change applied to ${res.updated} tests`; });
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
    run(async () => { const res = await OrderingApi.copyMode({ service_kind: k, from, to }); return AR ? `تم نسخ ${res.copied} أسعار` : `Copied ${res.copied} prices`; });
  };
  const share = async (text: string) => {
    try { await Share.share({ message: text }); } catch { show(AR ? 'تعذرت المشاركة' : 'Could not share', 'error'); }
  };
  const exportCsv = () => {
    if (!k) return;
    run(async () => { const text = await OrderingApi.exportCsv(k); setCsv(text); setResult(null); return AR ? 'جاهز: أرسل الملف أو انسخه من الحقل' : 'Ready: share the file or copy it from the field'; });
  };
  const pickFile = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.[0]) return;
      const text = stripBom(await (await fetch(r.assets[0].uri)).text());
      setCsv(text); setResult(null);
    } catch { setErr(AR ? 'تعذّرت قراءة الملف' : 'Could not read the file'); }
  };
  const importCsv = () => {
    if (!k) return;
    if (!looksLikeCsv(csv)) { setErr(AR ? 'الملف غير صالح: تأكد أنه CSV وأعمدته مثل القالب' : 'The file is not valid: make sure it is a CSV with the template columns'); return; }
    run(async () => {
      const res = await OrderingApi.importCsv(k, stripBom(csv));
      setResult(res);
      return AR ? `تم استيراد ${res.imported} صفًا · ${res.rejected.length} صفوف بها أخطاء` : `Imported ${res.imported} rows · ${res.rejected.length} rows have errors`;
    });
  };

  if (!k) return <NScroll><NHeader title={AR ? 'أدوات التعديل المجمّع' : 'Bulk tools'} onBack={onBack} /></NScroll>;
  const modeChips = (v: OrderMode, set: (m: OrderMode) => void) => (
    <Row>
      {(['facility', 'home'] as const).filter((m) => modes.includes(m)).map((m) => <Chip key={m} on={v === m} onPress={() => set(m)} label={m === 'home' ? (AR ? 'منزلي' : 'Home') : (AR ? 'في المنشأة' : 'At the facility')} />)}
    </Row>
  );

  return (
    <NScroll>
      <NHeader onBack={onBack} title={AR ? 'أدوات التعديل المجمّع' : 'Bulk tools'} />
      <LoadState loading={settings.loading || items.loading} error={settings.error || items.error} onRetry={() => { settings.reload(); items.reload(); }}>
        <View style={{ gap: SP.md, paddingTop: SP.md }}>
          <Row>
            <Chip label={AR ? 'تغيير السعر' : 'Change price'} on={tool === 'price'} onPress={() => { setTool('price'); setErr(null); setOk(null); }} />
            <Chip label={AR ? 'إضافة من الكتالوج' : 'Add from catalogue'} on={tool === 'add'} onPress={() => { setTool('add'); setErr(null); setOk(null); }} />
            <Chip label="CSV" on={tool === 'csv'} onPress={() => { setTool('csv'); setErr(null); setOk(null); }} />
            <Chip label={AR ? 'نسخ وضع' : 'Copy mode'} on={tool === 'copy'} onPress={() => { setTool('copy'); setErr(null); setOk(null); }} />
          </Row>

          {tool === 'price' && (
            <NCard>
              <Label bold>{AR ? 'تغيير السعر لعدة فحوص' : 'Change the price of many tests'}</Label>
              <Label sub>{AR ? 'الوضع' : 'Mode'}</Label>
              {modeChips(effMode, setMode)}
              <Row style={{ marginTop: SP.md }}>
                <Chip label={AR ? 'رفع بنسبة' : 'Raise by %'} on={op === 'percent'} onPress={() => setOp('percent')} />
                <Chip label={AR ? 'سعر ثابت' : 'Fixed price'} on={op === 'set'} onPress={() => setOp('set')} />
              </Row>
              <NInput kbType="numeric" label={AR ? 'القيمة' : 'Value'} value={value} onChange={(v) => setValue(v.replace(/[^0-9.\-]/g, ''))} />
              <Label sub>{picked.length ? (AR ? `${picked.length} فحوص محددة` : `${picked.length} tests selected`) : (AR ? `كل الفحوص (${all.length})` : `All tests (${all.length})`)}</Label>
              {previews.map(({ i, before, after }) => (
                <Row key={i.catalog_id} style={{ justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, color: theme.text, fontSize: FS.sm }}>{itemName(i, AR)}</Text>
                  <Text style={{ color: theme.textSub, fontSize: FS.sm }}>
                    {typeof before === 'number' ? fmtMoney(before, AR) : '-'}{' → '}{typeof after === 'number' ? fmtMoney(after, AR) : '-'}
                  </Text>
                </Row>
              ))}
              <Label sub>{AR ? 'تحديد' : 'Select'}</Label>
              {all.map((i) => <NCheckbox key={i.catalog_id} label={itemName(i, AR)} value={picked.includes(i.catalog_id)} onChange={() => setPicked(toggleIn(picked, i.catalog_id))} />)}
              <NBtn label={AR ? `طبّق على ${scope.length} فحوص` : `Apply to ${scope.length} tests`} onPress={applyPrice} loading={busy} disabled={!scope.length || !modes.length} style={{ marginTop: SP.md }} />
            </NCard>
          )}

          {tool === 'add' && (
            <NCard>
              <Label bold>{AR ? 'إضافة من الكتالوج الوطني' : 'Add from the national catalogue'}</Label>
              <Label sub>{AR ? 'التحضير ومدة النتيجة تأتي من الكتالوج ويمكنك تعديلها' : 'Preparation and turnaround come from the catalogue and can be edited'}</Label>
              <NSearch value={q} onChange={setQ} placeholder={AR ? 'ابحث في الكتالوج' : 'Search the catalogue'} />
              <LoadState loading={catalogue.loading} error={catalogue.error} onRetry={catalogue.reload}>
                {catList.length === 0 && <Label sub>{AR ? 'لا توجد فحوص للإضافة' : 'Nothing to add'}</Label>}
                {catList.slice(0, 60).map((c) => <NCheckbox key={c.id} label={AR ? c.name_ar : c.name_en} value={addPicked.includes(c.id)} onChange={() => setAddPicked(toggleIn(addPicked, c.id))} />)}
              </LoadState>
              <NBtn label={AR ? `أضف ${addPicked.length} فحوص` : `Add ${addPicked.length} tests`} onPress={addSelected} loading={busy} disabled={!addPicked.length} style={{ marginTop: SP.md }} />
            </NCard>
          )}

          {tool === 'csv' && (
            <NCard>
              <Label bold>{AR ? 'استيراد وتصدير CSV' : 'CSV import and export'}</Label>
              <Row>
                <NBtn size="sm" variant="outline" full={false} label={AR ? 'تصدير فحوصي' : 'Export my tests'} onPress={exportCsv} loading={busy} />
                <NBtn size="sm" variant="outline" full={false} label={AR ? 'تنزيل القالب' : 'Download template'} onPress={() => { setCsv(csvTemplate()); setResult(null); }} />
                <NBtn size="sm" variant="outline" full={false} label={AR ? 'استيراد ملف' : 'Import a file'} onPress={pickFile} />
              </Row>
              <NInput multiline lines={6} label="CSV" placeholder="catalog_id,mode,price" value={csv} onChange={setCsv} />
              <Row>
                <NBtn size="sm" variant="outline" full={false} label={AR ? 'مشاركة / نسخ' : 'Share / copy'} onPress={() => share(csv)} disabled={!csv} />
                <NBtn size="sm" full={false} label={AR ? 'استيراد' : 'Import'} onPress={importCsv} loading={busy} disabled={!csv} />
              </Row>
              {result && result.rejected.length > 0 && (
                <View style={{ marginTop: SP.md }}>
                  {result.rejected.slice(0, 50).map((r) => (
                    <Label key={r.line} sub>{AR ? `السطر ${r.line}: ` : `Row ${r.line}: `}{orderingErrorMessage({ message: r.reason }, AR)}</Label>
                  ))}
                  <NBtn size="sm" variant="outline" full={false} label={AR ? 'مشاركة ملف الأخطاء' : 'Share the error file'} onPress={() => share(rejectedToCsv(result.rejected))} />
                </View>
              )}
            </NCard>
          )}

          {tool === 'copy' && (
            <NCard>
              <Label bold>{AR ? 'نسخ من وضع إلى وضع' : 'Copy from one mode to another'}</Label>
              <Label sub>{AR ? 'من' : 'From'}</Label>
              {modeChips(from, setFrom)}
              <Label sub>{AR ? 'إلى' : 'To'}</Label>
              {modeChips(to, setTo)}
              <Label sub>{AR ? 'تُنسخ الأسعار فقط إلى الفحوص التي لا سعر لها في الوضع الهدف، والفحوص التي لا تُجرى في هذا الوضع تُتخطى' : 'Only prices are copied, to tests with no price in the target mode; tests that cannot be done in that mode are skipped'}</Label>
              <NBtn label={AR ? 'نسخ الأسعار' : 'Copy prices'} onPress={copy} loading={busy} disabled={modes.length < 2} style={{ marginTop: SP.md }} />
              {modes.length < 2 && <Label sub>{AR ? 'فعّل الطريقتين في الإعداد أولًا' : 'Turn on both modes in your setup first'}</Label>}
            </NCard>
          )}

          {err && <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{err}</Text>}
          {ok && (
            <NCard accent={theme.success}>
              <Text style={{ color: theme.text, fontWeight: FW.semi, textAlign: AR ? 'right' : 'left' }}>{ok}</Text>
              <NBtn size="sm" variant="outline" full={false} label={AR ? 'عرض الفحوص' : 'View tests'} onPress={() => onNav('ordering_items')} style={{ marginTop: SP.sm }} />
            </NCard>
          )}
        </View>
      </LoadState>
    </NScroll>
  );
}
