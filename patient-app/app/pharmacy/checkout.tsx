import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, ErrorState, FIcon, OfflineState, Screen, Segmented, StickyFooter } from '../../../packages/ui-native/src';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { PHARMACY_TONE, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useCart } from '../../src/context/CartContext';
import { apiFetch, newIdempotencyKey } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { buildPatientPharmacyDraft, extractPatientPharmacyOrderId, type DraftLine } from '../../src/utils/pharmacy-draft';
import { mapPrescriptionToPharmacyDraftLines } from '../../src/utils/pharmacy-prescription';
import { checkoutErrorKey, checkoutLines, noAnswerYet } from '../../src/utils/pharmacyCheckout';
import { idemKey } from '../../src/utils/pharmacyOffers';
import { resolveEffectiveAddress, type SelectedAddress } from '../../src/utils/selectedAddress';

/**
 * Send the request to the pharmacies — the CheckoutV2 / BookingConfirm boards' review-and-confirm step (header, summary
 * cards, sticky action) for a request that has no price yet: nearby pharmacies answer with offers, the patient chooses
 * one, and the final price and the payment come after (final-quote, payment). Nothing about a price, a payment method or
 * points is sent from here.
 *
 * What is sent: the prescription's medicines (`/prescriptions/:id`, with `prescription_id`) and the cart's other lines,
 * both listed below so the patient sees exactly what goes out; the delivery location (the one picked last, else the
 * default address, read again when the screen comes back into focus); delivery or pickup. Two requests, create then
 * submit, each with an idempotency key: a retry after no answer sends the same keys and finds the same order, a retry
 * after an answer takes new ones. The control is disabled while they run and a synchronous guard stops a second tap.
 */

type Fulfillment = 'delivery' | 'pickup';

export default function PharmacyCheckoutScreen() {
  const { theme, t, c, dir, flow, k, num } = useScreenUi();
  const { items, clearCart, ready: cartReady } = useCart();
  const params = useLocalSearchParams<{ prescriptionId?: string | string[] }>();
  const rxId = (Array.isArray(params.prescriptionId) ? params.prescriptionId[0] : params.prescriptionId) || undefined;

  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery');
  const [address, setAddress] = useState<SelectedAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [rxLines, setRxLines] = useState<DraftLine[]>([]);
  const [rxState, setRxState] = useState<'idle' | 'loading' | 'ready' | 'error' | 'offline'>(rxId ? 'loading' : 'idle');
  const [rxTry, setRxTry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [problemKey, setProblemKey] = useState<string | null>(null);
  const [needsLocation, setNeedsLocation] = useState(false);

  const busy = useRef(false);
  // one key pair per distinct request body: a retry of the same body after no answer is the same request
  const keys = useRef(new Map<string, { create: string; submit: string }>());
  const created = useRef<{ body: string; orderId: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingAddress(true);
      void (async () => {
        try {
          const next = await resolveEffectiveAddress();
          if (active) setAddress(next);
        } catch (error) {
          logError('pharmacy:checkout:address', error);
        } finally {
          if (active) setLoadingAddress(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!rxId) return undefined;
    let active = true;
    setRxState('loading');
    void (async () => {
      try {
        const response = await apiFetch<{ data?: unknown } & Record<string, unknown>>(`/prescriptions/${rxId}`);
        if (!active) return;
        setRxLines(mapPrescriptionToPharmacyDraftLines((response?.data ?? response) as Parameters<typeof mapPrescriptionToPharmacyDraftLines>[0]));
        setRxState('ready');
      } catch (error) {
        logError('pharmacy:checkout:prescription', error);
        const off = await isOffline();
        if (active) setRxState(off ? 'offline' : 'error');
      }
    })();
    return () => {
      active = false;
    };
  }, [rxId, rxTry]);

  const lines = checkoutLines(rxId ? rxLines : [], items.map((i) => ({ id: i.id, name: i.name, qty: i.qty })));
  const hasPoint = Boolean(address) && Number.isFinite(Number(address?.lat)) && Number.isFinite(Number(address?.lng));
  const ready = !loadingAddress && (!rxId || rxState === 'ready') && lines.all.length > 0;

  const send = async () => {
    if (busy.current || !ready) return;
    if (!address || !hasPoint) {
      setNeedsLocation(true);
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setProblemKey(null);
    setNeedsLocation(false);
    try {
      const draft = buildPatientPharmacyDraft(lines.all, address, rxId, { fulfillment, ...(rxId ? { prescription_id: rxId } : {}) });
      const body = JSON.stringify(draft);
      let pair = keys.current.get(body);
      if (!pair) {
        const nonce = newIdempotencyKey();
        pair = { create: idemKey('pharmacy-broadcast', [], nonce), submit: idemKey('pharmacy-broadcast-submit', [], nonce) };
        keys.current.set(body, pair);
      }
      let orderId = created.current?.body === body ? created.current.orderId : null;
      if (!orderId) {
        const response = await apiFetch('/patient/pharmacy/orders', { method: 'POST', headers: { 'Idempotency-Key': pair.create }, body });
        orderId = extractPatientPharmacyOrderId(response);
        if (!orderId) throw new Error('governed_pharmacy_order_id_missing');
        created.current = { body, orderId };
      }
      await apiFetch(`/patient/pharmacy/orders/${orderId}/submit`, { method: 'POST', headers: { 'Idempotency-Key': pair.submit }, body: JSON.stringify({}) });
      keys.current.delete(body);
      created.current = null;
      // the staged lines became a real order: the local list has done its job
      void clearCart();
      router.replace({ pathname: '/pharmacy/broadcast-status', params: { orderId } });
    } catch (error) {
      logError('pharmacy:checkout:send', error);
      // a server answer ends the attempt: the next one starts with new keys (after no answer the same keys are sent again)
      // (an order that was created stays: the retry only submits it again, it never creates a second one)
      if (!noAnswerYet(error)) keys.current.clear();
      setProblemKey(checkoutErrorKey(error));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.checkout.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="checkout-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (!cartReady || (rxId && rxState === 'loading')) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID="checkout-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ height: 96, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          <View style={{ height: 160, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        </View>
      </Screen>
    );
  }
  if (rxId && rxState === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => setRxTry((n) => n + 1)} theme={theme} />);
  }
  if (rxId && rxState === 'error') {
    return state(<ErrorState title={k('pharmacy.checkout.rxLoadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => setRxTry((n) => n + 1)} theme={theme} />);
  }
  if (lines.all.length === 0) {
    return state(
      <EmptyState
        icon="prescription"
        tone={PHARMACY_TONE}
        title={k('pharmacy.checkout.emptyTitle')}
        body={rxId ? k('pharmacy.checkout.emptyRxBody') : k('pharmacy.checkout.emptyBody')}
        actionLabel={k('pharmacy.cart.emptyAction')}
        onAction={() => router.replace('/(tabs)/pharmacy' as Href)}
        theme={theme}
      />,
    );
  }

  const addressLine = address ? [address.street || address.address, address.city].filter(Boolean).join(', ') : '';
  const group = (title: string, rows: DraftLine[], withQty: boolean) => (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{title}</Text>
      {rows.map((line) => (
        <View key={line.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'caption', 'medium'), color: c.text.primary, ...flow }}>{line.name}</Text>
          {withQty ? <Text style={{ ...scale(t, 'caption', 'regular'), color: c.text.secondary }}>{k('pharmacy.checkout.qty', { n: num(line.qty) })}</Text> : null}
        </View>
      ))}
    </View>
  );

  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={COLUMN}>
        <Button label={k('pharmacy.checkout.submit')} size="lg" fullWidth disabled={!ready || submitting} loading={submitting} onPress={() => void send()} testID="checkout-submit" theme={theme} />
      </View>
    </StickyFooter>
  );

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} scroll testID="checkout-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 }}>
        <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 21, color: c.text.secondary, ...flow }}>{k('pharmacy.checkout.intro')}</Text>

        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="map-pin" tone="coral" size={40} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.request.addressTitle')}</Text>
              <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>
                {loadingAddress ? k('pharmacy.request.addressLoading') : address ? address.label || addressLine || k('pharmacy.request.addressUsed') : k('pharmacy.request.addressNone')}
              </Text>
              {address && address.label && addressLine ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{addressLine}</Text> : null}
            </View>
          </View>
          {!loadingAddress && !hasPoint ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.status.warning.fg, ...flow }}>{k('pharmacy.request.addressMissing')}</Text> : null}
          <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.request.changeLocation')} onPress={() => router.push('/shared/location-picker')} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link, ...flow }}>{k('pharmacy.request.changeLocation')}</Text>
          </Pressable>
        </Card>

        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('pharmacy.checkout.fulfilTitle')}</Text>
          <Segmented
            label={k('pharmacy.checkout.fulfilTitle')}
            value={fulfillment}
            onChange={(v) => setFulfillment(v as Fulfillment)}
            disabled={submitting}
            options={[
              { value: 'delivery', label: k('pharmacy.checkout.delivery') },
              { value: 'pickup', label: k('pharmacy.checkout.pickup') },
            ]}
            theme={theme}
          />
          {fulfillment === 'pickup' ? <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('pharmacy.checkout.pickupNote')}</Text> : null}
        </View>

        <Card theme={theme}>
          <View style={{ gap: 14 }}>
            {lines.rx.length ? group(k('pharmacy.checkout.fromRx', { n: num(lines.rx.length) }), lines.rx, false) : null}
            {lines.rx.length ? <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('pharmacy.checkout.rxQtyNote')}</Text> : null}
            {lines.cart.length ? group(rxId ? k('pharmacy.checkout.fromCart', { n: num(lines.cart.length) }) : k('pharmacy.checkout.items', { n: num(lines.cart.length) }), lines.cart, true) : null}
            {lines.rx.length && lines.cart.length ? <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('pharmacy.checkout.bothNote')}</Text> : null}
            {lines.duplicates > 0 ? <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('pharmacy.checkout.dupNote', { n: num(lines.duplicates) })}</Text> : null}
          </View>
        </Card>

        <Text style={{ ...scale(t, 'caption'), lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.checkout.noPrice')}</Text>

        {needsLocation ? <Notice tone="warning" text={k('pharmacy.checkout.err.location')} actionLabel={k('pharmacy.request.changeLocation')} onAction={() => router.push('/shared/location-picker')} /> : null}
        {problemKey ? (
          <Notice
            tone="danger"
            text={k(problemKey)}
            actionLabel={problemKey === 'pharmacy.checkout.err.signIn' ? k('pharmacy.checkout.signIn') : undefined}
            onAction={problemKey === 'pharmacy.checkout.err.signIn' ? () => router.push('/(auth)/login' as Href) : undefined}
          />
        ) : null}
      </View>
    </Screen>
  );
}
