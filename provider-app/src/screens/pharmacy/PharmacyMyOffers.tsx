/**
 * Pharmacy "My offers" (P3): the offers this pharmacy sent, with the state the server reports
 * (sent, chosen, not chosen, expired, draft, cancelled) and how long a sent quote stays valid.
 * Reads GET /provider/pharmacy/offers (view_status, totals, quote_expires_at); no other endpoint.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme, useLang } from '../../context';
import { NCard, NHeader, NBadge, NBtn, NEmpty } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import { withAlpha } from '../../theme/tokens';
import client from '../../api/client';
import { OFFER_VIEW_STATUSES, OFFER_STATUS_LABEL, isOfferViewStatus, minutesLeft, type OfferViewStatus } from '../../utils/offerView';

interface OfferRow {
  id: string;
  order_id: string;
  view_status: OfferViewStatus;
  items_count: number;
  total: number | null;
  quote_expires_at: string | null;
}

function toRow(raw: unknown): OfferRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !isOfferViewStatus(o.view_status)) return null;
  const totals = (o.totals && typeof o.totals === 'object' ? o.totals : {}) as Record<string, unknown>;
  return {
    id: o.id,
    order_id: typeof o.order_id === 'string' ? o.order_id : '',
    view_status: o.view_status,
    items_count: typeof o.items_count === 'number' ? o.items_count : 0,
    total: typeof totals.total === 'number' ? totals.total : null,
    quote_expires_at: typeof o.quote_expires_at === 'string' ? o.quote_expires_at : null,
  };
}

const VARIANT: Record<OfferViewStatus, 'success' | 'danger' | 'warning' | 'info' | 'default' | 'primary'> = {
  sent: 'info', chosen: 'success', not_chosen: 'default', expired: 'warning', draft: 'default', cancelled: 'danger',
};

export function PharmacyMyOffersScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<OfferViewStatus | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const res = await client.get('/provider/pharmacy/offers');
      const list: unknown[] = Array.isArray(res.data) ? res.data : [];
      setRows(list.map(toRow).filter((r): r is OfferRow => r !== null));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => (filter === 'all' ? rows : rows.filter(r => r.view_status === filter)), [rows, filter]);
  const now = new Date();
  const dir = AR ? 'row-reverse' : 'row';
  const align = AR ? 'right' : 'left';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'عروضي' : 'My offers'} onBack={onBack} />
      <View style={{ flexDirection: dir, flexWrap: 'wrap', gap: SP.sm, padding: SP.lg, paddingBottom: SP.sm }}>
        {(['all', ...OFFER_VIEW_STATUSES] as const).map(k => {
          const on = filter === k;
          const label = k === 'all' ? (AR ? 'الكل' : 'All') : (AR ? OFFER_STATUS_LABEL[k].ar : OFFER_STATUS_LABEL[k].en);
          return (
            <TouchableOpacity key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setFilter(k)}
              style={{ paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.full, borderWidth: 1, borderColor: on ? theme.primary : theme.border, backgroundColor: on ? withAlpha(theme.primary, 0.12) : theme.surface }}>
              <Text style={{ color: on ? theme.primary : theme.text, fontSize: FS.sm }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xxl }} />
      ) : failed ? (
        <NCard style={{ margin: SP.lg, alignItems: 'center', gap: SP.sm }}>
          <Text style={{ color: theme.text, textAlign: 'center' }}>{AR ? 'تعذر تحميل العروض' : 'Could not load offers'}</Text>
          <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} size="sm" variant="outline" full={false} onPress={() => { void load(); }} />
        </NCard>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          {shown.length === 0 && <NEmpty icon="document" title={AR ? 'لا توجد عروض' : 'No offers'} sub={AR ? 'العروض التي ترسلها تظهر هنا' : 'Offers you send appear here'} />}
          {shown.map(r => {
            const left = r.view_status === 'sent' ? minutesLeft(r.quote_expires_at, now) : null;
            return (
              <NCard key={r.id} style={{ marginBottom: SP.md }}>
                <View style={{ flexDirection: dir, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                    {AR ? `طلب #${r.order_id.slice(-6)}` : `Order #${r.order_id.slice(-6)}`}
                  </Text>
                  <NBadge label={AR ? OFFER_STATUS_LABEL[r.view_status].ar : OFFER_STATUS_LABEL[r.view_status].en} variant={VARIANT[r.view_status]} size="xs" />
                </View>
                <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: align }}>
                  {AR ? `${r.items_count} أصناف` : `${r.items_count} items`}
                  {r.total != null ? ` · ${r.total} ${AR ? 'ريال' : 'SAR'}` : ''}
                </Text>
                {left != null && (
                  <Text style={{ color: left === 0 ? theme.danger : theme.textSub, marginTop: SP.xs, fontSize: FS.sm, textAlign: align }}>
                    {left === 0
                      ? (AR ? 'انتهت صلاحية العرض' : 'Quote has expired')
                      : (AR ? `العرض صالح لمدة ${left} دقيقة` : `Quote valid for ${left} min`)}
                  </Text>
                )}
              </NCard>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
