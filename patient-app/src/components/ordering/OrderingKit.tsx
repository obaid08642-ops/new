import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, EmptyState, ErrorState, OfflineState, Segmented } from '../../../../packages/ui-native/src';
import { Gate, type GateStatus } from '../consult/ConsultKit';
import { LabCard, LAB_TONE, Price, useDiagText } from '../diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { fmtDate, fmtTime } from '../../utils/dates';
import { providerName, type OrderingMode, type ProviderRow } from '../../utils/ordering';
import type { useOrderingContext } from '../../utils/useOrderingContext';
import { formatAddressLine } from '../../utils/selectedAddress';

export type OrderingCtx = ReturnType<typeof useOrderingContext>;

/** Place, payment and for whom, from the profile (the Ord01 bar replaces this strip; it uses the same hook). Changing a choice asks the quote again. */
export function ContextSummary({ ctx }: { ctx: OrderingCtx }) {
  const { theme, t, c, k, flow } = useScreenUi();
  const policy = ctx.profile?.policy ?? null;
  const members = ctx.profile?.members ?? [];
  const mode: OrderingMode = ctx.choice.mode;
  const line = (label: string, value: string) => (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{label}</Text>
      <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'meta', 'bold'), color: c.text.primary, ...flow }}>{value}</Text>
    </View>
  );
  const memberName = ctx.choice.memberId ? members.find((m) => m.id === ctx.choice.memberId)?.name : null;
  return (
    <View accessibilityLabel={k('ordering.ctx.aria')} style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, padding: 14, gap: 10 }}>
      <Segmented
        theme={theme}
        label={k('ordering.ctx.lblWhere')}
        value={mode}
        onChange={(v) => ctx.setMode(v === 'facility' ? 'facility' : 'home')}
        options={[{ value: 'home', label: k('ordering.ctx.optHome') }, { value: 'facility', label: k('ordering.ctx.optGo') }]}
      />
      {policy ? (
        <Segmented
          theme={theme}
          label={k('ordering.ctx.lblPay')}
          value={ctx.payer}
          onChange={(v) => ctx.setPayer(v === 'insurance' ? 'insurance' : 'cash')}
          options={[{ value: 'insurance', label: `${policy.company} · ${policy.cls}` }, { value: 'cash', label: k('ordering.ctx.valCash') }]}
        />
      ) : null}
      {members.length > 0 ? (
        <Segmented
          theme={theme}
          label={k('ordering.ctx.lblWho')}
          value={ctx.choice.memberId ?? ''}
          onChange={(v) => ctx.setMember(v === '' ? null : v)}
          options={[{ value: '', label: k('ordering.ctx.valMe') }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
        />
      ) : null}
      {ctx.place ? line(k('ordering.ctx.lblWhere'), mode === 'home' ? formatAddressLine(ctx.place) : k('ordering.ctx.valGo')) : null}
      {line(k('ordering.ctx.lblPay'), ctx.payer === 'insurance' && policy ? `${policy.company} · ${policy.cls}` : k('ordering.ctx.valCash'))}
      {memberName ? line(k('ordering.ctx.lblWho'), memberName) : null}
    </View>
  );
}

/** Gate for the profile read: loading / error / offline, and "set your place" when no saved address has a map point. */
export function ContextGate({ ctx, children }: { ctx: OrderingCtx; children: React.ReactNode }) {
  const { theme, k } = useScreenUi();
  const status: GateStatus = ctx.status === 'ready' ? 'ready' : ctx.status;
  if (status === 'ready' && ctx.needsPlace) {
    return (
      <EmptyState icon="map-pin" tone={LAB_TONE} title={k('ordering.ctx.setWhere')} body={k('ordering.ctx.newAddr')} actionLabel={k('ordering.ctx.setWhere')} onAction={() => router.push('/profile/addresses' as Href)} theme={theme} />
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
