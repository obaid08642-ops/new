import React from 'react';

import { ALL_ORDER_ENDPOINTS, OrderList } from '../../src/components/orders/OrderList';

/** My orders and results — board Orders (canvas/Orders.dc.html): every service's orders and bookings in one list. */
export default function OrderCenterScreen() {
  return <OrderList endpoints={ALL_ORDER_ENDPOINTS} titleKey="orders.resultsTitle" withResults testID="orders-screen" />;
}
