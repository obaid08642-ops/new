import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Card, EmptyState, ErrorState, Screen } from '../../../packages/ui-native/src';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { dateLocaleFor } from '../../src/utils/dates';
import { logError } from '../../src/utils/logger';
import { readPaymentResult, readResultParams, type PaymentResult } from '../../src/utils/pharmacyCheckout';

/**
 * The result of a payment — the Success board's state (a check on its ring, the amount, the reference) and the board's
 * state components for everything else. The result comes only from the server: this screen asks it
 * (POST /payments/verify/:transaction, or GET /moyasar/payments/sync/:id for the id the payment page's redirect carries),
 * asks again while the payment is pending (every 3 s, at most 15 times, and when the app comes back to the foreground),
 * and draws "paid" only when the server's status says `paid`. The `status` and `amount` of the address (a redirect, a deep
 * link, anything a person can type) are not read, so a link can never show a payment as made.
 *
 * Pending, failed, cancelled, refunded, unknown and unreachable each have their own state with a way out; a payment that
 * cannot be confirmed is never assumed to have failed or succeeded. Shared by the services that pay online (pharmacy,
 * diagnostics, nursing, insurance co-pay): the params that name what was paid for (`bookingKind`, `bookingId`, `visitType`)
 * only choose where "continue" goes.
 */

const EVERY = 3000;
const LIMIT = 15;

export default function PaymentResultRoute() {
  const { theme, t, c, lang, dir, flow, k, money } = useScreenUi();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const p = readResultParams(params);
  const transactionId = p.transactionId;
  const gatewayId = p.gatewayId;
  const hasTarget = transactionId !== null || gatewayId !== null;
  const pharmacy = p.bookingKind === 'pharmacy' && p.bookingId !== null;

  const [result, setResult] = useState<PaymentResult | null>(null);
  const [phase, setPhase] = useState<'checking' | 'slow' | 'error' | 'unknown'>(hasTarget ? 'checking' : 'unknown');
  const busy = useRef(false);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const opened = useRef(false);
  const paymentUrl = p.paymentUrl;

  const check = useCallback(async () => {
    if ((!transactionId && !gatewayId) || busy.current) return;
    busy.current = true;
    if (timer.current) clearTimeout(timer.current);
    attempts.current += 1;
    try {
      // the server's own answer: the transaction as the gateway reports it, or (for the id of the gateway's redirect) its payment record
      const raw = transactionId ? await apiFetch(`/payments/verify/${encodeURIComponent(transactionId)}`, { method: 'POST' }) : await apiFetch(`/moyasar/payments/sync/${encodeURIComponent(gatewayId ?? '')}`);
      const next = readPaymentResult(raw);
      if (!alive.current) return;
      if (!next || next.phase === 'unknown') {
        setPhase('unknown');
        return;
      }
      setResult(next);
      if (next.phase === 'pending') {
        if (attempts.current >= LIMIT) setPhase('slow');
        else {
          setPhase('checking');
          timer.current = setTimeout(() => void check(), EVERY);
        }
      } else setPhase('checking');
    } catch (error) {
      logError('payments:result', error);
      if (!alive.current) return;
      if (attempts.current >= LIMIT) setPhase('error');
      else timer.current = setTimeout(() => void check(), EVERY);
    } finally {
      busy.current = false;
    }
  }, [transactionId, gatewayId]);

  useEffect(() => {
    alive.current = true;
    attempts.current = 0;
    // the services that start a payment elsewhere (diagnostics, nursing, insurance co-pay) hand the hosted page over here
    if (paymentUrl && !opened.current) {
      opened.current = true;
      Linking.openURL(paymentUrl).catch((error) => logError('payments:result:open', error));
    }
    void check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && alive.current) void check();
    });
    return () => {
      alive.current = false;
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [check, paymentUrl]);

  const again = () => {
    attempts.current = 0;
    setPhase('checking');
    void check();
  };
  const home = () => router.replace('/(tabs)' as Href);
  const toOrder = () => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: p.bookingId } });
  const toOrders = () => router.replace('/pharmacy/order-history' as Href);
  const retryPay = () => (pharmacy ? router.replace({ pathname: '/pharmacy/payment', params: { orderId: p.bookingId } }) : router.back());

  const visit = (() => {
    if (!p.visitType) return null;
    const appointment = p.bookingId;
    if (appointment) return { label: p.visitType === 'clinic' ? k('payments.result.clinicLocation') : p.visitType === 'home' ? k('payments.result.trackDoctor') : k('payments.result.waitingRoom'), go: () => router.push({ pathname: '/consultations/booking-status', params: { appointmentId: appointment, visitType: p.visitType } }) };
    if (p.visitType === 'clinic') return { label: k('payments.result.clinicLocation'), go: () => router.push('/consultations/clinic-location' as Href) };
    if (p.visitType === 'home') return { label: k('payments.result.trackDoctor'), go: () => router.push('/consultations/home-visit-tracking' as Href) };
    return { label: k('payments.result.waitingRoom'), go: () => router.push({ pathname: '/consultations/booking-status', params: { visitType: p.visitType } }) };
  })();

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.pay.title')} onBack={() => (router.canGoBack() ? router.back() : home())} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode, below?: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="payment-result-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center', gap: 16 }}>
        {node}
        {below}
      </View>
    </Screen>
  );

  const symbol = (cur: string | null) => (!cur || cur === 'SAR' ? k('pharmacy.currency') : cur);

  if (phase === 'unknown') {
    return state(<EmptyState icon="warning" tone="amber" title={k('payments.result.unknownTitle')} body={k('payments.result.unknownBody')} actionLabel={pharmacy ? k('pharmacy.quote.orderStatus') : k('payments.result.toHome')} onAction={pharmacy ? toOrder : home} secondaryActionLabel={pharmacy ? k('pharmacy.offers.myOrders') : undefined} onSecondaryAction={pharmacy ? toOrders : undefined} theme={theme} />);
  }
  if (phase === 'error') {
    return state(<ErrorState title={k('payments.result.errorTitle')} body={k('pharmacy.error.body')} retryLabel={k('payments.result.check')} onRetry={again} actionLabel={pharmacy ? k('pharmacy.quote.orderStatus') : k('payments.result.toHome')} onAction={pharmacy ? toOrder : home} theme={theme} />);
  }
  const phaseNow = result?.phase ?? 'pending';

  if (phaseNow === 'paid' && result) {
    const rows: Array<[string, string]> = [];
    if (result.amount !== null) rows.push([k('payments.result.amount'), `${money(result.amount)} ${symbol(result.currency)}`]);
    if (result.reference) rows.push([k('payments.result.reference'), result.reference]);
    if (result.paidAt !== null) rows.push([k('payments.result.paidOn'), new Date(result.paidAt).toLocaleString(dateLocaleFor(lang), { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' })]);
    const primary = visit ?? (pharmacy ? { label: k('pharmacy.quote.orderStatus'), go: toOrder } : { label: k('payments.result.toHome'), go: home });
    const showHome = visit !== null || pharmacy;
    return state(
      <EmptyState icon="check-circle" tone="mint" title={k('pharmacy.pay.paidTitle')} body={k('payments.result.paidBody')} actionLabel={primary.label} onAction={primary.go} secondaryActionLabel={showHome ? k('payments.result.toHome') : undefined} onSecondaryAction={showHome ? home : undefined} theme={theme} />,
      rows.length ? (
        <Card theme={theme}>
          <View style={{ gap: 12 }}>
            {rows.map(([label, value]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ ...scale(t, 'caption', 'regular'), color: c.text.secondary, ...flow }}>{label}</Text>
                <Text style={{ flexShrink: 1, ...scale(t, 'caption', 'bold'), color: c.text.primary, ...flow }}>{value}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null,
    );
  }
  if (phaseNow === 'failed' || phaseNow === 'cancelled') {
    return state(<ErrorState icon="x-circle" tone="peach" title={phaseNow === 'cancelled' ? k('payments.result.cancelledTitle') : k('payments.result.failedTitle')} body={k('payments.result.failedBody')} retryLabel={k('payments.result.tryAgain')} onRetry={retryPay} actionLabel={pharmacy ? k('pharmacy.quote.orderStatus') : k('payments.result.toHome')} onAction={pharmacy ? toOrder : home} theme={theme} />);
  }
  if (phaseNow === 'refunded') {
    return state(<EmptyState icon="receipt" tone="blue" title={k('payments.result.refundedTitle')} body={k('pharmacy.pay.cancelledBody')} actionLabel={pharmacy ? k('pharmacy.quote.orderStatus') : k('payments.result.toHome')} onAction={pharmacy ? toOrder : home} theme={theme} />);
  }
  // pending: still asking, or asked often enough and the gateway has not settled
  const slow = phase === 'slow';
  return state(
    <EmptyState
      icon="clock-counter-clockwise"
      tone="amber"
      title={slow ? k('payments.result.pendingTitle') : k('payments.result.checkingTitle')}
      body={slow ? k('payments.result.pendingBody') : k('payments.result.checkingBody')}
      actionLabel={slow ? k('payments.result.check') : undefined}
      onAction={slow ? again : undefined}
      secondaryActionLabel={pharmacy ? k('pharmacy.quote.orderStatus') : k('payments.result.toHome')}
      onSecondaryAction={pharmacy ? toOrder : home}
      theme={theme}
    />,
  );
}
