import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Card, FIcon, SERVICE_ICONS, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { step as scale, tint, useScreenUi } from '../screen/ScreenKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { Money } from '../pharmacy/OfferKit';
import { Chevron } from '../consult/ConsultKit';
import { statusLook, type OrderKind } from '../../utils/orderCenter';

/**
 * What the labs and radiology screens share (Batch 3, slice 3-app): the look of a service, the tags, the test row with its
 * add toggle, the package and lab cards, the hub tiles, the timeline of a booking and the pieces of an amount. A screen
 * holds no colour, no font size and no sentence of its own: tones are the service tones of the tokens, the text is a
 * translation key or a value the server sent.
 */

export const LAB_TONE: ServiceTone = SERVICE_ICONS.lab.tone;
export const RAD_TONE: ServiceTone = SERVICE_ICONS.radiology.tone;
export const INSURANCE_TONE: ServiceTone = SERVICE_ICONS.insurance.tone;

export type DiagKind = 'lab' | 'radiology';

/** The glyph and tone of a service by its catalogue category (the service map of the handoff; unknown = the kind's own). */
const CATEGORY_LOOK: Record<string, { icon: FillIconName; tone: ServiceTone }> = {
  blood: { icon: 'drop', tone: SERVICE_ICONS.pharmacy.tone },
  hormones: { icon: 'chart-line-up', tone: 'violet' },
  vitamins: { icon: 'pill', tone: 'amber' },
  immunity: { icon: 'shield-check', tone: SERVICE_ICONS.nursing.tone },
};

export function diagLook(category: unknown, kind: DiagKind = 'lab'): { icon: FillIconName; tone: ServiceTone } {
  if (kind === 'radiology') return { icon: SERVICE_ICONS.radiology.icon, tone: RAD_TONE };
  return CATEGORY_LOOK[String(category ?? '').toLowerCase()] ?? { icon: SERVICE_ICONS.lab.icon, tone: LAB_TONE };
}

/** Back, or the diagnostics hub when there is nothing to go back to (a deep link, a notification). */
export function goBackDiag() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/diagnostics' as Href);
}

/** The status of a lab or radiology booking: the translation key of its label, the tone and whether it is finished. */
export function diagStatus(kind: DiagKind, raw: unknown): { key: string; tone: ReturnType<typeof statusLook>['tone']; past: boolean } {
  const look = statusLook((kind === 'lab' ? 'labs' : 'radiology') as OrderKind, raw as string | null | undefined);
  return { key: `orders.status.${look.label}`, tone: look.tone, past: look.bucket === 'previous' };
}

/** A small stroked mark (plus, check) in a token colour. */
export function Mark({ kind, size = 18, color }: { kind: 'plus' | 'check' | 'minus'; size?: number; color: string }) {
  const d = kind === 'plus' ? 'M12 5v14 M5 12h14' : kind === 'minus' ? 'M5 12h14' : 'M5 12.5l4.5 4.5L19 7.5';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      <Path d={d} />
    </Svg>
  );
}

/** A short tag in a service tone (board ServiceHub: home sample, fasting, accepts insurance); `neutral` is the grey one. */
export function Tag({ label, tone }: { label: string; tone: ServiceTone | 'neutral' }) {
  const { t, c } = useScreenUi();
  const look = tone === 'neutral' ? c.status.neutral : c.service[tone];
  return (
    <View style={{ alignSelf: 'flex-start', minHeight: 22, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 11, backgroundColor: look.bg, justifyContent: 'center' }}>
      <Text style={{ ...scale(t, 'tag', 'bold'), color: look.fg }}>{label}</Text>
    </View>
  );
}

/** The white rounded block the board draws a list of rows in. */
export function ListCard({ children }: { children: React.ReactNode }) {
  const { c } = useScreenUi();
  return <View style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, overflow: 'hidden' }}>{children}</View>;
}

/** A price in the language's format with the app's currency word. */
export function Price({ amount, size = 'bodyStrong', unit = 'tag' }: { amount: number; size?: 'h3' | 'h4' | 'bodyStrong' | 'small'; unit?: 'meta' | 'tag' | 'caption' }) {
  return <Money amount={amount} currency={null} size={size} unit={unit} />;
}

/** A label and an amount on one row (subtotal, discount, total). `strong` is the total line, `success` the saving. */
export function AmountLine({ label, amount, strong = false, success = false, minus = false }: { label: string; amount: number; strong?: boolean; success?: boolean; minus?: boolean }) {
  const { t, c, flow, money, k } = useScreenUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1, minWidth: 0, ...scale(t, strong ? 'bodyStrong' : 'small', strong ? 'bold' : 'regular'), color: success ? c.status.success.fg : strong ? c.text.primary : c.text.secondary, ...flow }}>{label}</Text>
      {success ? (
        <Text style={{ ...scale(t, 'small', 'bold'), color: c.status.success.fg }}>{minus ? '- ' : ''}{money(amount)} {k('pharmacy.currency')}</Text>
      ) : (
        <Price amount={amount} size={strong ? 'h4' : 'small'} />
      )}
    </View>
  );
}

/** The 44 square add / added toggle of a test row (board ServiceHub): outlined plus, or the ink square with a check. */
export function AddToggle({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const { c } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.action.selected.bg : c.bg.surface, borderWidth: on ? 0 : 1.5, borderColor: c.border.strong, opacity: pressed ? 0.8 : 1 })}
    >
      <Mark kind={on ? 'check' : 'plus'} color={on ? c.action.selected.fg : c.text.primary} />
    </Pressable>
  );
}

export interface TestRowProps {
  name: string;
  tags?: Array<{ label: string; tone: ServiceTone | 'neutral' }>;
  /** The line under the tags (turnaround, category). */
  note?: string;
  price: number | null;
  onPress?: () => void;
  /** The add toggle: `on` when it is in the cart. Omitted = no toggle. */
  toggle?: { on: boolean; label: string; onPress: () => void };
  /** The glyph tile in front of the name (a list of tests with no photo). */
  icon?: { icon: FillIconName; tone: ServiceTone };
  last?: boolean;
  testID?: string;
}

/** The board's test row (ServiceHub "common tests"): name, tags, note, price and the add toggle. */
export function TestRow({ name, tags, note, price, onPress, toggle, icon, last = false, testID }: TestRowProps) {
  const { theme, t, c, flow } = useScreenUi();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 64 }}>
      {icon ? <FIcon icon={icon.icon} tone={icon.tone} size={44} theme={theme} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={{ ...scale(t, 'bodyStrong', 'medium'), color: c.text.primary, ...flow }}>{name}</Text>
        {tags && tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {tags.map((g) => (
              <Tag key={g.label} label={g.label} tone={g.tone} />
            ))}
          </View>
        ) : null}
        {note ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{note}</Text> : null}
      </View>
      {price !== null ? <Price amount={price} /> : null}
    </View>
  );
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', paddingEnd: toggle ? 12 : 0, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border.hairline }}>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.85 : 1 })}>
          {body}
        </Pressable>
      ) : (
        <View style={{ flex: 1, minWidth: 0 }}>{body}</View>
      )}
      {toggle ? <AddToggle on={toggle.on} label={toggle.label} onPress={toggle.onPress} /> : null}
    </View>
  );
}

export interface PackageCardProps {
  name: string;
  desc?: string;
  /** "Includes N tests" already formatted; omitted when the server sent no count. */
  count?: string;
  price: number | null;
  oldPrice?: number | null;
  icon: FillIconName;
  tone: ServiceTone;
  actionLabel: string;
  onPress: () => void;
  /** A fixed width for the carousel; omitted = the full width of the list. */
  width?: number;
  testID?: string;
}

/** The board's package card (ServiceHub): a tone wash, icon and count, name, line, price and the ink action. */
export function PackageCard({ name, desc, count, price, oldPrice, icon, tone, actionLabel, onPress, width, testID }: PackageCardProps) {
  const { theme, t, c, flow, money, k } = useScreenUi();
  const look = c.service[tone];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[name, count, price !== null ? `${money(price)} ${k('pharmacy.currency')}` : ''].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => ({ width, borderRadius: 28, backgroundColor: look.bg, padding: 18, gap: 14, opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <FIcon icon={icon} tone={tone} size={48} theme={theme} />
        {count ? (
          <View style={{ minHeight: 26, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 13, backgroundColor: tint(c.bg.surface, 0.8), justifyContent: 'center', flexShrink: 1 }}>
            <Text style={{ ...scale(t, 'tag', 'bold'), color: c.text.primary }}>{count}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ gap: 4 }}>
        <Text style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{name}</Text>
        {desc ? <Text numberOfLines={2} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{desc}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View>
          {oldPrice ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, textDecorationLine: 'line-through' }}>{money(oldPrice)} {k('pharmacy.currency')}</Text> : null}
          {price !== null ? <Price amount={price} size="h3" /> : null}
        </View>
        <View style={{ minHeight: 40, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, backgroundColor: c.action.selected.bg, justifyContent: 'center', flexShrink: 1 }}>
          <Text style={{ ...scale(t, 'small', 'bold'), color: c.action.selected.fg, textAlign: 'center' }}>{actionLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export interface LabCardProps {
  name: string;
  /** Distance, rating, address: already formatted. */
  line?: string;
  tags?: Array<{ label: string; tone: ServiceTone | 'neutral' }>;
  /** The chosen one of a list (cart, insurance): the ink ring and a check. */
  selected?: boolean;
  onPress?: () => void;
  width?: number;
  children?: React.ReactNode;
  testID?: string;
}

/** The board's lab card (ServiceHub "approved labs", Cart's list of compatible labs): mark, name, line, tags, free content. */
export function LabCard({ name, line, tags, selected, onPress, width, children, testID }: LabCardProps) {
  const { theme, t, c, flow, k } = useScreenUi();
  const body = (
    <View style={{ width, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: selected ? 2 : 1, borderColor: selected ? c.text.primary : c.border.hairline, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <FIcon icon={SERVICE_ICONS.lab.icon} tone={LAB_TONE} size={48} theme={theme} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{name}</Text>
          {line ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text> : null}
        </View>
        {selected ? (
          <View accessibilityLabel={k('diag.selected')} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.action.selected.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Mark kind="check" size={16} color={c.action.selected.fg} />
          </View>
        ) : null}
      </View>
      {tags && tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {tags.map((g) => (
            <Tag key={g.label} label={g.label} tone={g.tone} />
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={[name, line].filter(Boolean).join(', ')} accessibilityState={{ selected: Boolean(selected) }} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      {body}
    </Pressable>
  );
}

/** A horizontal strip of cards that bleeds to the screen edges (board ServiceHub carousels). */
export function Strip({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
      {children}
    </ScrollView>
  );
}

/** The hub's two big tiles (labs, radiology): glyph, title, line; the chosen one has the ink ring. */
export function KindTile({ icon, tone, title, line, selected, onPress }: { icon: FillIconName; tone: ServiceTone; title: string; line?: string; selected: boolean; onPress: () => void }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: 84, borderRadius: 24, borderWidth: selected ? 2 : 1, borderColor: selected ? c.text.primary : c.border.hairline, backgroundColor: c.bg.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.9 : 1 })}
    >
      <FIcon icon={icon} tone={tone} size={52} theme={theme} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
        {line ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text> : null}
      </View>
    </Pressable>
  );
}

/** A 64 tall shortcut tile (board ServiceHub: my results, compare prices). */
export function ShortcutTile({ icon, tone, label, onPress }: { icon: FillIconName; tone: ServiceTone; label: string; onPress: () => void }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: 64, borderRadius: 20, borderWidth: 1, borderColor: c.border.hairline, backgroundColor: c.bg.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.9 : 1 })}
    >
      <FIcon icon={icon} tone={tone} size={40} theme={theme} />
      <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{label}</Text>
    </Pressable>
  );
}

/** A tappable card with a tone tile, a title, a line and a chevron (the insurance banner of the hub). */
export function LinkCard({ icon, tone, title, body, onPress }: { icon: FillIconName; tone: ServiceTone; title: string; body?: string; onPress: () => void }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, body].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => ({ borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, opacity: pressed ? 0.9 : 1 })}
    >
      <FIcon icon={icon} tone={tone} size={44} theme={theme} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
        {body ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{body}</Text> : null}
      </View>
      <Chevron />
    </Pressable>
  );
}

/** A note in a service tone (board ServiceHub radiology: the violet "some scans need a doctor's request"). */
export function ToneNote({ icon, tone, text }: { icon: FillIconName; tone: ServiceTone; text: string }) {
  const { t, c, flow } = useScreenUi();
  const look = c.service[tone];
  return (
    <View style={{ borderRadius: 20, backgroundColor: look.bg, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Glyph name={icon} size={20} color={look.fg} />
      <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'regular'), lineHeight: 22, color: look.fg, ...flow }}>{text}</Text>
    </View>
  );
}

/** The location row of the hub (board: pin, "to: address", change). */
export function PlaceRow({ text, actionLabel, onAction }: { text: string; actionLabel: string; onAction: () => void }) {
  const { t, c, flow } = useScreenUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
      <Glyph name="map-pin" size={18} color={c.action.primary.bg} />
      <Text numberOfLines={2} style={{ flex: 1, minWidth: 0, ...scale(t, 'meta', 'regular'), color: c.text.primary, ...flow }}>{text}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={8} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

/** The cart bar the hub floats above the tab bar: the count, the total and the one action. */
export function CartBar({ count, total, actionLabel, countLabel, totalLabel, bottom, onPress }: { count: number; total: number; actionLabel: string; countLabel: string; totalLabel: string; bottom: number; onPress: () => void }) {
  const { t, c, flow, money, k } = useScreenUi();
  return (
    <View style={{ position: 'absolute', start: 16, end: 16, bottom }}>
      <View style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: t.shadow.card }}>
        <View accessibilityLabel={countLabel} style={{ minWidth: 40, height: 40, borderRadius: 14, backgroundColor: c.service[SERVICE_ICONS.pharmacy.tone].bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.service[SERVICE_ICONS.pharmacy.tone].fg }}>{count}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{totalLabel}</Text>
          <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{money(total)} {k('pharmacy.currency')}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onPress}
          style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 18, paddingVertical: 6, borderRadius: 16, backgroundColor: c.action.primary.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 1, opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ ...scale(t, 'small', 'bold'), color: c.action.primary.fg, textAlign: 'center' }}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export interface TimelineStep {
  key: string;
  title: string;
  /** The server's time of the step, formatted; omitted when it sent none. */
  time?: string;
  state: 'done' | 'current' | 'todo';
}

/** The vertical timeline of a booking (board OrderTracking): done = the accent ring with a check, current = filled, todo = open. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  const { t, c, flow, k } = useScreenUi();
  return (
    <View accessibilityRole="list">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const on = s.state !== 'todo';
        return (
          <View key={s.key} accessible accessibilityLabel={[s.title, s.time, s.state === 'done' ? k('diag.step.done') : s.state === 'current' ? k('diag.step.current') : ''].filter(Boolean).join(', ')} style={{ flexDirection: 'row', gap: 14, minHeight: last ? 0 : 56 }}>
            <View style={{ width: 24, alignItems: 'center' }}>
              <View style={{ width: s.state === 'current' ? 22 : 20, height: s.state === 'current' ? 22 : 20, borderRadius: 11, backgroundColor: s.state === 'todo' ? 'transparent' : c.action.primary.bg, borderWidth: s.state === 'current' ? 0 : 2, borderColor: on ? c.action.primary.bg : c.border.strong, alignItems: 'center', justifyContent: 'center' }}>
                {s.state === 'done' ? <Mark kind="check" size={12} color={c.action.primary.fg} /> : null}
              </View>
              {!last ? <View style={{ flex: 1, width: 2, marginVertical: 2, backgroundColor: s.state === 'done' ? c.action.primary.bg : c.border.hairline }} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 12 }}>
              <Text style={{ ...scale(t, 'small', on ? 'bold' : 'regular'), color: on ? c.text.primary : c.text.secondary, ...flow }}>{s.title}</Text>
              {s.time ? <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{s.time}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The head of a tracking card: a small label over a big value, and an optional chip at the end (board OrderTracking). */
export function TrackHead({ label, value, chip }: { label: string; value: string; chip?: string }) {
  const { t, c, flow } = useScreenUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{label}</Text>
        <Text style={{ ...scale(t, 'h2'), color: c.text.primary, ...flow }}>{value}</Text>
      </View>
      {chip ? (
        <View style={{ minHeight: 26, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 13, backgroundColor: c.status.neutral.bg, justifyContent: 'center', flexShrink: 1 }}>
          <Text style={{ ...scale(t, 'tag', 'bold'), color: c.status.neutral.fg }}>{chip}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** A person or place row with an optional round action (the technician, with the call button). */
export function PersonRow({ icon, tone, title, line, actionIcon, actionLabel, onAction }: { icon: FillIconName; tone: ServiceTone; title: string; line?: string; actionIcon?: FillIconName; actionLabel?: string; onAction?: () => void }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
      <FIcon icon={icon} tone={tone} size={44} theme={theme} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
        {line ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text> : null}
      </View>
      {actionIcon && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.strong, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
          <Glyph name={actionIcon} size={20} color={c.icon.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The head of a detail page (package, test, lab): a tone wash with the glyph or the catalogue image, the name and a line. */
export function DetailHead({ icon, tone, image, title, body }: { icon: FillIconName; tone: ServiceTone; image?: string; title: string; body?: string }) {
  const { theme, t, c } = useScreenUi();
  return (
    <Card theme={theme} tint={tone} padding="lg">
      <View style={{ alignItems: 'center', gap: 10 }}>
        {image ? (
          <Image accessibilityIgnoresInvertColors source={{ uri: image }} style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: c.bg.surface }} resizeMode="cover" />
        ) : (
          <FIcon icon={icon} tone={tone} size={72} theme={theme} />
        )}
        <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, textAlign: 'center' }}>{title}</Text>
        {body ? <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, textAlign: 'center' }}>{body}</Text> : null}
      </View>
    </Card>
  );
}

/** The words of a service's facts, from the translation files and the server's numbers (fasting, turnaround, distance). */
export function useDiagText() {
  const { k, num } = useScreenUi();
  const hours = (n: number) => k('diag.hours', { n: num(n) });
  return {
    hours,
    turnaround: (n: number) => k('diag.turnaround', { time: hours(n) }),
    distance: (d: string | number | null) => (d === null ? '' : typeof d === 'number' ? k('diag.km', { n: num(d, { maximumFractionDigits: 1 }) }) : d),
    /** The tags of a test row: a home sample when the visit is at home and the test allows it, and the fasting it needs. */
    testTags: (item: { homeVisit: boolean; fastingRequired: boolean; fastingHours: number | null }, atHome: boolean): Array<{ label: string; tone: ServiceTone }> => [
      ...(atHome && item.homeVisit ? [{ label: k('diag.tag.homeSample'), tone: 'mint' as const }] : []),
      ...(item.fastingRequired ? [{ label: item.fastingHours !== null ? k('diag.tag.fastingHours', { n: hours(item.fastingHours) }) : k('diag.tag.fasting'), tone: 'amber' as const }] : []),
    ],
  };
}

/** The 40 tall white pill link of a header (board ServiceHub: "my orders and results"). */
export function PillLink({ icon, label, onPress }: { icon: FillIconName; label: string; onPress: () => void }) {
  const { t, c } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.85 : 1 })}
    >
      <Glyph name={icon} size={17} color={c.icon.primary} />
      <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flexShrink: 1 }}>{label}</Text>
    </Pressable>
  );
}

/** A card block of a screen: surface, hairline, padding; the rows inside decide their own gaps. */
export function Block({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  const { theme } = useScreenUi();
  return (
    <Card theme={theme} padding="md">
      <View style={{ gap }}>{children}</View>
    </Card>
  );
}
