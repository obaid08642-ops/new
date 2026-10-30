import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button } from '../../../../packages/ui-native/src';
import { itemSubtitle, type DiagArtKey } from '../../../../packages/ui/icons/diag-art';
import { useDiagnosticsCart } from '../../context/DiagnosticsCartContext';
import { apiFetch, hasSession } from '../../utils/api';
import { itemRating } from '../../utils/diagCatalog';
import { offerLines, type OfferSummary, type ServiceOffer } from '../../utils/catalogueOffers';
import type { CatalogItem } from '../../utils/labMappers';
import { logError } from '../../utils/logger';
import { singleOrderRoute } from '../../utils/singleOrder';
import { InfoRow, Section } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { Block, ItemCard, ListCard, useDiagText } from './DiagKit';

/**
 * The catalogue, drawn once (owner, 2026-10-28: the catalogue is the single source): the card of a test or a scan with its offer summary,
 * the "who offers it" section of a detail, and "Notify me when available" for a service nobody offers yet. The hub's labs and radiology tabs and
 * the service home list draw these same pieces, so a scan looks the same wherever it is listed.
 */

export type CatalogueKind = 'lab' | 'radiology';

/** Tests and scans nobody offers stay in every list, whatever the place or the payment the order has chosen. */
export const isUnoffered = (item: Pick<CatalogItem, 'offer'>): boolean => item.offer?.providersCount === 0;

/** One test or scan of the catalogue as a card: tags, offer lines (centres, from-price, where, insurance), rating, "Add to cart" and "Order now". */
export function CatalogueCard({ item, kind, art, place, payer, idPrefix, width, isPackage = false }: { item: CatalogItem; kind: CatalogueKind; art: DiagArtKey; place: 'home' | 'clinic'; payer?: 'cash' | 'insurance'; idPrefix: string; width?: number; /** A lab package: opens the package page and shows how many tests it holds. */ isPackage?: boolean }) {
  const { k, num, money, lang } = useScreenUi();
  const text = useDiagText();
  const { items, addItem } = useDiagnosticsCart();
  const inCart = items.some((i) => i.id === item.id);
  const lines = offerLines(item.offer, { k, num, money, lang }, false, item.price);
  const rating = itemRating(item);
  const offerNote = lines ? [lines.providers, lines.from].filter(Boolean).join(' · ') : '';
  // a test says what it needs and when the result comes (owner decision 4): "No fasting · Result within 24 hours"
  const factsNote = kind === 'lab' && !isPackage
    ? [item.fastingRequired ? (item.fastingHours !== null ? k('diag.tag.fastingHours', { n: text.hours(item.fastingHours) }) : k('diag.tag.fasting')) : item.fastingKnown !== false ? k('diag.tag.noFasting') : '', item.turnaroundHours !== null ? text.turnaround(item.turnaroundHours) : ''].filter(Boolean).join(' · ')
    : '';
  const baseNote = isPackage ? (item.testsCount > 0 ? k('diag.pack.count', { n: num(item.testsCount) }) : '') : kind === 'lab' ? factsNote : itemSubtitle(item.desc, [item.category, item.modality, item.bodyPart, item.sampleType], k(`diag.cat.${art}`));
  const tags = [
    ...(kind === 'lab' && !isPackage ? text.testTags({ ...item, fastingRequired: false }, place === 'home') : []),
    ...(lines ? lines.where.map((label) => ({ label, tone: 'neutral' as const })) : []),
  ];
  const open = () => router.push((isPackage ? `/diagnostics/package-detail?id=${item.id}&serviceType=${place}` : kind === 'lab' ? `/diagnostics/test-detail?id=${item.id}` : `/diagnostics/test-detail?id=${item.id}&isRadiology=true`) as Href);
  return (
    <ItemCard
      testID={`${idPrefix}-${item.id}`}
      name={item.name}
      nameMark={item.nameMark}
      art={art}
      width={width}
      image={item.image}
      tags={tags}
      note={[offerNote, baseNote].filter(Boolean).join(' · ') || undefined}
      rating={rating ? k('diag.ratingLine', { n: num(rating.rating, { maximumFractionDigits: 1 }), count: num(rating.count) }) : undefined}
      // with the offer summary the price is the providers' own "from" (in the note); the catalogue's base price is the fallback of an older answer
      price={item.offer && (item.offer.fromPrice !== null || isUnoffered(item)) ? null : item.price}
      inCart={inCart}
      addLabel={k('diag.detail.addToCart')}
      inCartLabel={k('diag.detail.inCart')}
      orderLabel={k('diag.detail.orderNow')}
      onPress={open}
      // a service nobody offers cannot be added or ordered: both buttons stay, switched off; its page has "Notify me when available"
      disabled={isUnoffered(item)}
      onAdd={() => { if (!isUnoffered(item) && !inCart) void addItem({ id: item.id, name: item.name, price: item.price ?? 0, kind }); }}
      onOrder={() => isUnoffered(item) ? undefined : router.push(singleOrderRoute({ kind, id: item.id, name: item.name, place: kind === 'radiology' && !item.homeVisit ? 'clinic' : place, payer: kind === 'lab' && payer === 'insurance' ? 'insurance' : 'cash' }) as unknown as Href)}
    />
  );
}

type Interest = 'lab' | 'radiology' | 'nursing';

/**
 * "Notify me when available" (POST /catalogue-interest { service_type, service_id }; the server keeps one interest per patient and service, so
 * pressing twice leaves one). Whether the patient already asked comes from GET /catalogue-interest/mine. With no session the button opens
 * the normal sign-in; once registered it is replaced by a confirmation.
 */
export function NotifyMeButton({ kind, serviceId }: { kind: Interest; serviceId: string }) {
  const { theme, t, c, k, flow } = useScreenUi();
  const [state, setState] = useState<'loading' | 'guest' | 'ready' | 'done'>('loading');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!(await hasSession())) { if (live) setState('guest'); return; }
      try {
        const mine = await apiFetch<unknown>('/catalogue-interest/mine');
        const asked = Array.isArray(mine) && mine.some((row) => !!row && typeof row === 'object' && (row as Record<string, unknown>).service_type === kind && (row as Record<string, unknown>).service_id === serviceId);
        if (live) setState(asked ? 'done' : 'ready');
      } catch (err) {
        logError('catalogue:interest-mine', err);
        if (live) setState(String((err as Error)?.message).startsWith('AUTH_ERROR_401') ? 'guest' : 'ready');
      }
    })();
    return () => { live = false; };
  }, [kind, serviceId]);

  const register = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await apiFetch('/catalogue-interest', { method: 'POST', body: JSON.stringify({ service_type: kind, service_id: serviceId }) });
      setState('done');
    } catch (err) {
      logError('catalogue:interest', err);
      if (String((err as Error)?.message).startsWith('AUTH_ERROR_401')) setState('guest');
      else setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return null;
  if (state === 'guest') return <Button theme={theme} size="lg" fullWidth variant="outline" label={k('diag.offer.notifySignIn')} onPress={() => router.push('/(auth)/login' as Href)} testID="notify-me-signin" />;
  if (state === 'done') return <Text accessibilityRole="text" testID="notify-me-done" style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, ...flow }}>{k('diag.offer.notifyDone')}</Text>;
  return (
    <View style={{ gap: 8 }}>
      <Button theme={theme} size="lg" fullWidth label={k('diag.offer.notify')} loading={busy} onPress={() => void register()} testID="notify-me" />
      {failed ? <Text accessibilityRole="alert" style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('diag.offer.notifyFailed')}</Text> : null}
    </View>
  );
}

/**
 * Who offers the service (the `offers` of the catalogue detail), side by side with price, where and insurance, cheapest first: a price
 * comparison (the order flow still checks out one item). A service nobody offers yet says so and offers "Notify me when available".
 * Draws nothing when the payload has no summary (an older answer).
 */
export function OffersSection({ kind, serviceId, offer, offers, price = null }: { kind: Interest; serviceId: string; offer: OfferSummary | null; offers: ServiceOffer[]; /** the catalogue price: an indicative "from" while nobody offers the service */ price?: number | null }) {
  const { t, c, k, num, money, flow } = useScreenUi();
  if (!offer) return null;
  if (offer.providersCount === 0) {
    return (
      <Section title={k('diag.offer.none')}>
        <Block>
          {price !== null ? <Text testID="indicative-price" style={{ ...scale(t, 'small', 'medium'), lineHeight: 22, color: c.text.primary, ...flow }}>{`${k('diag.offer.from', { price: `${money(price)} ${k('pharmacy.currency')}` })} · ${k('diag.offer.indicative')}`}</Text> : null}
          <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{k('diag.offer.noneBody')}</Text>
          <NotifyMeButton kind={kind} serviceId={serviceId} />
        </Block>
      </Section>
    );
  }
  if (offers.length === 0) return null;
  return (
    <Section title={k('diag.offer.title')}>
      <ListCard>
        <View style={{ paddingHorizontal: 14 }} testID="offers-list">
          {offers.map((o, i) => (
            <InfoRow
              key={o.providerId}
              label={o.name}
              value={[
                o.price !== null ? `${money(o.price)} ${k('pharmacy.currency')}` : k('diag.offer.noPrice'),
                o.premises ? k('diag.offer.atCentre') : '',
                o.home ? k('diag.offer.atHome') : '',
                o.insurance ? k('diag.offer.insurance') : '',
                o.rating !== null && o.ratingCount > 0 ? k('diag.ratingLine', { n: num(o.rating, { maximumFractionDigits: 1 }), count: num(o.ratingCount) }) : '',
              ].filter(Boolean).join(' · ')}
              last={i === offers.length - 1}
            />
          ))}
        </View>
      </ListCard>
    </Section>
  );
}
