import React from 'react';
import { Text, View } from 'react-native';

import { Section } from '../consult/ConsultKit';
import { Block, Price } from '../diagnostics/DiagKit';
import { Notice } from '../pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { itemCoverage, type OrderingKind } from '../../utils/ordering';
import { useOrderingContext } from '../../utils/useOrderingContext';
import { useOrderingQuote } from '../../utils/useOrderingQuote';
import { ContextGate, ContextSummary, QuoteFailure, QuoteLoading } from './OrderingKit';

/**
 * Ord03, the part of the item page that depends on the context: the lowest price among fitting providers with their count, the
 * visit-fee note, and the coverage of this item with the estimated share (POST /ordering/quote for this one item).
 */
export function ItemOrderingPanel({ kind, catalogId }: { kind: OrderingKind; catalogId: string }) {
  const { t, c, k, num, flow, money } = useScreenUi();
  const amount = (n: number) => `${money(n)} ${k('ordering.common.sar')}`;
  const ctx = useOrderingContext('home');
  const q = useOrderingQuote(kind, [catalogId], ctx.body);
  const group = q.quote?.groups[0];
  const best = group?.best_match ?? null;
  const cov = itemCoverage(group, catalogId);
  const homeFee = best && group?.mode === 'home' ? Math.round((best.total - best.items.reduce((s, l) => s + l.price, 0)) * 100) / 100 : 0;
  const covLabel = cov ? (cov.coverage === 'covered' ? k('ordering.item.cov.yes') : cov.coverage === 'needs_approval' ? k('ordering.item.cov.likely') : k('ordering.item.cov.no')) : '';
  return (
    <View style={{ gap: 16 }}>
      <ContextGate ctx={ctx}>
        <ContextSummary ctx={ctx} />
        {q.status === 'loading' || q.status === 'idle' ? <QuoteLoading label={k('ordering.home.loading')} /> : null}
        {q.status === 'error' || q.status === 'offline' ? <QuoteFailure offline={q.status === 'offline'} errorKey={q.errorKey} onRetry={() => void q.reload()} /> : null}
        {q.status === 'ready' && group ? (
          <Block gap={10}>
            {group.from_price ? (
              <View style={{ gap: 4 }}>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.item.fromWhere')}</Text>
                <Price amount={group.from_price.total} size="h3" />
                <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.item.providers', { m: num(group.from_price.providers_count) })}</Text>
              </View>
            ) : (
              <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.basket.altTitle')}</Text>
            )}
            {homeFee > 0 ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.item.homeFeeNote')}</Text> : null}
          </Block>
        ) : null}
        {q.status === 'ready' && cov ? (
          <Section title={k('ordering.item.secCov')}>
            <Notice tone={cov.coverage === 'covered' ? 'info' : cov.coverage === 'needs_approval' ? 'warning' : 'danger'} text={covLabel} />
            <Block gap={8}>
              <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{cov.coverage !== 'not_covered' ? k('ordering.item.cov.share', { p: amount(cov.patient_share) }) : k('ordering.item.cov.cash', { p: amount(cov.price) })}</Text>
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.item.covNote')}</Text>
            </Block>
          </Section>
        ) : null}
      </ContextGate>
    </View>
  );
}
