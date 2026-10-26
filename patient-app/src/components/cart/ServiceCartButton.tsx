import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { withAlpha } from '../../../../packages/ui-native/src/shells/shellTokens';
import { useCart } from '../../context/CartContext';
import { useDiagnosticsCart } from '../../context/DiagnosticsCartContext';
import { cartTargetFor, diagnosticsCounts, type CartService } from '../../utils/serviceCarts';
import { CountBadge, GlyphRound } from '../pharmacy/PharmacyKit';
import { useScreenUi } from '../screen/ScreenKit';

/**
 * The cart button of a header, one cart per service (utils/serviceCarts.ts). With `service` it opens that service's cart and
 * counts only that service. With none (Home, search) it opens the one cart that has something in it, or a chooser sheet of the
 * carts that are not empty, each with its count.
 */
export function ServiceCartButton({ service = null, testID }: { service?: CartService | null; testID?: string }) {
  const { itemCount } = useCart();
  const { items } = useDiagnosticsCart();
  const { c, k, tr, num, flow } = useScreenUi();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const diag = diagnosticsCounts(items);
  const target = cartTargetFor(service, { pharmacy: itemCount, lab: diag.lab, radiology: diag.radiology });
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
              accessibilityLabel={tr('common.close')}
              onPress={() => setOpen(false)}
              style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: withAlpha(c.text.primary, 0.4) }}
            />
            <View
              testID="cart-chooser"
              style={{ width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: c.bg.surface, borderTopStartRadius: 28, borderTopEndRadius: 28, paddingTop: 20, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 4 }}
            >
              <Text accessibilityRole="header" style={{ color: c.text.primary, fontSize: 18, fontWeight: '700', marginBottom: 8, paddingHorizontal: 4, ...flow }}>{k('cart.chooser.title')}</Text>
              {target.carts.map((cart) => (
                <Pressable
                  key={cart.service}
                  accessibilityRole="button"
                  testID={`cart-chooser-${cart.service}`}
                  accessibilityLabel={`${k(`cart.name.${cart.service}`)}, ${num(cart.count)}`}
                  onPress={() => { setOpen(false); go(cart.route); }}
                  style={{ minHeight: 52, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <Text style={{ flex: 1, color: c.text.primary, fontSize: 16, fontWeight: '500', ...flow }}>{k(`cart.name.${cart.service}`)}</Text>
                  <Text style={{ color: c.text.secondary, fontSize: 16, fontWeight: '700' }}>{num(cart.count)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
