import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Glyph, PHARMACY_TONE } from './PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * One row of the filters that are on, each as a removable chip, and "Clear all" (owner layout addition a).
 * The screen draws it only when at least one filter is active.
 */

export type ActiveFilter = { key: string; label: string; onRemove: () => void };

export function ActiveFilters({ items, onClearAll }: { items: ActiveFilter[]; onClearAll: () => void }) {
  const { t, c, k } = useScreenUi();
  if (!items.length) return null;
  return (
    <View style={{ marginHorizontal: -16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: 'center' }}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={k('pharmacy.filters.remove', { name: item.label })}
            testID={`pharmacy-active-${item.key}`}
            onPress={item.onRemove}
            style={({ pressed }) => ({ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: c.service[PHARMACY_TONE].bg, opacity: pressed ? 0.8 : 1 })}
          >
            <Text numberOfLines={1} style={{ ...scale(t, 'small', 'medium'), color: c.service[PHARMACY_TONE].fg }}>{item.label}</Text>
            <Glyph name="x-circle" size={16} color={c.service[PHARMACY_TONE].fg} />
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel={k('pharmacy.filters.clearAll')} testID="pharmacy-clear-all" onPress={onClearAll} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 8 }}>
          <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>{k('pharmacy.filters.clearAll')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
