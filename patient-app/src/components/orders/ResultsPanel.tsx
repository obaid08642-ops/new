import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, EmptyState, ErrorState, OfflineState } from '../../../../packages/ui-native/src';
import { Notice } from '../pharmacy/OfferKit';
import { useConsultFormat } from '../consult/ConsultKit';
import { LAB_TONE, NameArt } from '../diagnostics/DiagKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { StatusTag } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch, downloadProtected } from '../../utils/api';
import { isOffline } from '../../utils/isOffline';
import { logError } from '../../utils/logger';
import { labResultItems, radiologyResultItems, sortResults, type ResultItem } from '../../utils/ordersResults';

/**
 * The "Results and reports" tab of My orders and results. One card per ready result (GET /lab-results/mine and GET
 * /radiology/reports/mine), with its actions: view (the result screen), PDF (only a lab report file the protected report API
 * serves), share with your doctor (the share-reports screen) and book a consultation (discuss the lab result with a doctor, or
 * the consultations tab for a radiology report). An action the data cannot back is not drawn.
 */
export function ResultsPanel({ onSeen, testID }: { onSeen?: () => void; testID: string }) {
  const { theme, t, c, k, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const [items, setItems] = useState<ResultItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'offline'>('loading');
  const [failed, setFailed] = useState(0);

  const load = useCallback(async () => {
    setStatus('loading');
    let misses = 0;
    const miss = (error: unknown) => {
      misses += 1;
      logError('orders:results', error);
      return null;
    };
    const [labs, rads] = await Promise.all([apiFetch<unknown>('/lab-results/mine').catch(miss), apiFetch<unknown>('/radiology/reports/mine').catch(miss)]);
    setItems(sortResults([...labResultItems(labs), ...radiologyResultItems(rads)]));
    setFailed(misses);
    setStatus(misses === 2 ? ((await isOffline()) ? 'offline' : 'error') : 'ready');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (item: ResultItem) => {
    onSeen?.();
    router.push(item.kind === 'lab' ? ({ pathname: '/diagnostics/lab-result', params: { id: item.id } } as unknown as Href) : ({ pathname: '/diagnostics/order/[id]', params: { id: item.id } } as unknown as Href));
  };

  const pdf = async (item: ResultItem) => {
    if (!item.pdfPath) return;
    const uri = await downloadProtected(`/labs/bookings/${encodeURIComponent(item.pdfPath.bookingId)}/reports/${encodeURIComponent(item.pdfPath.reportId)}`, `lab-report-${item.pdfPath.reportId}.pdf`);
    if (!uri) {
      showLocalizedAlert(k('diag.order.noReportTitle'), k('diag.order.noReportBody'));
      return;
    }
    const { shareAsync } = await import('expo-sharing');
    await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: k('diag.order.pdf') });
  };

  const book = (item: ResultItem) => {
    if (item.kind === 'lab' && item.bookingId) router.push({ pathname: '/diagnostics/discuss', params: { booking: item.bookingId } } as unknown as Href);
    else router.push('/(tabs)/consultations' as Href);
  };

  if (status === 'loading') {
    return (
      <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ height: 140, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        ))}
      </View>
    );
  }
  if (status === 'offline') return <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  if (status === 'error') return <ErrorState title={k('orders.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;

  return (
    <View style={{ gap: 16 }} testID={testID}>
      {failed > 0 ? <Notice tone="warning" text={k('orders.results.partial')} actionLabel={k('pharmacy.retry')} onAction={() => void load()} /> : null}
      {items.length === 0 ? <EmptyState icon="file-text" tone={LAB_TONE} title={k('diag.results.empty')} body={k('orders.results.emptyBody')} theme={theme} /> : null}
      {items.map((item) => {
        const title = item.title ?? (item.kind === 'lab' ? k('diag.kind.lab') : k('diag.kind.rad'));
        const date = fmt.date(item.at);
        return (
          <Card key={item.key} theme={theme} padding="md">
            <View style={{ gap: 12 }} testID={`${testID}-${item.key}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <NameArt kind={item.kind} name={item.title ?? ''} size={44} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{title}</Text>
                  {date ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{date}</Text> : null}
                </View>
                {item.isNew ? <StatusTag label={k('orders.results.new')} tone="success" /> : null}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button label={k('orders.results.view')} size="sm" onPress={() => open(item)} theme={theme} testID={`${testID}-${item.key}-view`} />
                {item.pdfPath ? <Button label={k('diag.order.pdf')} size="sm" variant="outline" onPress={() => void pdf(item)} theme={theme} testID={`${testID}-${item.key}-pdf`} /> : null}
                <Button label={k('orders.results.share')} size="sm" variant="outline" onPress={() => router.push('/consultations/share-report' as Href)} theme={theme} testID={`${testID}-${item.key}-share`} />
                <Button label={k('orders.results.book')} size="sm" variant="outline" onPress={() => book(item)} theme={theme} testID={`${testID}-${item.key}-book`} />
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}
