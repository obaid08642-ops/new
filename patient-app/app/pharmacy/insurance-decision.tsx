import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, ErrorState, FIcon, OfflineState, Screen, StatusChip, StickyFooter } from '../../../packages/ui-native/src';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { AmountRow, Notice } from '../../src/components/pharmacy/OfferKit';
import { PHARMACY_TONE, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch, newIdempotencyKey } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { acceptanceAlreadyRecorded, insuranceErrorKey, noAnswerYet, readPayOrder, type InsuranceOutcome, type PayOrder } from '../../src/utils/pharmacyCheckout';
import { idemKey, orderIdParam } from '../../src/utils/pharmacyOffers';

/**
 * Insurance decision — the CheckoutV2 board's insurance card (the insurer and the patient's co-pay) as a screen of its own.
 * The pharmacy records the insurer's decision on the order; this screen shows it as the server derived it
 * (`insurance_decision_summary`: the patient's share and the insurer's share; `insurance_item_decisions`: each line) and lets
 * the patient continue: accept the co-pay, or pay the full price (self-pay) when the insurance covered part or none of it, or
 * cancel an order the insurance rejected. Accepting only unlocks the payment step; no payment is made here.
 *
 * No amount is computed on this screen. The co-pay, the insurer's share and each line are the server's numbers; the full
 * price of self-pay is the order's own quote total. The acceptance is a mutation: one explicit "Confirm", a synchronous guard
 * and a disabled control while it runs, an idempotency key sent again after no answer and replaced after any answer, and a
 * server refusal shown as a sentence (never its raw text). What the patient already accepted is read from the order
 * (`insurance_decision.patient_acceptance`), so reopening the screen never offers the same choice twice.
 */

type Choice = 'co-pay' | 'self-pay';
type Run = 'co-pay' | 'self-pay' | 'cancel';

export default function PharmacyInsuranceDecisionScreen() {
  const { theme, t, c, dir, flow, k, money } = useScreenUi();
  const params = useLocalSearchParams<{ orderId?: string | string[]; id?: string | string[] }>();
  const id = orderIdParam({ orderId: params.orderId ?? params.id });

  const [order, setOrder] = useState<PayOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [running, setRunning] = useState<Run | null>(null);
  const [problemKey, setProblemKey] = useState<string | null>(null);

  const busy = useRef(false);
  const hasData = useRef(false);
  const keys = useRef(new Map<string, string>());

  const load = useCallback(
    async (mode: 'first' | 'manual') => {
      if (!id) return;
      if (mode === 'first') setLoading(true);
      try {
        const parsed = readPayOrder(await apiFetch(`/patient/pharmacy/orders/${id}`));
        if (!parsed) throw new Error('order_unreadable');
        setOrder(parsed);
        setFailed(null);
        hasData.current = true;
      } catch (error) {
        logError('pharmacy:insurance-decision', error);
        if (!hasData.current) setFailed((await isOffline()) ? 'offline' : 'error');
        else setProblemKey(insuranceErrorKey(error, 'pharmacy.ins.err.state'));
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

  const processing = order?.governedState === 'INSURANCE_PROCESSING' && !order.insurance;
  // while the pharmacy has not decided yet the screen asks again (the server is the only one who knows)
  useEffect(() => {
    if (!processing) return undefined;
    const timer = setInterval(() => void load('manual'), 20000);
    return () => clearInterval(timer);
  }, [processing, load]);

  const toTracking = () => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: id } });
  const toPayment = () => router.replace({ pathname: '/pharmacy/payment', params: { orderId: id } });

  /** One mutation at a time; a retry after no answer sends the same key. */
  const run = async (kind: Run) => {
    if (!id || busy.current) return;
    busy.current = true;
    setRunning(kind);
    setProblemKey(null);
    let key = keys.current.get(kind);
    if (!key) {
      key = idemKey(`insurance-${kind}`, [id], newIdempotencyKey());
      keys.current.set(kind, key);
    }
    try {
      if (kind === 'cancel') {
        await apiFetch(`/patient/pharmacy/orders/${id}/insurance-rejection/cancel`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ idempotency_key: key }) });
        keys.current.delete(kind);
        router.replace('/(tabs)/pharmacy' as Href);
      } else {
        await apiFetch(`/patient/pharmacy/orders/${id}/insurance/${kind}/accept`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({}) });
        keys.current.delete(kind);
        toPayment();
      }
    } catch (error) {
      logError(`pharmacy:insurance-${kind}`, error);
      if (!noAnswerYet(error)) keys.current.delete(kind);
      if (acceptanceAlreadyRecorded(error)) void load('manual');
      else setProblemKey(insuranceErrorKey(error, kind === 'cancel' ? 'pharmacy.ins.err.cancel' : 'pharmacy.ins.err.accept'));
    } finally {
      busy.current = false;
      setRunning(null);
    }
  };

  const askCancel = () => {
    if (busy.current) return;
    showLocalizedAlert(k('pharmacy.offers.cancelTitle'), k('pharmacy.ins.cancelBody'), [
      { text: k('pharmacy.offers.cancelKeep'), style: 'cancel' },
      { text: k('pharmacy.offers.cancelConfirm'), style: 'destructive', onPress: () => void run('cancel') },
    ]);
  };

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.ins.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode, pull = false) => (
    <Screen
      theme={theme}
      direction={dir}
      header={header}
      scroll
      refreshControl={pull ? <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load('manual'); }} tintColor={c.text.primary} /> : undefined}
      testID="insurance-decision-screen"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (!id) {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.offers.noOrder')} body={k('pharmacy.offers.noOrderBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }
  if (loading) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID="insurance-decision-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ height: 120, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          <View style={{ height: 200, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        </View>
      </Screen>
    );
  }
  if (failed === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (failed === 'error' || !order) {
    return state(<ErrorState title={k('pharmacy.ins.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }

  if (order.governedState === 'CANCELLED' || order.status === 'cancelled') {
    return state(<EmptyState icon="x-circle" tone="peach" title={k('pharmacy.offers.cancelled')} body={k('pharmacy.pay.cancelledBody')} actionLabel={k('pharmacy.offers.backToPharmacy')} onAction={() => router.replace('/(tabs)/pharmacy' as Href)} theme={theme} />);
  }
  if (order.paymentStatus === 'paid') {
    return state(<EmptyState icon="check-circle" tone="mint" title={k('pharmacy.pay.paidTitle')} body={k('pharmacy.pay.paidBody')} actionLabel={k('pharmacy.quote.orderStatus')} onAction={toTracking} theme={theme} />);
  }
  if (processing) {
    return state(<EmptyState icon="clock-counter-clockwise" tone="blue" title={k('pharmacy.ins.processingTitle')} body={k('pharmacy.ins.processingBody')} actionLabel={k('pharmacy.ins.refresh')} onAction={() => void load('manual')} secondaryActionLabel={k('pharmacy.quote.orderStatus')} onSecondaryAction={toTracking} theme={theme} />, true);
  }
  const ins = order.insurance;
  if (!ins) {
    return state(<EmptyState icon="shield-check" tone="blue" title={k('pharmacy.ins.notInsuranceTitle')} body={k('pharmacy.ins.notInsuranceBody')} actionLabel={k('pharmacy.quote.orderStatus')} onAction={toTracking} theme={theme} />, true);
  }
  if (ins.outcome === 'full' || order.paymentStatus === 'covered_by_insurance') {
    return state(<EmptyState icon="shield-check" tone="blue" title={k('pharmacy.pay.coveredTitle')} body={k('pharmacy.pay.coveredBody')} actionLabel={k('pharmacy.quote.orderStatus')} onAction={toTracking} theme={theme} />);
  }
  if (ins.accepted) {
    return state(<EmptyState icon="check-circle" tone="mint" title={ins.accepted === 'co-pay' ? k('pharmacy.ins.acceptedTitle') : k('pharmacy.quote.acceptedTitle')} body={k('pharmacy.ins.acceptedBody')} actionLabel={k('pharmacy.ins.toPayment')} onAction={toPayment} secondaryActionLabel={k('pharmacy.quote.orderStatus')} onSecondaryAction={toTracking} theme={theme} />);
  }

  const totals = { ...order.totals, currency: order.totals.currency ?? ins.currency };
  const symbol = !totals.currency || totals.currency === 'SAR' ? k('pharmacy.currency') : totals.currency;
  const amountText = (n: number) => `${money(n)} ${symbol}`;
  const canCopay = ins.outcome === 'partial' && ins.copay !== null && ins.copay > 0;
  const canSelf = totals.total !== null && totals.total > 0;
  const outcomeKey: Record<InsuranceOutcome, string> = { full: 'pharmacy.ins.decision.full', partial: 'pharmacy.ins.decision.partial', rejected: 'pharmacy.ins.decision.rejected' };
  const chip = ins.outcome === 'partial' ? 'amber' : 'peach';

  const option = (value: Choice, title: string, body: string) => {
    const on = choice === value;
    return (
      <Pressable
        key={value}
        accessibilityRole="radio"
        accessibilityLabel={title}
        accessibilityState={{ checked: on, disabled: running !== null }}
        disabled={running !== null}
        onPress={() => setChoice(value)}
        style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.bg.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.text.primary : c.border.hairline }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{title}</Text>
          <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{body}</Text>
        </View>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 7 : 2, borderColor: on ? c.action.primary.bg : c.control.radioOff }} />
      </Pressable>
    );
  };

  const selected = choice === 'co-pay' && canCopay ? 'co-pay' : choice === 'self-pay' && canSelf ? 'self-pay' : null;
  const footer = (
    <StickyFooter theme={theme} direction={dir} testID="insurance-bar">
      <View style={{ ...COLUMN, gap: 10 }}>
        {problemKey ? <Notice tone="danger" text={k(problemKey)} /> : null}
        <Button label={k('pharmacy.ins.confirm')} size="lg" fullWidth disabled={selected === null || running !== null} loading={running === 'co-pay' || running === 'self-pay'} onPress={() => selected && void run(selected)} testID="insurance-confirm" theme={theme} />
        {ins.outcome === 'rejected' ? <Button label={k('pharmacy.offers.cancelOrder')} variant="outline" size="lg" fullWidth disabled={running !== null} loading={running === 'cancel'} onPress={askCancel} testID="insurance-cancel" theme={theme} /> : null}
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
      testID="insurance-decision-screen"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 }}>
        <Card theme={theme}>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FIcon icon="shield-check" tone="blue" chip="soft" size={44} theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{ins.outcome === 'rejected' ? k('pharmacy.ins.rejectedTitle') : k('pharmacy.ins.title')}</Text>
                <StatusChip label={k(outcomeKey[ins.outcome])} tone={chip} theme={theme} />
              </View>
            </View>
            {ins.outcome === 'rejected' ? <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('pharmacy.ins.rejectedBody')}</Text> : null}
            <View style={{ height: 1, backgroundColor: c.border.subtle }} />
            {totals.total !== null ? <AmountRow label={k('pharmacy.ins.orderTotal')} totals={totals} amount={totals.total} /> : null}
            {ins.insurerShare !== null ? <AmountRow label={k('pharmacy.pay.insurerCovers')} totals={totals} amount={ins.insurerShare} /> : null}
            {ins.copay !== null ? <AmountRow label={k('pharmacy.pay.yourShare')} totals={totals} amount={ins.copay} strong /> : null}
          </View>
        </Card>

        {ins.items.length ? (
          <Card theme={theme}>
            <View style={{ gap: 14 }}>
              <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('pharmacy.ins.itemsTitle')}</Text>
              {ins.items.map((item) => (
                <View key={item.key} style={{ gap: 2 }}>
                  <Text style={{ ...scale(t, 'caption', 'medium'), color: c.text.primary, ...flow }}>{item.name ?? k('pharmacy.offers.lineUnnamed')}</Text>
                  <Text style={{ ...scale(t, 'meta', 'bold'), color: item.outcome === 'rejected' ? c.status.danger.fg : item.outcome === 'partial' ? c.status.warning.fg : c.status.success.fg, ...flow }}>{k(outcomeKey[item.outcome])}</Text>
                  {item.covered !== null ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.ins.itemCovered', { amount: amountText(item.covered) })}</Text> : null}
                  {item.copay !== null && item.copay > 0 ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.ins.itemShare', { amount: amountText(item.copay) })}</Text> : null}
                  {item.reason ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.ins.itemReason', { reason: item.reason })}</Text> : null}
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('pharmacy.ins.chooseTitle')}</Text>
          {canCopay && ins.copay !== null ? option('co-pay', k('pharmacy.ins.optCopay', { amount: amountText(ins.copay) }), k('pharmacy.ins.optCopayBody')) : null}
          {canSelf && totals.total !== null ? option('self-pay', k('pharmacy.ins.optSelf', { amount: amountText(totals.total) }), k('pharmacy.ins.optSelfBody')) : null}
        </View>
      </View>
    </Screen>
  );
}
