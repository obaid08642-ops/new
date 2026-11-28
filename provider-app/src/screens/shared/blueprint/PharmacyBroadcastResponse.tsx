import { buildHeaders } from '../../../security/Security';
import { API_BASE } from '../../../constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Dimensions, Switch, Platform, Alert, Vibration,
 ActivityIndicator, TextInput, Linking
} from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import client from '../../../api/client';
import { useServicesCatalog } from '../../../api/catalogs';
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet, NEmpty
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A patient's private file on an order (a prescription attachment, the photo of a box): the API path is not a URL the
 * phone can open, so it asks for the 5-minute signed link (GET /storage/:id/signed-url; the server checks this pharmacy
 * was asked about the order) and opens that.
 */
async function openPrivateFile(uri: unknown): Promise<boolean> {
  const id = typeof uri === 'string' ? decodeURIComponent(uri.split('/storage/')[1] || '') : '';
  if (!id) return false;
  try {
    const r = await client.get(`/storage/${encodeURIComponent(id)}/signed-url`);
    const url = r.data?.url;
    if (typeof url !== 'string' || !url) return false;
    await Linking.openURL(url);
    return true;
  } catch { return false; }
}

export function PharmacyBroadcastResponse({ onBack, broadcast }: { onBack: () => void; broadcast?: any }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [catalog, setCatalog] = useState<Record<string, any[]>>({});
  const [choices, setChoices] = useState<Record<string, any>>({});
  const [quote, setQuote] = useState<any>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [providerNote, setProviderNote] = useState('');
  /** #507: the pharmacy's own preparation estimate (minutes); empty sends none. */
  const [prepMinutes, setPrepMinutes] = useState('');
  const prepBody = () => { const n = Number(prepMinutes); return Number.isInteger(n) && n >= 5 && n <= 240 ? { preparation_minutes: n } : {}; };
  // Per-line re-search (name or barcode) over the pharmacy's own inventory.
  const [terms, setTerms] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState<string | null>(null);
  const [searched, setSearched] = useState<Record<string, boolean>>({});
  const orderId = broadcast?.order_id;
  const items = Array.isArray(broadcast?.items) ? broadcast.items : [];
  const attachments = Array.isArray((broadcast as any)?.attachments) ? (broadcast as any).attachments : [];

  const loadCatalog = useCallback(async () => {
    if (!orderId || !items.length) return;
    setLoadingCatalog(true);
    try {
      const rows = await Promise.all(items.map(async (item: any) => {
        const q = item.matched_sku || item.generic_name || item.name_ar || item.name_en || '';
        const response = await client.get('/provider/inventory/search', { params: { q, include_catalogue: 1 } });
        return [item.order_item_id, Array.isArray(response.data) ? response.data : []] as const;
      }));
      setCatalog(Object.fromEntries(rows));
    } catch {
      show(tt('pbr.fe5d40ae'), 'error');
    } finally {
      setLoadingCatalog(false);
    }
  }, [orderId, items.length, AR, show]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Digits only (6+) is treated as a barcode, anything else as a name/SKU term (server needs 2+ chars).
  const searchLine = async (lineId: string) => {
    const term = (terms[lineId] || '').trim();
    const isBarcode = /^\d{6,}$/.test(term);
    if (!isBarcode && term.length < 2) {
      show(tt('pbr.08c1a05c'), 'error');
      return;
    }
    setSearching(lineId);
    try {
      const response = await client.get('/provider/inventory/search', { params: isBarcode ? { barcode: term, include_catalogue: 1 } : { q: term, include_catalogue: 1 } });
      setCatalog(prev => ({ ...prev, [lineId]: Array.isArray(response.data) ? response.data : [] }));
      setSearched(prev => ({ ...prev, [lineId]: true }));
    } catch {
      show(tt('pbr.c493390b'), 'error');
    } finally {
      setSearching(null);
    }
  };

  const offerItems = () => items.map((item: any) => {
    const choice = choices[item.order_item_id] || { availability: 'unavailable' };
    const override = Number(choice.unit_price_override);
    return {
      order_item_id: item.order_item_id,
      availability: choice.availability,
      qty_offered: choice.qty_offered,
      inventory_item_id: choice.availability === 'available' ? choice.inventory_item_id : undefined,
      substitute_inventory_item_id: choice.availability === 'substitute' ? choice.inventory_item_id : undefined,
      // provider-journeys 1: a catalogue item (not in the inventory yet); the server adds it to the inventory
      ...(choice.availability !== 'unavailable' && choice.medicine_id ? { medicine_id: choice.medicine_id } : {}),
      ...(Number.isFinite(override) && override > 0 ? { unit_price_override: override } : {}),
    };
  });

  const preview = async () => {
    if (!orderId) return;
    setBusy(true);
    try {
      const response = await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/preview`, { items: offerItems(), ...prepBody() });
      setQuote(response.data);
      show(tt('pbr.e04484c4'), 'success');
    } catch (error: any) {
      setQuote(null);
      show(error?.response?.data?.message || (tt('pbr.ab5685d4')), 'error');
    } finally { setBusy(false); }
  };

  const saveDraft = async () => {
    if (!orderId || !quote) {
      show(tt('pbr.508d2b9a'), 'error');
      return;
    }
    setBusy(true);
    try {
      const draft = await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/draft`, { items: offerItems(), ...prepBody(), ...(providerNote.trim() ? { provider_note: providerNote.trim().slice(0, 500) } : {}) });
      setQuote({ ...quote, draft: draft.data });
      show(tt('pbr.02a26fa2'), 'success');
    } catch (error: any) {
      show(error?.response?.data?.message || (tt('pbr.34750c78')), 'error');
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!orderId || !quote?.draft?.id) {
      show(tt('pbr.2f4f4f46'), 'error');
      return;
    }
    setBusy(true);
    try {
      const offerId = quote.draft.id;
      await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/${offerId}/submit`);
      show(tt('pbr.2d8a8e8c'), 'success');
      onBack();
    } catch (error: any) {
      show(error?.response?.data?.message || (tt('pbr.45156243')), 'error');
    } finally { setBusy(false); }
  };

  if (!orderId) return <View style={{ flex: 1, backgroundColor: theme.bg }}><NHeader title={tt('pbr.7277e9e2')} onBack={onBack} /><NEmpty icon="document" title={tt('pbr.ef320bfa')} sub={tt('pbr.70de3b99')} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('pbr.f24e6afa')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: SP.xxl, gap: SP.md }}>
        <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{tt('tpal.cba31840', { p1: String(orderId.slice(-6)) })}</Text><Text style={{ color: theme.textSub, marginTop: SP.xs }}>{tt('pbr.5646923d')}</Text></NCard>
        {attachments.length > 0 && <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{tt('pbr.fa23d7fa')}</Text>{attachments.map((a: any, i: number) => (
          <TouchableOpacity key={i} onPress={() => { void openPrivateFile(a?.uri).then((ok) => { if (!ok) show(tt('pbr.421b8913'), 'error'); }); }}>
            <Text style={{ color: theme.primary }}>{a?.type === 'pdf' ? '📄' : '🖼️'} {tt('pbr.b65e82a4')} {i + 1}</Text>
          </TouchableOpacity>
        ))}</NCard>}
        {loadingCatalog && <ActivityIndicator color={theme.primary} />}
        {items.map((item: any) => {
          const selected = choices[item.order_item_id] || { availability: 'unavailable' };
          const options = catalog[item.order_item_id] || [];
          return <NCard key={item.order_item_id} style={{ gap: SP.sm }}>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{item.qty_requested}× {item.name_ar || item.name_en || item.matched_sku}</Text>
            {item.photo_uri ? (
              <TouchableOpacity accessibilityRole="link" onPress={() => { void openPrivateFile(item.photo_uri).then((ok) => { if (!ok) show(tt('pbr.28e25040'), 'error'); }); }}>
                <Text style={{ color: theme.primary }}>{tt('pbr.94254409')}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ flexDirection: 'row', gap: SP.xs, flexWrap: 'wrap' }}>
              {(['available', 'substitute', 'unavailable'] as const).map((availability) => <NBtn key={availability} label={availability === 'available' ? (tt('pbr.6bea3de7')) : availability === 'substitute' ? (tt('pbr.a610e36e')) : (tt('pbr.11ecec56'))} variant={selected.availability === availability ? 'primary' : 'outline'} onPress={() => { setChoices(prev => ({ ...prev, [item.order_item_id]: { ...prev[item.order_item_id], availability } })); setQuote(null); }} />)}
            </View>
            {selected.availability !== 'unavailable' && <>
              <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{tt('pbr.ec417c68')}</Text>
              <NInput placeholder={tt('pbr.e35118b6')} value={terms[item.order_item_id] || ''} onChange={(v: string) => setTerms(prev => ({ ...prev, [item.order_item_id]: v }))} />
              <NBtn label={tt('pbr.f61f44ef')} size="sm" variant="outline" loading={searching === item.order_item_id} onPress={() => searchLine(item.order_item_id)} />
              {options.length === 0 && !loadingCatalog && (
                <Text style={{ color: theme.textSub, fontSize: FS.xs }}>
                  {searched[item.order_item_id] ? (tt('pbr.c35bea1b')) : (tt('pbr.9f703381'))}
                </Text>
              )}
              {options.map((stock: any) => {
                // provider-journeys 1: a catalogue row has no inventory id yet (source "catalogue"); picking it sends its
                // medicine_id and the server adds it to this pharmacy's inventory at the offered quantity.
                const fromCatalogue = stock.source === 'catalogue';
                const picked = fromCatalogue ? selected.medicine_id === stock.medicine_id : selected.inventory_item_id === stock.id;
                const cataloguePrice = stock.price ? ` · ${stock.price} ${AR ? 'ر.س' : 'SAR'}` : '';
                return <TouchableOpacity key={fromCatalogue ? `cat-${stock.medicine_id}` : stock.id} onPress={() => { setChoices(prev => ({ ...prev, [item.order_item_id]: { availability: selected.availability, ...(fromCatalogue ? { medicine_id: stock.medicine_id } : { inventory_item_id: stock.id }), qty_offered: fromCatalogue ? Number(item.qty_requested || 1) : Math.min(Number(item.qty_requested || 1), Number(stock.stock || 0)) } })); setQuote(null); }} style={{ padding: SP.sm, borderWidth: 1, borderRadius: R.md, borderColor: picked ? theme.primary : theme.border }}><Text style={{ color: theme.text }}>{stock.name_ar || stock.name_en || stock.sku} · {fromCatalogue ? tt('pbr.fromCatalogue', { p1: cataloguePrice }) : `${tt('pbr.22eec9a4')}: ${stock.stock}`}</Text></TouchableOpacity>;
              })}
              {(selected.inventory_item_id || selected.medicine_id) && <NInput label={tt('pbr.26d3c44d')} value={String(selected.qty_offered || '')} kbType="number-pad" onChange={(value: string) => { const row: any = options.find((stock: any) => (selected.medicine_id ? stock.medicine_id === selected.medicine_id && stock.source === 'catalogue' : stock.id === selected.inventory_item_id)) || {}; const max = row.source === 'catalogue' ? Number(item.qty_requested || 1) : Number(row.stock || 0); const qty = Math.max(1, Math.min(Number(item.qty_requested || 1), max, Number(value || 0))); setChoices(prev => ({ ...prev, [item.order_item_id]: { ...prev[item.order_item_id], qty_offered: qty } })); setQuote(null); }} />}
              {(selected.inventory_item_id || selected.medicine_id) && <NInput label={tt('pbr.a4b49a03')} value={selected.unit_price_override ? String(selected.unit_price_override) : ''} kbType="number-pad" onChange={(value: string) => { setChoices(prev => ({ ...prev, [item.order_item_id]: { ...prev[item.order_item_id], unit_price_override: value } })); setQuote(null); }} />}
            </>}
          </NCard>;
        })}
        <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{tt('pbr.d1e3b565')}</Text>{quote ? <Text style={{ color: theme.textSub }}>{tt('tpal.2c2cac27', { p1: String(quote.totals?.delivery_fee ?? 0) })}</Text> : <Text style={{ color: theme.textSub }}>{tt('pbr.03a8962d')}</Text>}</NCard>
        <NCard><NInput label={tt('pbr.830040f5')} value={prepMinutes} kbType="number-pad" onChange={(v: string) => { setPrepMinutes(v.replace(/[^0-9]/g, '').slice(0, 3)); setQuote(null); }} /></NCard>
        <NCard><NInput label={tt('pbr.617d2147')} value={providerNote} onChange={(v: string) => setProviderNote(v.slice(0, 500))} multi multiline lines={2} maxLen={500} /></NCard>
        {quote && <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{tt('pbr.3b2e69d8')}</Text><Text style={{ color: theme.text }}>{tt('tpal.7e0676d9', { p1: String(quote.totals?.total ?? '—'), p2: String(quote.totals?.currency ?? '') })}</Text><Text style={{ color: theme.textSub }}>{tt('tpal.75d8d3f1', { p1: String(quote.quote_ttl_seconds ?? 600) })}</Text><Text style={{ color: theme.textSub }}>{quote.fulfillment?.policy_status === 'unavailable_read_only' ? (tt('pbr.fd198ecc')) : ''}</Text></NCard>}
        {/* decision 12 (issue 331, revised 2026-10-10): a line above the catalogue (SFDA) price is accepted and flagged; the pharmacist is warned per line and the admin reviews it */}
        {(() => {
          const flagged = (Array.isArray(quote?.draft?.items) ? quote.draft.items : []).filter((i: any) => i?.above_catalogue_price === true || i?.price_check === 'not_verified');
          if (!flagged.length) return null;
          return <NCard style={{ borderColor: theme.warn }}>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{tt('pbr.1cacccef')}</Text>
            {flagged.map((i: any) => <Text key={String(i.order_item_id)} style={{ color: theme.textSub, marginTop: SP.xs }}>
              {i.above_catalogue_price === true
                ? (tt('tpal.7213c8bb', { p1: String(i.name_ar || i.sku || ''), p2: String(i.unit_price), p3: String(i.catalogue_price) }))
                : (tt('tpal.9bd57e54', { p1: String(i.name_ar || i.sku || '') }))}
            </Text>)}
          </NCard>;
        })()}
        <NBtn label={busy ? (tt('pbr.0f694ade')) : (tt('pbr.3b2e69d8'))} disabled={busy} onPress={preview} />
        <NBtn label={tt('pbr.9b2fd94a')} variant="secondary" disabled={busy || !quote} onPress={saveDraft} />
        <NBtn label={tt('pbr.65a4a93d')} disabled={busy || !quote?.draft?.id} onPress={submit} />
      </ScrollView>
    </View>
  );
}

