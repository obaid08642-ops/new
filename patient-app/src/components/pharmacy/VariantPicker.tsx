import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Chip } from '../../../../packages/ui-native/src';
import ProductImage from '../ProductImage';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { buildSwatches, formatPower, swatchKeyOf, variantForSwatch, visiblePowers, type ProductVariant } from '../../utils/variantPicker';

/**
 * Owner decision D (issue 1556, 2026-10-16): the product page's variant picker, built for long lists.
 *  - Colour / shade / picture: swatches from each variant's own picture. Lensme and Newlens have the colour only in the
 *    picture, so those swatches are "Option n", never an invented colour name.
 *  - Diva: the colour first, then the powers that colour has, in a grid split into minus and plus.
 *  - An unavailable variant is greyed and cannot be chosen. The screen keeps the choice in its route (?v=<id>).
 */
export function VariantPicker({ variants, selectedId, onSelect }: { variants: ProductVariant[]; selectedId: string; onSelect: (id: string) => void }) {
  const { theme, t, c, k, flow, lang } = useScreenUi();
  const [sign, setSign] = useState<'minus' | 'plus' | null>(null);
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  const swatches = useMemo(() => buildSwatches(variants, (n) => k('pharmacy.variant.option', { n })), [variants, k]);
  if (variants.length < 2 || !selected) return null;
  const selectedKey = swatchKeyOf(selected);
  const { powers, shown, hasMinus, hasPlus, activeSign } = visiblePowers(variants, selected, sign);
  const locale = lang;
  const chosen = [swatches.length > 1 ? swatches.find((s) => s.key === selectedKey)?.label : null, selected.variant.power !== null ? formatPower(locale, selected.variant.power) : null].filter(Boolean).join(' · ');

  return (
    <View testID="variant-picker" accessibilityLabel={k('pharmacy.variant.title')} style={{ gap: 12 }}>
      {swatches.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ ...scale(t, 'label', 'bold'), color: c.text.primary, ...flow }}>
            {selected.variant.colour ? k('pharmacy.variant.colour') : selected.variant.shade ? k('pharmacy.variant.shade') : k('pharmacy.variant.options')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="radiogroup">
            {swatches.map((s) => {
              const on = s.key === selectedKey;
              return (
                <Pressable
                  key={s.key}
                  testID={`variant-swatch-${s.first.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: !s.available }}
                  accessibilityLabel={s.available ? s.label : k('pharmacy.variant.unavailable', { label: s.label })}
                  disabled={!s.available}
                  onPress={() => {
                    const next = variantForSwatch(variants, s.key, selected);
                    if (next) onSelect(next.id);
                  }}
                  style={{ width: 56, height: 56, borderRadius: 14, borderWidth: on ? 2 : 1.5, borderColor: on ? c.text.primary : c.border.subtle, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: s.available ? 1 : 0.4 }}
                >
                  {s.first.image ? (
                    <ProductImage uri={s.first.image} style={{ width: 50, height: 50, borderRadius: 10 }} iconSize={24} />
                  ) : (
                    <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{s.label}</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {powers.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ ...scale(t, 'label', 'bold'), color: c.text.primary, ...flow }}>{k('pharmacy.variant.power')}</Text>
          {hasMinus && hasPlus ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label={k('pharmacy.variant.minus')} selected={activeSign === 'minus'} onPress={() => setSign('minus')} theme={theme} testID="variant-sign-minus" />
              <Chip label={k('pharmacy.variant.plus')} selected={activeSign === 'plus'} onPress={() => setSign('plus')} theme={theme} testID="variant-sign-plus" />
            </View>
          ) : null}
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {shown.map((v) => {
              const label = formatPower(locale, v.variant.power ?? 0);
              const on = v.id === selected.id;
              return (
                <Pressable
                  key={v.id}
                  testID={`variant-power-${v.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: !v.available }}
                  accessibilityLabel={v.available ? label : k('pharmacy.variant.unavailable', { label })}
                  disabled={!v.available}
                  onPress={() => onSelect(v.id)}
                  style={{ minWidth: 72, height: 44, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: on ? c.service.coral.bg : c.border.subtle, backgroundColor: on ? c.service.coral.bg : c.bg.surface, alignItems: 'center', justifyContent: 'center', opacity: v.available ? 1 : 0.4 }}
                >
                  <Text style={{ ...scale(t, 'control'), color: on ? c.service.coral.fg : c.text.primary, writingDirection: 'ltr' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'caption', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.variant.chosen', { label: chosen })}</Text>
    </View>
  );
}
