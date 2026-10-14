import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../../../../packages/ui/icons/fill';
import { Badge, SERVICE_ICONS } from '../../../../packages/ui-native/src';
import { useCart } from '../../context/CartContext';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { medGallery, medName, needsRx, onlineOnly, type Med } from '../../utils/pharmacyCatalog';

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
      style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 18, backgroundColor: c.action.selected.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
    >
      <Glyph name={name} size={22} color={c.action.selected.fg} />
    </Pressable>
  );
}

/** A 44 round header button with a fill glyph (board PharmacyHub: "my orders", the cart): surface, hairline ring, ink glyph. */
export function GlyphRound({ name, label, onPress, children }: { name: FillIconName; label: string; onPress: () => void; children?: React.ReactNode }) {
  const { c } = useScreenUi();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.onGlass, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
      >
        <Glyph name={name} size={20} color={c.icon.primary} />
      </Pressable>
      {children}
    </View>
  );
}

/** A count on a header button (the cart): the board's coral bubble at the end corner. Nothing when the count is 0. */
export function CountBadge({ count }: { count: number }) {
  const { theme } = useScreenUi();
  if (count <= 0) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -3, end: -3 }}>
      <Badge content={count} tone="danger" theme={theme} />
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
    (m: Med, qty = 1) => {
      if (needsRx(m)) {
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
  const fg = ink ? c.action.selected.fg : c.text.primary;
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
        backgroundColor: ink ? c.action.selected.bg : 'transparent',
        borderWidth: ink ? 0 : 1.5,
        borderColor: c.text.primary,
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
