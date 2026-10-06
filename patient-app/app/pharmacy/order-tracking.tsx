import React, { useCallback, useRef, useState } from 'react';
import { Linking, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, ErrorState, FIcon, OfflineState, Screen, Timeline } from '../../../packages/ui-native/src';
import { StatusPill, useClock, useOrderDate } from '../../src/components/orders/OrderKit';
import { Money, Notice } from '../../src/components/pharmacy/OfferKit';
import { Glyph, PHARMACY_TONE, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { ORDERS_TONE, hashRef, statusLook } from '../../src/utils/orderCenter';
import { nextKey, readTracking, type TrackingView } from '../../src/utils/orderTracking';
import { orderNumber } from '../../src/utils/pharmacyCheckout';
import { orderIdParam } from '../../src/utils/pharmacyOffers';

/**
 * Order tracking — board OrderTracking (canvas/OrderTracking.dc.html) for a governed pharmacy order. Everything on it is
 * what GET /patient/pharmacy/orders/:id returns (see utils/orderTracking.ts): the steps follow the order's own status,
 * a step shows a time only when the server recorded its event, the arrival time is the courier's own estimate and the
 * courier appears only when the pharmacy named one. There is no live map: the backend has no courier position to draw.
 * The page is read again when it comes into focus and on pull-to-refresh; no timer decides anything.
 */

export default function OrderTrackingScreen() {
  const { theme, t, c, dir, flow, k, num } = useScreenUi();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const id = orderIdParam({ orderId: params.orderId });
  const date = useOrderDate();
  const clock = useClock();

  const [view, setView] = useState<TrackingView | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState<'error' | 'offline' | 'missing' | null>(null);
  const hasData = useRef(false);

  const load = useCallback(
    async (mode: 'first' | 'manual') => {
      if (!id) return;
      if (mode === 'first') setLoading(true);
      try {
        const read = readTracking(await apiFetch(`/patient/pharmacy/orders/${id}`));
        if (!read) throw new Error('order_unreadable');
        setView(read);
        setFailed(null);
        hasData.current = true;
      } catch (error) {
        logError('pharmacy:order-tracking', error);
        if (/order_not_found|not_yours|AUTH_ERROR_403/i.test(error instanceof Error ? error.message : '')) setFailed('missing');
        else if (!hasData.current) setFailed((await isOffline()) ? 'offline' : 'error');
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

  const chat = view && !view.cancelled ? [{ key: 'chat', label: k('orders.track.chat'), icon: <Glyph name="chat-circle-text" size={20} color={c.icon.primary} />, onPress: () => router.push({ pathname: '/pharmacy/pharmacist-chat', params: { orderId: id } } as unknown as Href) }] : [];
  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('orders.track.title')} onBack={goBack} backLabel={k('pharmacy.back')} actions={chat} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="order-tracking-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (!id) {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.offers.noOrder')} body={k('pharmacy.offers.noOrderBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }
  if (loading) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID="order-tracking-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, gap: 16 }}>
          <View style={{ height: 300, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          <View style={{ height: 72, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        </View>
      </Screen>
    );
  }
  if (failed === 'missing') {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('orders.track.notFound')} body={k('orders.track.notFoundBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/pharmacy/order-history' as Href)} theme={theme} />);
  }
  if (failed === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }
  if (failed === 'error' || !view) {
    return state(<ErrorState title={k('orders.track.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }

  const number = orderNumber(view.order.id);
  const current = view.steps.find((s) => s.state === 'current');
  const phase = statusLook('pharmacy', view.status);
  const headline = view.cancelled ? k('orders.status.cancelled') : view.notStarted ? k(`orders.status.${phase.label}`) : view.done ? k(`orders.track.step.${view.steps[view.steps.length - 1].id}`) : current ? k(`orders.track.step.${current.id}`) : k(`orders.status.${phase.label}`);
  const { totals } = view;
  const summary = [view.itemCount === 1 ? k('pharmacy.hub.oneItem') : view.itemCount > 1 ? k('pharmacy.hub.items', { n: num(view.itemCount) }) : ''].filter(Boolean).join(' · ');

  return (
    <Screen
      theme={theme}
      direction={dir}
      header={header}
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load('manual'); }} tintColor={c.text.primary} />}
      testID="order-tracking-screen"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 }}>
        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              {view.eta !== null ? (
                <>
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('orders.track.eta')}</Text>
                  <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, ...flow }}>{clock(view.eta)}</Text>
                </>
              ) : (
                <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{headline}</Text>
              )}
            </View>
            <StatusPill label={k('orders.track.number', { n: hashRef(number) })} tone="neutral" />
          </View>

          {view.cancelled ? (
            <Notice tone="danger" text={k('orders.track.cancelled')} />
          ) : (
            <>
              {view.notStarted ? <Notice tone="warning" text={k('orders.track.notStarted')} /> : null}
              <Timeline
                label={k('orders.track.title')}
                steps={view.steps.map((s) => ({ id: s.id, label: k(`orders.track.step.${s.id}`), time: s.at !== null ? date(s.at, true) : undefined, state: s.state }))}
                theme={theme}
              />
            </>
          )}
        </Card>

        {view.courier ? (
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FIcon icon="moped" tone={ORDERS_TONE} chip="soft" size={48} theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{view.courier.name}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('orders.track.courier')}</Text>
              </View>
              {view.courier.phone ? (
                <Button
                  label={k('orders.track.call')}
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    Linking.openURL(`tel:${view.courier?.phone}`).catch((error) => logError('pharmacy:order-tracking:call', error));
                  }}
                  theme={theme}
                />
              ) : null}
            </View>
          </Card>
        ) : null}

        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="storefront" tone={ORDERS_TONE} chip="soft" size={40} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(t, 'row', 'medium'), color: c.text.primary, ...flow }}>{view.fulfillment === 'pickup' ? k('orders.track.pickup') : k('orders.track.delivery')}</Text>
              {summary ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{summary}</Text> : null}
            </View>
            {totals.total !== null && totals.total > 0 ? <Money amount={totals.total} currency={totals.currency} size="bodyStrong" unit="tag" /> : null}
          </View>
        </Card>

        {view.next ? <Button label={k(nextKey(view.next))} size="lg" fullWidth onPress={() => router.push(view.next as unknown as Href)} theme={theme} /> : null}
        {view.done ? (
          <Button
            label={k('orders.track.rate')}
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.push({ pathname: '/reviews', params: { booking_kind: 'pharmacy', booking_id: view.order.id } } as unknown as Href)}
            theme={theme}
          />
        ) : null}
      </View>
    </Screen>
  );
}
