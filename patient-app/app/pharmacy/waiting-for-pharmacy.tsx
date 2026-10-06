import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

import { orderIdParam } from '../../src/utils/pharmacyOffers';

/**
 * Merged into pharmacy/broadcast-status (journey compression). A link that still points here keeps working:
 * `waiting-for-pharmacy?orderId=X` (or the older `requestId=X`) opens the offers screen for that order, which reads the
 * order's state itself (searching, offers in, already chosen, cancelled). With no order id there is nothing to wait for,
 * so it opens the order list instead of a screen that would have no order to show.
 */
export default function WaitingForPharmacyRedirect() {
  const params = useLocalSearchParams<{ orderId?: string | string[]; requestId?: string | string[] }>();
  const id = orderIdParam(params);
  const href: Href = id ? { pathname: '/pharmacy/broadcast-status', params: { orderId: id } } : '/pharmacy/order-history';
  return <Redirect href={href} />;
}
