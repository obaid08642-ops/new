import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../../../../packages/ui/icons/fill';
import { Badge, SERVICE_ICONS } from '../../../../packages/ui-native/src';
import { useCart } from '../../context/CartContext';
import { useScreenUi } from '../screen/ScreenKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { medGallery, medName, needsRx, type Med } from '../../utils/pharmacyCatalog';

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
        qty,
      });
    },
    [addItem, k],
  );
}
