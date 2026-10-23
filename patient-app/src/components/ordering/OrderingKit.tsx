import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, EmptyState, ErrorState, OfflineState } from '../../../../packages/ui-native/src';
import { Gate, type GateStatus } from '../consult/ConsultKit';
import { LabCard, LAB_TONE, Price, useDiagText } from '../diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { fmtDate, fmtTime } from '../../utils/dates';
import { providerName, type ProviderRow } from '../../utils/ordering';
import type { useOrderingContext } from '../../utils/useOrderingContext';
import { FirstAskSheet, useFirstAsk } from './ContextBar';

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
export function ProviderCard({ row, total, selected, itemsCount, onChoose, chooseLabel, children }: { row: ProviderRow; total?: number; selected?: boolean; itemsCount: number; onChoose?: () => void; chooseLabel?: string; children?: React.ReactNode }) {
  const { t, c, k, num, lang, flow, theme } = useScreenUi();
  const text = useDiagText();
  const line = [
    row.rating !== null ? k('diag.rating', { n: num(row.rating, { maximumFractionDigits: 1 }) }) : '',
    row.distance_km !== null ? text.distance(row.distance_km) : '',
  ].filter(Boolean).join(' · ');
  const tags = [
    ...(row.in_network ? [{ label: k('ordering.match.inNet'), tone: 'mint' as const }] : []),
  ];
  const earliest = row.earliest_at ? `${fmtDate(row.earliest_at, { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(row.earliest_at)}` : null;
  return (
    <LabCard name={providerName(row, lang)} line={line} tags={tags} selected={selected}>
      {!row.covers_all ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.status.warning.fg, ...flow }}>{k('ordering.match.covers', { a: num(itemsCount - row.missing.length), b: num(itemsCount) })}</Text> : null}
      {earliest ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.match.earliest', { w: earliest })}</Text> : null}
      {row.turnaround_hours !== null ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{text.turnaround(row.turnaround_hours)}</Text> : null}
      {children}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.match.total')}</Text>
          <Price amount={total ?? row.total} size="h4" />
        </View>
        {onChoose && row.covers_all ? <Button theme={theme} size="md" label={chooseLabel ?? k('ordering.match.choose')} onPress={onChoose} /> : null}
      </View>
    </LabCard>
  );
}
