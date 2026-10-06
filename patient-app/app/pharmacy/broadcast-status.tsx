import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, EmptyState, ErrorState, OfflineState, Screen, Segmented, StickyFooter } from '../../../packages/ui-native/src';
import { Money, Notice, OfferHero, PharmacyOfferCard } from '../../src/components/pharmacy/OfferKit';
import { PHARMACY_TONE } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch, newIdempotencyKey } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import {
  defaultCoverage,
  errorMeansStale,
  lowestPriceIds,
  mayHaveReachedServer,
  offerErrorKey,
  offerName,
  offerPhase,
  orderIdParam,
  parseOffers,
  parseOrder,
  postSelectionRoute,
  secondsLeft,
  selectionKey,
  sortOffers,
  type Coverage,
  type OfferSort,
  type OfferView,
  type OrderState,
} from '../../src/utils/pharmacyOffers';

/**
 * Pharmacy offers — board PharmacyOffers (canvas/PharmacyOffers.dc.html): the broadcast hero, the sort control, one card
 * per offer and the privacy line. The offers are what GET /patient/pharmacy/orders/:id/offers returns for the order
 * (submitted and not yet expired); the order's own state comes from GET /patient/pharmacy/orders/:id. Prices, delivery
 * fees, totals, distances and expiry are the server's numbers and are only formatted here.
 *
 * Choosing an offer is a mutation (POST .../offers/:offerId/select): the card is marked, the footer shows the server's
 * total and the coverage, and one tap on "confirm" sends it. The control is disabled while it is pending, a retry sends
 * the same idempotency key, and a refusal shows the server's reason.
 */

const POLL_MS = 20000;

export default function BroadcastStatusScreen() {
  const { theme, t, c, dir, lang, k, num, flow } = useScreenUi();
  const params = useLocalSearchParams<{ orderId?: string | string[]; requestId?: string | string[] }>();
  const orderId = orderIdParam(params);

  const [offers, setOffers] = useState<OfferView[]>([]);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<OfferSort>('price');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage>('cash');
  const [confirming, setConfirming] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const hasData = useRef(false);
  const coverageTouched = useRef(false);
  const phaseRef = useRef<string>('searching');
  const submitted = useRef(false);
  const inFlight = useRef(false); // set at once on a tap, before the next render shows the disabled control
  const expiredSeen = useRef(new Set<string>());
  const keys = useRef(new Map<string, string>());

  const load = useCallback(
    async (mode: 'first' | 'silent' | 'manual') => {
      if (!orderId) return;
      if (mode === 'first') setLoading(true);
      const [offersRes, orderRes] = await Promise.allSettled([apiFetch(`/patient/pharmacy/orders/${orderId}/offers`), apiFetch(`/patient/pharmacy/orders/${orderId}`)]);
      if (offersRes.status === 'fulfilled') {
        setOffers(parseOffers(offersRes.value));
        setFailed(null);
        setRefreshFailed(false);
        hasData.current = true;
      } else {
        logError('pharmacy:offers', offersRes.reason);
        if (hasData.current) setRefreshFailed(true);
        else setFailed((await isOffline()) ? 'offline' : 'error');
      }
      if (orderRes.status === 'fulfilled') {
        const parsed = parseOrder(orderRes.value);
        setOrder(parsed);
        if (!coverageTouched.current) setCoverage(defaultCoverage(parsed));
      } else {
        logError('pharmacy:offers-order', orderRes.reason);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [orderId],
  );

  // read on focus, then again every 20 s while the broadcast can still bring offers; nothing runs while the screen is not shown
  useFocusEffect(
    useCallback(() => {
      void load(hasData.current ? 'silent' : 'first');
      const timer = setInterval(() => {
        if (phaseRef.current === 'searching') void load('silent');
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const phase = offerPhase(order);
  phaseRef.current = phase;

  // the countdown moves once a second while an offer carries an expiry
  const ticking = offers.some((o) => o.expiresAt !== null);
  useEffect(() => {
    if (!ticking) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  // an offer that has just run out is read again, so the list is the server's
  useEffect(() => {
    for (const o of offers) {
      if (secondsLeft(o, now) === 0 && !expiredSeen.current.has(o.id)) {
        expiredSeen.current.add(o.id);
        void load('silent');
      }
    }
  }, [offers, now, load]);

  const picked = offers.find((o) => o.id === pickedId && o.open && secondsLeft(o, now) !== 0) ?? null;
  useEffect(() => {
    if (pickedId && !picked && !confirming) setPickedId(null);
  }, [pickedId, picked, confirming]);

  const available = useMemo(() => {
    const list: OfferSort[] = ['price'];
    if (offers.some((o) => o.distanceKm !== null)) list.push('nearest');
    if (offers.some((o) => o.prepMinutes !== null)) list.push('fastest');
    return list;
  }, [offers]);
  const activeSort = available.includes(sort) ? sort : 'price';
  const shown = useMemo(() => sortOffers(offers, activeSort), [offers, activeSort]);
  const lowest = useMemo(() => lowestPriceIds(offers.filter((o) => o.open && secondsLeft(o, now) !== 0)), [offers, now]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pharmacy' as Href);
  };

  const confirm = async () => {
    if (!orderId || !picked || confirming || submitted.current || inFlight.current) return;
    inFlight.current = true;
    const mode: Coverage = coverage === 'insurance' && !picked.insuranceReady ? 'cash' : coverage;
    const slot = `${picked.id}:${mode}`;
    let key = keys.current.get(slot);
    if (!key) {
      key = selectionKey(orderId, picked.id, mode, newIdempotencyKey());
      keys.current.set(slot, key);
    }
    setConfirming(true);
    setPickError(null);
    try {
      await apiFetch(`/patient/pharmacy/orders/${orderId}/offers/${picked.id}/select`, {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify({ coverage_mode: mode }),
      });
      submitted.current = true; // the control stays disabled until the next screen replaces this one
      keys.current.delete(slot);
      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId, selectedOfferId: picked.id } });
    } catch (error) {
      logError('pharmacy:offer-select', error);
      // an answer from the server ends this attempt; no answer may mean it arrived, so a retry sends the same key
      if (!mayHaveReachedServer(error)) keys.current.delete(slot);
      setPickError(offerErrorKey(error));
      inFlight.current = false;
      setConfirming(false);
      if (errorMeansStale(error)) {
        setPickedId(null);
        void load('silent');
      }
    }
  };

  const doCancel = async () => {
    if (!orderId || cancelling || inFlight.current) return;
    inFlight.current = true;
    setCancelling(true);
    setCancelError(null);
    try {
      await apiFetch(`/patient/pharmacy/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'patient_requested' }) });
      router.replace('/(tabs)/pharmacy' as Href);
    } catch (error) {
      logError('pharmacy:offer-cancel', error);
      setCancelError(offerErrorKey(error));
      inFlight.current = false;
      setCancelling(false);
    }
  };

  const askCancel = () => {
    if (cancelling) return;
    showLocalizedAlert(k('pharmacy.offers.cancelTitle'), k('pharmacy.offers.cancelBody'), [
      { text: k('pharmacy.offers.cancelKeep'), style: 'cancel' },
      { text: k('pharmacy.offers.cancelConfirm'), style: 'destructive', onPress: () => void doCancel() },
    ]);
  };

  const refresh = () => {
    setRefreshing(true);
    void load('manual');
  };

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.offers.title')} onBack={back} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );

  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="broadcast-status-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (!orderId) {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.offers.noOrder')} body={k('pharmacy.offers.noOrderBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }
  if (loading) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID="broadcast-status-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, gap: 16 }}>
          <View style={{ height: 108, borderRadius: 28, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          {[0, 1].map((i) => (
            <View key={i} style={{ height: 176, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          ))}
        </View>
      </Screen>
    );
  }
  if (failed === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (failed === 'error') {
    return state(<ErrorState title={k('pharmacy.offers.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (phase === 'cancelled') {
    return state(<EmptyState icon="x-circle" tone="peach" title={k('pharmacy.offers.cancelled')} body={k('pharmacy.offers.cancelledBody')} actionLabel={k('pharmacy.offers.backToPharmacy')} onAction={() => router.replace('/(tabs)/pharmacy' as Href)} theme={theme} />);
  }
  if (phase === 'selected') {
    return state(<EmptyState icon="check-circle" tone="mint" title={k('pharmacy.offers.alreadyChosen')} body={k('pharmacy.offers.alreadyChosenBody')} actionLabel={k('pharmacy.offers.continueOrder')} onAction={() => router.replace({ pathname: postSelectionRoute(order), params: { orderId } } as Href)} theme={theme} />);
  }
  if (phase === 'draft') {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.offers.notSent')} body={k('pharmacy.offers.notSentBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }

  const open = offers.filter((o) => o.open);
  const ended = phase === 'review' && open.length === 0;
  const sortOptions = available.map((v) => ({ value: v, label: k(`pharmacy.offers.sort.${v}`) }));
  const pickedName = picked ? offerName(picked, lang) ?? k('pharmacy.offers.pharmacyFallback') : '';
  const coverageOptions = [
    { value: 'cash', label: k('pharmacy.offers.coverage.cash') },
    { value: 'insurance', label: k('pharmacy.offers.coverage.insurance'), disabled: picked ? !picked.insuranceReady : false },
  ];

  const footer = picked ? (
    <StickyFooter theme={theme} direction={dir} testID="offer-confirm-bar">
      <View style={{ ...COLUMN, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary, ...flow }}>{k('pharmacy.offers.footerFor', { name: pickedName })}</Text>
            {picked.totals.total !== null ? <Money amount={picked.totals.total} currency={picked.totals.currency} /> : null}
          </View>
        </View>
        <Segmented options={coverageOptions} value={coverage === 'insurance' && !picked.insuranceReady ? 'cash' : coverage} onChange={(v) => { coverageTouched.current = true; setCoverage(v === 'insurance' ? 'insurance' : 'cash'); }} label={k('pharmacy.offers.coverage.label')} size="sm" disabled={confirming} theme={theme} />
        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.offers.noPaymentNow')}</Text>
        {pickError ? <Notice tone="danger" text={k(pickError)} /> : null}
        <Button label={pickError ? k('pharmacy.offers.confirmRetry') : k('pharmacy.offers.confirm')} size="lg" fullWidth loading={confirming} disabled={confirming || picked.totals.total === null} onPress={() => void confirm()} theme={theme} />
      </View>
    </StickyFooter>
  ) : undefined;

  return (
    <Screen
      theme={theme}
      direction={dir}
      header={header}
      footer={footer}
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.text.primary} />}
      testID="broadcast-status-screen"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 }}>
        {ended ? null : (
          <OfferHero
            title={k('pharmacy.offers.searching')}
            line={open.length > 0 ? k('pharmacy.offers.received', { n: num(open.length) }) : k('pharmacy.offers.none')}
          />
        )}

        {refreshFailed ? <Notice tone="warning" text={k('pharmacy.offers.refreshFailed')} actionLabel={k('pharmacy.retry')} onAction={() => void load('manual')} /> : null}
        {pickError && !picked ? <Notice tone="danger" text={k(pickError)} /> : null}

        {ended ? (
          <EmptyState icon="storefront" tone={PHARMACY_TONE} title={k('pharmacy.offers.ended')} body={k('pharmacy.offers.endedBody')} actionLabel={k('pharmacy.offers.refresh')} onAction={() => void load('manual')} theme={theme} />
        ) : open.length === 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={{ ...scale(t, 'caption'), lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.offers.waitingBody')}</Text>
            <Button label={k('pharmacy.offers.refresh')} variant="secondary" size="md" fullWidth loading={refreshing} onPress={() => void load('manual')} theme={theme} />
          </View>
        ) : (
          <>
            {sortOptions.length > 1 ? <Segmented options={sortOptions} value={activeSort} onChange={(v) => setSort(v as OfferSort)} label={k('pharmacy.offers.sort.label')} size="sm" theme={theme} /> : null}
            {shown.map((offer) => (
              <PharmacyOfferCard
                key={offer.id}
                offer={offer}
                now={now}
                best={lowest.has(offer.id)}
                selected={pickedId === offer.id}
                busy={confirming}
                onPick={() => {
                  setPickError(null);
                  setPickedId((p) => (p === offer.id ? null : offer.id));
                }}
              />
            ))}
            <Text style={{ ...scale(t, 'label', 'regular'), lineHeight: 21, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.offers.privacy')}</Text>
          </>
        )}

        {phase === 'searching' || phase === 'review' ? (
          <View style={{ gap: 8 }}>
            <Button label={k('pharmacy.offers.cancelOrder')} variant="outline" size="md" fullWidth loading={cancelling} disabled={cancelling || confirming} onPress={askCancel} theme={theme} />
            {cancelError ? <Notice tone="danger" text={k(cancelError)} /> : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
