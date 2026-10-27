import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { useCart } from '../../context/CartContext';
import { useDiagnosticsCart } from '../../context/DiagnosticsCartContext';
import { cartRoute, cartTargetFor, diagnosticsCounts, type CartService } from '../../utils/serviceCarts';
import type { AppHeaderAction } from '../../../../packages/ui-native/src';
import { CountBadge, Glyph, GlyphRound } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * The cart button of a header, one cart per service (utils/serviceCarts.ts). It opens that service's cart and counts only
 * that service. Only screens where something can be added carry it; with no service it draws nothing.
 */
export function ServiceCartButton({ service = null, testID }: { service?: CartService | null; testID?: string }) {
  const { itemCount } = useCart();
  const { items } = useDiagnosticsCart();
  const { k } = useScreenUi();
  const diag = diagnosticsCounts(items);
  const target = cartTargetFor(service, { pharmacy: itemCount, lab: diag.lab, radiology: diag.radiology });
  if (target.kind === 'none') return null;
  const label = target.count > 0 ? k('pharmacy.cartCount', { count: target.count }) : k('pharmacy.cart');
  return (
    <GlyphRound name="package" label={label} testID={testID ?? 'cart-button'} onPress={() => router.push(target.route as Href)}>
      <CountBadge count={target.count} />
    </GlyphRound>
  );
}

/**
 * The same cart as a header action of the screens that draw their header through `ConsultScreen` (the lab, scan and package
 * item screens): the basket glyph with the count on its corner, opening that service's cart.
 */
export function useServiceCartAction(service: Exclude<CartService, 'pharmacy'>): AppHeaderAction[] {
  const { items } = useDiagnosticsCart();
  const { k, c, t, num } = useScreenUi();
  const count = diagnosticsCounts(items)[service];
  return [{
    key: 'cart',
    label: count > 0 ? k('pharmacy.cartCount', { count }) : k('pharmacy.cart'),
    icon: (
      <View>
        <Glyph name="package" size={22} color={c.icon.primary} />
        {count > 0 ? (
          <View style={{ position: 'absolute', top: -15, end: -15, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: c.action.primary.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...scale(t, 'tag', 'bold'), color: c.action.primary.fg }}>{num(count)}</Text>
          </View>
        ) : null}
      </View>
    ),
    onPress: () => router.push(cartRoute(service) as Href),
  }];
}
