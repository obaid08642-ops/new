import React from 'react';

import { ALL_ORDER_ENDPOINTS, OrderList } from '../../src/components/orders/OrderList';

/** My orders — board Orders (canvas/Orders.dc.html): every service's orders and bookings in one list. */
export default function OrderCenterScreen() {
  return <OrderList endpoints={ALL_ORDER_ENDPOINTS} titleKey="orders.title" testID="orders-screen" />;
}
