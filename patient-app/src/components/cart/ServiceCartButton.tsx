import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { withAlpha } from '../../../../packages/ui-native/src/shells/shellTokens';
import { useCart } from '../../context/CartContext';
import { useDiagnosticsCart } from '../../context/DiagnosticsCartContext';
import { cartRoute, cartTargetFor, diagnosticsCounts, type CartService } from '../../utils/serviceCarts';
import type { AppHeaderAction } from '../../../../packages/ui-native/src';
import { CountBadge, Glyph, GlyphRound } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * The cart button of a header, one cart per service (utils/serviceCarts.ts). It opens that service's cart and counts only
 * that service. With no service (Home, consultations, search) it draws nothing while every cart is empty, and otherwise opens a
 * "Your carts" sheet of the non-empty carts with their counts; its badge is the total.
 */
export function ServiceCartButton({ service = null, testID }: { service?: CartService | null; testID?: string }) {
  const { itemCount } = useCart();
  const { items } = useDiagnosticsCart();
  const { c, t, k, num, flow } = useScreenUi();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const diag = diagnosticsCounts(items);
  const target = cartTargetFor(service, { pharmacy: itemCount, lab: diag.lab, radiology: diag.radiology });
  if (target.kind === 'none') return null;
  const label = target.count > 0 ? k('pharmacy.cartCount', { count: target.count }) : k('pharmacy.cart');
  const go = (route: string) => router.push(route as Href);
  return (
    <>
      <GlyphRound
        name="package"
        label={label}
        testID={testID ?? 'cart-button'}
        onPress={() => (target.kind === 'chooser' ? setOpen(true) : go(target.route))}
      >
        <CountBadge count={target.count} />
      </GlyphRound>
      {target.kind === 'chooser' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={k('common.close')}
              onPress={() => setOpen(false)}
              style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: withAlpha(c.text.primary, 0.4) }}
            />
            <View
              testID="cart-chooser"
              style={{ width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: c.bg.surface, borderTopStartRadius: 28, borderTopEndRadius: 28, paddingTop: 20, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 4 }}
            >
              <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, marginBottom: 8, paddingHorizontal: 4, ...flow }}>{k('cart.chooser.title')}</Text>
              {target.carts.map((cart) => (
                <Pressable
                  key={cart.service}
                  accessibilityRole="button"
                  testID={`cart-chooser-${cart.service}`}
                  accessibilityLabel={`${k(`cart.name.${cart.service}`)}, ${num(cart.count)}`}
                  onPress={() => { setOpen(false); go(cart.route); }}
                  style={{ minHeight: 52, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <Text style={{ flex: 1, ...scale(t, 'body', 'medium'), color: c.text.primary, ...flow }}>{k(`cart.name.${cart.service}`)}</Text>
                  <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.secondary }}>{num(cart.count)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

/** True when some cart has items, i.e. when the page-less cart button (Home, consultations, search) is drawn. */
export function useAnyCartItems(): boolean {
  const { itemCount } = useCart();
  const { items } = useDiagnosticsCart();
  return itemCount > 0 || items.length > 0;
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
