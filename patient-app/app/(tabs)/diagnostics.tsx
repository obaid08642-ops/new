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
  KindTile,
  LAB_TONE,
  LabCard,
  LinkCard,
  PackageCard,
  PlaceRow,
  RAD_TONE,
  Strip,
  ToneNote,
  cartBarBottom,
  diagLook,
  useDiagText,
} from '../../src/components/diagnostics/DiagKit';
import { CatalogueCard, isUnoffered } from '../../src/components/diagnostics/CatalogueKit';
import { ActiveFilters, type ActiveFilter } from '../../src/components/pharmacy/ActiveFilters';
import { GlyphRound, WishlistButton } from '../../src/components/pharmacy/PharmacyKit';
import { ServiceCartButton } from '../../src/components/cart/ServiceCartButton';
import { HeaderMenuButton } from '../../src/components/nav/HeaderMenuButton';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { fetchPublicList } from '../../src/utils/publicCache';
import { DIAG_PAGE_SIZE, sortOfFilter, serverCategoryOf } from '../../src/utils/diagCatalogApi';
import { useDiagCatalog } from '../../src/utils/useDiagCatalog';
import { activeFilterCount, filterForTab, filtersFor, type FilterId } from '../../src/utils/diagFilters';
import { catalogArt, isNearEnd } from '../../src/utils/diagCatalog';
import { diagArtKeysOf, filterByArt, type DiagArtKey } from '../../../packages/ui/icons/diag-art';
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
  const { items } = useDiagnosticsCart();

  // `?tab=radiology` opens the radiology side (the services catalogue's imaging entry; needs-review issue 414).
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [mainTab, setMainTab] = useState<MainTab>(tab === 'radiology' ? 'radiology' : 'labs');
  const [place, setPlace] = useState<Place>('home');
  const [pay, setPay] = useState<Pay>('self_pay');
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');
  // the category chips: scans filter on the SERVER by category (a scan's category is its modality); tests keep the chip as a filter of the loaded rows
  const [cat, setCat] = useState<DiagArtKey | 'all'>('all');
  // the search text reaches the server (the catalogue's `search`) a moment after typing stops
  const [search, setSearch] = useState('');

  const [packages, setPackages] = useState<CatalogItem[]>([]);
  const [labs, setLabs] = useState<LabProvider[]>([]);
  const [auxLoading, setAuxLoading] = useState(true);
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

  // the packages and the approved labs are short lists read whole; the tests and scans are paged by the server (useDiagCatalog)
  const loadAux = useCallback(async () => {
    setAuxLoading(true);
    const miss = (err: unknown) => {
      logError('diagnostics:tab', err);
      return null;
    };
    const [pkgsRes, labsRes] = await Promise.all([fetchPublicList<unknown>('/labs/packages').catch(miss), apiFetch<unknown>('/providers?type=lab').catch(miss)]);
    setPackages(normalizeLabList(pkgsRes));
    setLabs(normalizeProviders(labsRes));
    setAuxLoading(false);
  }, []);

  useEffect(() => {
    void loadAux();
  }, [loadAux]);

  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim()), query.trim() === '' ? 0 : 300);
    return () => clearTimeout(id);
  }, [query]);

  // a category of the other kind does not exist: switching between labs and radiology starts at "All"
  useEffect(() => {
    setCat('all');
  }, [mainTab]);

  // a filter the other tab does not offer would change nothing there: it goes back to "all" with the tab
  const switchTab = (next: MainTab) => {
    setMainTab(next);
    setFilter((current) => filterForTab(current, next));
  };
  const reload = () => {
    void loadAux();
    catalog.reload();
    popularCatalog.reload();
  };
  const resetFilters = () => {
    setFilter('all');
    setCat('all');
  };

  // The tests and scans are paged, searched, sorted and (scans) filtered by category on the SERVER; packages and the labs strip are short
  // lists filtered here. The place and payment of the order hide the rows of the loaded pages that do not fit.
  const needle = query.trim().toLowerCase();
  const match = (name: string) => needle === '' || name.toLowerCase().includes(needle);
  const byPrice = (a: CatalogItem, b: CatalogItem) => (a.price ?? Infinity) - (b.price ?? Infinity);
  const isLab = mainTab === 'labs';
  const sort = sortOfFilter(filter);
  // the place switch hides scans that cannot be done at home on the rows loaded here; only the explicit "home visit" filter asks the server (it keeps services some provider offers at home, so a service nobody offers yet stays listed)
  const homeOnly = filter === 'home_visit';
  const testCatalog = useDiagCatalog('lab', isLab, { search, sort, homeVisit: filter === 'home_visit' });
  const radCatalog = useDiagCatalog('radiology', !isLab, { search, sort, homeVisit: homeOnly, category: serverCategoryOf('radiology', cat) });
  // "Most requested": the first six in the server's own popularity order (no search, sort or category)
  const popularTests = useDiagCatalog('lab', isLab, { limit: 6 });
  const popularScans = useDiagCatalog('radiology', !isLab, { limit: 6 });
  const popularCatalog = isLab ? popularTests : popularScans;
  const catalog = isLab ? testCatalog : radCatalog;
  const tests = testCatalog.items;
  const rads = radCatalog.items;
  const loading = auxLoading || (catalog.loading && catalog.items.length === 0);
  const failed = catalog.failed && catalog.items.length === 0 ? catalog.failed : null;
  // Nothing takes insurance in the loaded catalogue: the choice is not offered (no empty list behind it) and self-pay applies.
  const anyInsurance = useMemo(() => insuranceOffered([...packages, ...tests]), [packages, tests]);
  const effectivePay: Pay = anyInsurance ? pay : 'self_pay';
  // a service nobody offers yet stays in the list whatever the order's payment or place (its page says so and offers "Notify me")
  const pays = (x: CatalogItem) => isUnoffered(x) || (effectivePay === 'insurance' ? x.insurance : x.selfPay);
  const view = useMemo(() => {
    let p = packages.filter((x) => match(x.name) && pays(x));
    let ls = labs.filter((x) => match(x.name));
    if (filter === 'home_visit') {
      p = p.filter((x) => x.homeVisit);
      ls = ls.filter((x) => x.homeVisit);
    }
    if (filter === 'lowest_price') p = [...p].sort(byPrice);
    if (filter === 'highest_rated') ls = [...ls].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    return { p, ls };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, labs, needle, effectivePay, filter]);

  const testRows = useMemo(() => tests.filter(pays).map((item) => ({ item, art: catalogArt('lab', item) })), [tests, effectivePay]); // eslint-disable-line react-hooks/exhaustive-deps
  const radRows = useMemo(() => rads.filter((x) => isUnoffered(x) || place === 'clinic' || x.homeVisit).map((item) => ({ item, art: catalogArt('radiology', item) })), [rads, place]);
  // scan rows are already the chip's (server); test rows are filtered by the chip here
  const shownTests = filterByArt(testRows, cat);
  const shownRads = radRows;
  const popular =
    needle === '' && (filter === 'all' || !isLab)
      ? popularCatalog.items.filter((x) => (isLab ? pays(x) : isUnoffered(x) || place === 'clinic' || x.homeVisit)).slice(0, 6)
      : [];
  const moreRows = catalog.hasMore;
  const showPackages = filter === 'all' || filter === 'packages' || filter === 'lowest_price' || filter === 'home_visit' || filter === 'highest_rated';
  const showTests = filter !== 'packages' && filter !== 'labs';
  const showLabs = filter !== 'packages' && filter !== 'tests';

  // a test chip that matches few of the loaded rows keeps asking pages (the stored test categories do not match the chips one to one)
  useEffect(() => {
    if (isLab && cat !== 'all' && testCatalog.hasMore && !testCatalog.loading && !testCatalog.loadingMore && shownTests.length < DIAG_PAGE_SIZE) testCatalog.loadMore();
  }, [isLab, cat, testCatalog, shownTests.length]);
  // the same for scans when the place switch hides most of a page
  useEffect(() => {
    if (!isLab && radCatalog.hasMore && !radCatalog.loading && !radCatalog.loadingMore && shownRads.length < DIAG_PAGE_SIZE) radCatalog.loadMore();
  }, [isLab, radCatalog, shownRads.length]);

  const unfiltered = needle === '' && filter === 'all' && cat === 'all';
  const nothing = !loading && !failed && unfiltered && packages.length === 0 && catalog.items.length === 0;
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
  const barSpace = tabCount > 0 ? 96 : 0;
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
  const payer = effectivePay === 'insurance' ? 'insurance' : 'cash';
  const testCard = (test: CatalogItem, art: DiagArtKey, idPrefix: string, width?: number) => (
    <CatalogueCard key={`${idPrefix}-${test.id}`} item={test} kind="lab" art={art} place={place} payer={payer} idPrefix={idPrefix} width={width} />
  );
  const scanCard = (rad: CatalogItem, art: DiagArtKey, idPrefix: string, width?: number) => (
    <CatalogueCard key={`${idPrefix}-${rad.id}`} item={rad} kind="radiology" art={art} place={place} idPrefix={idPrefix} width={width} />
  );
  // the end of the list opens the next page (a ScrollView's scroll position in place of a list's onEndReached)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const m = e.nativeEvent;
    if (moreRows && isNearEnd({ layoutHeight: m.layoutMeasurement.height, contentHeight: m.contentSize.height, offsetY: m.contentOffset.y })) catalog.loadMore();
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
          formatCount={num}
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
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={c.text.primary} />}
      >
      <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 4, gap: 16 }}>

        {failed === 'error' ? <ErrorState title={k('consult.error.title')} body={k('consult.error.body')} retryLabel={k('consult.retry')} onRetry={reload} theme={theme} /> : null}
        {failed === 'offline' ? <OfflineState title={k('consult.offline.title')} body={k('consult.offline.body')} retryLabel={k('consult.retry')} onRetry={reload} theme={theme} /> : null}

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

            {showTests && (tests.length > 0 || needle !== '' || cat !== 'all') ? (
              <Section title={k('diag.hub.allTests')}>
                <View style={{ gap: 12 }}>
                  {catChips}
                  {shownTests.length === 0 && !catalog.loading ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text> : null}
                  {shownTests.map(({ item, art }) => testCard(item, art, 'diag-test'))}
                  {catalog.loadingMore ? <Skeleton lines={2} theme={theme} /> : null}
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

            {view.p.length === 0 && testRows.length === 0 && view.ls.length === 0 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text> : null}
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
            {shownRads.length > 0 || cat !== 'all' ? (
              <View style={{ gap: 12 }}>
                {catChips}
                {shownRads.length === 0 && !catalog.loading ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text> : null}
                {shownRads.map(({ item, art }) => scanCard(item, art, 'diag-scan'))}
                {catalog.loadingMore ? <Skeleton lines={2} theme={theme} /> : null}
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
      <CartBar count={tabCount} total={tabTotal} bottom={cartBarBottom(barHeight)} actionLabel={k('diag.bar.continue')} countLabel={k('diag.bar.count', { n: num(tabCount) })} totalLabel={k('diag.bar.total')} onPress={() => router.push('/diagnostics/cart' as Href)} />
    ) : null}
    </View>
  );
}
