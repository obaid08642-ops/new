import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';

import { AppHeader, EmptyState, ErrorState, OfflineState, Screen, Segmented } from '../../../../packages/ui-native/src';
import { OrderCard } from './OrderKit';
import { Notice } from '../pharmacy/OfferKit';
import { goBackDiag } from '../diagnostics/DiagKit';
import { goBack as goBackPharmacy } from '../pharmacy/PharmacyKit';
import { COLUMN, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { isOffline } from '../../utils/isOffline';
import { logError } from '../../utils/logger';
import { pickLocalized } from '../../utils/localize';
import { ORDERS_TONE, buildRows, inBucket, type Bucket, type OrderRow, type OrderSources } from '../../utils/orderCenter';

/**
 * The list of the Orders board (canvas/Orders.dc.html): the segmented "current / previous" and one card per order. Each
 * source is its own endpoint (see utils/orderCenter.ts); one that fails does not hide the others, it is said once with a
 * retry. Statuses, dates, numbers and amounts are what the endpoints return.
 */

const pick = (ar: unknown, en: unknown): string | null => {
  const value = pickLocalized(ar as string | undefined, en as string | undefined);
  return typeof value === 'string' && value.trim() !== '' ? value : null;
};

export type OrderEndpoints = ReadonlyArray<readonly [keyof OrderSources, string]>;

/** Every endpoint "My orders" reads. */
export const ALL_ORDER_ENDPOINTS: OrderEndpoints = [
  ['appointments', '/care/appointments'],
  ['legacyOrders', '/orders/mine'],
  ['pharmacyOrders', '/patient/pharmacy/orders'],
  ['labs', '/labs/bookings/mine'],
  ['radiology', '/radiology/bookings/mine'],
  ['nursing', '/home-care/bookings/my'],
  ['returns', '/pharmacy/returns'],
];

/** The pharmacy order history: the governed pharmacy orders only. */
export const PHARMACY_ORDER_ENDPOINTS: OrderEndpoints = [['pharmacyOrders', '/patient/pharmacy/orders']];

/** Back, or (when there is nothing to go back to: a deep link, a notification) the hub of the list's own service: the diagnostics hub for labs and radiology, the pharmacy hub for pharmacy orders, home for the all-services list. */
export function backFor(endpoints: OrderEndpoints): () => void {
  const keys = endpoints.map(([key]) => key);
  if (keys.length > 0 && keys.every((key) => key === 'labs' || key === 'radiology')) return goBackDiag;
  if (keys.length > 0 && keys.every((key) => key === 'pharmacyOrders')) return goBackPharmacy;
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as Href);
  };
}

export function OrderList({ endpoints, titleKey, testID }: { endpoints: OrderEndpoints; titleKey: string; testID: string }) {
  const { theme, dir, k, num, c } = useScreenUi();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(0);
  const [offline, setOffline] = useState(false);
  const [bucket, setBucket] = useState<Bucket>('current');
  const seq = useRef(0);
  const onBack = useMemo(() => backFor(endpoints), [endpoints]);

  const load = useCallback(async (mode: 'first' | 'manual') => {
    const mine = ++seq.current;
    if (mode === 'first') setLoading(true);
    const answers = await Promise.all(
      endpoints.map(async ([key, path]) => {
        try {
          return [key, await apiFetch(path)] as const;
        } catch (error) {
          logError(`orders:${key}`, error);
          return null;
        }
      }),
    );
    if (mine !== seq.current) return;
    const sources: OrderSources = {};
    let misses = 0;
    for (const answer of answers) {
      if (answer) sources[answer[0]] = answer[1];
      else misses += 1;
    }
    setRows(buildRows(sources, pick));
    setFailed(misses);
    setOffline(misses === endpoints.length ? await isOffline() : false);
    setLoading(false);
    setRefreshing(false);
  }, [endpoints]);

  useFocusEffect(
    useCallback(() => {
      void load('first');
    }, [load]),
  );

  const shown = useMemo(() => inBucket(rows, bucket), [rows, bucket]);

  const header = (
    <View style={COLUMN}>
      <AppHeader title={k(titleKey)} onBack={onBack} backLabel={k('pharmacy.back')} theme={theme} direction={dir} />
    </View>
  );
  const state = (node: React.ReactNode) => (
    <Screen theme={theme} direction={dir} header={header} scroll testID={testID}>
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' }}>{node}</View>
    </Screen>
  );

  if (loading) {
    return (
      <Screen theme={theme} direction={dir} header={header} scroll testID={testID}>
        <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ height: 120, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
          ))}
        </View>
      </Screen>
    );
  }
  if (failed === endpoints.length) {
    return offline
      ? state(<OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />)
      : state(<ErrorState title={k('orders.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load('first')} theme={theme} />);
  }

  const top = (
    <View style={{ gap: 16, paddingBottom: 16 }}>
      <Segmented
        label={k(titleKey)}
        value={bucket}
        onChange={(v) => setBucket(v === 'previous' ? 'previous' : 'current')}
        options={[
          { value: 'current', label: k('orders.tab.current') },
          { value: 'previous', label: k('orders.tab.previous') },
        ]}
        theme={theme}
        testID={`${testID}-tabs`}
      />
      {failed > 0 ? <Notice tone="warning" text={k('orders.partial', { n: num(failed) })} actionLabel={k('pharmacy.retry')} onAction={() => void load('first')} /> : null}
    </View>
  );

  return (
    <Screen theme={theme} direction={dir} header={header} testID={testID}>
      <FlatList
        style={{ flex: 1 }}
        data={shown}
        keyExtractor={(row) => row.key}
        ListHeaderComponent={top}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={<EmptyState icon="receipt" tone={ORDERS_TONE} title={k(bucket === 'current' ? 'orders.emptyCurrent' : 'orders.emptyPrevious')} body={k('orders.emptyBody')} theme={theme} />}
        contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load('manual'); }} tintColor={c.text.primary} />}
        initialNumToRender={10}
        windowSize={7}
        renderItem={({ item }) => <OrderCard row={item} onPress={item.route ? () => router.push(item.route as unknown as Href) : undefined} />}
        testID={`${testID}-list`}
      />
    </Screen>
  );
}
