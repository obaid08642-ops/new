import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, EmptyState, ErrorState, FIcon, OfflineState } from '../../../../packages/ui-native/src';
import { Gate, type GateStatus } from '../consult/ConsultKit';
import { LabCard, LAB_TONE, Price, useDiagText } from '../diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { dateFormatterFor } from '../../utils/dates';
import { providerName, type ProviderRow } from '../../utils/ordering';
import type { useOrderingContext } from '../../utils/useOrderingContext';
import { FirstAskSheet, useFirstAsk } from './ContextBar';

/**
 * Dates and times of the ordering screens in the language of the app (and its calendar preference), Latin digits as the rest of the app:
 * the shared `fmtDate` / `fmtTime` of utils/dates always format in Arabic, which showed Arabic day names in the English, Urdu, Hindi,
 * Bengali and Filipino layouts.
 */
export function useOrderDates() {
  const { lang } = useScreenUi();
  return dateFormatterFor(lang);
}

export type OrderingCtx = ReturnType<typeof useOrderingContext>;

/** Gate for the profile read: loading / error / offline, and "set your place" when no saved address has a map point. */
export function ContextGate({ ctx, children }: { ctx: OrderingCtx; children: React.ReactNode }) {
  const { theme, k } = useScreenUi();
  const status: GateStatus = ctx.status === 'ready' ? 'ready' : ctx.status;
  const [firstAsk, doneAsk] = useFirstAsk(ctx);
  if (status === 'ready' && ctx.needsPlace) {
    return (
      <>
      {firstAsk ? <FirstAskSheet ctx={ctx} onDone={doneAsk} /> : null}
      <EmptyState icon="map-pin" tone={LAB_TONE} title={k('ordering.ctx.setWhere')} body={k('ordering.ctx.newAddr')} actionLabel={k('ordering.ctx.setWhere')} onAction={() => router.push('/profile/addresses' as Href)} theme={theme} />
      </>
    );
  }
  return (
    <Gate status={status} onRetry={() => void ctx.reload()} errorTitle={k('ordering.ctx.error')}>
      {children}
    </Gate>
  );
}

/** A failed quote: the message of its stable error code and the retry. */
export function QuoteFailure({ offline, errorKey, onRetry }: { offline: boolean; errorKey: string; onRetry: () => void }) {
  const { theme, k } = useScreenUi();
  return offline ? (
    <OfflineState title={k('consult.offline.title')} body={k('consult.offline.body')} retryLabel={k('ordering.common.retry')} onRetry={onRetry} theme={theme} />
  ) : (
    <ErrorState title={k(errorKey)} body={k('ordering.item.errSub')} retryLabel={k('ordering.common.retry')} onRetry={onRetry} theme={theme} />
  );
}

export function QuoteLoading({ label }: { label: string }) {
  const { c } = useScreenUi();
  return <View accessibilityLabel={label} accessibilityState={{ busy: true }} style={{ height: 120, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />;
}

/** One provider of the compare list / the best match: name, rating, distance, network, earliest slot, turnaround, total. */
export function ProviderCard({ row, total, selected, itemsCount, onChoose, chooseLabel, badge, mode, children }: { row: ProviderRow; total?: number; selected?: boolean; itemsCount: number; onChoose?: () => void; chooseLabel?: string; /** The best match's pill (board Ord05: ink pill inside the card). A card without a badge is tapped to choose. */ badge?: string; mode?: 'home' | 'facility'; children?: React.ReactNode }) {
  const { t, c, k, num, lang, flow, theme } = useScreenUi();
  const { fmtDate, fmtTime } = useOrderDates();
  const text = useDiagText();
  const line = [
    row.rating !== null ? k('diag.rating', { n: num(row.rating, { maximumFractionDigits: 1 }) }) : '',
    row.distance_km !== null ? text.distance(row.distance_km) : '',
  ].filter(Boolean).join(' · ');
  const tags = [
    ...(mode ? [{ label: mode === 'home' ? k('ordering.match.homeVisit') : k('ordering.match.atCentre'), tone: 'blue' as const }] : []),
    ...(row.in_network ? [{ label: k('ordering.match.inNet'), tone: 'mint' as const }] : []),
  ];
  const earliest = row.earliest_at ? `${fmtDate(row.earliest_at, { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(row.earliest_at)}` : null;
  return (
    <LabCard
      name={providerName(row, lang)}
      line={line}
      tags={tags}
      selected={selected}
      icon="hospital"
      noCheck={Boolean(badge)}
      onPress={!badge && onChoose && row.covers_all ? onChoose : undefined}
      top={badge ? (
        <View style={{ alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.action.selected.bg, justifyContent: 'center' }}>
          <Text style={{ ...scale(t, 'tag', 'bold'), color: c.action.selected.fg }}>{badge}</Text>
        </View>
      ) : undefined}
    >
      {!row.covers_all ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.status.warning.fg, ...flow }}>{k('ordering.match.covers', { a: num(itemsCount - row.missing.length), b: num(itemsCount) })}</Text> : null}
      {earliest ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.match.earliest', { w: earliest })}</Text> : null}
      {row.turnaround_hours !== null ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{text.turnaround(row.turnaround_hours)}</Text> : null}
      {children}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.match.total')}</Text>
          <Price amount={total ?? row.total} size="h4" />
        </View>
        {badge && onChoose && row.covers_all ? <Button theme={theme} size="md" label={chooseLabel ?? k('ordering.match.choose')} onPress={onChoose} testID="provider-choose" /> : null}
      </View>
    </LabCard>
  );
}

/** Ord06 board: the card of a time choice (icon tile, title, one line) that holds the day cards and the window grid. */
export function WhenCard({ icon, tone, title, sub, children }: { icon: 'house' | 'hospital'; tone: 'mint' | 'violet'; title: string; sub?: string; children: React.ReactNode }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Card theme={theme} padding="md">
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FIcon icon={icon} tone={tone} size={44} theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
            {sub ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{sub}</Text> : null}
          </View>
        </View>
        {children}
      </View>
    </Card>
  );
}

/** Ord06 board: a day card (ink when chosen) or a time-window tile (coral ring when chosen); two windows per row. */
export function TimeTile({ label, selected, onPress, kind }: { label: string; selected: boolean; onPress: () => void; kind: 'day' | 'window' }) {
  const { t, c } = useScreenUi();
  const day = kind === 'day';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      testID={`time-${kind}`}
      style={{
        flexGrow: 1,
        flexBasis: day ? '30%' : '45%',
        minHeight: day ? 56 : 52,
        paddingHorizontal: 8,
        borderRadius: day ? 16 : 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: day && selected ? c.action.selected.bg : c.bg.surface,
        borderWidth: !day && selected ? 2 : 1,
        borderColor: !day && selected ? c.action.primary.bg : c.border.hairline,
      }}
    >
      <Text style={{ ...scale(t, day ? 'small' : 'small', selected ? 'bold' : 'medium'), textAlign: 'center', color: day && selected ? c.action.selected.fg : c.text.primary }}>{label}</Text>
    </Pressable>
  );
}
