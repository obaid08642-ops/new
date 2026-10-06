import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, ErrorState, FIcon, OfflineState, Screen, Stepper, StickyFooter } from '../../../packages/ui-native/src';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { Glyph, PHARMACY_TONE, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch, newIdempotencyKey } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { buildPatientPharmacyDraft, extractPatientPharmacyOrderId } from '../../src/utils/pharmacy-draft';
import { checkoutErrorKey, noAnswerYet } from '../../src/utils/pharmacyCheckout';
import { idemKey, orderIdParam } from '../../src/utils/pharmacyOffers';
import { ORDERS_TONE } from '../../src/utils/orderCenter';
import { readReorderLines, reorderBody, type ReorderLine } from '../../src/utils/reorder';
import { resolveEffectiveAddress, type SelectedAddress } from '../../src/utils/selectedAddress';

/**
 * Order again — a new request built from the lines of an earlier order (GET /patient/pharmacy/orders/:id), board Orders'
 * "أعد الطلب". Only the lines the server returns are offered; the patient keeps the ones to send and sets the quantities.
 * Prices, the payment method and the insurance of the earlier order are not carried over: the new request goes out for
 * fresh offers (create, then submit, each with an idempotency key that is sent again only after no answer came back).
 */

export default function PharmacyReorderScreen() {
  const { theme, t, c, dir, flow, k, num } = useScreenUi();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const id = orderIdParam({ orderId: params.orderId });

  const [lines, setLines] = useState<ReorderLine[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [address, setAddress] = useState<SelectedAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [problemKey, setProblemKey] = useState<string | null>(null);
  const [needsLocation, setNeedsLocation] = useState(false);

  const busy = useRef(false);
  const keys = useRef(new Map<string, { create: string; submit: string }>());
  const created = useRef<{ body: string; orderId: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFailed(null);
    try {
      setLines(readReorderLines(await apiFetch(`/patient/pharmacy/orders/${id}`)));
    } catch (error) {
      logError('pharmacy:reorder:load', error);
      setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingAddress(true);
      void (async () => {
        try {
          const next = await resolveEffectiveAddress();
          if (active) setAddress(next);
        } catch (error) {
          logError('pharmacy:reorder:address', error);
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
    void load();
  }, [load]);

  const chosen = lines.filter((l) => l.selected);
  const hasPoint = Boolean(address) && Number.isFinite(Number(address?.lat)) && Number.isFinite(Number(address?.lng));
  const patch = (key: string, change: Partial<ReorderLine>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...change } : l)));

  const send = async () => {
    if (busy.current || submitting || !chosen.length || loadingAddress) return;
    if (!address || !hasPoint) {
      setNeedsLocation(true);
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setProblemKey(null);
    setNeedsLocation(false);
    try {
      const body = JSON.stringify(reorderBody(chosen, address, buildPatientPharmacyDraft));
      let pair = keys.current.get(body);
      if (!pair) {
        const nonce = newIdempotencyKey();
        pair = { create: idemKey('pharmacy-reorder', [], nonce), submit: idemKey('pharmacy-reorder-submit', [], nonce) };
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
      router.replace({ pathname: '/pharmacy/broadcast-status', params: { orderId } });
    } catch (error) {
      logError('pharmacy:reorder:send', error);
      // a server answer ends the attempt (the next one takes new keys); after no answer the same keys go out again
      if (!noAnswerYet(error)) keys.current.clear();
      setProblemKey(checkoutErrorKey(error));
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('orders.reorder.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="reorder-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (!id) {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.offers.noOrder')} body={k('pharmacy.offers.noOrderBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }
  if (loading) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID="reorder-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ height: 60, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          <View style={{ height: 200, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        </View>
      </Screen>
    );
  }
  if (failed === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />);
  }
  if (failed === 'error') {
    return state(<ErrorState title={k('orders.reorder.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />);
  }
  if (!lines.length) {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('orders.reorder.noLines')} body={k('orders.reorder.noLinesBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }

  const addressLine = address ? [address.street || address.address, address.city].filter(Boolean).join(', ') : '';
  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={COLUMN}>
        <Button label={k('orders.reorder.submit')} size="lg" fullWidth disabled={!chosen.length || loadingAddress || submitting} loading={submitting} onPress={() => void send()} testID="reorder-submit" theme={theme} />
      </View>
    </StickyFooter>
  );

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} scroll testID="reorder-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 }}>
        <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 21, color: c.text.secondary, ...flow }}>{k('orders.reorder.intro')}</Text>

        <Card theme={theme}>
          <View style={{ gap: 4 }}>
            {lines.map((line, i) => (
              <View key={line.key} style={{ gap: 8, paddingVertical: 8, borderBottomWidth: i === lines.length - 1 ? 0 : 1, borderBottomColor: c.border.subtle }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={line.name}
                  accessibilityState={{ checked: line.selected, disabled: submitting }}
                  disabled={submitting}
                  onPress={() => patch(line.key, { selected: !line.selected })}
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: line.selected ? c.action.primary.bg : c.bg.surface, borderWidth: line.selected ? 0 : 2, borderColor: c.border.strong }}>
                    {line.selected ? <Glyph name="check-circle" size={14} color={c.action.primary.fg} /> : null}
                  </View>
                  <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'row', 'medium'), color: c.text.primary, ...flow }}>{line.name}</Text>
                </Pressable>
                {line.selected ? (
                  <View style={{ alignSelf: 'flex-start' }}>
                    <Stepper
                      value={line.qty}
                      min={1}
                      max={99}
                      onChange={(next) => patch(line.key, { qty: next })}
                      label={k('pharmacy.cart.quantity', { name: line.name })}
                      decrementLabel={k('pharmacy.cart.decrease', { name: line.name })}
                      incrementLabel={k('pharmacy.cart.increase', { name: line.name })}
                      format={(n) => num(n)}
                      disabled={submitting}
                      theme={theme}
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </Card>

        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="map-pin" tone={ORDERS_TONE} size={40} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.request.addressTitle')}</Text>
              <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>
                {loadingAddress ? k('pharmacy.request.addressLoading') : address ? address.label || addressLine || k('pharmacy.request.addressUsed') : k('pharmacy.request.addressNone')}
              </Text>
              {address && address.label && addressLine ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{addressLine}</Text> : null}
            </View>
          </View>
          {!loadingAddress && !hasPoint ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.status.warning.fg, ...flow }}>{k('pharmacy.request.addressMissing')}</Text> : null}
          <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.request.changeLocation')} onPress={() => router.push('/delivery/address-select' as Href)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link, ...flow }}>{k('pharmacy.request.changeLocation')}</Text>
          </Pressable>
        </Card>

        <Text style={{ ...scale(t, 'caption'), lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>{k('orders.reorder.note')}</Text>

        {!chosen.length ? <Notice tone="warning" text={k('orders.reorder.pickOne')} /> : null}
        {needsLocation ? <Notice tone="warning" text={k('pharmacy.checkout.err.location')} actionLabel={k('pharmacy.request.changeLocation')} onAction={() => router.push('/delivery/address-select' as Href)} /> : null}
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
