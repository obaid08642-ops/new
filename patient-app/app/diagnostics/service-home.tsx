import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, EmptyState, Search } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { LAB_TONE, LinkCard, ListCard, RAD_TONE, TestRow, diagLook, goBackDiag, useDiagText } from '../../src/components/diagnostics/DiagKit';
import { ContextGate, ContextSummary } from '../../src/components/ordering/OrderingKit';
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
  const footer = itemCount > 0 && kind !== 'nursing' ? <Button theme={theme} size="lg" fullWidth label={`${k('ordering.home.basketBar', { n: num(itemCount) })} · ${k('ordering.home.viewBasket')}`} onPress={() => router.push('/diagnostics/cart' as Href)} /> : undefined;

  return (
    <ConsultScreen testID={`ordering-home-${kind}`} title={title} onBack={goBackDiag} footer={footer} onRefresh={() => void load()}>
      <ContextGate ctx={ctx}>
        <ContextSummary ctx={ctx} />
        <Search theme={theme} variant="inline" value={query} onChange={setQuery} onClear={() => setQuery('')} clearLabel={k('diag.clear')} placeholder={k(searchKey)} label={k(searchKey)} />
        <Gate status={status} onRetry={() => void load()}>
          {needle && shown.length === 0 ? (
            <EmptyState icon="magnifying-glass" tone={kind === 'radiology' ? RAD_TONE : LAB_TONE} title={k('ordering.home.emptyTitle', { q: query.trim() })} body={k('ordering.home.emptySub')} theme={theme} />
          ) : (
            <>
              {!needle && kind !== 'nursing' ? (
                <Section title={k('ordering.home.orderTitle')}>
                  <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.home.orderSub')}</Text>
                  <LinkCard icon="test-tube" tone={LAB_TONE} title={k('ordering.home.orderMine')} onPress={() => router.push('/medical-orders' as Href)} />
                  <LinkCard icon="scan" tone={RAD_TONE} title={k('ordering.home.orderPhoto')} onPress={() => router.push('/diagnostics/upload-rx' as Href)} />
                </Section>
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
