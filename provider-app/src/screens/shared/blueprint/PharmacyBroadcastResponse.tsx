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

export function PharmacyBroadcastResponse({ onBack, broadcast }: { onBack: () => void; broadcast?: any }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [catalog, setCatalog] = useState<Record<string, any[]>>({});
  const [choices, setChoices] = useState<Record<string, any>>({});
  const [quote, setQuote] = useState<any>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [providerNote, setProviderNote] = useState('');
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
        const response = await client.get('/provider/inventory/search', { params: { q } });
        return [item.order_item_id, Array.isArray(response.data) ? response.data : []] as const;
      }));
      setCatalog(Object.fromEntries(rows));
    } catch {
      show(AR ? 'تعذر تحميل كتالوج الصيدلية. لم يتم إنشاء أي عرض.' : 'Catalog loading failed. No offer was created.', 'error');
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
      show(AR ? 'اكتب حرفين على الأقل أو امسح/اكتب الباركود' : 'Type at least 2 letters, or enter a barcode', 'error');
      return;
    }
    setSearching(lineId);
    try {
      const response = await client.get('/provider/inventory/search', { params: isBarcode ? { barcode: term } : { q: term } });
      setCatalog(prev => ({ ...prev, [lineId]: Array.isArray(response.data) ? response.data : [] }));
      setSearched(prev => ({ ...prev, [lineId]: true }));
    } catch {
      show(AR ? 'تعذر البحث في مخزون الصيدلية' : 'Inventory search failed', 'error');
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
      ...(Number.isFinite(override) && override > 0 ? { unit_price_override: override } : {}),
    };
  });

  const preview = async () => {
    if (!orderId) return;
    setBusy(true);
    try {
      const response = await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/preview`, { items: offerItems() });
      setQuote(response.data);
      show(AR ? 'تم احتساب المعاينة من الخادم' : 'Server quote preview calculated', 'success');
    } catch (error: any) {
      setQuote(null);
      show(error?.response?.data?.message || (AR ? 'تعذر احتساب المعاينة' : 'Quote preview failed'), 'error');
    } finally { setBusy(false); }
  };

  const saveDraft = async () => {
    if (!orderId || !quote) {
      show(AR ? 'احسب المعاينة الخادمية أولاً' : 'Calculate a server quote preview first', 'error');
      return;
    }
    setBusy(true);
    try {
      const draft = await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/draft`, { items: offerItems(), ...(providerNote.trim() ? { provider_note: providerNote.trim().slice(0, 500) } : {}) });
      setQuote({ ...quote, draft: draft.data });
      show(AR ? 'حُفظت مسودة العرض؛ السعر والمخزون حددهما الخادم' : 'Offer draft saved; price and stock came from the server.', 'success');
    } catch (error: any) {
      show(error?.response?.data?.message || (AR ? 'تعذر حفظ المسودة' : 'Saving draft failed'), 'error');
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!orderId || !quote?.draft?.id) {
      show(AR ? 'احفظ المسودة أولاً' : 'Save a draft first', 'error');
      return;
    }
    setBusy(true);
    try {
      await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/${quote.draft.id}/submit`);
      show(AR ? 'تم إرسال العرض للمريض للاختيار الصريح' : 'Offer submitted for explicit patient selection', 'success');
      onBack();
    } catch (error: any) {
      show(error?.response?.data?.message || (AR ? 'تعذر إرسال العرض' : 'Submitting offer failed'), 'error');
    } finally { setBusy(false); }
  };

  if (!orderId) return <View style={{ flex: 1, backgroundColor: theme.bg }}><NHeader title={AR ? 'عرض الصيدلية' : 'Pharmacy offer'} onBack={onBack} /><NEmpty icon="document" title={AR ? 'لا يوجد بث مخوّل' : 'No authorized broadcast'} sub={AR ? 'ارجع إلى الرادار واختر بثاً مُخَوَّلاً.' : 'Return to the radar and choose an authorized broadcast.'} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'مؤلف عرض صيدلية' : 'Pharmacy offer composer'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: SP.xxl, gap: SP.md }}>
        <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? `بث #${orderId.slice(-6)}` : `Broadcast #${orderId.slice(-6)}`}</Text><Text style={{ color: theme.textSub, marginTop: SP.xs }}>{AR ? 'اختر فقط عناصر من كتالوج الصيدلية. لا تُدخل الأسعار أو رسوم التوصيل أو وقت الوصول يدوياً.' : 'Bind only pharmacy catalog items. Prices, delivery fees, and ETA are never entered here.'}</Text></NCard>
        {attachments.length > 0 && <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? 'مرفقات الوصفة' : 'Prescription attachments'}</Text>{attachments.map((a: any, i: number) => (
          <TouchableOpacity key={i} onPress={() => a?.uri && Linking.openURL(a.uri)}>
            <Text style={{ color: theme.primary }}>{a?.type === 'pdf' ? '📄' : '🖼️'} {AR ? 'فتح المرفق' : 'Open attachment'} {i + 1}</Text>
          </TouchableOpacity>
        ))}</NCard>}
        {loadingCatalog && <ActivityIndicator color={theme.primary} />}
        {items.map((item: any) => {
          const selected = choices[item.order_item_id] || { availability: 'unavailable' };
          const options = catalog[item.order_item_id] || [];
          return <NCard key={item.order_item_id} style={{ gap: SP.sm }}>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{item.qty_requested}× {item.name_ar || item.name_en || item.matched_sku}</Text>
            <View style={{ flexDirection: 'row', gap: SP.xs, flexWrap: 'wrap' }}>
              {(['available', 'substitute', 'unavailable'] as const).map((availability) => <NBtn key={availability} label={availability === 'available' ? (AR ? 'متوفر' : 'Available') : availability === 'substitute' ? (AR ? 'بديل' : 'Substitute') : (AR ? 'غير متوفر' : 'Unavailable')} variant={selected.availability === availability ? 'primary' : 'outline'} onPress={() => { setChoices(prev => ({ ...prev, [item.order_item_id]: { ...prev[item.order_item_id], availability } })); setQuote(null); }} />)}
            </View>
            {selected.availability !== 'unavailable' && <>
              <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{AR ? 'اختر عنصر الكتالوج الذي سيتحقق منه الخادم:' : 'Choose a catalog item for server validation:'}</Text>
              <NInput placeholder={AR ? 'بحث بالاسم أو الباركود' : 'Search by name or barcode'} value={terms[item.order_item_id] || ''} onChange={(v: string) => setTerms(prev => ({ ...prev, [item.order_item_id]: v }))} />
              <NBtn label={AR ? 'بحث' : 'Search'} size="sm" variant="outline" loading={searching === item.order_item_id} onPress={() => searchLine(item.order_item_id)} />
              {options.length === 0 && !loadingCatalog && (
                <Text style={{ color: theme.textSub, fontSize: FS.xs }}>
                  {searched[item.order_item_id] ? (AR ? 'لا نتائج في مخزونك. جرّب اسماً آخر أو أضف الصنف من المخزون.' : 'No match in your inventory. Try another name or add the item in Inventory.') : (AR ? 'لا يوجد صنف مطابق في مخزونك. ابحث باسم آخر أو بالباركود.' : 'No matching item in your inventory. Search another name or a barcode.')}
                </Text>
              )}
              {options.map((stock: any) => <TouchableOpacity key={stock.id} onPress={() => { setChoices(prev => ({ ...prev, [item.order_item_id]: { availability: selected.availability, inventory_item_id: stock.id, qty_offered: Math.min(Number(item.qty_requested || 1), Number(stock.stock || 0)) } })); setQuote(null); }} style={{ padding: SP.sm, borderWidth: 1, borderRadius: R.md, borderColor: selected.inventory_item_id === stock.id ? theme.primary : theme.border }}><Text style={{ color: theme.text }}>{stock.name_ar || stock.name_en || stock.sku} · {AR ? 'المتاح' : 'Stock'}: {stock.stock}</Text></TouchableOpacity>)}
              {selected.inventory_item_id && <NInput label={AR ? 'الكمية المقدمة' : 'Quantity offered'} value={String(selected.qty_offered || '')} kbType="number-pad" onChange={(value: string) => { const max = Number((options.find((stock: any) => stock.id === selected.inventory_item_id) || {}).stock || 0); const qty = Math.max(1, Math.min(Number(item.qty_requested || 1), max, Number(value || 0))); setChoices(prev => ({ ...prev, [item.order_item_id]: { ...prev[item.order_item_id], qty_offered: qty } })); setQuote(null); }} />}
              {selected.inventory_item_id && <NInput label={AR ? 'سعر مخصص (اختياري)' : 'Custom price (optional)'} value={selected.unit_price_override ? String(selected.unit_price_override) : ''} kbType="number-pad" onChange={(value: string) => { setChoices(prev => ({ ...prev, [item.order_item_id]: { ...prev[item.order_item_id], unit_price_override: value } })); setQuote(null); }} />}
            </>}
          </NCard>;
        })}
        <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? 'التسليم' : 'Fulfillment'}</Text>{quote ? <Text style={{ color: theme.textSub }}>{AR ? `رسوم التوصيل في المعاينة: ${quote.totals?.delivery_fee ?? 0} ر.س (يحددها الخادم)` : `Delivery fee in the preview: ${quote.totals?.delivery_fee ?? 0} SAR (set by the server)`}</Text> : <Text style={{ color: theme.textSub }}>{AR ? 'تظهر رسوم التوصيل بعد المعاينة الخادمية؛ لا يُقبل خيار أو رسوم أو ETA من الواجهة.' : 'The delivery fee appears after the server preview; the interface cannot set an option, fee, or ETA.'}</Text>}</NCard>
        <NCard><NInput label={AR ? 'ملاحظة للمريض (اختياري)' : 'Note for patient (optional)'} value={providerNote} onChange={(v: string) => setProviderNote(v.slice(0, 500))} multi multiline lines={2} maxLen={500} /></NCard>
        {quote && <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? 'معاينة خادمية' : 'Server quote preview'}</Text><Text style={{ color: theme.text }}>{AR ? `الإجمالي: ${quote.totals?.total ?? '—'} ${quote.totals?.currency ?? ''}` : `Total: ${quote.totals?.total ?? '—'} ${quote.totals?.currency ?? ''}`}</Text><Text style={{ color: theme.textSub }}>{AR ? `صالحة للمسودة لمدة ${quote.quote_ttl_seconds ?? 600} ثانية` : `Draft quote TTL: ${quote.quote_ttl_seconds ?? 600} seconds`}</Text><Text style={{ color: theme.textSub }}>{quote.fulfillment?.policy_status === 'unavailable_read_only' ? (AR ? 'سياسة التسليم غير متاحة للقراءة فقط.' : 'Delivery policy unavailable (read-only).') : ''}</Text></NCard>}
        <NBtn label={busy ? (AR ? 'جارٍ المعالجة…' : 'Working…') : (AR ? 'معاينة خادمية' : 'Server quote preview')} disabled={busy} onPress={preview} />
        <NBtn label={AR ? 'حفظ المسودة' : 'Save draft'} variant="secondary" disabled={busy || !quote} onPress={saveDraft} />
        <NBtn label={AR ? 'إرسال العرض للاختيار' : 'Submit for patient selection'} disabled={busy || !quote?.draft?.id} onPress={submit} />
      </ScrollView>
    </View>
  );
}

