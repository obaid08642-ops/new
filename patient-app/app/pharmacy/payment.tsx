import React, { useCallback, useRef, useState } from 'react';
import { Linking, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, ErrorState, FIcon, OfflineState, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { AmountRow, Money, Notice } from '../../src/components/pharmacy/OfferKit';
import { PHARMACY_TONE, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch, newIdempotencyKey } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { isPayBlock, noAnswerYet, orderNumber, payBlock, payErrorKey, paymentView, readCapabilities, readIntent, readPayOrder, type Capabilities, type PayBlock, type PayOrder, type PaymentView } from '../../src/utils/pharmacyCheckout';
import { idemKey, orderIdParam } from '../../src/utils/pharmacyOffers';

/**
 * Payment — the CheckoutV2 board's header, order card, totals card and sticky "Pay" bar. What is payable is the server's
 * decision, never the screen's: GET /payments/pharmacy/:id/capabilities answers the amount due now (the full accepted
 * quote, or the co-pay the patient accepted) or refuses with a code (accept the final price first, the insurance step is
 * not done, cash on delivery, ...), and the order's own `payment_status` says whether it is already paid. The amounts are
 * those numbers as sent, formatted with Intl; nothing is added up here.
 *
 * Paying opens the payment provider's hosted page (POST /payments/intent/pharmacy/:id answers its https address); no card
 * number, CVV or token is entered here, stored, logged or put in an address. Back from that page the result screen asks the
 * server what happened: this screen never says "paid" on its own. The tap is single-flight (a synchronous guard plus a
 * disabled control); its idempotency key is sent again by a retry after no answer and replaced after any answer.
 */

export default function PharmacyPaymentScreen() {
  const { theme, t, c, dir, flow, k, money } = useScreenUi();
  const params = useLocalSearchParams<{ orderId?: string | string[]; id?: string | string[] }>();
  const id = orderIdParam({ orderId: params.orderId ?? params.id });

  const [order, setOrder] = useState<PayOrder | null>(null);
  const [view, setView] = useState<PaymentView | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [paying, setPaying] = useState(false);
  const [problemKey, setProblemKey] = useState<string | null>(null);
  /** A payment that was started (the server holds its transaction) but whose page did not open: the result screen can ask about it. */
  const [startedTxn, setStartedTxn] = useState<string | null>(null);

  const busy = useRef(false);
  const hasData = useRef(false);
  const payKey = useRef<string | null>(null);

  const load = useCallback(
    async (mode: 'first' | 'manual') => {
      if (!id) return;
      if (mode === 'first') setLoading(true);
      try {
        const [orderResult, capsResult] = await Promise.allSettled([apiFetch(`/patient/pharmacy/orders/${id}`), apiFetch(`/payments/pharmacy/${id}/capabilities`)]);
        if (orderResult.status === 'rejected') throw orderResult.reason;
        const parsed = readPayOrder(orderResult.value);
        if (!parsed) throw new Error('order_unreadable');
        let caps: Capabilities | null = null;
        let blocked: PayBlock | null = null;
        let capsFailure: unknown = null;
        if (capsResult.status === 'fulfilled') caps = readCapabilities(capsResult.value);
        else if (isPayBlock(capsResult.reason)) blocked = payBlock(capsResult.reason);
        else capsFailure = capsResult.reason;
        const next = paymentView(parsed, caps, blocked);
        // a failure to reach the payment service is not "nothing to pay": it is an error with a retry
        if (capsFailure && next.kind === 'blocked') throw capsFailure;
        setOrder(parsed);
        setView(next);
        setFailed(null);
        hasData.current = true;
      } catch (error) {
        logError('pharmacy:payment', error);
        if (!hasData.current) setFailed((await isOffline()) ? 'offline' : 'error');
        else setProblemKey(payErrorKey(error, 'pharmacy.pay.loadError'));
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

  const toTracking = () => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: id } });
  const toResult = (transactionId: string) => router.replace({ pathname: '/payments/result', params: { transactionId, bookingKind: 'pharmacy', bookingId: id } });

  const pay = async () => {
    if (!id || busy.current || view?.kind !== 'payable') return;
    busy.current = true;
    setPaying(true);
    setProblemKey(null);
    setStartedTxn(null);
    if (!payKey.current) payKey.current = idemKey('payment', [id], newIdempotencyKey());
    try {
      const response = await apiFetch(`/payments/intent/pharmacy/${id}`, { method: 'POST', headers: { 'Idempotency-Key': payKey.current }, body: JSON.stringify({}) });
      payKey.current = null;
      const intent = readIntent(response);
      if (!intent.transactionId) throw new Error('payment_intent_unreadable');
      if (!intent.checkoutUrl) {
        setStartedTxn(intent.transactionId);
        throw new Error('secure_checkout_redirect_unavailable');
      }
      try {
        await Linking.openURL(intent.checkoutUrl);
      } catch (error) {
        setStartedTxn(intent.transactionId);
        throw new Error(`secure_checkout_redirect_unavailable:${error instanceof Error ? error.name : ''}`);
      }
      toResult(intent.transactionId);
    } catch (error) {
      logError('pharmacy:payment:pay', error);
      if (!noAnswerYet(error)) payKey.current = null;
      setProblemKey(payErrorKey(error));
    } finally {
      busy.current = false;
      setPaying(false);
    }
  };

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.pay.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="payment-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (!id) {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.offers.noOrder')} body={k('pharmacy.offers.noOrderBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }
  if (loading) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID="payment-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ height: 80, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          <View style={{ height: 180, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        </View>
      </Screen>
    );
  }
  if (failed === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (failed === 'error' || !order || !view) {
    return state(<ErrorState title={k('pharmacy.pay.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }

  if (view.kind === 'paid') {
    return state(<EmptyState icon="check-circle" tone="mint" title={k('pharmacy.pay.paidTitle')} body={k('pharmacy.pay.paidBody')} actionLabel={k('pharmacy.quote.orderStatus')} onAction={toTracking} theme={theme} />);
  }
  if (view.kind === 'covered') {
    return state(<EmptyState icon="shield-check" tone="blue" title={k('pharmacy.pay.coveredTitle')} body={k('pharmacy.pay.coveredBody')} actionLabel={k('pharmacy.quote.orderStatus')} onAction={toTracking} theme={theme} />);
  }
  if (view.kind === 'cod') {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.quote.codTitle')} body={k('pharmacy.quote.codNote')} actionLabel={k('pharmacy.quote.orderStatus')} onAction={toTracking} theme={theme} />);
  }
  if (view.kind === 'cancelled') {
    return state(<EmptyState icon="x-circle" tone="peach" title={k('pharmacy.offers.cancelled')} body={k('pharmacy.pay.cancelledBody')} actionLabel={k('pharmacy.offers.backToPharmacy')} onAction={() => router.replace('/(tabs)/pharmacy' as Href)} theme={theme} />);
  }
  if (view.kind === 'blocked') {
    const where = view.reason === 'acceptQuote' ? { label: k('pharmacy.quote.title'), go: () => router.replace({ pathname: '/pharmacy/final-quote', params: { orderId: id } }) }
      : view.reason === 'insurance' ? { label: k('pharmacy.ins.title'), go: () => router.replace({ pathname: '/pharmacy/insurance-decision', params: { orderId: id } }) }
      : view.reason === 'noSelection' ? { label: k('pharmacy.offers.title'), go: () => router.replace({ pathname: '/pharmacy/broadcast-status', params: { orderId: id } }) }
      : { label: k('pharmacy.quote.orderStatus'), go: toTracking };
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k(`pharmacy.pay.blocked.${view.reason === 'notFound' ? 'other' : view.reason}.title`)} body={k(`pharmacy.pay.blocked.${view.reason === 'notFound' ? 'other' : view.reason}.body`)} actionLabel={where.label} onAction={where.go} theme={theme} />);
  }
  if (view.kind === 'noMethods') {
    return state(<EmptyState icon="credit-card" tone="amber" title={k('pharmacy.pay.noMethodsTitle')} body={k('pharmacy.pay.noMethodsBody')} actionLabel={k('pharmacy.retry')} onAction={() => void load('first')} secondaryActionLabel={k('pharmacy.quote.orderStatus')} onSecondaryAction={toTracking} theme={theme} />);
  }

  const totals = { ...order.totals, currency: view.currency ?? order.totals.currency };
  const symbol = !totals.currency || totals.currency === 'SAR' ? k('pharmacy.currency') : totals.currency;
  const fee = totals.deliveryFee !== null && totals.deliveryFee > 0 ? totals.deliveryFee : null;
  const insurance = order.insurance && order.insurance.accepted === 'co-pay' ? order.insurance : null;
  const addressLine = order.address?.line ?? order.address?.label ?? null;
  const orderLine = order.fulfillment === 'pickup' ? k('pharmacy.pay.pickup') : addressLine ? k('pharmacy.pay.deliverTo', { address: addressLine }) : null;

  const footer = (
    <StickyFooter theme={theme} direction={dir} testID="payment-bar">
      <View style={{ ...COLUMN, gap: 10 }}>
        {problemKey ? (
          <Notice
            tone="danger"
            text={k(problemKey)}
            actionLabel={startedTxn ? k('pharmacy.pay.checkStatus') : undefined}
            onAction={startedTxn ? () => toResult(startedTxn) : undefined}
          />
        ) : null}
        <Button label={k('pharmacy.pay.pay', { amount: `${money(view.amount)} ${symbol}` })} size="lg" fullWidth loading={paying} disabled={paying} onPress={() => void pay()} testID="payment-pay" theme={theme} />
      </View>
    </StickyFooter>
  );

  return (
    <Screen
      theme={theme}
      direction={dir}
      header={header}
      footer={footer}
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load('manual'); }} tintColor={c.text.primary} />}
      testID="payment-screen"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 }}>
        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="storefront" tone={PHARMACY_TONE} chip="soft" size={44} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('pharmacy.pay.order', { id: orderNumber(order.id) })}</Text>
              {orderLine ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{orderLine}</Text> : null}
            </View>
          </View>
        </Card>

        {insurance ? (
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FIcon icon="shield-check" tone="blue" chip="soft" size={44} theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('pharmacy.ins.acceptedTitle')}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.ins.optCopayBody')}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card theme={theme}>
          <View style={{ gap: 12 }}>
            {totals.subtotal !== null ? <AmountRow label={k('pharmacy.quote.subtotal')} totals={totals} amount={totals.subtotal} /> : null}
            {fee !== null ? <AmountRow label={k('pharmacy.quote.delivery')} totals={totals} amount={fee} /> : null}
            {insurance && insurance.insurerShare !== null && insurance.insurerShare > 0 ? <AmountRow label={k('pharmacy.pay.insurerCovers')} totals={totals} amount={insurance.insurerShare} /> : null}
            <View style={{ height: 1, backgroundColor: c.border.subtle }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('pharmacy.pay.dueNow')}</Text>
              <Money amount={view.amount} currency={totals.currency} size="h4" />
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <FIcon icon="lock" tone="ink" chip="soft" size={32} theme={theme} />
          <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'meta', 'regular'), lineHeight: 21, color: c.text.secondary, ...flow }}>{k('pharmacy.pay.secureNote')}</Text>
        </View>
      </View>
    </Screen>
  );
}
