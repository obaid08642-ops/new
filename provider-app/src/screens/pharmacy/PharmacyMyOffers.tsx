/**
 * Pharmacy "My offers" (P3): the offers this pharmacy sent, with the state the patient's choice put them in.
 * Reads GET /provider/pharmacy/offers?status= only.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NCard, NHeader, NBadge, NEmpty } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';
import { OFFER_FILTERS, OFFER_VIEW_META, OfferFilter, OfferRow, mapOffers, offersPath } from './offersList';

export function PharmacyMyOffers({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [filter, setFilter] = useState<OfferFilter>('all');
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (f: OfferFilter) => {
    setLoading(true); setFailed(false);
    try {
      const res = await client.get(offersPath(f));
      setRows(mapOffers(res.data));
    } catch {
      setRows([]); setFailed(true);
      show(tt('rrce.e40fc44a'), 'error');
    } finally { setLoading(false); }
  }, [AR, show]);
  useEffect(() => { void load(filter); }, [filter, load]);

  const fmtDate = (iso: string) => new Date(iso).toLocaleString(AR ? 'ar-SA' : 'en-GB');

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('rrce.4cc750e5')} onBack={onBack} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ padding: SP.lg, gap: SP.sm, flexDirection: AR ? 'row-reverse' : 'row' }}>
        {OFFER_FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} accessibilityRole="button" accessibilityState={{ selected: filter === f.key }}
            style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: 999, borderWidth: 1, borderColor: filter === f.key ? theme.primary : 'transparent', backgroundColor: filter === f.key ? theme.primaryLight : theme.surface2 }}>
            <Text style={{ color: filter === f.key ? theme.primary : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>{AR ? f.ar : f.en}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingTop: 0, paddingBottom: 100 }}>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />}
        {!loading && !failed && rows.length === 0 && (
          <NEmpty title={tt('rrce.3ecb83da')} subtitle={tt('rrce.59ee1c77')} />
        )}
        {!loading && rows.map(r => {
          const meta = r.view ? OFFER_VIEW_META[r.view] : null;
          return (
            <NCard key={r.id} style={{ marginBottom: SP.md, padding: SP.lg }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: SP.sm }}>
                <Text style={{ color: theme.text, fontWeight: FW.bold, flex: 1, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>
                  {(tt('rrce.520d902c')) + r.orderId.slice(0, 8)}
                </Text>
                {meta && <NBadge size="xs" variant={meta.variant} label={AR ? meta.ar : meta.en} />}
              </View>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: SP.sm }}>
                <Text style={{ color: theme.text, fontWeight: FW.semi }}>{r.total === null ? '—' : `${r.total} ${r.currency === 'SAR' ? (tt('rrce.91d5796f')) : r.currency}`}</Text>
                <Text style={{ color: theme.textSub }}>{tt('tpac.fc3f0d35', { p1: String(r.itemsCount) })}</Text>
              </View>
              {r.quoteExpiresAt && (
                <Text style={{ color: theme.textSub, fontSize: FS.xs, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>
                  {(tt('rrce.83eddde4')) + fmtDate(r.quoteExpiresAt)}
                </Text>
              )}
              {r.view === 'chosen' && (
                <Text style={{ color: theme.success, fontSize: FS.xs, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>
                  {tt('rrce.75d7e355')}
                </Text>
              )}
            </NCard>
          );
        })}
      </ScrollView>
    </View>
  );
}
