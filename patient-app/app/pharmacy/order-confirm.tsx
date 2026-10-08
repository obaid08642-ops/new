import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, EmptyState, ErrorState, OfflineState, Screen } from '../../../packages/ui-native/src';
import { PHARMACY_TONE, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { orderRoute, readPayOrder } from '../../src/utils/pharmacyCheckout';
import { orderIdParam } from '../../src/utils/pharmacyOffers';

/**
 * The entry of a pharmacy order from a link or a notification (`orders/:id` in the deep-link map, which names the param
 * `id`; the app's own screens say `orderId`). It reads the order and opens the step the server says it is at (offers, final
 * price, insurance decision, or the order status). The routing follows what the backend really produces: `governed_state`
 * is empty until an offer is selected, so an order still looking for offers is told by its `status`.
 */

export default function PharmacyOrderConfirmRoute() {
  const { theme, dir, k } = useScreenUi();
  const params = useLocalSearchParams<{ orderId?: string | string[]; id?: string | string[] }>();
  const id = orderIdParam({ orderId: params.orderId ?? params.id });
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  const open = useCallback(async () => {
    if (!id) return;
    setFailed(null);
    try {
      const order = readPayOrder(await apiFetch(`/patient/pharmacy/orders/${id}`));
      if (!order) throw new Error('order_unreadable');
      router.replace(orderRoute({ id: order.id, status: order.status, governed_state: order.governedState, payment_status: order.paymentStatus, selected_offer_id: order.selectedOfferId, payment_method: order.paymentMethod }));
    } catch (error) {
      logError('pharmacy:order-confirm', error);
      setFailed((await isOffline()) ? 'offline' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void open();
  }, [open]);

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k('pharmacy.confirm.title')} onBack={goBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID="order-confirm-screen">
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (!id) {
    return state(<EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.offers.noOrder')} body={k('pharmacy.offers.noOrderBody')} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/orders' as Href)} theme={theme} />);
  }
  if (failed === 'offline') {
    return state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void open()} theme={theme} />);
  }
  if (failed === 'error') {
    return state(<ErrorState title={k('pharmacy.confirm.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void open()} actionLabel={k('pharmacy.offers.myOrders')} onAction={() => router.replace('/orders' as Href)} theme={theme} />);
  }
  return (
    <Screen theme={theme} direction={dir} header={header} scroll testID="order-confirm-screen">
      <View accessibilityLabel={k('pharmacy.confirm.opening')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16 }}>
        <EmptyState icon="receipt" tone={PHARMACY_TONE} title={k('pharmacy.confirm.opening')} theme={theme} />
      </View>
    </Screen>
  );
}
