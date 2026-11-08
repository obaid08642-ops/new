/**
 * Disputes on my bookings (scenario PV-15): the list of support tickets patients raised about one of this provider's consultation bookings.
 * Read only. The provider sees that a dispute exists, what it is about and where it stands; the patient's own words and identity stay with
 * support (GET /support/provider/disputes returns the subject, category, status, booking and dates, nothing else).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { useTheme, useLang } from '../../context';
import { NHeader, NCard, NScroll, NBadge, NEmpty, NSkeleton } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import { localeTag } from '../../i18n';
import client from '../../api/client';

export type ProviderDispute = {
  id: string;
  subject?: string;
  category?: string;
  status?: string;
  booking_kind?: string;
  booking_id?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BadgeVariant = 'warning' | 'info' | 'success' | 'default';
const STATUS_VARIANT: Record<string, BadgeVariant> = { OPEN: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success', CLOSED: 'default' };

/** A known status or category answers its translation key; anything else is shown as the backend wrote it. */
export const KNOWN_STATUS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export const KNOWN_CATEGORY = ['GENERAL', 'ORDER_ISSUE', 'PAYMENT', 'TECHNICAL', 'COMPLAINT', 'SUGGESTION'] as const;
export const KNOWN_BOOKING_KIND = ['consultation', 'lab', 'radiology'] as const;

export function ProviderDisputesScreen({ onBack }: { onBack?: () => void }) {
  const { theme } = useTheme();
  const { t, lang, isRTL } = useLang();
  const [items, setItems] = useState<ProviderDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setFailed(false);
    try {
      const res = await client.get('/support/provider/disputes');
      const body = res.data;
      setItems(Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const label = (group: string, known: readonly string[], value?: string) =>
    value && known.includes(value) ? t(`disputes.${group}.${value}` as any) : (value || t('disputes.unknown'));
  const date = (v?: string) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(localeTag(lang)) : '';
  };
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  return (
    <NScroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}>
      <NHeader title={t('disputes.title')} sub={t('disputes.subtitle')} onBack={onBack} />
      <View style={{ padding: SP.xl }}>
        <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.lg, ...align }}>{t('disputes.note')}</Text>
        {loading ? (
          <>
            <NSkeleton w="100%" h={96} style={{ marginBottom: SP.md }} />
            <NSkeleton w="100%" h={96} style={{ marginBottom: SP.md }} />
          </>
        ) : failed ? (
          <NEmpty icon="alert" title={t('disputes.error.title')} actionLabel={t('disputes.retry')} onAction={() => { setLoading(true); load(); }} />
        ) : items.length === 0 ? (
          <NEmpty icon="shield" title={t('disputes.empty.title')} sub={t('disputes.empty.sub')} />
        ) : (
          items.map((d) => (
            <NCard key={d.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
                <Text style={{ flex: 1, fontSize: FS.md, fontWeight: FW.bold, color: theme.text, ...align }} numberOfLines={2}>{d.subject || t('disputes.noSubject')}</Text>
                <NBadge label={label('status', KNOWN_STATUS, d.status)} variant={STATUS_VARIANT[d.status || ''] || 'default'} />
              </View>
              <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: 2, ...align }}>
                {t('disputes.about', { kind: label('booking', KNOWN_BOOKING_KIND, d.booking_kind) })}
                {' · '}{label('category', KNOWN_CATEGORY, d.category)}
              </Text>
              {!!date(d.createdAt) && (
                <Text style={{ fontSize: FS.sm, color: theme.textSub, ...align }}>{t('disputes.opened', { date: date(d.createdAt) })}</Text>
              )}
            </NCard>
          ))
        )}
      </View>
    </NScroll>
  );
}
