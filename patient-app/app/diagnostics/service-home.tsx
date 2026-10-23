import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, EmptyState, FIcon, Search } from '../../../packages/ui-native/src';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { ConsultScreen, Gate, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { LAB_TONE, ListCard, RAD_TONE, TestRow, diagLook, goBackDiag, useDiagText } from '../../src/components/diagnostics/DiagKit';
import { ContextBar } from '../../src/components/ordering/ContextBar';
import { ContextGate } from '../../src/components/ordering/OrderingKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { normalizeLabList, type CatalogItem } from '../../src/utils/labMappers';
import { logError } from '../../src/utils/logger';
import type { OrderingKind } from '../../src/utils/ordering';
import { useOrderingContext } from '../../src/utils/useOrderingContext';
import { useFromPrices } from '../../src/utils/useOrderingQuote';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PATHS: Record<OrderingKind, { items: string; packages: string | null }> = {
  lab: { items: '/labs/services', packages: '/labs/packages' },
  radiology: { items: '/radiology/services', packages: null },
  nursing: { items: '/home-care/services', packages: null },
};

/**
 * Ord02: the service home of labs, radiology and nursing (`?kind=lab|radiology|nursing`): search, the doctor's order entry, packages,
 * the most requested items with "From X SAR · n providers" for the context (POST /ordering/quote), and the basket bar.
 */
export default function ServiceHome() {
  const { theme, t, c, k, num, flow } = useScreenUi();
  const text = useDiagText();
  const p = useLocalSearchParams<{ kind?: string }>();
  const kind: OrderingKind = first(p.kind) === 'radiology' ? 'radiology' : first(p.kind) === 'nursing' ? 'nursing' : 'lab';
  const ctx = useOrderingContext('home');
  const { items: cart, itemCount, addItem, removeItem } = useDiagnosticsCart();
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [packages, setPackages] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [list, pkgs] = await Promise.all([apiFetch<unknown>(PATHS[kind].items), PATHS[kind].packages ? apiFetch<unknown>(PATHS[kind].packages as string) : Promise.resolve(null)]);
      setCatalog(normalizeLabList(list));
      setPackages(pkgs ? normalizeLabList(pkgs) : []);
      setStatus('ready');
    } catch (err) {
      logError('ordering:service-home', err);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const needle = query.trim().toLowerCase();
  const featured = useMemo(() => {
    const popular = catalog.filter((x) => x.isPopular);
    return (popular.length ? popular : catalog).slice(0, 4);
  }, [catalog]);
  const shown = needle ? catalog.filter((x) => x.name.toLowerCase().includes(needle)).slice(0, 30) : featured;
  const from = useFromPrices(kind, featured.map((x) => x.id), ctx.status === 'ready' ? ctx.body : null);
  const inCart = (id: string) => cart.some((i) => i.id === id);
  const cartKind = kind === 'radiology' ? 'radiology' : 'lab';
  const atHome = ctx.choice.mode === 'home';

  const open = (item: CatalogItem) => {
    if (kind === 'nursing') router.push({ pathname: '/nursing/service-details', params: { serviceId: item.id, title: item.name } } as unknown as Href);
    else router.push(`/diagnostics/test-detail?id=${item.id}${kind === 'radiology' ? '&type=radiology' : ''}` as Href);
  };

  const row = (item: CatalogItem, last: boolean) => {
    const look = diagLook(item.category, cartKind);
    const priceLine = !needle && from[item.id] ? k('ordering.home.fromLine', { p: `${num(from[item.id]!.total, { maximumFractionDigits: 2 })} ${k('ordering.common.sar')}`, m: num(from[item.id]!.providers_count) }) : undefined;
    const tags = [
      ...(kind === 'radiology' ? [item.portable ? { label: k('ordering.home.tag.portable'), tone: 'mint' as const } : { label: k('ordering.home.tag.centre'), tone: 'amber' as const }] : []),
      ...(kind === 'lab' ? text.testTags(item, atHome) : []),
    ];
    return (
      <TestRow
        key={item.id}
        name={item.name}
        icon={look}
        tags={tags}
        note={[priceLine, item.turnaroundHours !== null ? text.turnaround(item.turnaroundHours) : ''].filter(Boolean).join(' · ') || undefined}
        price={null}
        last={last}
        onPress={() => open(item)}
        toggle={kind === 'nursing' ? undefined : { on: inCart(item.id), label: inCart(item.id) ? k('ordering.common.remove') : k('ordering.home.addAria'), onPress: () => void (inCart(item.id) ? removeItem(item.id, cartKind) : addItem({ id: item.id, name: item.name, price: item.price ?? 0, kind: cartKind })) }}
      />
    );
  };

  const searchKey = kind === 'radiology' ? 'ordering.home.search.rad' : kind === 'nursing' ? 'ordering.home.search.nur' : 'ordering.home.search.lab';
  const title = kind === 'radiology' ? k('ordering.nav.radiology') : kind === 'nursing' ? k('ordering.nav.nursing') : k('ordering.nav.lab');
  // Ord02 board: the basket button in the header with the item count on its corner
  const basketIcon = (
    <View>
      <Glyph name="package" size={22} color={c.icon.primary} />
      {itemCount > 0 ? (
        <View style={{ position: 'absolute', top: -15, end: -15, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: c.action.primary.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...scale(t, 'tag', 'bold'), color: c.action.primary.fg }}>{num(itemCount)}</Text>
        </View>
      ) : null}
    </View>
  );
  const footer = itemCount > 0 && kind !== 'nursing' ? <Button theme={theme} size="lg" fullWidth label={`${k('ordering.home.viewBasket')} · ${k('diag.checkout.count', { n: num(itemCount) })}`} onPress={() => router.push('/diagnostics/cart' as Href)} /> : undefined;

  return (
    <ConsultScreen testID={`ordering-home-${kind}`} title={title} onBack={goBackDiag} footer={footer} actions={kind === 'nursing' ? undefined : [{ key: 'basket', label: k('ordering.home.viewBasket'), icon: basketIcon, onPress: () => router.push('/diagnostics/cart' as Href) }]} onRefresh={() => void load()}>
      <ContextGate ctx={ctx}>
        <ContextBar ctx={ctx} />
        <Search theme={theme} variant="inline" value={query} onChange={setQuery} onClear={() => setQuery('')} clearLabel={k('diag.clear')} placeholder={k(searchKey)} label={k(searchKey)} />
        <Gate status={status} onRetry={() => void load()}>
          {needle && shown.length === 0 ? (
            <EmptyState icon="magnifying-glass" tone={kind === 'radiology' ? RAD_TONE : LAB_TONE} title={k('ordering.home.emptyTitle', { q: query.trim() })} body={k('ordering.home.emptySub')} theme={theme} />
          ) : (
            <>
              {!needle && kind !== 'nursing' ? (
                <Card theme={theme} elevation="card" padding="md">
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <FIcon icon="file-text" tone={LAB_TONE} size={44} theme={theme} />
                      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('ordering.home.orderTitle')}</Text>
                        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.home.orderSub')}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <View style={{ flexGrow: 1, flexBasis: 140 }}><Button theme={theme} size="md" variant="outline" fullWidth startIcon="clipboard-text" label={k('ordering.home.orderMine')} onPress={() => router.push('/medical-orders' as Href)} /></View>
                      <View style={{ flexGrow: 1, flexBasis: 140 }}><Button theme={theme} size="md" variant="outline" fullWidth startIcon="camera" label={k('ordering.home.orderPhoto')} onPress={() => router.push('/diagnostics/upload-rx' as Href)} /></View>
                    </View>
                  </View>
                </Card>
              ) : null}
              {!needle && packages.length > 0 ? (
                <Section title={k('ordering.home.secPkg')} actionLabel={k('diag.cat.all')} onAction={() => router.push('/diagnostics/packages' as Href)}>
                  <ListCard>
                    {packages.slice(0, 3).map((pkg, i, all) => (
                      <TestRow key={pkg.id} name={pkg.name} icon={diagLook(pkg.category)} note={pkg.testsCount > 0 ? k('ordering.home.pkgCount', { n: num(pkg.testsCount) }) : undefined} price={pkg.price} last={i === all.length - 1} onPress={() => router.push(`/diagnostics/package-detail?id=${pkg.id}` as Href)} />
                    ))}
                  </ListCard>
                </Section>
              ) : null}
              {shown.length > 0 ? (
                <Section title={needle ? undefined : k('ordering.home.secPopular')}>
                  <ListCard>{shown.map((item, i) => row(item, i === shown.length - 1))}</ListCard>
                </Section>
              ) : null}
            </>
          )}
        </Gate>
      </ContextGate>
    </ConsultScreen>
  );
}
