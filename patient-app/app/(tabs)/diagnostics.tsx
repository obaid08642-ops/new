import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScopedSuggest } from '../../src/components/search/ScopedSuggest';
import { SUGGEST_SCOPES } from '../../src/utils/searchSuggest';
import { RefreshControl, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Chip, EmptyState, ErrorState, OfflineState, Screen, Search, Segmented, Skeleton, Toggle, useTabBarHeight } from '../../../packages/ui-native/src';
import { Section, Sheet } from '../../src/components/consult/ConsultKit';
import {
  CartBar,
  LAB_TONE,
  LabCard,
  PackageCard,
  PlaceRow,
  RAD_TONE,
  Strip,
  ToneNote,
  cartBarBottom,
  diagLook,
  useDiagText,
} from '../../src/components/diagnostics/DiagKit';
import { CatalogueCard } from '../../src/components/diagnostics/CatalogueKit';
import { ActiveFilters, type ActiveFilter } from '../../src/components/pharmacy/ActiveFilters';
import { GlyphRound, WishlistButton } from '../../src/components/pharmacy/PharmacyKit';
import { ServiceCartButton } from '../../src/components/cart/ServiceCartButton';
import { HeaderMenuButton } from '../../src/components/nav/HeaderMenuButton';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { fetchPublicList } from '../../src/utils/publicCache';
import { DIAG_PAGE_SIZE, serverCategoryOf } from '../../src/utils/diagCatalogApi';
import { useDiagCatalog } from '../../src/utils/useDiagCatalog';
import { DEFAULT_SHEET, passesSheet, resultCount, sheetFilterCount, sheetHomeVisit, sheetSort, type SheetFilters, type SheetPay } from '../../src/utils/diagHubFilters';
import { catalogArt, isNearEnd } from '../../src/utils/diagCatalog';
import { diagArtKeysOf, filterByArt, type DiagArtKey } from '../../../packages/ui/icons/diag-art';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { insuranceOffered, normalizeLabList, normalizeProviders, type CatalogItem, type LabProvider } from '../../src/utils/labMappers';
import { formatAddressLine, resolveEffectiveAddress } from '../../src/utils/selectedAddress';

type MainTab = 'labs' | 'radiology';
type Place = 'home' | 'clinic';
/** The "Packages" chip is a category of the labs tab only; the other chips are the category art keys. */
type Cat = DiagArtKey | 'all' | 'packages';
/** The hub of labs and radiology (board ServiceHub): what to book, where, and what is already in the cart. */
export default function DiagnosticsHub() {
  const { theme, dir, t, c, k, num, flow } = useScreenUi();
  const text = useDiagText();
  const barHeight = useTabBarHeight();
  const { items } = useDiagnosticsCart();

  // `?tab=radiology` opens the radiology side (the services catalogue's imaging entry; needs-review issue 414).
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [mainTab, setMainTab] = useState<MainTab>(tab === 'radiology' ? 'radiology' : 'labs');
  // the filter sheet (payment, place, sort, toggles); the card's place stays "home" until the lab is chosen (the previous default)
  const [sheetF, setSheetF] = useState<SheetFilters>(DEFAULT_SHEET);
  const place: Place = sheetF.place === 'lab' ? 'clinic' : 'home';
  const pay = sheetF.pay;
  const patchSheet = (patch: Partial<SheetFilters>) => setSheetF((cur) => ({ ...cur, ...patch }));
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(false);
  // the category chips: scans filter on the SERVER by category (a scan's category is its modality); tests keep the chip as a filter of the loaded rows
  const [cat, setCat] = useState<Cat>('all');
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

  // the lab-only options (no fasting, same day, at the lab) would change nothing on the scans: they go back with the tab
  const switchTab = (next: MainTab) => {
    setMainTab(next);
    setSheetF((cur) => (next === 'radiology' ? { ...cur, place: cur.place === 'lab' ? 'all' : cur.place, noFasting: false, sameDay: false } : cur));
  };
  const reload = () => {
    void loadAux();
    catalog.reload();
    popularCatalog.reload();
  };
  const resetFilters = () => {
    setSheetF(DEFAULT_SHEET);
    setCat('all');
  };

  // The tests and scans are paged, searched, sorted and (scans) filtered by category on the SERVER; packages and the labs strip are short
  // lists filtered here. The place and payment of the order hide the rows of the loaded pages that do not fit.
  const needle = query.trim().toLowerCase();
  const match = (name: string) => needle === '' || name.toLowerCase().includes(needle);
  const byPrice = (a: CatalogItem, b: CatalogItem) => (a.price ?? Infinity) - (b.price ?? Infinity);
  const isLab = mainTab === 'labs';
  const sort = sheetSort(sheetF.sort);
  // R1: the place never hides scans (only ultrasound is portable); only the explicit "home collection" choice asks the server for home scans
  const homeOnly = sheetHomeVisit(sheetF);
  const artCat: DiagArtKey | 'all' = cat === 'packages' ? 'all' : cat;
  const testCatalog = useDiagCatalog('lab', isLab, { search, sort, homeVisit: homeOnly });
  const radCatalog = useDiagCatalog('radiology', !isLab, { search, sort, homeVisit: homeOnly, category: serverCategoryOf('radiology', artCat) });
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
  const effectivePay: SheetPay = anyInsurance ? pay : 'self_pay';
  // the payment always applies, offers or not: an insurance-only test never shows under "Without insurance" and a self-pay-only one never under "Insurance"
  const pays = (x: CatalogItem) => (effectivePay === 'insurance' ? x.insurance : x.selfPay);
  const view = useMemo(() => {
    let p = packages.filter((x) => match(x.name) && pays(x));
    let ls = labs.filter((x) => match(x.name));
    if (sheetF.place === 'home') {
      p = p.filter((x) => x.homeVisit);
      ls = ls.filter((x) => x.homeVisit);
    }
    if (sheetF.place === 'lab') p = p.filter((x) => x.facilityVisit);
    if (sheetF.noFasting) p = p.filter((x) => !x.fastingRequired);
    if (sheetF.sort === 'lowest_price') p = [...p].sort(byPrice);
    if (sheetF.sort === 'highest_rated') ls = [...ls].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    return { p, ls };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, labs, needle, effectivePay, sheetF]);

  const testRows = useMemo(() => tests.filter(pays).filter((x) => passesSheet(x, sheetF, 'lab')).map((item) => ({ item, art: catalogArt('lab', item) })), [tests, effectivePay, sheetF]); // eslint-disable-line react-hooks/exhaustive-deps
  const radRows = useMemo(() => rads.map((item) => ({ item, art: catalogArt('radiology', item) })), [rads]);
  // scan rows are already the chip's (server); test rows are filtered by the chip here
  const shownTests = filterByArt(testRows, artCat);
  const shownRads = radRows;
  const defaultOrder = sheetF.sort === 'popular' && sheetF.place === 'all' && !sheetF.noFasting && !sheetF.sameDay;
  const popular =
    needle === '' && cat !== 'packages' && (defaultOrder || !isLab)
      ? popularCatalog.items.filter((x) => (isLab ? pays(x) : true)).slice(0, 6)
      : [];
  const moreRows = catalog.hasMore;
  const onlyPackages = cat === 'packages';
  const showPackages = cat === 'all';
  const showTests = !onlyPackages;
  const showLabs = cat === 'all';
  const clientKept = sheetF.noFasting || sheetF.sameDay || sheetF.place === 'lab';

  // a test chip that matches few of the loaded rows keeps asking pages (the stored test categories do not match the chips one to one)
  useEffect(() => {
    if (isLab && !onlyPackages && (cat !== 'all' || clientKept) && testCatalog.hasMore && !testCatalog.loading && !testCatalog.loadingMore && shownTests.length < DIAG_PAGE_SIZE) testCatalog.loadMore();
  }, [isLab, cat, onlyPackages, clientKept, testCatalog, shownTests.length]);
  // the same for scans when the place switch hides most of a page
  useEffect(() => {
    if (!isLab && radCatalog.hasMore && !radCatalog.loading && !radCatalog.loadingMore && shownRads.length < DIAG_PAGE_SIZE) radCatalog.loadMore();
  }, [isLab, radCatalog, shownRads.length]);

  const unfiltered = needle === '' && sheetFilterCount(sheetF) === 0 && cat === 'all';
  const nothing = !loading && !failed && unfiltered && packages.length === 0 && catalog.items.length === 0;
  const addressLine = address ? k('diag.addr.to', { address: formatAddressLine(address) }) : addressLoaded ? k('diag.addr.none') : k('diag.addr.loading');

  // one cart per service: the labs tab counts the lab tests, the radiology tab the scans (the cart screen lists both groups)
  const tabLines = items.filter((i) => (i.kind === 'radiology') === (mainTab === 'radiology'));
  const tabCount = tabLines.reduce((n, i) => n + (i.qty > 0 ? i.qty : 1), 0);
  const tabTotal = tabLines.reduce((n, i) => n + i.price * (i.qty > 0 ? i.qty : 1), 0);
  const barSpace = tabCount > 0 ? 96 : 0;
  // "Show N results": what the lists below hold now (packages when that chip is on), the server's total while nothing is kept back here
  const shownRows = onlyPackages ? view.p.length : isLab ? shownTests.length : shownRads.length;
  const shownCount = onlyPackages ? shownRows : resultCount(shownRows, catalog.total, shownRows !== catalog.items.length);
  const filterCount = sheetFilterCount(sheetF) + (cat === 'all' ? 0 : 1);
  const activeItems: ActiveFilter[] = [
    ...(sheetF.pay === DEFAULT_SHEET.pay ? [] : [{ key: `pay-${sheetF.pay}`, label: k('diag.pay.insurance'), onRemove: () => patchSheet({ pay: DEFAULT_SHEET.pay }) }]),
    ...(sheetF.place === 'all' ? [] : [{ key: `place-${sheetF.place}`, label: k(sheetF.place === 'lab' ? 'diag.filter.placeLab' : 'diag.filter.placeHome'), onRemove: () => patchSheet({ place: 'all' }) }]),
    ...(sheetF.sort === 'popular' ? [] : [{ key: `sort-${sheetF.sort}`, label: k(sheetF.sort === 'lowest_price' ? 'diag.filter.price' : 'diag.filter.rating'), onRemove: () => patchSheet({ sort: 'popular' }) }]),
    ...(sheetF.noFasting ? [{ key: 'no-fasting', label: k('diag.filter.noFasting'), onRemove: () => patchSheet({ noFasting: false }) }] : []),
    ...(sheetF.sameDay ? [{ key: 'same-day', label: k('diag.filter.sameDay'), onRemove: () => patchSheet({ sameDay: false }) }] : []),
    ...(cat === 'all' ? [] : [{ key: `cat-${cat}`, label: k(`diag.cat.${cat}`), onRemove: () => setCat('all') }]),
  ];

  const catChips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={k('diag.cat.group')} contentContainerStyle={{ gap: 8 }} testID="diag-cat-chips">
      <Chip label={k('diag.filter.all')} selected={cat === 'all'} onPress={() => setCat('all')} theme={theme} testID="diag-cat-all" />
      {isLab ? <Chip label={k('diag.cat.packages')} selected={cat === 'packages'} onPress={() => setCat('packages')} theme={theme} testID="diag-cat-packages" /> : null}
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
          <ServiceCartButton service="diagnostics" />
          <HeaderMenuButton testID="diagnostics-menu-button" />
        </View>

        <Segmented
          theme={theme}
          label={k('diag.kind.group')}
          options={[
            { value: 'labs', label: k('diag.kind.lab') },
            { value: 'radiology', label: k('diag.kind.rad') },
          ]}
          value={mainTab}
          onChange={(v) => switchTab(v as MainTab)}
          testID="diag-main-tabs"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
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
        </View>
        <GlyphRound name="prescription" label={k('diag.hub.rxOrder')} onPress={() => router.push('/diagnostics/insurance-approval' as Href)} testID="diag-rx-order" />
        </View>
        {catChips}
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
            {sheetF.place === 'home' ? <PlaceRow text={addressLine} actionLabel={address ? k('diag.addr.change') : k('diag.addr.choose')} onAction={() => router.push('/profile/addresses?select=1' as Href)} /> : null}
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
            {onlyPackages ? (
              <View style={{ gap: 12 }} testID="diag-packages-list">
                {view.p.length === 0 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text> : null}
                {view.p.map((pkg) => (
                  <CatalogueCard key={`diag-pkg-${pkg.id}`} item={pkg} kind="lab" art={catalogArt('lab', pkg)} place={place} payer={payer} idPrefix="diag-pkg" isPackage />
                ))}
              </View>
            ) : null}

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
                        nameMark={pkg.nameMark}
                        desc={pkg.desc}
                        descMark={pkg.descMark}
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

            {!onlyPackages && view.p.length === 0 && testRows.length === 0 && view.ls.length === 0 ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text> : null}
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
        <View style={{ gap: 18 }}>
          {isLab && anyInsurance ? (
            <View style={{ gap: 8 }}>
              <Text accessibilityRole="header" style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary, ...flow }}>{k('diag.pay.group')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip label={k('diag.pay.selfPay')} selected={sheetF.pay === 'self_pay'} onPress={() => patchSheet({ pay: 'self_pay' })} theme={theme} testID="diag-pay-self_pay" />
                <Chip label={k('diag.pay.insurance')} selected={sheetF.pay === 'insurance'} onPress={() => patchSheet({ pay: 'insurance' })} theme={theme} testID="diag-pay-insurance" />
              </View>
            </View>
          ) : null}
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary, ...flow }}>{k('diag.place.group')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label={k('diag.filter.all')} selected={sheetF.place === 'all'} onPress={() => patchSheet({ place: 'all' })} theme={theme} testID="diag-place-all" />
              {isLab ? <Chip label={k('diag.filter.placeLab')} selected={sheetF.place === 'lab'} onPress={() => patchSheet({ place: 'lab' })} theme={theme} testID="diag-place-lab" /> : null}
              <Chip label={k('diag.filter.placeHome')} selected={sheetF.place === 'home'} onPress={() => patchSheet({ place: 'home' })} theme={theme} testID="diag-place-home" />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary, ...flow }}>{k('diag.filter.sortBy')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label={k('diag.hub.popular')} selected={sheetF.sort === 'popular'} onPress={() => patchSheet({ sort: 'popular' })} theme={theme} testID="diag-sort-popular" />
              <Chip label={k('diag.filter.price')} selected={sheetF.sort === 'lowest_price'} onPress={() => patchSheet({ sort: 'lowest_price' })} theme={theme} testID="diag-sort-lowest_price" />
              <Chip label={k('diag.filter.rating')} selected={sheetF.sort === 'highest_rated'} onPress={() => patchSheet({ sort: 'highest_rated' })} theme={theme} testID="diag-sort-highest_rated" />
            </View>
          </View>
          {isLab ? (
            <View style={{ gap: 12 }}>
              <Toggle theme={theme} label={k('diag.filter.noFasting')} value={sheetF.noFasting} onChange={(v) => patchSheet({ noFasting: v })} testID="diag-toggle-no-fasting" />
              <Toggle theme={theme} label={k('diag.filter.sameDay')} value={sheetF.sameDay} onChange={(v) => patchSheet({ sameDay: v })} testID="diag-toggle-same-day" />
            </View>
          ) : null}
          <View style={{ gap: 8 }}>
            <Button theme={theme} size="lg" fullWidth label={k('diag.filter.showCount', { n: num(shownCount) })} onPress={() => setSheet(false)} testID="diag-filter-apply" />
            {filterCount > 0 ? <Button theme={theme} size="lg" fullWidth variant="outline" label={k('pharmacy.filters.reset')} onPress={() => { resetFilters(); setSheet(false); }} testID="diag-filter-reset" /> : null}
          </View>
        </View>
      </Sheet>
    </Screen>
    {tabCount > 0 ? (
      <CartBar count={tabCount} total={tabTotal} bottom={cartBarBottom(barHeight)} actionLabel={k('diag.bar.continue')} countLabel={k('diag.bar.count', { n: num(tabCount) })} totalLabel={k('diag.bar.total')} onPress={() => router.push('/diagnostics/cart' as Href)} />
    ) : null}
    </View>
  );
}
