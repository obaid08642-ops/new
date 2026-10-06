import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from 'react-native';

import { Card, FIcon, StatusChip } from '../../../../packages/ui-native/src';
import { Glyph, PHARMACY_TONE } from './PharmacyKit';
import { step as scale, tint, useScreenUi } from '../screen/ScreenKit';
import { offerName, secondsLeft, type OfferView, type OfferTotals, type QuoteLine } from '../../utils/pharmacyOffers';

/**
 * The pieces of the offers flow (board PharmacyOffers, canvas/PharmacyOffers.dc.html): the "searching nearby" hero with
 * its pulse, the offer card, a notice banner and the money text. Colours, sizes and type come from the tokens; every
 * number and string is a value the screen hands in (the server's), never one made here.
 */

/** The OS "reduce motion" setting; the pulse stands still when it is on. */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduced(v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** One expanding ring of the board's broadcast pulse (scale .6 -> 1.8, fading out, 1.8 s, the second ring half a cycle later). */
function Ring({ delay, reduced }: { delay: number; reduced: boolean }) {
  const { c } = useScreenUi();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [delay, reduced, v]);
  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, borderRadius: 36, backgroundColor: tint(c.service[PHARMACY_TONE].solid.from, 0.25), opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }] }}
    />
  );
}

/** The hero of the board: the storefront on its pulse, a title and a line. `still` draws it without the pulse (the search is over). */
export function OfferHero({ title, line, still = false }: { title: string; line: string; still?: boolean }) {
  const { theme, t, c, flow } = useScreenUi();
  const reduced = useReduceMotion();
  return (
    <Card tint={PHARMACY_TONE} padding="lg" theme={theme}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
          <Ring delay={0} reduced={reduced || still} />
          <Ring delay={900} reduced={reduced || still} />
          <FIcon icon="storefront" tone={PHARMACY_TONE} chip="solid" size={56} theme={theme} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{title}</Text>
          <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>{line}</Text>
        </View>
      </View>
    </Card>
  );
}

/** A message that sits in the page: a failed refresh, a refused selection. Danger, warning or info, from the status tokens. */
export function Notice({ tone, text, actionLabel, onAction }: { tone: 'danger' | 'warning' | 'info'; text: string; actionLabel?: string; onAction?: () => void }) {
  const { t, c, flow } = useScreenUi();
  const look = c.status[tone];
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ borderRadius: 16, backgroundColor: look.bg, padding: 14, gap: 8 }}>
      <Text style={{ ...scale(t, 'small', 'medium'), lineHeight: 21, color: look.fg, ...flow }}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={({ pressed }) => ({ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ ...scale(t, 'control', 'bold'), color: look.fg, textDecorationLine: 'underline' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** An amount in the language's own format with the currency the server sent (the app's own "ر.س" for SAR). */
export function Money({ amount, currency, size = 'h3', unit = 'meta' }: { amount: number; currency: string | null; size?: 'h3' | 'h4' | 'bodyStrong' | 'small'; unit?: 'meta' | 'tag' | 'caption' }) {
  const { t, c, k, money, flow } = useScreenUi();
  const symbol = !currency || currency === 'SAR' ? k('pharmacy.currency') : currency;
  return (
    <Text style={{ ...scale(t, size), color: c.text.primary, ...flow }}>
      {money(amount)} <Text style={{ ...scale(t, unit, 'regular') }}>{symbol}</Text>
    </Text>
  );
}

/** "mm:ss" in the language's digits. */
export function clock(seconds: number, num: (n: number, o?: Intl.NumberFormatOptions) => string): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const two = { minimumIntegerDigits: 2, useGrouping: false } as const;
  return `${num(m, two)}:${num(s, two)}`;
}

function LineRows({ offer }: { offer: OfferView }) {
  const { t, c, k, num, flow, money } = useScreenUi();
  return (
    <View style={{ gap: 8 }}>
      {offer.lines.map((l) => (
        <View key={l.key} style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'caption', 'medium'), color: c.text.primary, ...flow }}>
              {l.name ?? k('pharmacy.offers.lineUnnamed')}
              {l.offeredQty !== null && l.offeredQty > 0 ? ` × ${num(l.offeredQty)}` : ''}
            </Text>
            <Text style={{ ...scale(t, 'meta', 'bold'), color: l.available ? c.status.success.fg : c.status.danger.fg }}>
              {l.available ? k('pharmacy.offers.lineAvailable') : k('pharmacy.offers.lineUnavailable')}
            </Text>
          </View>
          {l.available && l.unitPrice !== null ? (
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>
              {k('pharmacy.offers.unitPrice', { price: `${money(l.unitPrice)} ${!offer.totals.currency || offer.totals.currency === 'SAR' ? k('pharmacy.currency') : offer.totals.currency}` })}
            </Text>
          ) : null}
          {l.alternative ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.offers.alternative', { name: l.alternative })}</Text> : null}
        </View>
      ))}
      {offer.note ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.offers.note', { note: offer.note })}</Text> : null}
    </View>
  );
}

export interface OfferCardProps {
  offer: OfferView;
  /** `Date.now()` ticking once a second, so the countdown moves; the expiry itself is the server's. */
  now: number;
  best: boolean;
  selected: boolean;
  busy: boolean;
  onPick: () => void;
}

/** The offer of the board: pharmacy, how far and how soon, what is in stock, the server's total and "choose". */
export function PharmacyOfferCard({ offer, now, best, selected, busy, onPick }: OfferCardProps) {
  const { theme, t, c, lang, k, num, flow } = useScreenUi();
  const [open, setOpen] = useState(false);
  const left = secondsLeft(offer, now);
  const expired = left === 0 || !offer.open;
  const name = offerName(offer, lang) ?? k('pharmacy.offers.pharmacyFallback');
  const sub = [
    offer.distanceKm !== null ? k('pharmacy.offers.distance', { km: num(offer.distanceKm, { maximumFractionDigits: 1 }) }) : null,
    offer.prepMinutes !== null ? k('pharmacy.offers.prep', { min: num(offer.prepMinutes, { maximumFractionDigits: 0 }) }) : null,
  ].filter(Boolean).join(' · ');
  const total = offer.totals.total;
  const fee = offer.totals.deliveryFee;
  const hasFee = fee !== null && fee > 0;
  const lineCount = offer.lines.length;
  const disabled = expired || busy || total === null;

  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: c.bg.surface,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? c.text.primary : c.border.hairline,
        boxShadow: t.shadow.card,
        padding: selected ? 13 : 14,
        gap: 12,
        opacity: expired ? 0.7 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.bg.media, alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="storefront" size={24} color={c.icon.secondary} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ ...scale(t, 'bodyStrong'), lineHeight: 22, color: c.text.primary, ...flow }}>{name}</Text>
          {sub ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{sub}</Text> : null}
        </View>
        {best ? <StatusChip label={k('pharmacy.offers.lowest')} tone="mint" theme={theme} /> : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        {lineCount > 0 ? (
          offer.allAvailable ? (
            <StatusChip label={k('pharmacy.offers.allAvailable')} tone="mint" theme={theme} />
          ) : (
            <StatusChip label={k('pharmacy.offers.someAvailable', { n: num(offer.availableCount), total: num(lineCount) })} tone="amber" theme={theme} />
          )
        ) : null}
        {expired ? (
          <StatusChip label={k('pharmacy.offers.expired')} tone="peach" theme={theme} />
        ) : left !== null ? (
          <Text accessibilityLabel={k('pharmacy.offers.expiresIn', { time: clock(left, num) })} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>
            {k('pharmacy.offers.expiresIn', { time: clock(left, num) })}
          </Text>
        ) : null}
      </View>

      {lineCount > 0 || offer.note ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={open ? k('pharmacy.offers.hideDetails') : k('pharmacy.offers.showDetails')}
            onPress={() => setOpen((v) => !v)}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ ...scale(t, 'control', 'bold'), color: c.text.link, ...flow }}>{open ? k('pharmacy.offers.hideDetails') : k('pharmacy.offers.showDetails')}</Text>
          </Pressable>
          {open ? <LineRows offer={offer} /> : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.secondary, ...flow }}>{hasFee ? k('pharmacy.offers.totalWithDelivery') : k('pharmacy.offers.total')}</Text>
          {total !== null ? <Money amount={total} currency={offer.totals.currency} /> : <Text style={{ ...scale(t, 'small'), color: c.text.secondary, ...flow }}>{k('pharmacy.offers.noTotal')}</Text>}
          {hasFee ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.offers.deliveryFee', { price: `${num(fee as number, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${!offer.totals.currency || offer.totals.currency === 'SAR' ? k('pharmacy.currency') : offer.totals.currency}` })}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selected ? k('pharmacy.offers.chosenFor', { name }) : k('pharmacy.offers.chooseFor', { name })}
          accessibilityState={{ disabled, selected }}
          disabled={disabled}
          onPress={onPick}
          style={({ pressed }) => ({ minHeight: 46, minWidth: 96, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? c.bg.sunken : c.action.selected.bg, opacity: pressed ? 0.85 : 1 })}
        >
          {selected ? <Glyph name="check-circle" size={18} color={c.action.selected.fg} /> : null}
          <Text style={{ flexShrink: 1, textAlign: 'center', ...scale(t, 'bodyStrong'), color: disabled ? c.text.secondary : c.action.selected.fg }}>{expired ? k('pharmacy.offers.expiredShort') : selected ? k('pharmacy.offers.chosen') : k('pharmacy.offers.choose')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The server's lines of the chosen pharmacy's offer, for the final quote. */
export function QuoteLines({ lines, currency }: { lines: QuoteLine[]; currency: string | null }) {
  const { t, c, k, num, money, flow } = useScreenUi();
  if (!lines.length) return null;
  return (
    <View style={{ gap: 10 }}>
      {lines.map((l) => (
        <View key={l.key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ ...scale(t, 'caption', 'medium'), color: c.text.primary, ...flow }}>
              {l.name ?? k('pharmacy.offers.lineUnnamed')}
              {l.qty !== null && l.qty > 0 ? ` × ${num(l.qty)}` : ''}
            </Text>
            {l.action === 'substitute' ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.quote.substitute')}</Text> : null}
          </View>
          {l.action === 'unavailable' ? (
            <Text style={{ ...scale(t, 'meta', 'bold'), color: c.status.danger.fg }}>{k('pharmacy.offers.lineUnavailable')}</Text>
          ) : l.unitPrice !== null ? (
            <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary }}>{k('pharmacy.offers.unitPrice', { price: `${money(l.unitPrice)} ${!currency || currency === 'SAR' ? k('pharmacy.currency') : currency}` })}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** A label and an amount on one row (subtotal, delivery). */
export function AmountRow({ label, totals, amount, strong = false }: { label: string; totals: OfferTotals; amount: number; strong?: boolean }) {
  const { t, c, flow } = useScreenUi();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1, minWidth: 0, ...scale(t, strong ? 'bodyStrong' : 'caption', strong ? 'bold' : 'regular'), color: strong ? c.text.primary : c.text.secondary, ...flow }}>{label}</Text>
      <Money amount={amount} currency={totals.currency} size={strong ? 'h4' : 'small'} unit="tag" />
    </View>
  );
}
