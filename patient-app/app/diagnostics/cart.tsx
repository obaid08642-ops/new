import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, EmptyState, FIcon } from '../../../packages/ui-native/src';
import { ConsultScreen, Section } from '../../src/components/consult/ConsultKit';
import { AmountLine, Block, LAB_TONE, RAD_TONE, Tag, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { ContextGate, ContextSummary, QuoteFailure, QuoteLoading } from '../../src/components/ordering/OrderingKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart, type DiagnosticsCartItem } from '../../src/context/DiagnosticsCartContext';
import { basketLines, basketShares, type QuoteGroup } from '../../src/utils/ordering';
import { useOrderingContext } from '../../src/utils/useOrderingContext';
import { useOrderingQuote } from '../../src/utils/useOrderingQuote';

/**
 * Ord04: the basket with the automatic split (at home / at the centre), the facility-only label with its reason, the price summary from
 * POST /ordering/quote and the empty-result alternatives. Labs and scans are quoted by their own service; the lines are the local cart.
 */
export default function DiagnosticsCart() {
  const { theme, t, c, k, num, flow } = useScreenUi();
  const { items, removeItem, itemCount, clearCart } = useDiagnosticsCart();
  const ctx = useOrderingContext('home');
  const labs = items.filter((i) => i.kind !== 'radiology');
  const scans = items.filter((i) => i.kind === 'radiology');
  const labQ = useOrderingQuote('lab', labs.map((i) => i.id), ctx.body);
  const scanQ = useOrderingQuote('radiology', scans.map((i) => i.id), ctx.body);
  const quotes = [labQ, scanQ].filter((q) => q.status !== 'idle');
  const loading = quotes.some((q) => q.status === 'loading');
  const failed = quotes.find((q) => q.status === 'error' || q.status === 'offline');
  const groups: QuoteGroup[] = [labQ.quote, scanQ.quote].flatMap((q) => q?.groups ?? []);
  const estimate = [labQ.quote, scanQ.quote].some((q) => q?.estimate);
  const lines = basketLines(groups);
  const shares = basketShares(groups);
  const byId = new Map(items.map((i) => [i.id, i]));
  const noProvider = groups.filter((g) => g.empty);

  if (itemCount === 0) {
    return (
      <ConsultScreen testID="diagnostics-cart" title={k('ordering.basket.title')} onBack={goBackDiag}>
        <EmptyState icon="test-tube" tone={LAB_TONE} title={k('ordering.basket.emptyTitle')} body={k('ordering.basket.emptySub')} actionLabel={k('ordering.common.back')} onAction={goBackDiag} theme={theme} />
      </ConsultScreen>
    );
  }

  const canContinue = !loading && !failed && groups.length > 0 && noProvider.length === 0;
  const footer = (
    <Button
      theme={theme}
      size="lg"
      fullWidth
      label={k('ordering.basket.cta')}
      disabled={!canContinue}
      onPress={() => router.push({ pathname: '/diagnostics/lab-comparison', params: { kind: labs.length ? 'lab' : 'radiology', mode: ctx.choice.mode, payer: ctx.payer } } as unknown as Href)}
    />
  );

  const row = (item: DiagnosticsCartItem, facilityOnly: boolean, last: boolean) => (
    <View key={`${item.id}-${item.kind}`} style={{ gap: 6, paddingBottom: last ? 0 : 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border.hairline }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FIcon icon={item.kind === 'radiology' ? 'scan' : 'test-tube'} tone={item.kind === 'radiology' ? RAD_TONE : LAB_TONE} size={44} theme={theme} />
        <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{item.name}</Text>
        <Button theme={theme} size="md" variant="outline" label={k('ordering.common.remove')} onPress={() => void removeItem(item.id, item.kind)} />
      </View>
      {facilityOnly ? (
        <View style={{ gap: 4 }}>
          <Tag label={k('ordering.home.tag.centre')} tone="amber" />
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.basket.centreWhy')}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ConsultScreen
      testID="diagnostics-cart"
      title={k('ordering.basket.title')}
      onBack={goBackDiag}
      footer={footer}
      actions={[{ key: 'clear', label: k('diag.cart.clear'), icon: <Glyph name="trash" size={20} color={c.icon.primary} />, onPress: () => void clearCart() }]}
      onRefresh={() => { void labQ.reload(); void scanQ.reload(); }}
    >
      <ContextGate ctx={ctx}>
        <ContextSummary ctx={ctx} />
        {loading ? <QuoteLoading label={k('ordering.basket.updating')} /> : null}
        {failed ? <QuoteFailure offline={failed.status === 'offline'} errorKey={failed.errorKey} onRetry={() => { void labQ.reload(); void scanQ.reload(); }} /> : null}

        {!loading && !failed && groups.length > 1 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.basket.split')}</Text> : null}

        {!loading && !failed
          ? groups.map((g, gi) => (
              <Section key={`${g.mode}-${gi}`} title={g.mode === 'home' ? k('ordering.basket.gHome', { n: num(g.items.length) }) : k('ordering.basket.gCentreN', { n: num(g.items.length) })}>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{g.mode === 'home' ? k('ordering.basket.gHomeSub') : k('ordering.basket.gCentreSub')}</Text>
                <Block gap={12}>{g.items.map((gi2, idx) => { const item = byId.get(gi2.catalog_id); return item ? row(item, gi2.facility_only, idx === g.items.length - 1) : null; })}</Block>
                {g.empty ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('ordering.basket.altTitle')}</Text>
                    {g.empty.alternatives.filter((a) => a.type === 'facility_nearby' && a.providers_count !== null && a.nearest_km !== null).map((a) => (
                      <Text key={a.type} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.basket.altCentreN', { n: num(a.providers_count as number), d: num(a.nearest_km as number, { maximumFractionDigits: 1 }) })}</Text>
                    ))}
                    {g.mode === 'home' && g.empty.alternatives.some((a) => a.type === 'facility_nearby') ? (
                      <Button theme={theme} size="md" variant="outline" label={k('ordering.basket.altCentreBtn')} onPress={() => ctx.setMode('facility')} />
                    ) : null}
                  </View>
                ) : null}
              </Section>
            ))
          : null}

        {/* the lines of a basket whose quote is not shown yet (loading or failed) stay removable */}
        {loading || failed ? <Block gap={12}>{items.map((i, idx) => row(i, false, idx === items.length - 1))}</Block> : null}

        {!loading && !failed && lines && shares ? (
          <Block gap={8}>
            <AmountLine label={k('ordering.basket.sumItems', { n: num(itemCount) })} amount={lines.items} />
            {lines.fee > 0 ? <AmountLine label={k('ordering.basket.sumFee')} amount={lines.fee} /> : null}
            {ctx.payer === 'insurance' && estimate ? <AmountLine label={k('ordering.basket.sumIns')} amount={shares.insurance} success minus /> : null}
            <AmountLine label={k('ordering.basket.sumTotal')} amount={ctx.payer === 'insurance' && estimate ? shares.patient : shares.total} strong />
            {ctx.payer === 'insurance' && estimate ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.item.covNote')}</Text> : null}
          </Block>
        ) : null}
      </ContextGate>
    </ConsultScreen>
  );
}
