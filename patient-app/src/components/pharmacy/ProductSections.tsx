import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FIcon, Icon } from '../../../../packages/ui-native/src';
import type { FillIconName, ServiceTone } from '../../../../packages/ui/icons/fill';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import ProductImage from '../ProductImage';
import { Glyph } from './PharmacyKit';

/**
 * The blocks of the product page (board ProductFull, canvas/ProductFull.dc.html). Each takes the real values the
 * screen read from the API and draws only what it is given.
 */

/** A 28 tall pill with an optional glyph (the Rx, category and cold-chain chips). */
export function Pill({ label, glyph, tone, onPress }: { label: string; glyph?: FillIconName; tone: 'success' | 'warning' | 'info' | 'plain'; onPress?: () => void }) {
  const { t, c } = useScreenUi();
  const look =
    tone === 'plain'
      ? { bg: c.bg.surface, fg: c.text.primary, border: c.border.subtle }
      : { bg: c.status[tone].bg, fg: c.status[tone].fg, border: 'transparent' };
  const body = (
    <View style={{ minHeight: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: look.bg, borderWidth: tone === 'plain' ? 1 : 0, borderColor: look.border, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
      {glyph ? <Glyph name={glyph} size={14} color={look.fg} /> : null}
      <Text style={{ ...scale(t, 'label', tone === 'plain' ? 'regular' : 'medium'), color: look.fg }}>{label}</Text>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} hitSlop={8}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** "Key facts": a 3-column grid of white cells (icon, label, value); it reflows to the facts that exist (never fewer than 2 columns). */
export function FactsGrid({ facts }: { facts: { key: string; icon: FillIconName; label: string; value: string }[] }) {
  const { t, c, flow } = useScreenUi();
  const cols = Math.min(3, Math.max(2, facts.length));
  const rows: (typeof facts)[] = [];
  for (let i = 0; i < facts.length; i += cols) rows.push(facts.slice(i, i + cols));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
          {Array.from({ length: cols }).map((_, i) => {
            const f = row[i];
            return (
              <View key={i} style={{ flex: 1, minWidth: 0 }}>
                {f ? (
                  <View accessible accessibilityLabel={`${f.label}: ${f.value}`} style={{ flex: 1, borderRadius: 18, backgroundColor: c.bg.surface, paddingVertical: 12, paddingHorizontal: 10, gap: 6 }}>
                    <Glyph name={f.icon} size={20} color={c.action.primary.bg} />
                    <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, ...flow }}>{f.label}</Text>
                    <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, ...flow }}>{f.value}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** The "Safety" card: one row per real safety note, a tinted icon tile, a title and its first lines. */
export function SafetyCard({ rows }: { rows: { key: string; icon: FillIconName; tone: ServiceTone; title: string; text: string }[] }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <View style={{ borderRadius: 22, backgroundColor: c.bg.surface }}>
      {rows.map((r, i) => (
        <View key={r.key} style={{ minHeight: 56, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: c.border.subtle }}>
          <FIcon icon={r.icon} tone={r.tone} size={36} theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ ...scale(t, 'control'), color: c.text.primary, ...flow }}>{r.title}</Text>
            <Text numberOfLines={3} style={{ ...scale(t, 'label', 'regular'), lineHeight: 19, color: c.text.secondary, ...flow }}>{r.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export interface AccordionSection {
  key: string;
  title: string;
  items: string[];
}

/** "Medicine details": one section open at a time, the count shown when there is more than one item, bullets in the action colour. */
export function DetailAccordion({ sections }: { sections: AccordionSection[] }) {
  const { theme, t, c, flow, dir } = useScreenUi();
  const [open, setOpen] = useState(0);
  return (
    <View style={{ borderRadius: 22, backgroundColor: c.bg.surface, overflow: 'hidden' }}>
      {sections.map((s, i) => {
        const isOpen = open === i;
        return (
          <View key={s.key} style={{ borderBottomWidth: i < sections.length - 1 ? 1 : 0, borderBottomColor: c.border.subtle }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={s.items.length > 1 ? `${s.title} ${s.items.length}` : s.title}
              onPress={() => setOpen(isOpen ? -1 : i)}
              style={{ minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Text style={{ flex: 1, ...scale(t, 'row', isOpen ? 'bold' : 'medium'), color: c.text.primary, ...flow }}>{s.title}</Text>
              {s.items.length > 1 ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{s.items.length}</Text> : null}
              <Icon name={isOpen ? 'caret-up' : 'caret-down'} size={18} theme={theme} tone="secondary" />
            </Pressable>
            {isOpen ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                {s.items.map((it, k) => (
                  <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 10, backgroundColor: c.action.primary.bg }} />
                    <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'control', 'regular'), lineHeight: 24, color: c.text.tertiary, writingDirection: dir, textAlign: dir === 'rtl' ? 'right' : 'left' }}>{it}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** A 150 wide card of the alternatives and related rows: the picture on the media tile, name, maker and pack, price, and an end element. */
export function MiniProduct({
  name,
  meta,
  price,
  currency,
  uri,
  badge,
  onPress,
  onAdd,
  addLabel,
}: {
  name: string;
  meta?: string;
  price?: string;
  currency?: string;
  uri?: string | null;
  badge?: { label: string; tone: 'success' | 'neutral' };
  onPress: () => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  const { t, c, flow } = useScreenUi();
  const chip = badge ? (badge.tone === 'success' ? { bg: c.status.success.bg, fg: c.status.success.fg } : { bg: c.status.neutral.bg, fg: c.text.tertiary }) : null;
  return (
    <View style={{ width: 150, borderRadius: 22, backgroundColor: c.bg.surface, padding: 10, gap: 8 }}>
      <Pressable accessibilityRole="link" accessibilityLabel={name} onPress={onPress} style={{ gap: 8 }}>
        <View style={{ height: 110, borderRadius: 16, backgroundColor: c.bg.media, overflow: 'hidden' }}>
          <ProductImage uri={uri} style={{ width: '100%', height: '100%' }} iconSize={44} />
        </View>
        <Text numberOfLines={2} style={{ ...scale(t, 'small', 'medium'), lineHeight: 19, color: c.text.primary, ...flow }}>{name}</Text>
        {meta ? <Text numberOfLines={1} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{meta}</Text> : null}
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        {price ? (
          <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary }}>
            {price} <Text style={{ ...scale(t, 'tag', 'regular') }}>{currency}</Text>
          </Text>
        ) : (
          <View />
        )}
        {chip && badge ? (
          <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: chip.bg, justifyContent: 'center' }}>
            <Text style={{ ...scale(t, 'tag'), color: chip.fg }}>{badge.label}</Text>
          </View>
        ) : null}
        {onAdd ? (
          <Pressable accessibilityRole="button" accessibilityLabel={addLabel} onPress={onAdd} hitSlop={4} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.action.selected.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={16} color={c.action.selected.fg} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
