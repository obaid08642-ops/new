import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { router, type Href } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../../../../packages/ui/icons/fill';
import { Badge, SERVICE_ICONS } from '../../../../packages/ui-native/src';
import { useCart } from '../../context/CartContext';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { medGallery, medName, needsRx, onlineOnly, type Med } from '../../utils/pharmacyCatalog';
import { flyToCart, registerCartTarget } from '../../utils/flyToCart';
import { MOTION, reduceMotion } from '../../utils/motion';
import { showUndoToast } from '../../utils/undoToast';

/**
 * Pieces the pharmacy hub, the product page, the wishlist and the comparison share, so each screen holds no colour,
 * no font size and no cart logic of its own.
 */

/** The pharmacy's own service tone (the service map of the handoff), for its hero, empty states and icon tiles. */
export const PHARMACY_TONE = SERVICE_ICONS.pharmacy.tone;
/** The tone of "order again" and the comparison (the handoff's nursing / compare tone). */
export const SECONDARY_TONE = SERVICE_ICONS.nursing.tone;

/** A glyph of the board's fill set in a token colour (the icon boxes of the boards draw them without a tile). */
export function Glyph({ name, size, color }: { name: FillIconName; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX}>
      <Path d={FILL_ICON_PATHS[name]} fill={color} />
    </Svg>
  );
}

/** The ink square beside the search field (board PharmacyHub, "تصوير الروشتة"): 52 square, radius 18, white glyph. */
export function GlyphSquare({ name, label, onPress }: { name: FillIconName; label: string; onPress: () => void }) {
  const { c } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 18, backgroundColor: c.action.primary.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
    >
      <Glyph name={name} size={22} color={c.action.primary.fg} />
    </Pressable>
  );
}

/** A 44 round header button with a fill glyph (board PharmacyHub: "my orders", the cart): surface, hairline ring, ink glyph. */
export function GlyphRound({ name, label, onPress, children, testID }: { name: FillIconName; label: string; onPress: () => void; children?: React.ReactNode; testID?: string }) {
  const { c } = useScreenUi();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.onGlass, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
      >
        <Glyph name={name} size={20} color={c.text.secondary} />
      </Pressable>
      {children}
    </View>
  );
}

/**
 * A count on a header button (the cart): the board's coral bubble at the end corner. Nothing when the count is 0. When the
 * count goes up the bubble pops (scale 1 -> 1.2 -> 1, MOTION.pop); with reduced motion only the number changes.
 */
export function CountBadge({ count }: { count: number }) {
  const { theme } = useScreenUi();
  const scaleValue = useRef(new Animated.Value(1)).current;
  const before = useRef(count);
  useEffect(() => {
    if (count > before.current && !reduceMotion()) {
      Animated.sequence([
        Animated.timing(scaleValue, { toValue: 1.2, duration: MOTION.pop / 2, useNativeDriver: true }),
        Animated.timing(scaleValue, { toValue: 1, duration: MOTION.pop / 2, useNativeDriver: true }),
      ]).start();
    }
    before.current = count;
  }, [count, scaleValue]);
  if (count <= 0) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -3, end: -3, transform: [{ scale: scaleValue }] }}>
      <Badge content={count} tone="danger" theme={theme} />
    </Animated.View>
  );
}

/** The header cart button says where it is, so a product picture can fly to it (utils/flyToCart.ts). */
function useCartTarget() {
  const ref = useRef<View>(null);
  useEffect(() => registerCartTarget({ measure: (done) => { if (ref.current) ref.current.measureInWindow(done); else done(0, 0, 0, 0); } }), []);
  return ref;
}

/**
 * The cart button of every header that carries it (hub, search, home, the offers screens): the board's 44 round glyph with
 * the count bubble, read from the same cart context the add buttons write to, so it changes in the same render as an add
 * or a remove. The accessible name carries the count in the screen's language.
 */
export function CartButton({ testID }: { testID?: string }) {
  const { itemCount } = useCart();
  const { k } = useScreenUi();
  const label = itemCount > 0 ? k('pharmacy.cartCount', { count: itemCount }) : k('pharmacy.cart');
  const target = useCartTarget();
  return (
    <View ref={target} collapsable={false}>
      <GlyphRound name="package" label={label} onPress={() => router.push('/pharmacy/cart' as Href)} testID={testID ?? 'cart-button'}>
        <CountBadge count={itemCount} />
      </GlyphRound>
    </View>
  );
}

/**
 * The one way a medicine goes into the local cart. A prescription medicine says, once per tap, that the prescription
 * is asked for in the cart (the same notice the screens showed before). Returns nothing: the cart's count is the feedback.
 */
export function useAddMedToCart() {
  const { addItem } = useCart();
  const { k } = useScreenUi();
  return useCallback(
    (m: Med, qty = 1, opts?: { quiet?: boolean }) => {
      if (needsRx(m) && !opts?.quiet) {
        showLocalizedAlert(k('pharmacy.rxNoticeTitle'), k('pharmacy.rxNoticeBody'), [{ text: k('pharmacy.ok') }]);
      }
      void addItem({
        id: String(m.id),
        name: medName(m),
        rx: needsRx(m),
        image: medGallery(m)[0] || (typeof m.image === 'string' ? m.image : undefined),
        activeIngredient: String(m.active_ingredient ?? m.activeIngredient ?? '') || undefined,
        onlineOnly: onlineOnly(m),
        qty,
      });
    },
    [addItem, k],
  );
}

/** Back, or the pharmacy hub when there is nothing to go back to (a deep link, a notification). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/pharmacy' as Href);
}

type StatusTone = 'warning' | 'danger' | 'success' | 'info' | 'neutral';

/** A short status label (a prescription's state, the Rx note of the cart): the status tokens, wraps in any language. */
export function Pill({ label, tone }: { label: string; tone: StatusTone }) {
  const { t, c } = useScreenUi();
  return (
    <View style={{ alignSelf: 'flex-start', minHeight: 24, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 12, backgroundColor: c.status[tone].bg, justifyContent: 'center' }}>
      <Text style={{ ...scale(t, 'tag', 'bold'), color: c.status[tone].fg }}>{label}</Text>
    </View>
  );
}

/**
 * The board's notice card (Cart: the prescription banner; here also the permission and error notices): a tinted
 * status surface, an icon tile, a title, a line and an optional action button.
 */
export function Notice({ tone, icon, title, body, actionLabel, onAction }: { tone: 'warning' | 'danger'; icon: FillIconName; title: string; body?: string; actionLabel?: string; onAction?: () => void }) {
  const { t, c, flow } = useScreenUi();
  const s = c.status[tone];
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} style={{ borderRadius: 20, backgroundColor: s.bg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Glyph name={icon} size={22} color={s.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...scale(t, 'small', 'bold'), color: s.fg, ...flow }}>{title}</Text>
        {body ? <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 18, color: s.fg, ...flow }}>{body}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The board's two picker buttons (RxUpload: camera, photos): 44 tall, radius 14, a fill glyph and a label that grows
 * with the language. `ink` is the filled one, the other is outlined.
 */
export function PickButton({ name, label, ink, disabled, onPress }: { name: FillIconName; label: string; ink?: boolean; disabled?: boolean; onPress: () => void }) {
  const { t, c } = useScreenUi();
  const fg = ink ? c.service.coral.fg : c.action.primary.bg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: ink ? c.service.coral.bg : 'transparent',
        borderWidth: ink ? 0 : 1.5,
        borderColor: c.action.primary.bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Glyph name={name} size={18} color={fg} />
      <Text style={{ ...scale(t, 'small', 'bold'), color: fg }}>{label}</Text>
    </Pressable>
  );
}

/**
 * The add control of a product card, tile or row. Nothing of it in the cart: the board's + button. Once it is in the cart:
 * [- qty +], the cart's own quantity (so the same product shows the same number on every screen and after a restart); - at 1
 * removes the line and offers "undo". The first add flies the product's picture to the header cart button (not with reduced motion).
 */
export function MedAddControl({ med, size = 40, disabled = false, addLabel }: { med: Med; size?: number; disabled?: boolean; addLabel?: string }) {
  const { items, updateQty, removeItem } = useCart();
  const { c, k, num } = useScreenUi();
  const addToCart = useAddMedToCart();
  const id = String(med.id);
  const name = medName(med);
  const qty = items.find((line) => line.id === id)?.qty ?? 0;
  const fly = (event: GestureResponderEvent) => flyToCart({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }, medGallery(med)[0] || (typeof med.image === 'string' ? med.image : null));
  const box = { height: size, borderRadius: 14, backgroundColor: c.action.primary.bg, alignItems: 'center' as const, justifyContent: 'center' as const };

  if (qty > 0 && !disabled) {
    return (
      <View accessibilityRole="adjustable" accessibilityLabel={k('pharmacy.stepper.qty', { n: num(qty) })} testID={`med-stepper-${id}`} style={{ ...box, flexDirection: 'row', gap: 2, paddingHorizontal: 2 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={k('pharmacy.stepper.decrease', { name })}
          testID={`med-stepper-${id}-minus`}
          hitSlop={4}
          onPress={() => {
            if (qty > 1) { void updateQty(id, -1); return; }
            void removeItem(id);
            showUndoToast(k('pharmacy.removedFromCart', { name }), k('common.undo'), () => addToCart(med, 1, { quiet: true }));
          }}
          style={{ width: 34, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: 14, height: 2.5, borderRadius: 2, backgroundColor: c.action.primary.fg }} />
        </Pressable>
        <Text testID={`med-stepper-${id}-qty`} style={{ minWidth: 18, textAlign: 'center', color: c.action.primary.fg, fontSize: 15, fontWeight: '700' }}>{num(qty)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={k('pharmacy.stepper.increase', { name })}
          testID={`med-stepper-${id}-plus`}
          hitSlop={4}
          onPress={(event) => { void updateQty(id, 1); fly(event); }}
          style={{ width: 34, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: 14, height: 2.5, borderRadius: 2, backgroundColor: c.action.primary.fg }} />
          <View style={{ position: 'absolute', width: 2.5, height: 14, borderRadius: 2, backgroundColor: c.action.primary.fg }} />
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={addLabel ?? k('pharmacy.addToCart')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      testID={`med-add-${id}`}
      hitSlop={4}
      onPress={(event) => { addToCart(med); fly(event); }}
      style={{ ...box, width: size, opacity: disabled ? 0.4 : 1 }}
    >
      <View style={{ width: 16, height: 2.5, borderRadius: 2, backgroundColor: c.action.primary.fg }} />
      <View style={{ position: 'absolute', width: 2.5, height: 16, borderRadius: 2, backgroundColor: c.action.primary.fg }} />
    </Pressable>
  );
}
