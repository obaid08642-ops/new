import React from 'react';

import { OrderList, PHARMACY_ORDER_ENDPOINTS } from '../../src/components/orders/OrderList';

/**
 * The pharmacy order history — board Orders (canvas/Orders.dc.html) for the governed pharmacy orders. A row opens the step
 * the order is at (offers, final price, insurance decision or tracking, by `orderRoute` in utils/pharmacyCheckout.ts),
 * and a delivered one offers "order again".
 */
export default function PharmacyOrderHistoryScreen() {
  return <OrderList endpoints={PHARMACY_ORDER_ENDPOINTS} titleKey="orders.pharmacyTitle" testID="order-history-screen" />;
}
