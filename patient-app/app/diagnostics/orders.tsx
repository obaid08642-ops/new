import React from 'react';

import { OrderList, type OrderEndpoints } from '../../src/components/orders/OrderList';

/** Labs and radiology bookings in the shared order list (board Orders): current and previous, the status and the amount from the server. */
const DIAGNOSTICS_ORDER_ENDPOINTS: OrderEndpoints = [
  ['labs', '/labs/bookings/mine'],
  ['radiology', '/radiology/bookings/mine'],
];

export default function DiagnosticsOrders() {
  return <OrderList endpoints={DIAGNOSTICS_ORDER_ENDPOINTS} titleKey="diag.orders.title" testID="diagnostics-orders-screen" />;
}
