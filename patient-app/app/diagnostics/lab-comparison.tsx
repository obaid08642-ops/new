import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Chip, EmptyState, Segmented } from '../../../packages/ui-native/src';
import { ConsultScreen, Section } from '../../src/components/consult/ConsultKit';
import { AmountLine, LAB_TONE, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { ContextBar } from '../../src/components/ordering/ContextBar';
import { ContextGate, ProviderCard, QuoteFailure, QuoteLoading } from '../../src/components/ordering/OrderingKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { groupsMissingPick, setPick, startDraft } from '../../src/utils/orderingBooking';
import { formatAddressLine } from '../../src/utils/selectedAddress';
import { providerName, sortRows, type OrderingKind, type OrderingMode, type OrderingSort, type ProviderRow } from '../../src/utils/ordering';
import { isSingleOrder } from '../../src/utils/singleOrder';
import { useOrderingContext } from '../../src/utils/useOrderingContext';
import { useOrderingQuote } from '../../src/utils/useOrderingQuote';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SORTS: Array<{ id: OrderingSort; key: string }> = [
  { id: 'cheapest', key: 'ordering.match.sCheap' },
  { id: 'nearest', key: 'ordering.match.sNear' },
  { id: 'fastest', key: 'ordering.match.sFast' },
  { id: 'rating', key: 'ordering.match.sRating' },
];

/**
 * Ord05: best match for the whole basket, the compare list with sort and filters, and the split suggestion when no single provider
 * covers everything (POST /ordering/quote). With `id` it is the legacy "labs for this one test" entry; without it, the cart of `kind`.
 */
export default function LabComparison() {
  const { theme, t, c, k, num, flow, money, lang } = useScreenUi();
  const p = useLocalSearchParams<{ kind?: string; id?: string; name?: string; mode?: string; payer?: string; single?: string }>();
  const kind: OrderingKind = first(p.kind) === 'radiology' ? 'radiology' : 'lab';
  const id = first(p.id);
  // "Order now" (single=1 with the item id): this one item goes to the lab choice, the time and the payment; the cart is not read, added to or changed
  const single = isSingleOrder(p);
  const { items, addItem } = useDiagnosticsCart();
  const ids = useMemo(() => (id ? [id] : items.filter((i) => (kind === 'radiology') === (i.kind === 'radiology')).map((i) => i.id)), [id, items, kind]);
  const ctx = useOrderingContext(first(p.mode) === 'facility' ? 'facility' : 'home', first(p.payer) === 'insurance' ? 'insurance' : first(p.payer) === 'cash' ? 'cash' : null);
  const q = useOrderingQuote(kind, ids, ctx.body);
  const [groupMode, setGroupMode] = useState<OrderingMode | null>(null);
  const [sort, setSort] = useState<OrderingSort | null>(null);
  const [network, setNetwork] = useState(false);

  const quote = q.quote;
  const group = quote ? (quote.groups.find((g) => g.mode === groupMode) ?? quote.groups[0]) : undefined;
  const rows: ProviderRow[] = group ? sortRows(group.compare, sort).filter((r) => !network || r.in_network) : [];
  const itemsCount = group?.items.length ?? 0;

  const choose = async (row: ProviderRow) => {
    const name = providerName(row, lang);
    if (id && !single) {
      const known = items.find((i) => i.id === id);
      await addItem({ id, name: first(p.name) ?? known?.name ?? id, price: known?.price ?? row.total, kind, provider: name, lockedProviderId: row.provider_id, isHomeVisit: group?.mode === 'home' });
      router.push('/diagnostics/cart' as Href);
      return;
    }
    if (!quote || !group || !ctx.body) return;
    // the quote, the provider of this group and (for a split basket) the other group's provider travel to the time picker in the draft
    startDraft({ kind, payer: ctx.payer, quote, lat: ctx.body.lat, lng: ctx.body.lng, placeLine: ctx.place ? formatAddressLine(ctx.place) : null, ...(single && id ? { single: true, names: { [id]: first(p.name) ?? '' } } : {}) });
    const next = setPick(group, row);
    const missing = next ? groupsMissingPick(next) : [];
    if (missing.length > 0) {
      setGroupMode(missing[0]);
      return;
    }
    router.push('/diagnostics/when' as Href);
  };

  const nameOf = (pid: string) => {
    const row = group?.compare.find((r) => r.provider_id === pid);
    return row ? providerName(row, lang) : '';
  };

  return (
    <ConsultScreen testID="diagnostics-lab-comparison" title={k('ordering.match.title')} onBack={goBackDiag} onRefresh={() => void q.reload()}>
      <ContextGate ctx={ctx}>
        <ContextBar ctx={ctx} />
        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{single ? k('ordering.match.single') : k('ordering.match.basket', { n: num(ids.length) })}</Text>
        {ids.length === 0 ? (
          <EmptyState icon="test-tube" tone={LAB_TONE} title={k('ordering.basket.emptyTitle')} body={k('ordering.basket.emptySub')} actionLabel={k('ordering.common.back')} onAction={goBackDiag} theme={theme} />
        ) : q.status === 'loading' || q.status === 'idle' ? (
          <QuoteLoading label={k('ordering.match.loading')} />
        ) : q.status === 'error' || q.status === 'offline' || !quote || !group ? (
          <QuoteFailure offline={q.status === 'offline'} errorKey={q.errorKey} onRetry={() => void q.reload()} />
        ) : (
          <>
            {quote.groups.length > 1 ? (
              <Segmented
                theme={theme}
                label={k('ordering.match.title')}
                value={group.mode}
                onChange={(v) => setGroupMode(v === 'facility' ? 'facility' : 'home')}
                options={quote.groups.map((g) => ({ value: g.mode, label: g.mode === 'home' ? k('ordering.match.homeVisit') : k('ordering.match.atCentre') }))}
              />
            ) : null}

            {quote.groups.length > 1 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.match.pickEach')}</Text> : null}

            {group.split_suggestion ? (
              <Section title={k('ordering.match.splitTitle')}>
                <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.match.splitSub')}</Text>
                <View style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, padding: 14, gap: 8 }}>
                  {group.split_suggestion.assignments.map((a) => (
                    <Text key={a.provider_id} style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('ordering.match.splitLine', { x: nameOf(a.provider_id), n: num(a.catalog_ids.length) })}</Text>
                  ))}
                  <AmountLine label={k('ordering.match.total')} amount={group.split_suggestion.total} strong />
                </View>
              </Section>
            ) : null}

            {group.best_match ? (
              <Section>
                <ProviderCard row={group.best_match} itemsCount={itemsCount} selected badge={k('ordering.match.best')} mode={group.mode} onChoose={() => void choose(group.best_match as ProviderRow)}>
                  {ctx.payer === 'insurance' && quote.estimate ? (
                    <View style={{ gap: 4 }}>
                      <AmountLine label={k('ordering.basket.sumIns')} amount={group.best_match.estimated_insurance_share} success />
                      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.item.cov.share', { p: `${money(group.best_match.patient_share)} ${k('ordering.common.sar')}` })}</Text>
                    </View>
                  ) : null}
                </ProviderCard>
              </Section>
            ) : null}

            {group.compare.length > 0 ? (
              <Section title={k('ordering.match.compare')}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityLabel={k('ordering.match.sort')}>
                  {SORTS.map((s) => (
                    <Chip key={s.id} theme={theme} label={k(s.key)} selected={sort === s.id} onPress={() => setSort(sort === s.id ? null : s.id)} />
                  ))}
                  {ctx.payer === 'insurance' ? <Chip theme={theme} label={k('ordering.match.fNet')} selected={network} onPress={() => setNetwork(!network)} /> : null}
                  <Chip theme={theme} label={k('ordering.match.fGender')} selected={ctx.choice.staffGender === 'female'} onPress={() => ctx.setStaffGender(ctx.choice.staffGender === 'female' ? null : 'female')} />
                </View>
                {rows.length === 0 ? (
                  <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('ordering.match.emptyTitle')}</Text>
                ) : (
                  rows.map((r) => <ProviderCard key={r.provider_id} row={r} itemsCount={itemsCount} mode={group.mode} onChoose={() => void choose(r)} />)
                )}
              </Section>
            ) : null}

            {group.empty ? (
              <EmptyState
                icon="test-tube"
                tone={LAB_TONE}
                title={k('ordering.basket.altTitle')}
                body={k('ordering.basket.emptySub')}
                actionLabel={group.mode === 'home' && group.empty.alternatives.some((a) => a.type === 'facility_nearby') ? k('ordering.basket.altCentreBtn') : undefined}
                onAction={() => ctx.setMode('facility')}
                theme={theme}
              />
            ) : null}
          </>
        )}
      </ContextGate>
    </ConsultScreen>
  );
}
