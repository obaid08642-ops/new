import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScopedSuggest } from '../../src/components/search/ScopedSuggest';
import { SUGGEST_SCOPES } from '../../src/utils/searchSuggest';
import { RefreshControl, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Chip, EmptyState, ErrorState, OfflineState, Radio, Screen, Search, Segmented, Skeleton, useTabBarHeight } from '../../../packages/ui-native/src';
import { Section, Sheet } from '../../src/components/consult/ConsultKit';
import {
  CartBar,
  INSURANCE_TONE,
  ItemCard,
  KindTile,
  LAB_TONE,
  LabCard,
  LinkCard,
  PackageCard,
  PlaceRow,
  RAD_TONE,
  Strip,
  ToneNote,
  diagLook,
  useDiagText,
} from '../../src/components/diagnostics/DiagKit';
import { ActiveFilters, type ActiveFilter } from '../../src/components/pharmacy/ActiveFilters';
import { GlyphRound, WishlistButton } from '../../src/components/pharmacy/PharmacyKit';
import { ServiceCartButton } from '../../src/components/cart/ServiceCartButton';
import { HeaderMenuButton } from '../../src/components/nav/HeaderMenuButton';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { fetchPublicList } from '../../src/utils/publicCache';
import { visibleRows } from '../../src/utils/diagPaging';
import { activeFilterCount, filterForTab, filtersFor, type FilterId } from '../../src/utils/diagFilters';
import { catalogArt, isNearEnd } from '../../src/utils/diagCatalog';
import { singleOrderRoute } from '../../src/utils/singleOrder';
import { diagArtKeysOf, filterByArt, mostRequested, type DiagArtKey } from '../../../packages/ui/icons/diag-art';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { insuranceOffered, normalizeLabList, normalizeProviders, type CatalogItem, type LabProvider } from '../../src/utils/labMappers';
import { formatAddressLine, resolveEffectiveAddress } from '../../src/utils/selectedAddress';

type MainTab = 'labs' | 'radiology';
type Place = 'home' | 'clinic';
/** Decision 30: insurance or self-pay is chosen first; the lists show only the services that take that payment. */
type Pay = 'self_pay' | 'insurance';
/** The hub of labs and radiology (board ServiceHub): what to book, where, and what is already in the cart. */
export default function DiagnosticsHub() {
  const { theme, dir, t, c, k, num, flow } = useScreenUi();
  const text = useDiagText();
  const barHeight = useTabBarHeight();
  const { items, addItem } = useDiagnosticsCart();

  // `?tab=radiology` opens the radiology side (the services catalogue's imaging entry; needs-review issue 414).
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [mainTab, setMainTab] = useState<MainTab>(tab === 'radiology' ? 'radiology' : 'labs');
  const [place, setPlace] = useState<Place>('home');
  const [pay, setPay] = useState<Pay>('self_pay');
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');
  // the full tests and scans open a page at a time as the list is scrolled to its end (the catalogue endpoints return every row); a new search, filter or category starts again at page 1
  const [pages, setPages] = useState(1);
  // the category chips (blood, hormones ... for tests; X-ray, CT ... for scans) filter the loaded rows by their mapped category
  const [cat, setCat] = useState<DiagArtKey | 'all'>('all');

  const [packages, setPackages] = useState<CatalogItem[]>([]);
  const [tests, setTests] = useState<CatalogItem[]>([]);
  const [rads, setRads] = useState<CatalogItem[]>([]);
  const [labs, setLabs] = useState<LabProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [address, setAddress] = useState<Awaited<ReturnType<typeof resolveEffectiveAddress>>>(null);
  const [addressLoaded, setAddressLoaded] = useState(false);

  // Reload the effective delivery address whenever the tab gains focus (covers returning from the address picker).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const addr = await resolveEffectiveAddress();
        if (active) {
          setAddress(addr);
          setAddressLoaded(true);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(null);
    let failures = 0;
    const miss = (err: unknown) => {
      failures += 1;
      logError('diagnostics:tab', err);
      return null;
    };
    const [pkgsRes, testsRes, radsRes, labsRes] = await Promise.all([
      fetchPublicList<unknown>('/labs/packages').catch(miss),
      fetchPublicList<unknown>('/labs/services').catch(miss),
      fetchPublicList<unknown>('/radiology/services').catch(miss),
      apiFetch<unknown>('/providers?type=lab').catch(miss),
    ]);
    setPackages(normalizeLabList(pkgsRes));
    setTests(normalizeLabList(testsRes));
    setRads(normalizeLabList(radsRes));
    setLabs(normalizeProviders(labsRes));
    if (failures === 4) setFailed((await isOffline()) ? 'offline' : 'error');
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPages(1);
  }, [query, place, pay, filter, mainTab, cat]);

  // a category of the other kind does not exist: switching between labs and radiology starts at "All"
  useEffect(() => {
    setCat('all');
  }, [mainTab]);

  // a filter the other tab does not offer would change nothing there: it goes back to "all" with the tab
  const switchTab = (next: MainTab) => {
    setMainTab(next);
    setFilter((current) => filterForTab(current, next));
  };
  const resetFilters = () => {
    setFilter('all');
    setCat('all');
  };

  const inCart = (id: string) => items.some((i) => i.id === id);
  // one cart per service: a test goes to the lab cart, a scan to the radiology cart
  const addToCart = (item: CatalogItem, kind: 'lab' | 'radiology') => {
    if (!inCart(item.id)) void addItem({ id: item.id, name: item.name, price: item.price ?? 0, kind });
  };
  // "Order now" skips the cart: this one item goes to the lab choice (every lab with its price), then the time and the payment; the cart is not touched
  const orderNow = (item: CatalogItem, kind: 'lab' | 'radiology') => {
    router.push(singleOrderRoute({ kind, id: item.id, name: item.name, place, payer: kind === 'lab' && effectivePay === 'insurance' ? 'insurance' : 'cash' }) as unknown as Href);
  };

  // search and filter run on what the screen already loaded
  const needle = query.trim().toLowerCase();
  const match = (name: string) => needle === '' || name.toLowerCase().includes(needle);
  const byPrice = (a: CatalogItem, b: CatalogItem) => (a.price ?? Infinity) - (b.price ?? Infinity);
  // Nothing takes insurance in the loaded catalogue: the choice is not offered (no empty list behind it) and self-pay applies.
  const anyInsurance = useMemo(() => insuranceOffered([...packages, ...tests]), [packages, tests]);
  const effectivePay: Pay = anyInsurance ? pay : 'self_pay';
  const view = useMemo(() => {
    const pays = (x: CatalogItem) => (effectivePay === 'insurance' ? x.insurance : x.selfPay);
    let p = packages.filter((x) => match(x.name) && pays(x));
    let ts = tests.filter((x) => match(x.name) && pays(x));
    let rs = rads.filter((x) => match(x.name) && (place === 'clinic' || x.homeVisit));
    let ls = labs.filter((x) => match(x.name));
    if (filter === 'home_visit') {
      ts = ts.filter((x) => x.homeVisit);
      p = p.filter((x) => x.homeVisit);
      ls = ls.filter((x) => x.homeVisit);
    }
    if (filter === 'home_visit') rs = rs.filter((x) => x.homeVisit);
    if (filter === 'lowest_price') {
      p = [...p].sort(byPrice);
      ts = [...ts].sort(byPrice);
      rs = [...rs].sort(byPrice);
    }
    if (filter === 'highest_rated') ls = [...ls].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    return { p, ts, rs, ls };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, tests, rads, labs, needle, place, effectivePay, filter]);

  const testRows = useMemo(() => view.ts.map((item) => ({ item, art: catalogArt('lab', item) })), [view.ts]);
  const radRows = useMemo(() => view.rs.map((item) => ({ item, art: catalogArt('radiology', item) })), [view.rs]);
  const chipRows = mainTab === 'radiology' ? radRows : testRows;
  const testPage = visibleRows(filterByArt(testRows, cat), pages);
  const radPage = visibleRows(filterByArt(radRows, cat), pages);
  // "Most requested": the first few by the backend's popularity, for the unfiltered hub
  const popular = needle === '' && (filter === 'all' || mainTab === 'radiology') ? mostRequested(mainTab === 'radiology' ? view.rs : view.ts, 6) : [];
  const moreRows = (mainTab === 'radiology' ? radPage.remaining : testPage.remaining) > 0;
  const showPackages = filter === 'all' || filter === 'packages' || filter === 'lowest_price' || filter === 'home_visit' || filter === 'highest_rated';
  const showTests = filter !== 'packages' && filter !== 'labs';
  const showLabs = filter !== 'packages' && filter !== 'tests';

  const isLab = mainTab === 'labs';
  const nothing = !loading && !failed && packages.length === 0 && tests.length === 0 && rads.length === 0;
  const placeOptions = isLab
    ? [
        { value: 'home', label: k('diag.place.homeLab') },
        { value: 'clinic', label: k('diag.place.visitLab') },
      ]
    : [
        { value: 'home', label: k('diag.place.homeRad') },
        { value: 'clinic', label: k('diag.place.visitRad') },
      ];
  const addressLine = address ? k('diag.addr.to', { address: formatAddressLine(address) }) : addressLoaded ? k('diag.addr.none') : k('diag.addr.loading');

  // one cart per service: the labs tab counts the lab tests, the radiology tab the scans (the cart screen lists both groups)
  const tabLines = items.filter((i) => (i.kind === 'radiology') === (mainTab === 'radiology'));
  const tabCount = tabLines.reduce((n, i) => n + (i.qty > 0 ? i.qty : 1), 0);
  const tabTotal = tabLines.reduce((n, i) => n + i.price * (i.qty > 0 ? i.qty : 1), 0);
  const barSpace = tabCount > 0 ? 84 : 0;
  const options = filtersFor(mainTab);
  const filterCount = activeFilterCount(filter, cat === 'all' ? '' : cat);
  const activeItems: ActiveFilter[] = [
    ...(filter === 'all' ? [] : [{ key: filter, label: k(options.find((f) => f.id === filter)?.key ?? 'diag.filter.all'), onRemove: () => setFilter('all') }]),
    ...(cat === 'all' ? [] : [{ key: `cat-${cat}`, label: k(`diag.cat.${cat}`), onRemove: () => setCat('all') }]),
  ];

  const catChips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={k('diag.cat.group')} contentContainerStyle={{ gap: 8 }} testID="diag-cat-chips">
      <Chip label={k('diag.filter.all')} selected={cat === 'all'} onPress={() => setCat('all')} theme={theme} testID="diag-cat-all" />
      {diagArtKeysOf(isLab ? 'lab' : 'radiology').map((key) => (
        <Chip key={key} label={k(`diag.cat.${key}`)} selected={cat === key} onPress={() => setCat(key)} theme={theme} testID={`diag-cat-${key}`} />
      ))}
    </ScrollView>
  );
  const testCard = (test: CatalogItem, art: DiagArtKey, idPrefix: string, width?: number) => (
    <ItemCard
      key={`${idPrefix}-${test.id}`}
      testID={`${idPrefix}-${test.id}`}
      name={test.name}
      art={art}
      width={width}
      image={test.image}
      tags={text.testTags(test, place === 'home')}
      note={test.turnaroundHours !== null ? text.turnaround(test.turnaroundHours) : undefined}
      price={test.price}
      inCart={inCart(test.id)}
      addLabel={k('diag.detail.addToCart')}
      inCartLabel={k('diag.detail.inCart')}
      orderLabel={k('diag.detail.orderNow')}
      onPress={() => router.push(`/diagnostics/test-detail?id=${test.id}` as Href)}
      onAdd={() => addToCart(test, 'lab')}
      onOrder={() => orderNow(test, 'lab')}
    />
  );
  const scanCard = (rad: CatalogItem, art: DiagArtKey, idPrefix: string, width?: number) => (
    <ItemCard
      key={`${idPrefix}-${rad.id}`}
      testID={`${idPrefix}-${rad.id}`}
      name={rad.name}
      art={art}
      width={width}
      image={rad.image}
      note={rad.desc || undefined}
      price={rad.price}
      inCart={inCart(rad.id)}
      addLabel={k('diag.detail.addToCart')}
      inCartLabel={k('diag.detail.inCart')}
      orderLabel={k('diag.detail.orderNow')}
      onPress={() => router.push(`/diagnostics/test-detail?id=${rad.id}&isRadiology=true` as Href)}
      onAdd={() => addToCart(rad, 'radiology')}
      onOrder={() => orderNow(rad, 'radiology')}
    />
  );
  // the end of the list opens the next page (a ScrollView's scroll position in place of a list's onEndReached)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const m = e.nativeEvent;
    if (moreRows && isNearEnd({ layoutHeight: m.layoutMeasurement.height, contentHeight: m.contentSize.height, offsetY: m.contentOffset.y })) setPages((p) => p + 1);
  };

  return (
    <View style={{ flex: 1 }}>
    <Screen theme={theme} direction={dir} edges={['top', 'start', 'end']} testID="diagnostics-hub">
      {/* fixed under the top while the lists scroll (owner layout addition b): the title row with "My orders and results", the search, the filters that are on */}
      <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 12, backgroundColor: c.bg.canvas }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, ...scale(t, 'h1'), color: c.text.primary, ...flow }}>{k('diag.hub.title')}</Text>
          <GlyphRound name="receipt" label={k('diag.hub.myOrders')} onPress={() => router.push('/diagnostics/orders' as Href)} testID="diagnostics-orders-entry" />
          <WishlistButton />
          <ServiceCartButton service={mainTab === 'radiology' ? 'radiology' : 'lab'} />
          <HeaderMenuButton testID="diagnostics-menu-button" />
        </View>

        <Search
          theme={theme}
          variant="inline"
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          clearLabel={k('diag.clear')}
          placeholder={isLab ? k('diag.hub.searchLab') : k('diag.hub.searchRad')}
          label={isLab ? k('diag.hub.searchLab') : k('diag.hub.searchRad')}
          onFilterPress={() => setSheet(true)}
          filterLabel={filterCount > 0 ? `${k('diag.hub.filter')} (${num(filterCount)})` : k('diag.hub.filter')}
          filterCount={filterCount}
        />
        <ScopedSuggest query={query} scope={isLab ? SUGGEST_SCOPES.labs : SUGGEST_SCOPES.radiology} />
        <ActiveFilters items={activeItems} onClearAll={resetFilters} tone={isLab ? LAB_TONE : RAD_TONE} testIdPrefix="diag" />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: barHeight + barSpace + 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={100}
        testID="diag-scroll"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} tintColor={c.text.primary} />}
      >
      <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 4, gap: 16 }}>

        {failed === 'error' ? <ErrorState title={k('consult.error.title')} body={k('consult.error.body')} retryLabel={k('consult.retry')} onRetry={() => void load()} theme={theme} /> : null}
        {failed === 'offline' ? <OfflineState title={k('consult.offline.title')} body={k('consult.offline.body')} retryLabel={k('consult.retry')} onRetry={() => void load()} theme={theme} /> : null}

        {failed ? null : (
          <>
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 10 }}>
              <KindTile icon="test-tube" tone={LAB_TONE} title={k('diag.kind.lab')} line={k('diag.kind.labLine')} selected={isLab} onPress={() => switchTab('labs')} />
              <KindTile icon="scan" tone={RAD_TONE} title={k('diag.kind.rad')} line={k('diag.kind.radLine')} selected={!isLab} onPress={() => switchTab('radiology')} />
            </View>

            <View style={{ gap: 4 }}>
              <Segmented theme={theme} label={k('diag.place.group')} options={placeOptions} value={place} onChange={(v) => setPlace(v as Place)} />
              {place === 'home' ? <PlaceRow text={addressLine} actionLabel={address ? k('diag.addr.change') : k('diag.addr.choose')} onAction={() => router.push('/profile/addresses?select=1' as Href)} /> : null}
            </View>

            {isLab && anyInsurance ? (
              <Segmented
              theme={theme}
              label={k('diag.pay.group')}
              options={[
                { value: 'self_pay', label: k('diag.pay.selfPay') },
                { value: 'insurance', label: k('diag.pay.insurance') },
              ]}
              value={effectivePay}
              onChange={(v) => setPay(v as Pay)}
              />
            ) : null}

            <LinkCard icon="shield-check" tone={INSURANCE_TONE} title={k('diag.hub.insTitle')} body={k('diag.hub.insBody')} onPress={() => router.push('/diagnostics/insurance-approval' as Href)} />
          </>
        )}

        {loading ? (
          <View accessibilityLabel={k('consult.loading')} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ minHeight: 96, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
                <Skeleton variant="circle" theme={theme} />
                <View style={{ flex: 1 }}><Skeleton lines={2} theme={theme} /></View>
              </View>
            ))}
          </View>
        ) : null}

        {nothing ? <EmptyState icon="test-tube" tone={LAB_TONE} title={k('diag.empty.title')} theme={theme} /> : null}

        {!loading && !failed && !nothing && isLab ? (
          <View style={{ gap: 22 }}>
            {showPackages && view.p.length > 0 ? (
              <Section title={k('diag.hub.packs')} actionLabel={k('diag.hub.allPacks')} onAction={() => router.push('/diagnostics/packages' as Href)}>
                <Strip>
                  {view.p.map((pkg) => {
                    const look = diagLook(pkg.category);
                    return (
                      <PackageCard
                        key={pkg.id}
                        width={268}
                        name={pkg.name}
                        desc={pkg.desc}
                        count={pkg.testsCount > 0 ? k('diag.pack.count', { n: num(pkg.testsCount) }) : undefined}
                        price={pkg.price}
                        oldPrice={pkg.oldPrice}
                        icon={look.icon}
                        tone={look.tone}
                        actionLabel={k('diag.pack.details')}
                        onPress={() => router.push(`/diagnostics/package-detail?id=${pkg.id}&serviceType=${place}` as Href)}
                      />
                    );
                  })}
                </Strip>
              </Section>
            ) : null}

            {showTests && popular.length > 0 ? (
              <Section title={k('diag.hub.popular')}>
                <Strip>{popular.map((test) => testCard(test, catalogArt('lab', test), 'diag-popular', 300))}</Strip>
              </Section>
            ) : null}

            {showTests && view.ts.length > 0 ? (
              <Section title={k('diag.hub.allTests')}>
                <View style={{ gap: 12 }}>
                  {catChips}
                  {testPage.shown.length === 0 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text> : null}
                  {testPage.shown.map(({ item, art }) => testCard(item, art, 'diag-test'))}
                </View>
              </Section>
            ) : null}

            {showLabs && view.ls.length > 0 ? (
              <Section title={k('diag.hub.labs')}>
                <Strip>
                  {view.ls.map((lab) => (
                    <LabCard
                      key={lab.id}
                      width={210}
                      name={lab.name}
                      line={[lab.rating !== null ? k('diag.rating', { n: num(lab.rating, { maximumFractionDigits: 1 }) }) : '', text.distance(lab.distance)].filter(Boolean).join(' · ')}
                      tags={lab.homeVisit ? [{ label: k('diag.tag.home'), tone: 'neutral' }] : undefined}
                      onPress={() => router.push(`/diagnostics/lab/${lab.id}` as Href)}
                    />
                  ))}
                </Strip>
              </Section>
            ) : null}

            {view.p.length === 0 && view.ts.length === 0 && view.ls.length === 0 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text> : null}
          </View>
        ) : null}

        {!loading && !failed && !nothing && !isLab ? (
          <View style={{ gap: 14 }}>
            <ToneNote icon="info" tone={RAD_TONE} text={place === 'home' ? k('diag.hub.radNoteHome') : k('diag.hub.radNoteClinic')} />
            {popular.length > 0 ? (
              <Section title={k('diag.hub.popular')}>
                <Strip>{popular.map((rad) => scanCard(rad, catalogArt('radiology', rad), 'diag-popular', 300))}</Strip>
              </Section>
            ) : null}
            <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('diag.hub.allScans')}</Text>
            {view.rs.length > 0 ? (
              <View style={{ gap: 12 }}>
                {catChips}
                {radPage.shown.length === 0 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text> : null}
                {radPage.shown.map(({ item, art }) => scanCard(item, art, 'diag-scan'))}
              </View>
            ) : (
              <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text>
            )}
          </View>
        ) : null}
      </View>
      </ScrollView>

      <Sheet open={sheet} title={k('diag.filter.title')} onClose={() => setSheet(false)} closeLabel={k('diag.filter.close')}>
        <View>
          {options.map((f, i) => (
            <Radio
              key={f.id}
              theme={theme}
              label={k(f.key)}
              selected={filter === f.id}
              divider={i < options.length - 1}
              onChange={() => {
                setFilter(f.id);
                setSheet(false);
              }}
            />
          ))}
          {filterCount > 0 ? (
            <View style={{ paddingTop: 12 }}>
              <Button theme={theme} size="lg" fullWidth variant="outline" label={k('pharmacy.filters.reset')} onPress={() => { resetFilters(); setSheet(false); }} testID="diag-filter-reset" />
            </View>
          ) : null}
        </View>
      </Sheet>
    </Screen>
    {tabCount > 0 ? (
      <CartBar count={tabCount} total={tabTotal} bottom={barHeight + 8} actionLabel={k('diag.bar.continue')} countLabel={k('diag.bar.count', { n: num(tabCount) })} totalLabel={k('diag.bar.total')} onPress={() => router.push('/diagnostics/cart' as Href)} />
    ) : null}
    </View>
  );
}
