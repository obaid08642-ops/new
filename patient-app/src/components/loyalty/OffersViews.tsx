import React from 'react';
import { Image, Pressable, Share, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Card, EmptyState } from '../../../../packages/ui-native/src';
import { ConsultList, ConsultScreen, Gate, Section, ShareGlyph, goBack, useConsultFormat } from '../consult/ConsultKit';
import { Panel, Pill, Row, rowsOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { pickLocalized } from '../../utils/localize';
import { logError } from '../../utils/logger';

/**
 * Offers (Batch 11, merge map section 7: list and detail stay). GET /home/offers, GET /offers/:id,
 * GET /promotions/offers/:id/providers. Titles, providers, prices, discounts, dates, inclusions and terms are the
 * server's own; the screen computes no discount and invents no price.
 */

const HOME = '/(tabs)' as Href;

interface OfferRow {
  id?: string;
  t?: string;
  prov?: string;
  disc?: string | number;
  price?: number | string;
  old?: number | string;
  rating?: number | null;
  sponsored?: boolean;
}

function Price({ value, strike = false }: { value: unknown; strike?: boolean }) {
  const { t, c, k, num } = useScreenUi();
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return null;
  return (
    <Text style={{ ...scale(t, strike ? 'meta' : 'h3', strike ? 'regular' : undefined), color: strike ? c.text.tertiary : c.text.primary, textDecorationLine: strike ? 'line-through' : 'none' }}>
      {k('offers.price', { amount: num(n, { maximumFractionDigits: 2 }) })}
    </Text>
  );
}

export function OffersListView() {
  const { k, t, c, flow, num } = useScreenUi();
  const remote = useRemote(async () => rowsOf<OfferRow>(await apiFetch('/home/offers')), [], 'offers:list');
  return (
    <ConsultList<OfferRow>
      title={k('offers.title')}
      onBack={() => goBack(HOME)}
      testID="offers-list"
      data={remote.data ?? []}
      status={remote.status === 'missing' ? 'ready' : remote.status}
      onRetry={() => void remote.reload()}
      onRefresh={() => void remote.reload(true)}
      keyExtractor={(o, i) => String(o.id ?? i)}
      empty={{ icon: 'tag', title: k('offers.emptyTitle'), body: k('offers.emptyBody') }}
      renderItem={(o) => (
        <Pressable accessibilityRole="button" accessibilityLabel={[o.t, o.prov].filter(Boolean).join(', ')} disabled={!o.id} onPress={() => o.id && router.push(`/offers/${o.id}` as Href)} testID={`offer-${o.id}`} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <Card padding="md">
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{o.t}</Text>
                  {o.prov ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{o.prov}</Text> : null}
                </View>
                {o.disc !== undefined && o.disc !== null && o.disc !== '' ? <Pill tone="danger" label={k('offers.discount', { value: String(o.disc) })} /> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Price value={o.price} />
                <Price value={o.old} strike />
                {typeof o.rating === 'number' ? <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary }}>{`★ ${num(o.rating, { maximumFractionDigits: 1 })}`}</Text> : null}
              </View>
              {o.sponsored ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{k('offers.sponsored')}</Text> : null}
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

interface Offer {
  title_ar?: string;
  title_en?: string;
  image?: string;
  provider?: { name?: string };
  original_price?: number;
  discounted_price?: number;
  start_date?: string;
  end_date?: string;
  target?: { sponsored?: boolean; inclusions?: string[]; terms?: string[] };
}
interface ProviderRow {
  id?: string;
  name?: string;
  specialty?: string;
  city?: string;
  rating_avg?: number;
  rating_count?: number;
}

export function OfferDetailView() {
  const { k, t, c, flow, num } = useScreenUi();
  const { date } = useConsultFormat();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const offerId = typeof id === 'string' ? id : '';
  const remote = useRemote(
    async () => {
      if (!offerId) throw new Error('no offer id');
      const offer = await apiFetch<Offer | null>(`/offers/${offerId}`);
      if (!offer) throw new Error('offer not found');
      const providers = await apiFetch<unknown>(`/promotions/offers/${offerId}/providers`).catch(() => []);
      return { offer, providers: Array.isArray(providers) ? (providers as ProviderRow[]) : [] };
    },
    [offerId],
    'offers:detail',
  );
  const offer = remote.data?.offer;
  const providers = remote.data?.providers ?? [];
  const title = pickLocalized(offer?.title_ar, offer?.title_en) ?? '';
  const providerName = offer?.provider?.name ?? '';
  const inclusions = Array.isArray(offer?.target?.inclusions) ? offer!.target!.inclusions! : [];
  const terms = Array.isArray(offer?.target?.terms) ? offer!.target!.terms! : [];
  const saving = offer && typeof offer.original_price === 'number' && typeof offer.discounted_price === 'number' ? offer.original_price - offer.discounted_price : 0;
  const validity = offer?.end_date ? k('offers.validUntil', { date: date(offer.end_date, true) }) : offer?.start_date ? k('offers.startsOn', { date: date(offer.start_date, true) }) : '';

  const share = async () => {
    if (!offer) return;
    try {
      await Share.share({ message: k('offers.shareMessage', { title, provider: providerName, price: num(offer.discounted_price ?? 0, { maximumFractionDigits: 2 }), old: num(offer.original_price ?? 0, { maximumFractionDigits: 2 }) }) });
    } catch (e) {
      logError('offers:share', e);
    }
  };

  return (
    <ConsultScreen
      title={k('offers.detailTitle')}
      onBack={() => goBack('/offers' as Href)}
      testID="offer-detail"
      actions={offer ? [{ key: 'share', label: k('offers.share'), icon: <ShareGlyph />, onPress: () => void share() }] : undefined}
    >
      <Gate status={remote.status === 'ready' && !offer ? 'missing' : remote.status} onRetry={() => void remote.reload()} missingTitle={k('offers.missingTitle')} missingBody={k('offers.missingBody')} errorTitle={k('offers.errorTitle')}>
        {offer ? (
          <>
            {offer.image ? <Image accessibilityIgnoresInvertColors accessibilityLabel={title} source={{ uri: offer.image }} style={{ width: '100%', height: 200, borderRadius: 24, backgroundColor: c.bg.surface }} resizeMode="cover" /> : null}
            <View style={{ gap: 6 }}>
              {offer.target?.sponsored ? <Pill tone="neutral" label={k('offers.sponsored')} /> : null}
              <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, ...flow }}>{title}</Text>
              {providerName ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{providerName}</Text> : null}
            </View>
            <Card padding="md">
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Price value={offer.discounted_price} />
                  {offer.original_price !== offer.discounted_price ? <Price value={offer.original_price} strike /> : null}
                </View>
                {saving > 0 ? <Pill tone="success" label={k('offers.save', { amount: num(saving, { maximumFractionDigits: 2 }) })} /> : null}
              </View>
            </Card>
            {validity ? <Row icon="calendar-dots" tone="blue" title={validity} last /> : null}
            {inclusions.length > 0 ? (
              <Section title={k('offers.inclusions')}>
                <Panel>
                  {inclusions.map((item, i) => (
                    <Row key={`${item}-${i}`} icon="check-circle" tone="mint" title={item} last={i === inclusions.length - 1} />
                  ))}
                </Panel>
              </Section>
            ) : null}
            {terms.length > 0 ? (
              <Section title={k('offers.terms')}>
                <Panel>
                  {terms.map((item, i) => (
                    <Row key={`${item}-${i}`} icon="info" tone="ink" title={item} last={i === terms.length - 1} />
                  ))}
                </Panel>
              </Section>
            ) : null}
            <Section title={k('offers.bookAt')}>
              {providers.length === 0 ? (
                <EmptyState icon="hospital" tone="blue" title={providerName ? k('offers.bookAtProvider', { provider: providerName }) : k('offers.noProviders')} />
              ) : (
                <Panel>
                  {providers.map((p, i) => (
                    <Row
                      key={String(p.id ?? i)}
                      icon="hospital"
                      tone="blue"
                      title={p.name ?? ''}
                      subtitle={[p.specialty, p.city].filter(Boolean).join(' — ') || undefined}
                      caption={typeof p.rating_avg === 'number' && p.rating_avg > 0 ? `★ ${num(p.rating_avg, { maximumFractionDigits: 1 })} (${num(p.rating_count ?? 0)})` : undefined}
                      onPress={p.id ? () => router.push({ pathname: '/consultations/book/[id]', params: { id: p.id } } as unknown as Href) : undefined}
                      last={i === providers.length - 1}
                    />
                  ))}
                </Panel>
              )}
            </Section>
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
