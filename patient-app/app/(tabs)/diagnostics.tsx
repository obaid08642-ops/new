import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';

import { EmptyState, ErrorState, OfflineState, Radio, Screen, Search, Segmented, useTabBarHeight } from '../../../packages/ui-native/src';
import { CARE_TONE, Section, Sheet } from '../../src/components/consult/ConsultKit';
import {
  CartBar,
  INSURANCE_TONE,
  KindTile,
  LAB_TONE,
  LabCard,
  LinkCard,
  ListCard,
  PackageCard,
  PillLink,
  PlaceRow,
  RAD_TONE,
  ShortcutTile,
  Strip,
  TestRow,
  ToneNote,
  diagLook,
  useDiagText,
} from '../../src/components/diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { normalizeLabList, normalizeProviders, type CatalogItem, type LabProvider } from '../../src/utils/labMappers';
import { formatAddressLine, resolveEffectiveAddress } from '../../src/utils/selectedAddress';

type MainTab = 'labs' | 'radiology';
type Place = 'home' | 'clinic';
type FilterId = 'all' | 'tests' | 'packages' | 'labs' | 'highest_rated' | 'lowest_price' | 'home_visit';
const FILTERS: Array<{ id: FilterId; key: string }> = [
  { id: 'all', key: 'diag.filter.all' },
  { id: 'tests', key: 'diag.filter.tests' },
  { id: 'packages', key: 'diag.filter.packages' },
  { id: 'labs', key: 'diag.filter.labs' },
  { id: 'highest_rated', key: 'diag.filter.rating' },
  { id: 'lowest_price', key: 'diag.filter.price' },
  { id: 'home_visit', key: 'diag.filter.home' },
];

/** The hub of labs and radiology (board ServiceHub): what to book, where, and what is already in the cart. */
export default function DiagnosticsHub() {
  const { theme, dir, t, c, k, num, flow } = useScreenUi();
  const text = useDiagText();
  const barHeight = useTabBarHeight();
  const { items, itemCount, total, addItem, removeItem } = useDiagnosticsCart();

  const [mainTab, setMainTab] = useState<MainTab>('labs');
  const [place, setPlace] = useState<Place>('home');
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');

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
      apiFetch<unknown>('/labs/packages').catch(miss),
      apiFetch<unknown>('/labs/services').catch(miss),
      apiFetch<unknown>('/radiology/services').catch(miss),
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

  const inCart = (id: string) => items.some((i) => i.id === id);
  const toggle = (item: CatalogItem, kind: 'lab' | 'radiology') => {
    if (inCart(item.id)) void removeItem(item.id, kind);
    else void addItem({ id: item.id, name: item.name, price: item.price ?? 0, kind });
  };

  // search and filter run on what the screen already loaded
  const needle = query.trim().toLowerCase();
  const match = (name: string) => needle === '' || name.toLowerCase().includes(needle);
  const byPrice = (a: CatalogItem, b: CatalogItem) => (a.price ?? Infinity) - (b.price ?? Infinity);
  const view = useMemo(() => {
    let p = packages.filter((x) => match(x.name));
    let ts = tests.filter((x) => match(x.name));
    let rs = rads.filter((x) => match(x.name) && (place === 'clinic' || x.homeVisit));
    let ls = labs.filter((x) => match(x.name));
    if (filter === 'home_visit') {
      ts = ts.filter((x) => x.homeVisit);
      p = p.filter((x) => x.homeVisit);
      ls = ls.filter((x) => x.homeVisit);
    }
    if (filter === 'lowest_price') {
      p = [...p].sort(byPrice);
      ts = [...ts].sort(byPrice);
      rs = [...rs].sort(byPrice);
    }
    if (filter === 'highest_rated') ls = [...ls].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    return { p, ts, rs, ls };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, tests, rads, labs, needle, place, filter]);

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

  const barSpace = itemCount > 0 ? 84 : 0;

  return (
    <View style={{ flex: 1 }}>
    <Screen
      theme={theme}
      direction={dir}
      edges={['top', 'start', 'end']}
      scroll
      bottomSpace={barHeight + barSpace + 16}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} tintColor={c.text.primary} />}
      testID="diagnostics-hub"
    >
      <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, ...scale(t, 'h1'), color: c.text.primary, ...flow }}>{k('diag.hub.title')}</Text>
          <View style={{ flexShrink: 1 }}>
            <PillLink icon="receipt" label={k('diag.hub.myOrders')} onPress={() => router.push('/diagnostics/orders' as Href)} />
          </View>
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
          filterLabel={k('diag.hub.filter')}
        />

        {failed === 'error' ? <ErrorState title={k('consult.error.title')} body={k('consult.error.body')} retryLabel={k('consult.retry')} onRetry={() => void load()} theme={theme} /> : null}
        {failed === 'offline' ? <OfflineState title={k('consult.offline.title')} body={k('consult.offline.body')} retryLabel={k('consult.retry')} onRetry={() => void load()} theme={theme} /> : null}

        {failed ? null : (
          <>
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 10 }}>
              <KindTile icon="test-tube" tone={LAB_TONE} title={k('diag.kind.lab')} line={k('diag.kind.labLine')} selected={isLab} onPress={() => setMainTab('labs')} />
              <KindTile icon="scan" tone={RAD_TONE} title={k('diag.kind.rad')} line={k('diag.kind.radLine')} selected={!isLab} onPress={() => setMainTab('radiology')} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ShortcutTile icon="chart-line-up" tone="mint" label={k('diag.hub.results')} onPress={() => router.push('/diagnostics/my-results' as Href)} />
              <ShortcutTile icon="arrows-left-right" tone={CARE_TONE} label={k('diag.hub.compare')} onPress={() => router.push('/diagnostics/search' as Href)} />
            </View>

            <View style={{ gap: 4 }}>
              <Segmented theme={theme} label={k('diag.place.group')} options={placeOptions} value={place} onChange={(v) => setPlace(v as Place)} />
              {place === 'home' ? <PlaceRow text={addressLine} actionLabel={address ? k('diag.addr.change') : k('diag.addr.choose')} onAction={() => router.push('/profile/addresses?select=1' as Href)} /> : null}
            </View>

            <LinkCard icon="shield-check" tone={INSURANCE_TONE} title={k('diag.hub.insTitle')} body={k('diag.hub.insBody')} onPress={() => router.push('/diagnostics/insurance-upload' as Href)} />
          </>
        )}

        {loading ? (
          <View accessibilityLabel={k('consult.loading')} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ height: 96, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
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

            {showTests && view.ts.length > 0 ? (
              <Section title={k('diag.hub.tests')} actionLabel={k('diag.hub.allTests')} onAction={() => router.push('/diagnostics/search' as Href)}>
                <ListCard>
                  {view.ts.map((test, i) => (
                    <TestRow
                      key={test.id}
                      name={test.name}
                      tags={text.testTags(test, place === 'home')}
                      note={test.turnaroundHours !== null ? text.turnaround(test.turnaroundHours) : undefined}
                      price={test.price}
                      last={i === view.ts.length - 1}
                      onPress={() => router.push(`/diagnostics/test-detail?id=${test.id}` as Href)}
                      toggle={{ on: inCart(test.id), label: inCart(test.id) ? k('diag.cart.remove', { name: test.name }) : k('diag.cart.add', { name: test.name }), onPress: () => toggle(test, 'lab') }}
                    />
                  ))}
                </ListCard>
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
            <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('diag.hub.radTitle')}</Text>
            {view.rs.length > 0 ? (
              <ListCard>
                {view.rs.map((rad, i) => (
                  <TestRow
                    key={rad.id}
                    name={rad.name}
                    icon={{ icon: 'scan', tone: RAD_TONE }}
                    note={rad.desc || undefined}
                    price={rad.price}
                    last={i === view.rs.length - 1}
                    onPress={() => router.push(`/diagnostics/test-detail?id=${rad.id}&isRadiology=true` as Href)}
                    toggle={{ on: inCart(rad.id), label: inCart(rad.id) ? k('diag.cart.remove', { name: rad.name }) : k('diag.cart.add', { name: rad.name }), onPress: () => toggle(rad, 'radiology') }}
                  />
                ))}
              </ListCard>
            ) : (
              <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('diag.empty.noMatch')}</Text>
            )}
          </View>
        ) : null}
      </View>


      <Sheet open={sheet} title={k('diag.filter.title')} onClose={() => setSheet(false)} closeLabel={k('diag.filter.close')}>
        <View>
          {FILTERS.map((f, i) => (
            <Radio
              key={f.id}
              theme={theme}
              label={k(f.key)}
              selected={filter === f.id}
              divider={i < FILTERS.length - 1}
              onChange={() => {
                setFilter(f.id);
                setSheet(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
    {itemCount > 0 ? (
      <CartBar count={itemCount} total={total} bottom={barHeight + 8} actionLabel={k('diag.bar.continue')} countLabel={k('diag.bar.count', { n: num(itemCount) })} totalLabel={k('diag.bar.total')} onPress={() => router.push('/diagnostics/cart' as Href)} />
    ) : null}
    </View>
  );
}
