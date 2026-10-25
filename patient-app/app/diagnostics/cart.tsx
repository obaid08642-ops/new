import React from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Pressable } from 'react-native';
import { Button, Card, EmptyState, FIcon } from '../../../packages/ui-native/src';
import { ConsultScreen } from '../../src/components/consult/ConsultKit';
import { AmountLine, Block, LAB_TONE, Price, RAD_TONE, Tag, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { ContextBar } from '../../src/components/ordering/ContextBar';
import { ContextGate, QuoteFailure, QuoteLoading } from '../../src/components/ordering/OrderingKit';
import { Notice } from '../../src/components/health/HealthKit';
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
      testID="diag-cart-continue"
      disabled={!canContinue}
      onPress={() => router.push({ pathname: '/diagnostics/lab-comparison', params: { kind: labs.length ? 'lab' : 'radiology', mode: ctx.choice.mode, payer: ctx.payer } } as unknown as Href)}
    />
  );

  // Ord04 board: a line is the glyph tile, the name with its coverage chip, the price from the quote and a round trash button
  const covTag = (cov: string | null | undefined): { label: string; tone: 'mint' | 'amber' | 'neutral' } | null =>
    cov === 'covered' ? { label: k('ordering.item.cov.yes'), tone: 'mint' } : cov === 'needs_approval' ? { label: k('ordering.item.cov.likely'), tone: 'amber' } : cov === 'not_covered' ? { label: k('ordering.item.cov.no'), tone: 'neutral' } : null;
  const row = (item: DiagnosticsCartItem, facilityOnly: boolean, last: boolean, line?: { price: number; coverage: string | null }) => {
    const cov = ctx.payer === 'insurance' ? covTag(line?.coverage) : null;
    return (
      <View key={`${item.id}-${item.kind}`} style={{ gap: 8, paddingBottom: last ? 0 : 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border.hairline }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FIcon icon={item.kind === 'radiology' ? 'scan' : 'test-tube'} tone={item.kind === 'radiology' ? RAD_TONE : LAB_TONE} size={44} theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{item.name}</Text>
            {cov ? <Tag label={cov.label} tone={cov.tone} /> : null}
          </View>
          {line ? <Price amount={line.price} /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={k('ordering.common.remove')} onPress={() => void removeItem(item.id, item.kind)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.border.hairline, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="trash" size={20} color={c.icon.primary} />
          </Pressable>
        </View>
        {facilityOnly ? (
          <>
            <Tag label={k('ordering.home.tag.centre')} tone="amber" />
            <Notice tone="warning" text={k('ordering.basket.centreWhy')} />
          </>
        ) : null}
      </View>
    );
  };

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
        <ContextBar ctx={ctx} />
        {loading ? <QuoteLoading label={k('ordering.basket.updating')} /> : null}
        {failed ? <QuoteFailure offline={failed.status === 'offline'} errorKey={failed.errorKey} onRetry={() => { void labQ.reload(); void scanQ.reload(); }} /> : null}

        {!loading && !failed && groups.length > 1 ? <Notice tone="info" text={k('ordering.basket.split')} /> : null}

        {!loading && !failed
          ? groups.map((g, gi) => (
              <Card key={`${g.mode}-${gi}`} theme={theme} padding="md">
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border.hairline }}>
                    <FIcon icon={g.mode === 'home' ? 'house' : 'hospital'} tone={g.mode === 'home' ? 'mint' : 'violet'} size={44} theme={theme} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{g.mode === 'home' ? k('ordering.basket.gHome', { n: num(g.items.length) }) : k('ordering.basket.gCentreN', { n: num(g.items.length) })}</Text>
                      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{g.mode === 'home' ? k('ordering.basket.gHomeSub') : k('ordering.basket.gCentreSub')}</Text>
                    </View>
                    {g.best_match ? <Price amount={g.best_match.total} size="small" /> : null}
                  </View>
                  {g.items.map((gi2, idx) => { const item = byId.get(gi2.catalog_id); return item ? row(item, gi2.facility_only, idx === g.items.length - 1, g.best_match?.items.find((l) => l.catalog_id === gi2.catalog_id)) : null; })}
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
                </View>
              </Card>
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
