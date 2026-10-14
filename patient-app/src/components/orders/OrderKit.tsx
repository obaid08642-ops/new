import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, FIcon } from '../../../../packages/ui-native/src';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { Money } from '../pharmacy/OfferKit';
import { dateLocaleFor } from '../../utils/dates';
import { KIND_ICON, hashRef, type OrderRow, type PillTone, type RowAction } from '../../utils/orderCenter';

/**
 * The pieces "My orders" and the pharmacy order history share (board Orders, canvas/Orders.dc.html): the order card with
 * its kind icon, title, number and date, the status pill and the amount with the action. Colours are tokens, text comes
 * from the translation files or from the server; nothing here makes up a value.
 */

/** A date in the language's own format (Latin digits, as the rest of the app); '' when the server sent none. */
export function useOrderDate() {
  const { lang } = useScreenUi();
  return (at: number | null, withTime = false): string =>
    at === null
      ? ''
      : new Date(at).toLocaleDateString(dateLocaleFor(lang), { year: 'numeric', month: 'short', day: 'numeric', numberingSystem: 'latn', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
}

/** A time of day in the language's own format. */
export function useClock() {
  const { lang } = useScreenUi();
  return (at: number): string => new Date(at).toLocaleTimeString(dateLocaleFor(lang), { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
}

/** The board's status pill: 26 tall, radius 13, the tone's own background and ink; wraps in a long language. */
export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  const { t, c } = useScreenUi();
  const look = tone === 'danger' ? c.status.danger : tone === 'neutral' ? c.status.neutral : c.service[tone];
  return (
    <View style={{ alignSelf: 'flex-start', minHeight: 26, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 13, backgroundColor: look.bg, justifyContent: 'center', flexShrink: 1, maxWidth: 140 }}>
      <Text style={{ ...scale(t, 'tag', 'bold'), color: look.fg }}>{label}</Text>
    </View>
  );
}

const ACTION_KEY: Record<RowAction, string> = { track: 'orders.action.track', details: 'orders.action.details', reorder: 'orders.action.reorder' };

/** The text of a row's second line: what the service said (a count, a place) in the language of the screen. */
export function useSubLine() {
  const { k, num } = useScreenUi();
  return (row: OrderRow): string => {
    const sub = row.sub;
    if (!sub) return '';
    if ('text' in sub) return sub.text;
    return k(sub.key, { n: sub.n === undefined ? '' : num(sub.n), ref: sub.ref ? hashRef(sub.ref) : '' });
  };
}

export function OrderCard({ row, onPress }: { row: OrderRow; onPress?: () => void }) {
  const { theme, t, c, k, flow } = useScreenUi();
  const date = useOrderDate();
  const subLine = useSubLine()(row);
  const kind = KIND_ICON[row.kind];
  const title = row.title ?? k(`orders.kind.${row.kind}`);
  const status = k(`orders.status.${row.look.label}`);
  const meta = [row.number ? hashRef(row.number) : '', date(row.at)].filter(Boolean).join(' · ');
  const action = row.action && row.route ? k(ACTION_KEY[row.action]) : null;
  const name = [title, status, subLine, meta, action].filter(Boolean).join(', ');

  const body = (
    <Card padding="sm" theme={theme}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FIcon icon={kind.icon} tone={kind.tone} chip="soft" size={44} theme={theme} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{title}</Text>
          {subLine ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{subLine}</Text> : null}
          {meta ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{meta}</Text> : null}
        </View>
        <StatusPill label={status} tone={row.look.tone} />
      </View>
      {row.amount || action ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border.subtle }}>
          {row.amount ? <Money amount={row.amount.value} currency={row.amount.currency} size="bodyStrong" unit="tag" /> : <View />}
          {action ? (
            <View style={{ minHeight: 36, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5, borderColor: c.text.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 1 }}>
              <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, textAlign: 'center' }}>{action}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );

  if (!onPress || !row.route) return <View accessible accessibilityLabel={name}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}
