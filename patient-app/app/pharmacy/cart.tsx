import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppHeader, Button, Card, EmptyState, FIcon, Icon, Screen, Stepper, StickyFooter } from '../../../packages/ui-native/src';
import ProductImage from '../../src/components/ProductImage';
import { Glyph, Notice, PHARMACY_TONE, Pill, goBack } from '../../src/components/pharmacy/PharmacyKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useCart, type CartItem } from '../../src/context/CartContext';

/**
 * Pharmacy cart — board Cart (canvas/Cart.dc.html).
 *
 * The cart is a local list of what the patient picked (CartContext): a medicine, its picture, its active ingredient,
 * whether it needs a prescription, and a quantity. It is local-first: kept on this device, with no price, total or stock
 * on purpose (the pharmacies' offers set the price, so the board's price, total and points rows are not drawn here: Needs
 * review), and opening it or changing a line makes no request. The delivery address is chosen at the next step. The
 * prescription banner shows only when a line of the cart needs one. The empty state waits until the cart saved on this
 * device has been read.
 */

/** A route that is a screen of the app (the typed router only knows the generated list). */
const go = (href: string) => router.push(href as Href);

function Line({ item, last }: { item: CartItem; last: boolean }) {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const { updateQty, removeItem } = useCart();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border.subtle }}>
      <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: c.bg.media, overflow: 'hidden' }}>
        <ProductImage uri={item.image} style={{ width: '100%', height: '100%' }} iconSize={30} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Text style={{ ...scale(t, 'row', 'medium'), color: c.text.primary, ...flow }}>{item.name}</Text>
        {item.activeIngredient ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{item.activeIngredient}</Text> : null}
        {item.rx ? <Pill label={k('pharmacy.needsRx')} tone="warning" /> : null}
        <Stepper
          value={item.qty}
          min={1}
          max={99}
          onChange={(next) => void updateQty(item.id, next - item.qty)}
          label={k('pharmacy.cart.quantity', { name: item.name })}
          decrementLabel={k('pharmacy.cart.decrease', { name: item.name })}
          incrementLabel={k('pharmacy.cart.increase', { name: item.name })}
          format={(n) => num(n)}
          testID={`cart-qty-${item.id}`}
          theme={theme}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={k('pharmacy.cart.remove', { name: item.name })}
        onPress={() => void removeItem(item.id)}
        hitSlop={4}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
      >
        <Glyph name="trash" size={20} color={c.icon.secondary} />
      </Pressable>
    </View>
  );
}

export default function PharmacyCartScreen() {
  const { theme, t, c, dir, flow, k, num } = useScreenUi();
  const { items, hasRxItems, clearCart, ready } = useCart();

  const confirmClear = () =>
    showLocalizedAlert(k('pharmacy.cart.clearTitle'), k('pharmacy.cart.clearBody'), [
      { text: k('pharmacy.cancel'), style: 'cancel' },
      { text: k('pharmacy.cart.clearConfirm'), style: 'destructive', onPress: () => void clearCart() },
    ]);

  // with a prescription medicine the next step is choosing the prescription; otherwise the address and the request
  const proceed = () => go(hasRxItems ? '/pharmacy/rx-order' : '/pharmacy/checkout');

  const header = (
    <View style={COLUMN}>
      <AppHeader
        title={k('pharmacy.cart')}
        onBack={goBack}
        backLabel={k('pharmacy.back')}
        actions={items.length ? [{ key: 'clear', label: k('pharmacy.cart.clear'), icon: <Glyph name="trash" size={20} color={c.icon.primary} />, onPress: confirmClear }] : []}
        theme={theme}
        direction={dir}
      />
    </View>
  );

  if (!ready) {
    return (
      <Screen theme={theme} direction={dir} header={header} testID="cart-screen">
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ height: 160, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        </View>
      </Screen>
    );
  }

  if (!items.length) {
    return (
      <Screen theme={theme} direction={dir} header={header} testID="cart-screen">
        <View style={{ ...COLUMN, flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
          <EmptyState
            icon="package"
            tone={PHARMACY_TONE}
            title={k('pharmacy.cart.emptyTitle')}
            body={k('pharmacy.cart.emptyBody')}
            actionLabel={k('pharmacy.cart.emptyAction')}
            onAction={() => router.replace('/(tabs)/pharmacy' as Href)}
            theme={theme}
          />
        </View>
      </Screen>
    );
  }

  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={COLUMN}>
        <Button label={hasRxItems ? k('pharmacy.cart.ctaRx') : k('pharmacy.cart.ctaRequest')} size="lg" fullWidth onPress={proceed} testID="cart-continue" theme={theme} />
      </View>
    </StickyFooter>
  );

  return (
    <Screen theme={theme} direction={dir} header={header} footer={footer} testID="cart-screen">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 }}>
        <Text style={{ ...scale(t, 'label', 'medium'), color: c.text.secondary, ...flow }}>
          {items.length === 1 ? k('pharmacy.hub.oneItem') : k('pharmacy.hub.items', { n: num(items.length) })}
        </Text>

        <Card padding="none" theme={theme}>
          <View style={{ paddingHorizontal: 16 }}>
            {items.map((item, i) => (
              <Line key={item.id} item={item} last={i === items.length - 1} />
            ))}
          </View>
        </Card>

        {hasRxItems ? (
          <Notice tone="warning" icon="prescription" title={k('pharmacy.cart.rxBannerTitle')} body={k('pharmacy.cart.rxBannerBody')} actionLabel={k('pharmacy.cart.rxBannerAction')} onAction={() => go('/pharmacy/rx-order?via=photo')} />
        ) : null}

        <Pressable accessibilityRole="link" accessibilityLabel={k('pharmacy.cart.manual')} onPress={() => go('/pharmacy/rx-order?via=type')}>
          <Card padding="sm" theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FIcon icon="pill" tone={PHARMACY_TONE} size={40} theme={theme} />
              <Text style={{ flex: 1, ...scale(t, 'small', 'medium'), color: c.text.primary, ...flow }}>{k('pharmacy.cart.manual')}</Text>
              <Icon name={dir === 'rtl' ? 'caret-left' : 'caret-right'} size={18} theme={theme} tone="secondary" />
            </View>
          </Card>
        </Pressable>

        <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 21, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.cart.note')}</Text>
      </ScrollView>
    </Screen>
  );
}
