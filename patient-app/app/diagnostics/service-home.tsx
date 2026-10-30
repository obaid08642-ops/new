import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScopedSuggest } from '../../src/components/search/ScopedSuggest';
import { SUGGEST_SCOPES } from '../../src/utils/searchSuggest';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, EmptyState, FIcon, Search, Skeleton } from '../../../packages/ui-native/src';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { ConsultScreen, Gate, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { LAB_TONE, ListCard, RAD_TONE, TestRow, diagLook, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { CatalogueCard } from '../../src/components/diagnostics/CatalogueKit';
import { NursingServiceList } from '../../src/components/nursing/NursingServiceList';
import { ContextBar } from '../../src/components/ordering/ContextBar';
import { ContextGate } from '../../src/components/ordering/OrderingKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { catalogArt } from '../../src/utils/diagCatalog';
import { useDiagCatalog } from '../../src/utils/useDiagCatalog';
import { isOffline } from '../../src/utils/isOffline';
import { normalizeLabList, type CatalogItem } from '../../src/utils/labMappers';
import { logError } from '../../src/utils/logger';
import { pickDbField } from '../../src/utils/localize';
import type { OrderingKind } from '../../src/utils/ordering';
import { useOrderingContext } from '../../src/utils/useOrderingContext';

type Rec = Record<string, unknown>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const textOf = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/**
 * Ord02: the service home of labs, radiology and nursing (`?kind=lab|radiology|nursing`): search, the doctor's order entry, packages and the
 * catalogue. The catalogue list is the SAME list as the hub's tabs (useDiagCatalog + CatalogueCard for tests and scans, NursingServiceList for
 * nursing): every service, each with its centres, from-price, where and insurance, and one nobody offers yet stays listed.
 */
export default function ServiceHome() {
  const { theme, t, c, k, num, flow } = useScreenUi();
  const p = useLocalSearchParams<{ kind?: string }>();
  const kind: OrderingKind = first(p.kind) === 'radiology' ? 'radiology' : first(p.kind) === 'nursing' ? 'nursing' : 'lab';
  const ctx = useOrderingContext('home');
  const { itemCount } = useDiagnosticsCart();
  const [query, setQuery] = useState('');
  // the search text reaches the server (the catalogue's `search`) a moment after typing stops
  const [search, setSearch] = useState('');
  const [packages, setPackages] = useState<CatalogItem[]>([]);
  const [nursing, setNursing] = useState<Rec[]>([]);
  const [status, setStatus] = useState<GateStatus>('loading');
  const isNursing = kind === 'nursing';
  const catalog = useDiagCatalog(kind === 'radiology' ? 'radiology' : 'lab', !isNursing, { search });

  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim()), query.trim() === '' ? 0 : 300);
    return () => clearTimeout(id);
  }, [query]);

  // the packages (labs) and the nursing services are short lists read whole; the tests and scans are paged by the server
  const load = useCallback(async () => {
    setStatus('loading');
    try {
      if (kind === 'nursing') {
        const res = await apiFetch<unknown>('/home-care/services');
        setNursing(Array.isArray(res) ? (res as Rec[]) : []);
      } else if (kind === 'lab') {
        setPackages(normalizeLabList(await apiFetch<unknown>('/labs/packages')));
      }
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
  const nursingShown = useMemo(
    () => nursing.filter((svc) => !needle || [pickDbField(svc, 'name'), svc.name_ar, svc.name_en, svc.title].some((v) => textOf(v).toLowerCase().includes(needle))),
    [nursing, needle],
  );
  const cartKind = kind === 'radiology' ? 'radiology' : 'lab';
  const place = ctx.choice.mode === 'home' ? 'home' : 'clinic';
  const payer = ctx.choice.payer === 'insurance' ? 'insurance' : 'cash';
  // R1: the place never hides scans; the payment of the order hides the tests that cannot be paid that way
  const rows = catalog.items.filter((x) => kind !== 'lab' || (payer === 'insurance' ? x.insurance : x.selfPay));
  const listFailed = !isNursing && catalog.failed && catalog.items.length === 0 ? catalog.failed : null;
  const effectiveStatus: GateStatus = listFailed ?? status;
  const nothing = needle !== '' && (isNursing ? nursingShown.length === 0 : rows.length === 0 && !catalog.loading);

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
    <ConsultScreen testID={`ordering-home-${kind}`} title={title} onBack={goBackDiag} footer={footer} actions={kind === 'nursing' ? undefined : [{ key: 'basket', label: k('ordering.home.viewBasket'), icon: basketIcon, onPress: () => router.push('/diagnostics/cart' as Href) }]} onRefresh={() => { void load(); catalog.reload(); }}>
      <ContextGate ctx={ctx}>
        <ContextBar ctx={ctx} />
        <Search theme={theme} variant="inline" value={query} onChange={setQuery} onClear={() => setQuery('')} clearLabel={k('diag.clear')} placeholder={k(searchKey)} label={k(searchKey)} />
        <ScopedSuggest query={query} scope={kind === 'radiology' ? SUGGEST_SCOPES.radiology : kind === 'nursing' ? SUGGEST_SCOPES.nursing : SUGGEST_SCOPES.labs} />
        <Gate status={effectiveStatus} onRetry={() => { void load(); catalog.reload(); }}>
          {nothing ? (
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
                      <TestRow key={pkg.id} name={pkg.name} nameMark={pkg.nameMark} icon={diagLook(pkg.category)} note={pkg.testsCount > 0 ? k('ordering.home.pkgCount', { n: num(pkg.testsCount) }) : undefined} price={pkg.price} last={i === all.length - 1} onPress={() => router.push(`/diagnostics/package-detail?id=${pkg.id}` as Href)} />
                    ))}
                  </ListCard>
                </Section>
              ) : null}
              {isNursing ? (
                nursingShown.length > 0 ? (
                  <Section title={needle ? undefined : k('ordering.home.secPopular')}>
                    <NursingServiceList
                      services={nursingShown}
                      actionLabel={k('nur.hub.book')}
                      onOpen={(id) => router.push({ pathname: '/nursing/service-info', params: { serviceId: id } } as unknown as Href)}
                      onBook={(id, name) => router.push({ pathname: '/nursing/service-details', params: { serviceId: id, title: name } } as unknown as Href)}
                    />
                  </Section>
                ) : null
              ) : rows.length > 0 ? (
                <Section title={needle ? undefined : k('ordering.home.secPopular')}>
                  <View style={{ gap: 12 }} testID="service-home-list">
                    {rows.map((item) => <CatalogueCard key={item.id} item={item} kind={cartKind} art={catalogArt(cartKind, item)} place={place} payer={payer} idPrefix="ordering-item" />)}
                    {catalog.loadingMore ? <Skeleton lines={2} theme={theme} /> : null}
                    {catalog.hasMore && !catalog.loadingMore ? <Button theme={theme} size="lg" fullWidth variant="outline" label={k('diag.hub.showMore')} onPress={catalog.loadMore} testID="service-home-more" /> : null}
                  </View>
                </Section>
              ) : null}
            </>
          )}
        </Gate>
      </ContextGate>
    </ConsultScreen>
  );
}
