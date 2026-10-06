import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, ErrorState, OfflineState, Screen, StatusChip, StickyFooter } from '../../../packages/ui-native/src';
import { AmountRow, Money, Notice, QuoteLines } from '../../src/components/pharmacy/OfferKit';
import { PHARMACY_TONE } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch, newIdempotencyKey } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { allocationLines, idemKey, mayHaveReachedServer, offerErrorKey, orderIdParam, parseOrder, quoteView, type OrderState, type QuoteLine, type QuoteView } from '../../src/utils/pharmacyOffers';

/**
 * Final price — the PharmacyOffers board's offer card and sticky bar (canvas/PharmacyOffers.dc.html) for the chosen
 * pharmacy's quote. Everything on it is what GET /patient/pharmacy/orders/:id returns: `governed_state` decides what
 * the screen offers, the amounts are the quote snapshot's own `totals`, and the lines are the chosen allocation's items.
 *
 * Accepting the quote (POST .../final-quote/accept) sends the snapshot's hash and revision back, is disabled while it is
 * pending, and retries with the same idempotency key. No payment is created here; paying is a separate step
 * (/pharmacy/payment) or, for a cash order the server allows it for, a cash-on-delivery commitment
 * (POST .../cod/register).
 */

export default function PharmacyFinalQuoteScreen() {
  const { theme, t, c, dir, k, flow } = useScreenUi();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const id = orderIdParam(params);

  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [saving, setSaving] = useState<'accept' | 'cod' | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const hasData = useRef(false);
  const busy = useRef(false);
  const keys = useRef(new Map<string, string>());

  const load = useCallback(
    async (mode: 'first' | 'manual') => {
      if (!id) return;
      if (mode === 'first') setLoading(true);
      try {
        const response = await apiFetch(`/patient/pharmacy/orders/${id}`);
        const parsed = parseOrder(response);
        setOrder(parsed);
        setQuote(quoteView(response));
        setLines(allocationLines(response, parsed?.selectedAllocationId ?? null));
        setFailed(null);
        hasData.current = true;
      } catch (error) {
        logError('pharmacy:final-quote', error);
        if (!hasData.current) setFailed((await isOffline()) ? 'offline' : 'error');
        else setErrorKey(offerErrorKey(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      void load(hasData.current ? 'manual' : 'first');
    }, [load]),
  );

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pharmacy' as Href);
  };

  /** One mutation at a time; the key of an attempt that may have reached the server is sent again by the retry. */
  const run = async (kind: 'accept' | 'cod', path: string, body: Record<string, unknown> | undefined, parts: string[], after: () => Promise<void> | void) => {
    if (!id || busy.current) return;
    busy.current = true;
    setSaving(kind);
    setErrorKey(null);
    const slot = `${kind}:${parts.join(':')}`;
    let key = keys.current.get(slot);
    if (!key) {
      key = idemKey(kind === 'accept' ? 'final-quote' : 'cod', [id, ...parts.map((p) => p.slice(0, 16))], newIdempotencyKey());
      keys.current.set(slot, key);
    }
    try {
      await apiFetch(`/patient/pharmacy/orders/${id}/${path}`, { method: 'POST', headers: { 'Idempotency-Key': key }, ...(body ? { body: JSON.stringify(body) } : {}) });
      keys.current.delete(slot);
      await after();
    } catch (error) {
      logError(`pharmacy:${kind}`, error);
      if (!mayHaveReachedServer(error)) keys.current.delete(slot);
      setErrorKey(offerErrorKey(error, kind === 'accept' ? 'pharmacy.quote.err.accept' : 'pharmacy.quote.err.cod'));
    } finally {
      busy.current = false;
      setSaving(null);
    }
  };

  const accept = () => {
    if (!quote || quote.kind !== 'accept' || quote.hash === null || quote.revision === null) return;
    const { hash, revision } = quote;
    void run('accept', 'final-quote/accept', { quote_hash: hash, quote_revision: revision }, [hash, String(revision)], () => load('manual'));
  };
  const registerCod = () => {
    void run('cod', 'cod/register', undefined, [], () => {
      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: id } });
    });
  };
  const toTracking = () => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: id } });

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.quote.title')} onBack={back} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="final-quote-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (!id) {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.offers.noOrder')} body={k('pharmacy.offers.noOrderBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }
  if (loading) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID="final-quote-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16 }}>
          <View style={{ height: 240, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        </View>
      </Screen>
    );
  }
  if (failed === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (failed === 'error' || !quote) {
    return state(<ErrorState title={k('pharmacy.quote.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (quote.kind === 'cancelled') {
    return state(<EmptyState icon="x-circle" tone="peach" title={k('pharmacy.offers.cancelled')} body={k('pharmacy.offers.cancelledBody')} actionLabel={k('pharmacy.offers.backToPharmacy')} onAction={() => router.replace('/(tabs)/pharmacy' as Href)} theme={theme} />);
  }
  if (quote.kind === 'none') {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.quote.none')} body={k('pharmacy.quote.noneBody')} actionLabel={k('pharmacy.quote.orderStatus')} onAction={toTracking} theme={theme} />);
  }

  const { totals } = quote;
  const fee = totals.deliveryFee !== null && totals.deliveryFee > 0 ? totals.deliveryFee : null;
  const canCod = quote.kind === 'accepted' && quote.cashCoverage && quote.codAllowed;

  const footer =
    quote.kind === 'accept' && totals.total !== null ? (
      <StickyFooter theme={theme} direction={dir} testID="final-quote-bar">
        <View style={{ ...COLUMN, gap: 10 }}>
          {errorKey ? <Notice tone="danger" text={k(errorKey)} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ minWidth: 96 }}>
              <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.quote.total')}</Text>
              <Money amount={totals.total} currency={totals.currency} size="h4" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={errorKey ? k('pharmacy.quote.acceptRetry') : k('pharmacy.quote.accept')} size="lg" fullWidth loading={saving === 'accept'} disabled={saving !== null} onPress={accept} theme={theme} />
            </View>
          </View>
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load('manual'); }} tintColor={c.text.primary} />}
      testID="final-quote-screen"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 }}>
        <Card padding="lg" theme={theme}>
          <View style={{ gap: 14 }}>
            <View style={{ gap: 8 }}>
              {quote.kind === 'accepted' ? <StatusChip label={k('pharmacy.quote.accepted')} tone="mint" theme={theme} /> : null}
              {quote.kind === 'cod' ? <StatusChip label={k('pharmacy.quote.codRegistered')} tone="mint" theme={theme} /> : null}
              <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>
                {quote.kind === 'accept' ? k('pharmacy.quote.review') : quote.kind === 'accepted' ? k('pharmacy.quote.acceptedTitle') : k('pharmacy.quote.codTitle')}
              </Text>
            </View>
            <QuoteLines lines={lines} currency={totals.currency} />
            {lines.length ? <View style={{ height: 1, backgroundColor: c.border.subtle }} /> : null}
            {totals.subtotal !== null ? <AmountRow label={k('pharmacy.quote.subtotal')} totals={totals} amount={totals.subtotal} /> : null}
            {fee !== null ? <AmountRow label={k('pharmacy.quote.delivery')} totals={totals} amount={fee} /> : null}
            {totals.total !== null ? <AmountRow label={k('pharmacy.quote.total')} totals={totals} amount={totals.total} strong /> : null}
          </View>
        </Card>

        {quote.kind === 'accept' ? <Text style={{ ...scale(t, 'caption'), lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.quote.noPaymentYet')}</Text> : null}

        {quote.kind === 'accepted' ? (
          <View style={{ gap: 10 }}>
            <Text style={{ ...scale(t, 'caption'), lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.quote.acceptedBody')}</Text>
            <Button label={k('pharmacy.quote.payNow')} size="lg" fullWidth disabled={saving !== null} onPress={() => router.push({ pathname: '/pharmacy/payment', params: { orderId: id } })} theme={theme} />
            {canCod ? (
              <>
                <Button label={k('pharmacy.quote.cod')} variant="outline" size="lg" fullWidth loading={saving === 'cod'} disabled={saving !== null} onPress={registerCod} theme={theme} />
                <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.quote.codNote')}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {quote.kind === 'cod' ? (
          <View style={{ gap: 10 }}>
            <Text style={{ ...scale(t, 'caption'), lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.quote.codNote')}</Text>
            <Button label={k('pharmacy.quote.orderStatus')} size="lg" fullWidth onPress={toTracking} theme={theme} />
          </View>
        ) : null}

        {errorKey && quote.kind !== 'accept' ? <Notice tone="danger" text={k(errorKey)} /> : null}
      </View>
    </Screen>
  );
}
